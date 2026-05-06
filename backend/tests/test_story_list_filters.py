"""Story list filter, sort, and pagination tests."""

import asyncio

import pytest
from fastapi.testclient import TestClient

from routers.auth import router as auth_router
from routers.stories import router as stories_router
from tests.conftest import _init_test_db, make_test_app

_ALICE = {"username": "alice", "email": "alice@example.com", "password": "Password123!"}

_BASE_PROFILE = {
    "gender": "girl",
    "skin_tone": "medium",
    "hair_color": "black",
    "eye_color": "brown",
    "favorite_color": "purple",
}


@pytest.fixture
def client(tmp_path):
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    with TestClient(make_test_app(db_path, auth_router, stories_router)) as test_client:
        yield test_client


def _signup(client: TestClient) -> dict[str, str]:
    response = client.post("/api/auth/signup", json=_ALICE)
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _create_story(
    client: TestClient,
    headers: dict[str, str],
    *,
    title: str,
    hero_name: str,
    archetype: str | None = None,
) -> dict:
    profile = {**_BASE_PROFILE, "name": hero_name, "archetype": archetype}
    payload = {"profile": profile, "title": title, "panels": []}
    response = client.post("/api/stories", json=payload, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def _set_visibility(client: TestClient, headers: dict[str, str], story_id: int, visibility: str) -> None:
    response = client.patch(
        f"/api/stories/{story_id}/visibility",
        json={"visibility": visibility},
        headers=headers,
    )
    assert response.status_code == 200, response.text


def test_story_list_search_by_title_or_hero(client):
    headers = _signup(client)
    alpha = _create_story(client, headers, title="Alpha Quest", hero_name="Milo", archetype="explorer")
    _create_story(client, headers, title="Beta Quest", hero_name="Nova", archetype="inventor")

    by_title = client.get("/api/stories?search=Alpha", headers=headers).json()
    assert [story["id"] for story in by_title["items"]] == [alpha["id"]]

    by_hero = client.get("/api/stories?search=Milo", headers=headers).json()
    assert [story["id"] for story in by_hero["items"]] == [alpha["id"]]

    by_archetype_term = client.get("/api/stories?search=explorer", headers=headers).json()
    assert by_archetype_term["items"] == []


def test_story_list_filters_sort_and_pagination(client):
    headers = _signup(client)
    story_c = _create_story(client, headers, title="C Story", hero_name="Zara", archetype="guardian")
    story_a = _create_story(client, headers, title="A Story", hero_name="Luna", archetype="explorer")
    story_b = _create_story(client, headers, title="B Story", hero_name="Nico", archetype="inventor")
    _set_visibility(client, headers, story_b["id"], "shared_with_friends")

    by_archetype = client.get("/api/stories?archetype=explorer", headers=headers).json()
    assert [story["id"] for story in by_archetype["items"]] == [story_a["id"]]

    by_visibility = client.get("/api/stories?visibility=shared_with_friends", headers=headers).json()
    assert [story["id"] for story in by_visibility["items"]] == [story_b["id"]]

    sorted_titles = client.get("/api/stories?sort=title_asc", headers=headers).json()
    assert [story["title"] for story in sorted_titles["items"]] == ["A Story", "B Story", "C Story"]

    page_one = client.get("/api/stories?sort=title_asc&page_size=2&page=1", headers=headers).json()
    assert page_one["total"] == 3
    assert page_one["page"] == 1
    assert page_one["page_size"] == 2
    assert len(page_one["items"]) == 2

    page_two = client.get("/api/stories?sort=title_asc&page_size=2&page=2", headers=headers).json()
    assert page_two["total"] == 3
    assert page_two["page"] == 2
    assert page_two["page_size"] == 2
    assert len(page_two["items"]) == 1

    assert {story["id"] for story in page_one["items"] + page_two["items"]} == {
        story_a["id"],
        story_b["id"],
        story_c["id"],
    }
