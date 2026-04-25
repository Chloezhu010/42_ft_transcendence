"""AI generation request and response schemas."""

from pydantic import BaseModel, Field

from schemas.stories import KidProfileCreate, StoryResponse


class GenerateStoryScriptRequest(BaseModel):
    """Request to generate a story script."""

    profile: KidProfileCreate


class GeneratedPanel(BaseModel):
    """A generated panel from the story script."""

    id: str = Field(description="Panel identifier, e.g. '1', '2', '3'")
    text: str = Field(description="The narrative text for this panel, 8-12 words")
    imagePrompt: str = Field(description="Detailed image prompt for this panel with cinematic direction")


class GenerateStoryScriptResponse(BaseModel):
    """Response containing the generated story script."""

    title: str = Field(description="The title of the comic book story")
    foreword: str = Field(description="A short foreword, max 30 words")
    characterDescription: str = Field(
        description=("Detailed description of all characters including their appearance and outfits")
    )
    coverImagePrompt: str = Field(description="Image prompt for the cover showing the hero and companion")
    panels: list[GeneratedPanel] = Field(description="List of story panels")


class GenerateAndSaveStoryRequest(BaseModel):
    """Generate script, images, and save story."""

    profile: KidProfileCreate


class GenerateAndSaveStoryResponse(BaseModel):
    """Complete story with images."""

    story: StoryResponse


class GeneratePanelImageRequest(BaseModel):
    """Request to generate a panel image."""

    prompt: str
    cast_guide: str
    style: str | None = None


class GeneratePanelImageResponse(BaseModel):
    """Response containing the generated image."""

    image_base64: str


class EditPanelImageRequest(BaseModel):
    """Request to edit a panel image."""

    image_base64: str
    original_prompt: str
    edit_prompt: str
    cast_guide: str
    style: str | None = None


class EditPanelImageResponse(BaseModel):
    """Response containing the edited image."""

    image_base64: str
