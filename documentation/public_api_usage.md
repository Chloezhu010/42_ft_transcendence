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

1. Log in to the app and navigate to `/api-keys`.
2. Click **Generate API Key**, give it a name, and copy the key shown — it is displayed only once.
3. To revoke a key, click **Revoke** next to it on the same page.

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
| `POST` | `/api/public/stories` | Create a story manually with profile and panels (no AI). |
| `POST` | `/api/public/stories/preview` | AI-generate a script preview (no DB write, no images). |
| `POST` | `/api/public/stories/generate` | AI-generate full story with images and save to DB. |
| `PUT` | `/api/public/stories/{story_id}/visibility` | Update story visibility. |
| `DELETE` | `/api/public/stories/{story_id}` | Delete one owned story. |

## GET List Stories

```bash
curl -k https://localhost:8443/api/public/stories \
  -H "X-API-Key: $PUBLIC_API_KEY" | jq
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
  -H "X-API-Key: $PUBLIC_API_KEY" | jq
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

## POST Preview Story (AI)

Generates a story script from a kid profile and returns it without saving anything. Use this to show the user a preview before committing to image generation, which is slow and billed.

```bash
curl -k https://localhost:8443/api/public/stories/preview \
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
      "favorite_color": "purple",
      "dream": "to befriend dragons",
      "art_style": "watercolor"
    }
  }'
```

Response (`200 OK`):

```json
{
  "title": "Zara and the Friendly Dragon",
  "foreword": "A tiny hero finds a brave spark.",
  "characterDescription": "Zara is a girl with medium skin, black hair, brown eyes, wearing a purple cape...",
  "coverImagePrompt": "Zara stands on a glowing hill with a purple dragon...",
  "panels": [
    {"id": "1", "text": "Zara sees a glowing hill at dusk.", "imagePrompt": "..."},
    {"id": "2", "text": "A friendly dragon waves hello.", "imagePrompt": "..."}
  ]
}
```

No story is created in the database — call `POST /api/public/stories/generate` next if the preview looks good.

## POST Generate Full Story (AI + Images, Saves to DB)

Runs the complete pipeline: generate script → generate cover image → generate every panel image → save to DB. This call can take 30–90 seconds depending on the number of panels.

```bash
curl -k https://localhost:8443/api/public/stories/generate \
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
      "favorite_color": "purple",
      "dream": "to befriend dragons",
      "art_style": "watercolor"
    }
  }'
```

Response (`200 OK`):

```json
{
  "story": {
    "id": 13,
    "title": "Zara and the Friendly Dragon",
    "foreword": "A tiny hero finds a brave spark.",
    "character_description": "...",
    "cover_image_prompt": "...",
    "cover_image_url": "/api/static/images/...",
    "visibility": "private",
    "is_unlocked": true,
    "created_at": "2026-05-08T12:00:00",
    "updated_at": "2026-05-08T12:00:00",
    "profile": { "...": "..." },
    "panels": [
      {"id": 71, "panel_order": 0, "text": "...", "image_prompt": "...", "image_url": "/api/static/images/..."}
    ]
  }
}
```

Errors specific to AI endpoints (`/preview` and `/generate`):

```json
{ "detail": "Story generation failed" }
```
Status: `500 Internal Server Error` — Gemini script generation failed.

```json
{ "detail": "Image generation failed" }
```
Status: `500 Internal Server Error` — Gemini image generation failed mid-pipeline.

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
curl -k https://localhost:8443/api/public/stories/11 \
  -X DELETE \
  -H "X-API-Key: $PUBLIC_API_KEY"
```

Response: `204 No Content`.

## Error Responses

Missing `X-API-Key` header:

```json
{ "detail": "Missing API key" }
```

Status: `401 Unauthorized`

Invalid or revoked API key:

```json
{ "detail": "Invalid API key" }
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

The recommended demo mirrors how the web UI builds a story: **preview first, then commit**.

### Using the Swagger UI (easiest)

1. Open `https://localhost:8443/docs` in a browser.
2. Create an API key via the `/api-keys` page in the app, then copy it.
3. Click **Authorize** at the top of the Swagger page, paste the key into the `X-API-Key` field, and confirm.
4. Run the endpoints in the order shown in the curl flow below directly from the Swagger UI.

### Using curl — AI preview-then-generate flow

```bash
export PUBLIC_API_KEY="wc_live_..."   # key from /api-keys page

PROFILE='{
  "profile": {
    "name":"Alex","gender":"neutral","skin_tone":"light",
    "hair_color":"brown","eye_color":"green","favorite_color":"blue",
    "dream":"to explore the stars","art_style":"watercolor"
  }
}'

# 1. Preview — fast, no DB write, lets the user judge the script
curl -sk https://localhost:8443/api/public/stories/preview \
  -X POST -H "X-API-Key: $PUBLIC_API_KEY" -H "Content-Type: application/json" \
  -d "$PROFILE" | python3 -m json.tool

# 2. Generate full story with images and save (slow: 30–90s)
STORY_ID=$(curl -sk https://localhost:8443/api/public/stories/generate \
  -X POST -H "X-API-Key: $PUBLIC_API_KEY" -H "Content-Type: application/json" \
  -d "$PROFILE" | python3 -c "import sys,json; print(json.load(sys.stdin)['story']['id'])")
echo "created story id=$STORY_ID"

# 3. List stories
curl -k https://localhost:8443/api/public/stories \
  -H "X-API-Key: $PUBLIC_API_KEY"

# 4. Read the saved story (full panels with image URLs)
curl -k https://localhost:8443/api/public/stories/$STORY_ID \
  -H "X-API-Key: $PUBLIC_API_KEY"

# 5. Update visibility
curl -k https://localhost:8443/api/public/stories/$STORY_ID/visibility \
  -X PUT -H "X-API-Key: $PUBLIC_API_KEY" -H "Content-Type: application/json" \
  -d '{"visibility":"shared_with_friends"}'

# 6. Delete the story
curl -k https://localhost:8443/api/public/stories/$STORY_ID \
  -X DELETE -H "X-API-Key: $PUBLIC_API_KEY"

# 7. Revoke the key from the /api-keys page in the UI, then confirm 401
curl -k https://localhost:8443/api/public/stories \
  -H "X-API-Key: $PUBLIC_API_KEY"
```

### Manual create (no AI)

If Gemini is unavailable during evaluation, fall back to the manual `POST /api/public/stories` path with a hand-written profile and panels (no images):

```bash
curl -k https://localhost:8443/api/public/stories \
  -X POST -H "X-API-Key: $PUBLIC_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "profile": {"name":"Alex","gender":"neutral","skin_tone":"light","hair_color":"brown","eye_color":"green","favorite_color":"blue"},
    "title": "Alex and the Stars",
    "panels": [{"panel_order":0,"text":"Alex looked up at the night sky."}]
  }'
```
