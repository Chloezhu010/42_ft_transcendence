from dataclasses import dataclass
from typing import Literal

OAuthProvider = Literal["google"]


@dataclass
class NormalizedOAuthProfile:
    provider: OAuthProvider
    provider_user_id: str  # Google's stable unique ID ("sub" field)
    email: str
    email_verified: bool   # must be True before account linking is allowed
    display_name: str      # used as the initial username
