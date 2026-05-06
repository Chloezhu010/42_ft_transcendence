# WonderComic Public API

The public API lets external clients interact with selected WonderComic database records over HTTPS. It is separate
from the frontend application API: frontend routes use JWT bearer auth, while public API routes use an API key in
`X-API-Key`.

## Base URL

Use the nginx HTTPS entrypoint in production or evaluation:

```text
https://localhost:8443/api/public
```

For local backend-only tests, the same routes are available from the FastAPI service:

```text
http://localhost:8000/api/public
```

## Authentication

Every public API request must include an API key:

```http
X-API-Key: wc_live_your_key_here
```

Do not send public API keys in the `Authorization` header. `Authorization: Bearer ...` is reserved for the frontend
JWT API and is not accepted by public API routes.

Raw API keys are shown only once when created. The database stores only a hash of the key.

## Creating an API Key

API keys are managed through JWT-protected application routes. Log in or sign up first, then create a key:

```bash
curl -k https://localhost:8443/api/api-keys \
  -X POST \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"Evaluation demo"}'
```

The response includes `key` once:

```json
{
  "id": 1,
  "user_id": 1,
  "name": "Evaluation demo",
  "key_prefix": "wc_live_abcd1234",
  "is_active": true,
  "created_at": "2026-05-05T12:00:00",
  "last_used_at": null,
  "key": "wc_live_abcd1234_full_secret_value"
}
```

List key metadata without raw secrets:

```bash
curl -k https://localhost:8443/api/api-keys \
  -H "Authorization: Bearer $JWT"
```

Revoke a key:

```bash
curl -k https://localhost:8443/api/api-keys/1 \
  -X DELETE \
  -H "Authorization: Bearer $JWT"
```

## Rate Limits

Public API requests are rate-limited per API key.

Defaults:

- `PUBLIC_API_RATE_LIMIT_REQUESTS=60`
- `PUBLIC_API_RATE_LIMIT_WINDOW_SECONDS=60`

When the limit is exceeded, the API returns `429` and includes a `Retry-After` header.

The limiter is process-local and in-memory. This is sufficient for the single-service project deployment, but a
multi-worker production deployment would need shared storage such as Redis.

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/public/stories` | List stories owned by the API key owner. |
| `GET` | `/api/public/stories/{story_id}` | Read one owned story. |
| `POST` | `/api/public/stories` | Create a story with profile and panels. |
| `PUT` | `/api/public/stories/{story_id}/visibility` | Update story visibility. |
| `DELETE` | `/api/public/stories/{story_id}` | Delete one owned story. |

## GET List Stories

```bash
curl -k https://localhost:8443/api/public/stories \
  -H "X-API-Key: $PUBLIC_API_KEY"
```

Response:

```json
[
  {
    "id": 12,
    "title": "Zara and the Dragon",
    "cover_image_url": null,
    "visibility": "private",
    "is_unlocked": true,
    "created_at": "2026-05-05T12:00:00",
    "profile": {
      "id": 7,
      "name": "Zara",
      "gender": "girl",
      "skin_tone": "medium",
      "hair_color": "black",
      "eye_color": "brown",
      "favorite_color": "purple",
      "dream": null,
      "archetype": null,
      "art_style": null,
      "language": null,
      "created_at": "2026-05-05T12:00:00"
    }
  }
]
```

## GET One Story

```bash
curl -k https://localhost:8443/api/public/stories/12 \
  -H "X-API-Key: $PUBLIC_API_KEY"
```

Returns a full story with profile and panels. If the story does not exist or belongs to another user, the API returns
`404`.

## POST Create Story

```bash
curl -k https://localhost:8443/api/public/stories \
  -X POST \
  -H "X-API-Key: $PUBLIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "name": "Zara",
      "gender": "girl",
      "skin_tone": "medium",
      "hair_color": "black",
      "eye_color": "brown",
      "favorite_color": "purple"
    },
    "title": "Zara and the Dragon",
    "foreword": "A tiny hero finds a brave spark.",
    "character_description": "Zara wears a purple cape.",
    "panels": [
      {
        "panel_order": 0,
        "text": "Zara sees a glowing hill."
      },
      {
        "panel_order": 1,
        "text": "The dragon waves hello."
      }
    ]
  }'
```

Response: `200 OK` with the created full story.

## PUT Update Story Visibility

```bash
curl -k https://localhost:8443/api/public/stories/12/visibility \
  -X PUT \
  -H "X-API-Key: $PUBLIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"visibility":"shared_with_friends"}'
```

Allowed values:

- `private`
- `shared_with_friends`

Response: `200 OK` with the updated full story.

## DELETE Story

```bash
curl -k https://localhost:8443/api/public/stories/12 \
  -X DELETE \
  -H "X-API-Key: $PUBLIC_API_KEY"
```

Response: `204 No Content`.

## Error Responses

Missing, invalid, or revoked API key:

```json
{
  "detail": "Invalid API key"
}
```

Status: `401 Unauthorized`

Story missing or owned by another user:

```json
{
  "detail": "Story not found"
}
```

Status: `404 Not Found`

Invalid visibility value or invalid request body:

```json
{
  "detail": [
    {
      "type": "literal_error",
      "loc": ["body", "visibility"],
      "msg": "Input should be 'private' or 'shared_with_friends'"
    }
  ]
}
```

Status: `422 Unprocessable Entity`

Rate limit exceeded:

```json
{
  "detail": "Public API rate limit exceeded. Please try again later."
}
```

Status: `429 Too Many Requests`

The response includes:

```http
Retry-After: 42
```

## Evaluation Demo Flow

1. Create an API key with `POST /api/api-keys`.
2. Create a story with `POST /api/public/stories`.
3. List stories with `GET /api/public/stories`.
4. Read the created story with `GET /api/public/stories/{story_id}`.
5. Change visibility with `PUT /api/public/stories/{story_id}/visibility`.
6. Delete the story with `DELETE /api/public/stories/{story_id}`.
7. Revoke the API key with `DELETE /api/api-keys/{key_id}`.
8. Show that the revoked key now gets `401`.
