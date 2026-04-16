import base64

import pytest

from services import image_storage


@pytest.fixture
def temp_images_dir(tmp_path, monkeypatch):
    images_dir = tmp_path / "images"
    images_dir.mkdir()
    monkeypatch.setattr(image_storage, "IMAGES_DIR", images_dir)
    return images_dir


def test_save_base64_image_returns_none_for_empty_input(temp_images_dir):
    assert image_storage.save_base64_image("") is None


def test_save_base64_image_saves_png_with_plain_base64(temp_images_dir):
    raw = b"hello-image"
    encoded = base64.b64encode(raw).decode()

    filename = image_storage.save_base64_image(encoded, prefix="panel")

    assert filename is not None
    assert filename.startswith("panel_")
    assert filename.endswith(".png")
    assert (temp_images_dir / filename).read_bytes() == raw


def test_save_base64_image_supports_data_url_prefix(temp_images_dir):
    raw = b"cover-bytes"
    encoded = base64.b64encode(raw).decode()
    data_url = f"data:image/png;base64,{encoded}"

    filename = image_storage.save_base64_image(data_url, prefix="cover")

    assert filename is not None
    assert filename.startswith("cover_")
    assert (temp_images_dir / filename).read_bytes() == raw


def test_save_base64_image_returns_none_for_invalid_base64(temp_images_dir):
    assert image_storage.save_base64_image("%%%invalid%%%") is None


def test_delete_local_image_deletes_existing_file(temp_images_dir):
    target = temp_images_dir / "panel_test.png"
    target.write_bytes(b"data")

    image_storage.delete_local_image(target.name)

    assert not target.exists()


def test_delete_local_image_ignores_missing_or_empty_filename(temp_images_dir):
    image_storage.delete_local_image(None)
    image_storage.delete_local_image("")
    image_storage.delete_local_image("does-not-exist.png")
