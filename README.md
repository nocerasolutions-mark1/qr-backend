# QR SaaS Starter (Node.js + TypeScript + Prisma)

A minimal multi-tenant QR code SaaS backend with:
- tenant and user auth
- QR code CRUD
- dynamic redirects
- scan analytics
- PNG/SVG QR generation

## Quick start

1. Install dependencies
   ```bash
   npm install
   ```
2. Copy env file
   ```bash
   cp .env.example .env
   ```
3. Create PostgreSQL database and update `DATABASE_URL`
4. Generate Prisma client
   ```bash
   npm run prisma:generate
   ```
5. Push schema
   ```bash
   npm run prisma:push
   ```
6. Start dev server
   ```bash
   npm run dev
   ```

## Endpoints
- `POST /auth/register`
- `POST /auth/login`
- `GET /qr-codes`
- `POST /qr-codes`
- `PATCH /qr-codes/:id`
- `GET /analytics/summary`
- `GET /r/:shortPath`
- `GET /health`

## Notes
- For production, add proper rate limiting, CSRF/session strategy for web frontend, audit logs, object storage for assets, Stripe billing, and GeoIP enrichment.
- This starter uses JWT bearer auth for simplicity.
