/**
 * Profile page.
 * Inline-edit username/email, crop-and-upload avatar, logout.
 * Data flows through useProfilePage; this file is layout + presentation only.
 */
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/app/auth';
import { SketchyInput } from '@/components/design-system/Forms';
import { SketchyButton } from '@/components/design-system/Primitives';
import StorageImage from '@/components/StorageImage';
import { AvatarCropper } from './AvatarCropper';
import { useProfilePage } from './useProfilePage';

export function ProfilePage(): JSX.Element {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
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
  } = useProfilePage();

  if (!currentUser) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-rounded text-xl text-brand-muted">Loading…</p>
      </div>
    );
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    openAvatarPicker(file);
  }

  async function onLogout(): Promise<void> {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Logout failed');
    }
  }

  return (
    <div className="flex flex-1 justify-center py-12">
      <div className="w-full max-w-2xl bg-white rounded-2xl border-4 border-brand-primary/20 shadow-soft p-10 space-y-8">
        <h1 className="font-sans font-bold text-3xl text-brand-dark text-center">Your profile</h1>

        {/* Avatar */}
        <section className="flex flex-col items-center gap-3">
          {pendingAvatarFile ? (
            <AvatarCropper
              file={pendingAvatarFile}
              onCancel={cancelAvatarPicker}
              onCropComplete={handleAvatarUpload}
            />
          ) : (
            <>
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-brand-primary/20 bg-brand-light">
                <StorageImage
                  src={currentUser.avatar_url}
                  alt={`${currentUser.username}'s avatar`}
                  className="w-full h-full object-cover"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onFilePicked}
              />
              <SketchyButton
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? 'Uploading…' : 'Change avatar'}
              </SketchyButton>
            </>
          )}
        </section>

        {/* Inline-editable fields */}
        <section className="space-y-6">
          <EditableRow
            label="Username"
            value={currentUser.username}
            isEditing={editingField === 'username'}
            draft={draftValue}
            onEdit={() => startEditing('username')}
            onCancel={cancelEditing}
            onChange={setDraftValue}
            onSave={handleSave}
            isSaving={isSaving}
          />
          <EditableRow
            label="Email"
            value={currentUser.email}
            isEditing={editingField === 'email'}
            draft={draftValue}
            onEdit={() => startEditing('email')}
            onCancel={cancelEditing}
            onChange={setDraftValue}
            onSave={handleSave}
            isSaving={isSaving}
            inputType="email"
          />
        </section>

        <div className="pt-4 border-t border-brand-primary/10 flex justify-end">
          <SketchyButton type="button" variant="outline" onClick={onLogout}>
            Log out
          </SketchyButton>
        </div>
      </div>
    </div>
  );
}

interface EditableRowProps {
  label: string;
  value: string;
  isEditing: boolean;
  draft: string;
  onEdit: () => void;
  onCancel: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  isSaving: boolean;
  inputType?: string;
}

function EditableRow({
  label,
  value,
  isEditing,
  draft,
  onEdit,
  onCancel,
  onChange,
  onSave,
  isSaving,
  inputType = 'text',
}: EditableRowProps): JSX.Element {
  return (
    <div>
      <label className="block text-sm font-bold text-brand-muted mb-2">{label}</label>
      {isEditing ? (
        <div className="flex items-center gap-3">
          <SketchyInput
            type={inputType}
            value={draft}
            onChange={e => onChange(e.target.value)}
            disabled={isSaving}
            autoFocus
          />
          <SketchyButton type="button" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </SketchyButton>
          <SketchyButton type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </SketchyButton>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-2xl font-semibold text-brand-dark">{value}</span>
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-bold text-brand-primary hover:underline"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
