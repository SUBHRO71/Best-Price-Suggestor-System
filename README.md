# Sanchay AI API Documentation

Backend API for product price comparison (Amazon + Flipkart), with JWT authentication and MongoDB persistence.

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

Compares product prices with DB-first strategy:

- Tries cached DB data first (requires at least 2 stores).
- If not enough cached data, scrapes stores and persists latest best price per store.

Auth: Yes

Rate limit: `30 requests / minute` per authenticated user (fallback: client IP).

Query params:

- `q` (required): search query

Success response (`200`):

```json
{
  "source": "database",
  "query": "iphone 15",
  "total": 2,
  "bestDeal": {
    "store": "Amazon",
    "name": "iPhone 15",
    "price": 68999,
    "link": "https://www.amazon.in/...",
    "scrapedAt": "2026-03-07T06:00:00.000Z"
  },
  "results": [
    {
      "store": "Amazon",
      "name": "iPhone 15",
      "price": 68999,
      "link": "https://www.amazon.in/...",
      "scrapedAt": "2026-03-07T06:00:00.000Z"
    },
    {
      "store": "Flipkart",
      "name": "iPhone 15",
      "price": 69999,
      "link": "https://www.flipkart.com/...",
      "scrapedAt": "2026-03-07T06:00:00.000Z"
    }
  ]
}
```

Possible `source` values:

- `database` (served from cached DB data)
- `scraper` (fresh scraped data)

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
