/**
 * Story panel editing workflow.
 * Keeps image generation and persistence details out of the page controller.
 */
import { editPanelImage, updatePanelImage } from '@api';
import type { ComicPanelData, Story } from '@/types';

interface EditStoryPanelImageParams {
  accessToken: string;
  panel: ComicPanelData;
  story: Story;
  artStyle?: string;
  editPrompt: string;
  savedStoryId: number | null;
}

export async function editStoryPanelImage({
  accessToken,
  artStyle,
  editPrompt,
  panel,
  savedStoryId,
  story,
}: EditStoryPanelImageParams): Promise<ComicPanelData> {
  const updatedImageUrl = await editPanelImage(
    accessToken,
    panel.imageUrl!,
    editPrompt,
    panel.imagePrompt,
    story.characterDescription,
    artStyle,
  );
  const updatedPanel = {
    ...panel,
    imageUrl: updatedImageUrl,
  };

  const panelOrder = story.panels.findIndex((storyPanel) => storyPanel.id === panel.id);
  if (savedStoryId && panelOrder >= 0) {
    await updatePanelImage(accessToken, savedStoryId, panelOrder, updatedImageUrl);
  }

  return updatedPanel;
}
