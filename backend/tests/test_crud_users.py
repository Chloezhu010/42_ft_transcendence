import aiosqlite
import pytest
import pytest_asyncio

from auth_utils import verify_password
from db.crud_users import (
    accept_friend_request,
    create_user,
    get_friends,
    get_friendship_between,
    get_pending_requests,
    get_user_by_email,
    get_user_by_id,
    remove_friend,
    search_users_by_username,
    send_friend_request,
    set_online_status,
    update_avatar,
    update_user,
)
from db.database import init_db


@pytest_asyncio.fixture
async def db(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DB_PATH", str(db_path))

    import db.database as database

    database.DB_PATH = str(db_path)
    await init_db()

    conn = await aiosqlite.connect(str(db_path))
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA foreign_keys = ON")
    yield conn
    await conn.close()


async def create_sample_users(db: aiosqlite.Connection) -> tuple[int, int, int]:
    alice_id = await create_user(db, "alice", "alice@example.com", "password123")
    bob_id = await create_user(db, "bob", "bob@example.com", "password456")
    charlie_id = await create_user(db, "charlie", "charlie@example.com", "password789")
    return alice_id, bob_id, charlie_id


@pytest.mark.asyncio
async def test_create_user_inserts_user_and_hashes_password(db):
    user_id = await create_user(db, "alice", "alice@example.com", "password123")

    assert isinstance(user_id, int)

    user = await get_user_by_id(db, user_id)
    assert user is not None
    assert user["id"] == user_id
    assert user["username"] == "alice"
    assert user["email"] == "alice@example.com"
    assert user["avatar_path"] == "default-avatar.png"
    assert user["is_online"] == 0
    assert user["password_hash"] != "password123"
    assert verify_password("password123", user["password_hash"]) is True


@pytest.mark.asyncio
async def test_create_user_rejects_duplicate_email(db):
    await create_user(db, "alice", "alice@example.com", "password123")

    with pytest.raises(aiosqlite.IntegrityError):
        await create_user(db, "alice2", "alice@example.com", "password456")


@pytest.mark.asyncio
async def test_create_user_rejects_duplicate_username(db):
    await create_user(db, "alice", "alice@example.com", "password123")

    with pytest.raises(aiosqlite.IntegrityError):
        await create_user(db, "alice", "alice2@example.com", "password456")


@pytest.mark.asyncio
async def test_get_user_by_email_returns_user(db):
    user_id = await create_user(db, "bob", "bob@example.com", "password123")

    user = await get_user_by_email(db, "bob@example.com")

    assert user is not None
    assert user["id"] == user_id
    assert user["username"] == "bob"
    assert user["email"] == "bob@example.com"


@pytest.mark.asyncio
async def test_get_user_by_email_returns_none_when_missing(db):
    user = await get_user_by_email(db, "missing@example.com")

    assert user is None


@pytest.mark.asyncio
async def test_get_user_by_id_returns_user(db):
    user_id = await create_user(db, "alice", "alice@example.com", "password123")

    user = await get_user_by_id(db, user_id)

    assert user is not None
    assert user["id"] == user_id
    assert user["username"] == "alice"


@pytest.mark.asyncio
async def test_get_user_by_id_returns_none_when_missing(db):
    user = await get_user_by_id(db, 99999)

    assert user is None


# --- search_users_by_username ---
@pytest.mark.asyncio
async def test_search_users_by_username_matches_partial_case_insensitive(db):
    _, bob_id, _ = await create_sample_users(db)

    results = await search_users_by_username(db, "ALI", current_user_id=bob_id)

    usernames = [row["username"] for row in results]
    assert "alice" in usernames
    assert all(row["id"] != bob_id for row in results)


@pytest.mark.asyncio
async def test_search_users_by_username_excludes_current_user(db):
    alice_id, _, _ = await create_sample_users(db)

    results = await search_users_by_username(db, "ali", current_user_id=alice_id)

    assert all(row["id"] != alice_id for row in results)
    assert results == []


@pytest.mark.asyncio
async def test_search_users_by_username_returns_empty_for_blank_query(db):
    alice_id, _, _ = await create_sample_users(db)

    assert await search_users_by_username(db, "", current_user_id=alice_id) == []
    assert await search_users_by_username(db, "   ", current_user_id=alice_id) == []


@pytest.mark.asyncio
async def test_search_users_by_username_orders_alphabetically(db):
    # Insert out of alphabetical order to confirm ORDER BY, not insertion order.
    zoe_id = await create_user(db, "zoe", "zoe@example.com", "password123")
    await create_user(db, "Aaron", "aaron@example.com", "password123")
    await create_user(db, "amy", "amy@example.com", "password123")

    results = await search_users_by_username(db, "a", current_user_id=zoe_id)

    usernames = [row["username"] for row in results]
    # COLLATE NOCASE => "Aaron" sorts before "amy"
    assert usernames == sorted(usernames, key=str.lower)
    assert usernames[0].lower() == "aaron"


@pytest.mark.asyncio
async def test_search_users_by_username_clamps_limit(db):
    searcher_id = await create_user(db, "searcher", "s@example.com", "password123")
    for i in range(25):
        await create_user(db, f"user{i:02d}", f"u{i}@example.com", "password123")

    # limit above max (20) should be clamped down to 20
    capped = await search_users_by_username(db, "user", current_user_id=searcher_id, limit=999)
    assert len(capped) == 20

    # limit below min (1) should be clamped up to 1
    floored = await search_users_by_username(db, "user", current_user_id=searcher_id, limit=0)
    assert len(floored) == 1

@pytest.mark.asyncio
async def test_search_users_by_username_escapes_like_wildcards(db):
    searcher_id = await create_user(db, "searcher", "s@example.com", "password123")
    await create_user(db, "a_c", "a_c@example.com", "password123")
    await create_user(db, "abc", "abc@example.com", "password123")
    await create_user(db, "a%z", "apz@example.com", "password123")
    await create_user(db, "plain", "plain@example.com", "password123")

    # "_" must be treated literally, not as "any single char"
    underscore_results = await search_users_by_username(db, "a_c", current_user_id=searcher_id)
    usernames = [row["username"] for row in underscore_results]
    assert "a_c" in usernames
    assert "abc" not in usernames

    # "%" must be treated literally, not as "match anything"
    percent_results = await search_users_by_username(db, "%", current_user_id=searcher_id)
    percent_usernames = [row["username"] for row in percent_results]
    assert percent_usernames == ["a%z"]


@pytest.mark.asyncio
async def test_update_user_updates_username_only(db):
    user_id = await create_user(db, "alice", "alice@example.com", "password123")

    updated_user = await update_user(db, user_id, username="alice_new")

    assert updated_user is not None
    assert updated_user["username"] == "alice_new"
    assert updated_user["email"] == "alice@example.com"


@pytest.mark.asyncio
async def test_update_user_updates_email_only(db):
    user_id = await create_user(db, "alice", "alice@example.com", "password123")

    updated_user = await update_user(db, user_id, email="alice_new@example.com")

    assert updated_user is not None
    assert updated_user["username"] == "alice"
    assert updated_user["email"] == "alice_new@example.com"


@pytest.mark.asyncio
async def test_update_user_updates_both_fields(db):
    user_id = await create_user(db, "alice", "alice@example.com", "password123")

    updated_user = await update_user(
        db,
        user_id,
        username="alice_new",
        email="alice_new@example.com",
    )

    assert updated_user is not None
    assert updated_user["username"] == "alice_new"
    assert updated_user["email"] == "alice_new@example.com"


@pytest.mark.asyncio
async def test_update_user_returns_current_user_when_no_fields_provided(db):
    user_id = await create_user(db, "alice", "alice@example.com", "password123")

    current_user = await update_user(db, user_id)

    assert current_user is not None
    assert current_user["id"] == user_id
    assert current_user["username"] == "alice"
    assert current_user["email"] == "alice@example.com"


@pytest.mark.asyncio
async def test_update_user_returns_none_when_user_missing(db):
    updated_user = await update_user(db, 99999, username="ghost")

    assert updated_user is None


@pytest.mark.asyncio
async def test_update_user_rejects_duplicate_email(db):
    alice_id, bob_id, _ = await create_sample_users(db)

    with pytest.raises(ValueError, match="Email already in use"):
        await update_user(db, bob_id, email="alice@example.com")

    alice = await get_user_by_id(db, alice_id)
    bob = await get_user_by_id(db, bob_id)
    assert alice is not None
    assert bob is not None
    assert bob["email"] == "bob@example.com"


@pytest.mark.asyncio
async def test_update_user_rejects_duplicate_username(db):
    alice_id, bob_id, _ = await create_sample_users(db)

    with pytest.raises(ValueError, match="Username already in use"):
        await update_user(db, bob_id, username="alice")

    alice = await get_user_by_id(db, alice_id)
    bob = await get_user_by_id(db, bob_id)
    assert alice is not None
    assert bob is not None
    assert bob["username"] == "bob"


@pytest.mark.asyncio
async def test_update_avatar_updates_avatar_path(db):
    user_id = await create_user(db, "alice", "alice@example.com", "password123")

    updated_user = await update_avatar(db, user_id, "avatars/alice.png")

    assert updated_user is not None
    assert updated_user["avatar_path"] == "avatars/alice.png"


@pytest.mark.asyncio
async def test_update_avatar_returns_none_when_user_missing(db):
    updated_user = await update_avatar(db, 99999, "avatars/missing.png")

    assert updated_user is None


@pytest.mark.asyncio
async def test_set_online_status_sets_true(db):
    user_id = await create_user(db, "alice", "alice@example.com", "password123")

    updated_user = await set_online_status(db, user_id, True)

    assert updated_user is not None
    assert updated_user["is_online"] == 1


@pytest.mark.asyncio
async def test_set_online_status_sets_false(db):
    user_id = await create_user(db, "alice", "alice@example.com", "password123")
    await set_online_status(db, user_id, True)

    updated_user = await set_online_status(db, user_id, False)

    assert updated_user is not None
    assert updated_user["is_online"] == 0


@pytest.mark.asyncio
async def test_set_online_status_returns_none_when_user_missing(db):
    updated_user = await set_online_status(db, 99999, True)

    assert updated_user is None


@pytest.mark.asyncio
async def test_get_friendship_between_returns_row_for_existing_request(db):
    alice_id, bob_id, _ = await create_sample_users(db)
    created_friendship = await send_friend_request(db, alice_id, bob_id)

    friendship = await get_friendship_between(db, alice_id, bob_id)

    assert friendship is not None
    assert friendship["id"] == created_friendship["id"]
    assert friendship["requester_id"] == alice_id
    assert friendship["addressee_id"] == bob_id
    assert friendship["status"] == "pending"


@pytest.mark.asyncio
async def test_get_friendship_between_finds_reverse_direction(db):
    alice_id, bob_id, _ = await create_sample_users(db)
    created_friendship = await send_friend_request(db, alice_id, bob_id)

    friendship = await get_friendship_between(db, bob_id, alice_id)

    assert friendship is not None
    assert friendship["id"] == created_friendship["id"]


@pytest.mark.asyncio
async def test_get_friendship_between_returns_none_when_missing(db):
    alice_id, bob_id, _ = await create_sample_users(db)

    friendship = await get_friendship_between(db, alice_id, bob_id)

    assert friendship is None


@pytest.mark.asyncio
async def test_send_friend_request_creates_pending_request(db):
    alice_id, bob_id, _ = await create_sample_users(db)

    friendship = await send_friend_request(db, alice_id, bob_id)

    assert friendship["requester_id"] == alice_id
    assert friendship["addressee_id"] == bob_id
    assert friendship["status"] == "pending"


@pytest.mark.asyncio
async def test_send_friend_request_rejects_self_request(db):
    alice_id = await create_user(db, "alice", "alice@example.com", "password123")

    with pytest.raises(ValueError, match="Cannot send friend request to yourself"):
        await send_friend_request(db, alice_id, alice_id)


@pytest.mark.asyncio
async def test_send_friend_request_rejects_missing_requester(db):
    bob_id = await create_user(db, "bob", "bob@example.com", "password123")

    with pytest.raises(ValueError, match="Requester user not found"):
        await send_friend_request(db, 99999, bob_id)


@pytest.mark.asyncio
async def test_send_friend_request_rejects_missing_addressee(db):
    alice_id = await create_user(db, "alice", "alice@example.com", "password123")

    with pytest.raises(ValueError, match="Addressee user not found"):
        await send_friend_request(db, alice_id, 99999)


@pytest.mark.asyncio
async def test_send_friend_request_rejects_duplicate_same_direction(db):
    alice_id, bob_id, _ = await create_sample_users(db)
    await send_friend_request(db, alice_id, bob_id)

    with pytest.raises(ValueError, match="A friend request already exists"):
        await send_friend_request(db, alice_id, bob_id)


@pytest.mark.asyncio
async def test_send_friend_request_rejects_duplicate_reverse_direction(db):
    alice_id, bob_id, _ = await create_sample_users(db)
    await send_friend_request(db, alice_id, bob_id)

    with pytest.raises(ValueError, match="A friend request already exists"):
        await send_friend_request(db, bob_id, alice_id)


@pytest.mark.asyncio
async def test_send_friend_request_rejects_when_already_friends(db):
    alice_id, bob_id, _ = await create_sample_users(db)
    await send_friend_request(db, alice_id, bob_id)
    await accept_friend_request(db, bob_id, alice_id)

    with pytest.raises(ValueError, match="already friends"):
        await send_friend_request(db, alice_id, bob_id)


@pytest.mark.asyncio
async def test_accept_friend_request_marks_request_accepted(db):
    alice_id, bob_id, _ = await create_sample_users(db)
    await send_friend_request(db, alice_id, bob_id)

    updated_friendship = await accept_friend_request(db, bob_id, alice_id)

    assert updated_friendship is not None
    assert updated_friendship["status"] == "accepted"
    assert updated_friendship["requester_id"] == alice_id
    assert updated_friendship["addressee_id"] == bob_id


@pytest.mark.asyncio
async def test_accept_friend_request_rejects_when_missing(db):
    alice_id, bob_id, _ = await create_sample_users(db)

    with pytest.raises(ValueError, match="Friend request not found"):
        await accept_friend_request(db, bob_id, alice_id)


@pytest.mark.asyncio
async def test_accept_friend_request_rejects_when_not_pending(db):
    alice_id, bob_id, _ = await create_sample_users(db)
    await send_friend_request(db, alice_id, bob_id)
    await accept_friend_request(db, bob_id, alice_id)

    with pytest.raises(ValueError, match="Friend request is not pending"):
        await accept_friend_request(db, bob_id, alice_id)


@pytest.mark.asyncio
async def test_remove_friend_deletes_pending_request(db):
    alice_id, bob_id, _ = await create_sample_users(db)
    await send_friend_request(db, alice_id, bob_id)

    removed = await remove_friend(db, alice_id, bob_id)
    friendship = await get_friendship_between(db, alice_id, bob_id)

    assert removed is True
    assert friendship is None


@pytest.mark.asyncio
async def test_remove_friend_deletes_accepted_friendship(db):
    alice_id, bob_id, _ = await create_sample_users(db)
    await send_friend_request(db, alice_id, bob_id)
    await accept_friend_request(db, bob_id, alice_id)

    removed = await remove_friend(db, bob_id, alice_id)
    friendship = await get_friendship_between(db, alice_id, bob_id)

    assert removed is True
    assert friendship is None


@pytest.mark.asyncio
async def test_remove_friend_raises_when_missing(db):
    alice_id, bob_id, _ = await create_sample_users(db)

    with pytest.raises(ValueError, match="Friendship not found"):
        await remove_friend(db, alice_id, bob_id)


@pytest.mark.asyncio
async def test_get_friends_returns_only_accepted_friends(db):
    alice_id, bob_id, charlie_id = await create_sample_users(db)
    await send_friend_request(db, alice_id, bob_id)
    await accept_friend_request(db, bob_id, alice_id)
    await send_friend_request(db, alice_id, charlie_id)

    friends = await get_friends(db, alice_id)

    assert len(friends) == 1
    assert friends[0]["id"] == bob_id
    assert friends[0]["status"] == "accepted"


@pytest.mark.asyncio
async def test_get_friends_excludes_pending_requests(db):
    alice_id, bob_id, _ = await create_sample_users(db)
    await send_friend_request(db, alice_id, bob_id)

    friends = await get_friends(db, alice_id)

    assert friends == []


@pytest.mark.asyncio
async def test_get_friends_returns_empty_list_when_none(db):
    alice_id = await create_user(db, "alice", "alice@example.com", "password123")

    friends = await get_friends(db, alice_id)

    assert friends == []


@pytest.mark.asyncio
async def test_get_pending_requests_returns_received_pending_requests(db):
    alice_id, bob_id, charlie_id = await create_sample_users(db)
    await send_friend_request(db, alice_id, bob_id)
    await send_friend_request(db, charlie_id, bob_id)

    pending_requests = await get_pending_requests(db, bob_id)

    assert len(pending_requests) == 2
    pending_request_ids = {row["id"] for row in pending_requests}
    assert pending_request_ids == {alice_id, charlie_id}
    assert all(row["status"] == "pending" for row in pending_requests)


@pytest.mark.asyncio
async def test_get_pending_requests_excludes_sent_requests(db):
    alice_id, bob_id, _ = await create_sample_users(db)
    await send_friend_request(db, alice_id, bob_id)

    pending_requests = await get_pending_requests(db, alice_id)

    assert pending_requests == []


@pytest.mark.asyncio
async def test_get_pending_requests_excludes_accepted_requests(db):
    alice_id, bob_id, _ = await create_sample_users(db)
    await send_friend_request(db, alice_id, bob_id)
    await accept_friend_request(db, bob_id, alice_id)

    pending_requests = await get_pending_requests(db, bob_id)

    assert pending_requests == []


@pytest.mark.asyncio
async def test_get_pending_requests_returns_empty_list_when_none(db):
    alice_id = await create_user(db, "alice", "alice@example.com", "password123")

    pending_requests = await get_pending_requests(db, alice_id)

    assert pending_requests == []
