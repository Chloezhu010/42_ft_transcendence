/**
 * Profile page controller.
 * Owns inline-edit draft state, avatar cropper visibility, and the two
 * handlers (save + upload) that call the backend.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { updateMe, uploadAvatar, type UserResponse } from '@api';
import { useAuth } from '@/app/auth';

type EditableField = 'username' | 'email';

interface UseProfilePageResult {
  currentUser: UserResponse | null;
  // inline edit
  editingField: EditableField | null;
  draftValue: string;
  startEditing: (field: EditableField) => void;
  cancelEditing: () => void;
  setDraftValue: (value: string) => void;
  handleSave: () => Promise<void>;
  isSaving: boolean;
  // avatar
  pendingAvatarFile: File | null;
  openAvatarPicker: (file: File) => void;
  cancelAvatarPicker: () => void;
  handleAvatarUpload: (croppedFile: File) => Promise<void>;
  isUploadingAvatar: boolean;
}

export function useProfilePage(): UseProfilePageResult {
  const { currentUser, accessToken, refreshMe } = useAuth();

  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  function startEditing(field: EditableField): void {
    if (!currentUser) return;
    setEditingField(field);
    setDraftValue(currentUser[field] ?? '');
  }

  function cancelEditing(): void {
    setEditingField(null);
    setDraftValue('');
  }

  function openAvatarPicker(file: File): void {
    setPendingAvatarFile(file);
  }

  function cancelAvatarPicker(): void {
    setPendingAvatarFile(null);
  }

  /**
   * Save the inline-edited field (`editingField` = 'username' | 'email').
   *
   * Flow:
   *   1. No-op if draft matches current value — avoids an API round-trip and a
   *      spurious 409 from the DB's UNIQUE check on the user's own value.
   *   2. Local validation for faster feedback: email shape + non-empty username.
   *      Backend still validates authoritatively (it's the source of truth).
   *   3. PATCH with a partial body `{ [editingField]: draftValue }` — matches
   *      PATCH semantics; backend schema allows partial updates.
   *   4. On success: `refreshMe()` so the navbar picks up the new name/email,
   *      then exit edit mode.
   *   5. On error (e.g. 409 username/email taken): surface `error.message` via
   *      toast and keep the user in edit mode so they can fix the draft.
   */
  async function handleSave(): Promise<void> {
    if (!accessToken || !editingField) return;
    setIsSaving(true);
    try {
      if (currentUser && currentUser[editingField] === draftValue) {
        toast('No changes to save.');
        cancelEditing();
        return;
      }
      if (editingField === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draftValue)) {
        toast.error('Please enter a valid email address.');
        return;
      }
      if (editingField === 'username' && draftValue.trim() === '') {
        toast.error('Username cannot be empty.');
        return;
      }
      await updateMe(accessToken, { [editingField]: draftValue });
      await refreshMe();
      toast.success('Profile updated.');
      cancelEditing();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Upload the cropped avatar (512x512 JPEG produced by the cropper).
   *
   * Flow:
   *   1. POST the file via `uploadAvatar` — backend returns the updated user.
   *   2. `refreshMe()` re-reads from source so any other tab/consumer of the
   *      auth context stays consistent (slightly safer than trusting the
   *      response in isolation).
   *   3. On success: close the cropper and toast confirmation.
   *   4. On error: leave the cropper open so the user can retry the same file.
   */
  async function handleAvatarUpload(croppedFile: File): Promise<void> {
    if (!accessToken) return;
    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(accessToken, croppedFile);
      await refreshMe();
      setPendingAvatarFile(null);
      toast.success('Avatar updated.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast.error(message);
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  return {
    currentUser,
    editingField,
    draftValue,
    startEditing,
    cancelEditing,
    setDraftValue,
    handleSave,
    isSaving,
    pendingAvatarFile,
    openAvatarPicker,
    cancelAvatarPicker,
    handleAvatarUpload,
    isUploadingAvatar,
  };
}
