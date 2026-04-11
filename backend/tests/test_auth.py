import os
from datetime import UTC, datetime

import jwt
import pytest
from jwt.exceptions import InvalidTokenError

from auth_utils import ALGORITHM, create_access_token, hash_password, verify_password

JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]


# --- hash_password ---


def test_hash_password_returns_string():
    assert isinstance(hash_password("mypassword"), str)


def test_hash_is_not_plaintext():
    assert hash_password("mypassword") != "mypassword"


def test_hash_starts_with_bcrypt_prefix():
    # bcrypt hashes always start with $2b$
    assert hash_password("mypassword").startswith("$2b$")


def test_hash_is_different_each_time():
    # bcrypt generates a random salt per call
    assert hash_password("mypassword") != hash_password("mypassword")


def test_hash_empty_string():
    # empty string is a valid (if bad) password — should not raise
    h = hash_password("")
    assert isinstance(h, str)


def test_hash_long_password():
    with pytest.raises(ValueError, match="longer than 72 bytes"):
        hash_password("a" * 100)  # bcrypt has a max input length of 72 bytes


def test_hash_special_characters():
    h = hash_password("p@$$w0rd!#%^&*()")
    assert isinstance(h, str)


# --- verify_password ---


def test_verify_correct_password():
    h = hash_password("secret123")
    assert verify_password("secret123", h) is True


def test_verify_wrong_password():
    h = hash_password("secret123")
    assert verify_password("wrongpassword", h) is False


def test_verify_empty_password_against_hash():
    h = hash_password("notempty")
    assert verify_password("", h) is False


def test_verify_correct_empty_password():
    h = hash_password("")
    assert verify_password("", h) is True


def test_verify_case_sensitive():
    h = hash_password("Password")
    assert verify_password("password", h) is False
    assert verify_password("PASSWORD", h) is False


def test_verify_special_characters():
    h = hash_password("p@$$w0rd!#%^&*()")
    assert verify_password("p@$$w0rd!#%^&*()", h) is True
    assert verify_password("p@$$w0rd", h) is False


def test_verify_whitespace_matters():
    h = hash_password("pass word")
    assert verify_password("pass word", h) is True
    assert verify_password("password", h) is False


# --- create_access_token ---


def test_token_is_string():
    assert isinstance(create_access_token(1), str)


def test_token_has_three_parts():
    # JWT format: header.payload.signature
    assert len(create_access_token(1).split(".")) == 3


def test_token_sub_is_user_id_as_string():
    token = create_access_token(42)
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "42"


def test_token_sub_for_user_id_1():
    token = create_access_token(1)
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "1"


def test_token_has_exp_claim():
    token = create_access_token(1)
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
    assert "exp" in payload


def test_token_exp_is_in_the_future():
    token = create_access_token(1)
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
    now = datetime.now(UTC).timestamp()
    assert payload["exp"] > now


def test_token_exp_is_roughly_24h():
    token = create_access_token(1)
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
    now = datetime.now(UTC).timestamp()
    hours = (payload["exp"] - now) / 3600
    assert 23 < hours <= 24  # allow slight timing slack


def test_different_users_get_different_tokens():
    assert create_access_token(1) != create_access_token(2)


def test_token_signed_with_correct_secret():
    token = create_access_token(7)
    # should decode without raising
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "7"


def test_token_invalid_with_wrong_secret():
    token = create_access_token(7)
    with pytest.raises(InvalidTokenError):
        jwt.decode(token, "wrong-secret-key-that-is-long-enough-for-hs256", algorithms=[ALGORITHM])


def test_token_invalid_if_tampered():
    token = create_access_token(1)
    # tamper with the payload (middle) section
    parts = token.split(".")
    payload = parts[1]
    tampered_payload = payload[:-1] + ("A" if payload[-1] != "A" else "B")
    tampered = f"{parts[0]}.{tampered_payload}.{parts[2]}"
    with pytest.raises(InvalidTokenError):
        jwt.decode(tampered, JWT_SECRET_KEY, algorithms=[ALGORITHM])
