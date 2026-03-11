# Sanchay AI API Documentation

Backend API for product price comparison (Amazon + Flipkart), with JWT authentication and MongoDB persistence.

Catalog retention:

- Search/comparison cache data in `Product` and `Price` is treated as temporary catalog cache.
- Cached catalog rows expire on a 7-day window aligned with the refresh-token lifetime.
- A backend cleanup job runs every 15 minutes and deletes expired catalog data, while preserving products referenced by user wishlists.

## Base URL

- Local: `http://localhost:5000`
- API prefix: `/api`

Example full URL: `http://localhost:5000/api/auth/register`

## Authentication

Protected endpoints require:

`Authorization: Bearer <accessToken>`

Public (no-token) endpoints are:

- `GET /`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

## Environment Variables

Backend uses these environment variables:

- `PORT` (optional, default `5000`)
- `MONGO_URI` (required)
- `JWT_ACCESS_SECRET` (recommended)
- `JWT_REFRESH_SECRET` (required for refresh flow)
- `CHROME_EXECUTABLE_PATH` (optional, used by Flipkart scraper)

## Health Endpoint

### `GET /`

Returns API status text.

Response:

```json
"Price Comparison API Running"
```

## API Endpoints

### Auth

#### `POST /api/auth/register`

Register a new user.

Auth: No

Request body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "strongpassword"
}
```

Success response (`201`):

```json
{
  "message": "Registration successful. You can now log in.",
  "user": {
    "id": "65f...",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

Errors:

- `400` missing required fields
- `409` user already exists
- `500` server error

#### `POST /api/auth/login`

Login and receive tokens.

Auth: No

Request body:

```json
{
  "email": "john@example.com",
  "password": "strongpassword"
}
```

Success response (`200`):

```json
{
  "message": "Login successful",
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "65f...",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

Errors:

- `400` missing email/password
- `401` invalid credentials
- `500` server error

#### `POST /api/auth/refresh`

Generate fresh access + refresh tokens using a valid refresh token.

Auth: No

Request body:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Success response (`200`):

```json
{
  "accessToken": "new-jwt-access-token",
  "refreshToken": "new-jwt-refresh-token"
}
```

Errors:

- `400` missing refresh token
- `401` invalid or expired refresh token

### Internal Services

Scraping and database persistence are internal-only and are not exposed as public HTTP endpoints.

### Comparison

All comparison endpoints are protected.

#### `GET /api/search?q=<query>`

Returns a product-list search response with DB-first backfill:

- Serves cached generic product matches from MongoDB first.
- Deduplicates repeated products before returning them.
- Search results are store-agnostic; store comparison is deferred to `/api/compare` after a product is selected.
- If fewer than 10 cached matches exist, scrapes stores and appends only non-duplicate products until the response reaches 10 items or store results are exhausted.

Auth: Yes

Rate limit: `30 requests / minute` per authenticated user (fallback: client IP).

Query params:

- `q` (required): search query

Success response (`200`):

```json
{
  "source": "hybrid",
  "query": "iphone 15",
  "total": 10,
  "bestDeal": {
    "name": "Apple iPhone 15 (Black, 128 GB)",
    "price": 68999,
    "link": null,
    "scrapedAt": "2026-03-07T06:00:00.000Z"
  },
  "results": [
    {
      "name": "Apple iPhone 15 (Black, 128 GB)",
      "price": 68999,
      "link": null,
      "scrapedAt": "2026-03-07T06:00:00.000Z"
    },
    {
      "name": "Apple iPhone 15 (Pink, 128 GB)",
      "price": 69499,
      "link": null,
      "scrapedAt": "2026-03-07T06:00:00.000Z"
    }
  ]
}
```

Possible `source` values:

- `database` (all returned items came from cached DB data)
- `scraper` (all returned items came from fresh scraping)
- `hybrid` (cached DB data was backfilled with fresh scraped items)

Errors:

- `400` missing query parameter
- `429` too many requests
- `401` missing/invalid access token
- `404` no comparable results found
- `500` server error

#### `GET /api/compare?q=<query>`

Always performs fresh scraping comparison (does not DB-short-circuit first), then persists best price per store.

Auth: Yes

Rate limit: `30 requests / minute` per authenticated user (fallback: client IP).

Query params:

- `q` (required): search query

Success response (`200`): same structure as `/api/search`.

Errors:

- `400` missing query parameter
- `429` too many requests
- `401` missing/invalid access token
- `404` no comparable results found
- `500` server error

## Common Error Shape

Most server errors return:

```json
{
  "error": "Error message"
}
```

Auth-related errors typically return:

```json
{
  "message": "Invalid or expired access token"
}
```

## Run Locally

From `Backend/`:

```bash
npm install
npm run dev
```

Or:

```bash
npm start
```
