# QR SaaS — API Reference

**Base URL** — set via `APP_BASE_URL` env var (e.g. `http://localhost:4000`)

**Authentication** — protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <token>
```
Tokens are returned by `/auth/register` and `/auth/login`. They are signed JWTs valid for **7 days**.

**Errors** — all errors return:
```json
{ "error": "Human-readable message" }
```
with HTTP status `400` (validation / business logic) or `401` (missing/invalid token).

---

## Auth

### POST /auth/register

Creates a new tenant and owner account in one step. Returns a token — no separate login needed.

**No auth required.**

**Request body**
```json
{
  "tenantName": "Acme Corp",
  "tenantSlug": "acme",
  "email": "owner@acme.com",
  "password": "secret123"
}
```

| Field | Type | Rules |
|---|---|---|
| `tenantName` | string | min 2 chars |
| `tenantSlug` | string | min 2 chars, must be unique |
| `email` | string | valid email, must be unique |
| `password` | string | min 6 chars |

**Response `200`**
```json
{
  "tenant": {
    "id": "cm...",
    "name": "Acme Corp",
    "slug": "acme",
    "plan": "free",
    "status": "active",
    "createdAt": "2026-05-02T10:00:00.000Z",
    "users": [
      {
        "id": "cm...",
        "tenantId": "cm...",
        "email": "owner@acme.com",
        "passwordHash": "<bcrypt hash>",
        "role": "owner",
        "createdAt": "2026-05-02T10:00:00.000Z"
      }
    ]
  },
  "user": {
    "id": "cm...",
    "tenantId": "cm...",
    "email": "owner@acme.com",
    "passwordHash": "<bcrypt hash>",
    "role": "owner",
    "createdAt": "2026-05-02T10:00:00.000Z"
  },
  "token": "eyJhbGci..."
}
```

---

### POST /auth/login

**No auth required.**

**Request body**
```json
{
  "email": "owner@acme.com",
  "password": "secret123"
}
```

**Response `200`**
```json
{
  "user": {
    "id": "cm...",
    "tenantId": "cm...",
    "email": "owner@acme.com",
    "passwordHash": "<bcrypt hash>",
    "role": "owner",
    "createdAt": "2026-05-02T10:00:00.000Z"
  },
  "tenant": {
    "id": "cm...",
    "name": "Acme Corp",
    "slug": "acme",
    "plan": "free",
    "status": "active",
    "createdAt": "2026-05-02T10:00:00.000Z"
  },
  "token": "eyJhbGci..."
}
```

---

## QR Codes

All `/qr-codes` endpoints require **Bearer auth**. All operations are scoped to the authenticated tenant — you can only see and modify your own QR codes.

### QrCode object

```ts
{
  id: string               // CUID
  tenantId: string
  name: string
  slug: string             // internal unique slug
  type: "dynamic" | "static"
  targetUrl: string        // the destination URL
  shortPath: string        // used in the redirect URL: /r/<shortPath>
  status: "active" | "archived" | "disabled"
  designJson: DesignJson | null
  imageUrl: string | null  // base64 data URL of the QR image preview
  createdBy: string | null // userId of creator
  createdAt: string        // ISO 8601
  updatedAt: string        // ISO 8601
}
```

**DesignJson shape**
```ts
{
  contentType?: string
  design?: {
    style?: "square" | "dots" | "rounded"  // dot pattern style
    colorDark?: string    // hex, e.g. "#000000"
    colorLight?: string   // hex, e.g. "#ffffff"
    logo?: string         // base64 data URL or https:// URL
  }
}
```

**Dynamic vs Static**
- `dynamic` — QR encodes `/r/<shortPath>`; target URL can be changed later without reprinting the QR
- `static` — QR encodes `targetUrl` directly; target URL is permanent

---

### GET /qr-codes

List all QR codes for the tenant, newest first. Includes a scan count per QR code.

**Response `200`** — array of QrCode objects, each with an extra `_count` field:
```json
[
  {
    "id": "cm...",
    "name": "Product Landing Page",
    "type": "dynamic",
    "targetUrl": "https://example.com/product",
    "shortPath": "aB3xK",
    "status": "active",
    "designJson": null,
    "imageUrl": "data:image/png;base64,...",
    "createdAt": "2026-05-02T10:00:00.000Z",
    "updatedAt": "2026-05-02T10:00:00.000Z",
    "_count": { "scanEvents": 42 }
  }
]
```

---

### POST /qr-codes

Create a new QR code. A preview image (`imageUrl`) is generated automatically.

**Request body**
```json
{
  "name": "Product Landing Page",
  "targetUrl": "https://example.com/product",
  "type": "dynamic",
  "designJson": {
    "design": {
      "style": "rounded",
      "colorDark": "#1a1a2e",
      "colorLight": "#ffffff",
      "logo": "https://example.com/logo.png"
    }
  }
}
```

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, min 1 char |
| `targetUrl` | string | required, valid URL |
| `type` | `"dynamic"` \| `"static"` | optional, default `"dynamic"` |
| `designJson` | object | optional |

**Response `200`** — QrCode object (no `_count`).

---

### GET /qr-codes/:id

Get a single QR code by ID.

**Response `200`** — QrCode object.

**Errors**
- `400 { "error": "QR code not found" }` — wrong ID or belongs to another tenant

---

### PATCH /qr-codes/:id

Update a QR code. All fields are optional — only send what you want to change.

**Request body**
```json
{
  "name": "New Name",
  "targetUrl": "https://example.com/new-product",
  "status": "archived",
  "designJson": {
    "design": {
      "style": "dots",
      "colorDark": "#333333"
    }
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `name` | string | optional |
| `targetUrl` | string (URL) | optional — **ignored for static QR codes** |
| `status` | `"active"` \| `"archived"` \| `"disabled"` | optional |
| `designJson` | object | optional |

**Response `200`** — updated QrCode object.

**Errors**
- `400 { "error": "Static QR target URL cannot be edited" }`
- `400 { "error": "QR code not found" }`

---

### GET /qr-codes/:id/image

Download the QR code as a high-resolution PNG (800×800px). Respects the current `designJson` (style, colors, logo).

**Response `200`**
- `Content-Type: image/png`
- `Content-Disposition: inline; filename="qr-<id>.png"`
- Body: raw PNG binary

**Frontend tip** — to trigger a download:
```ts
const res = await fetch(`/qr-codes/${id}/image`, {
  headers: { Authorization: `Bearer ${token}` },
});
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `qr-${id}.png`;
a.click();
```

---

### DELETE /qr-codes/:id

Permanently deletes the QR code and all its scan history (cascade).

**Response `200`**
```json
{ "success": true }
```

**Errors**
- `400 { "error": "QR code not found" }`

---

## Analytics

All `/analytics` endpoints require **Bearer auth** and are scoped to the authenticated tenant.

---

### GET /analytics/summary

High-level counts for the tenant's dashboard.

**Response `200`**
```json
{
  "totalScans": 1234,
  "totalQrCodes": 15
}
```

---

### GET /analytics/qr/:id

Detailed analytics for a specific QR code — total scan count plus the 20 most recent scan events with geo and device data.

**Response `200`**
```json
{
  "qrCodeId": "cm...",
  "totalScans": 42,
  "recentScans": [
    {
      "createdAt": "2026-05-02T10:00:00.000Z",
      "browser": "Chrome",
      "os": "Android",
      "deviceType": "mobile",
      "referer": "https://instagram.com",
      "country": "US",
      "city": "New York",
      "latitude": 40.7128,
      "longitude": -74.006
    }
  ]
}
```

**Scan event fields**

| Field | Type | Notes |
|---|---|---|
| `createdAt` | ISO 8601 string | scan timestamp |
| `browser` | string \| null | e.g. `"Chrome"`, `"Safari"` |
| `os` | string \| null | e.g. `"Android"`, `"iOS"`, `"Windows"` |
| `deviceType` | string \| null | `"mobile"`, `"tablet"`, or `"desktop"` |
| `referer` | string \| null | HTTP Referer header, if present |
| `country` | string \| null | ISO 3166-1 alpha-2 code, e.g. `"US"`, `"GB"` |
| `city` | string \| null | city name, e.g. `"New York"` |
| `latitude` | number \| null | city-level approximate latitude |
| `longitude` | number \| null | city-level approximate longitude |

> **Note on coordinates:** latitude/longitude are derived from IP geolocation (city-level accuracy, ~25–50 km radius). They are `null` for localhost, private IPs, or unrecognised IPs.

---

## Redirect (public)

### GET /r/:shortPath

The URL embedded in every **dynamic** QR code. When scanned, it:
1. Looks up the QR code by `shortPath`
2. Records a scan event (device, browser, OS, geo-location)
3. Redirects (`302`) to the QR code's `targetUrl`

**No auth required.**

Returns `404` plain text if the `shortPath` is unknown or the QR code status is not `"active"`.

---

## Health Check

### GET /health

**No auth required.**

**Response `200`**
```json
{ "ok": true }
```

---

## Quick-start example (fetch)

```ts
const BASE = "https://your-api.up.railway.app";

// 1. Login
const { token } = await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "owner@acme.com", password: "secret123" }),
}).then(r => r.json());

// 2. List QR codes
const qrCodes = await fetch(`${BASE}/qr-codes`, {
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.json());

// 3. Create a QR code
const newQr = await fetch(`${BASE}/qr-codes`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    name: "My Campaign",
    targetUrl: "https://example.com",
  }),
}).then(r => r.json());

// 4. Get analytics
const analytics = await fetch(`${BASE}/analytics/qr/${newQr.id}`, {
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.json());
```
