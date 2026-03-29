# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (hot reload)
npm run dev

# Build
npm run build

# Start production
npm start
```

No test suite is configured.

## Architecture

Multi-tenant Express.js REST API for order management and EPCIS supply chain integration.

**Stack**: Node.js + Express 5, TypeScript, MongoDB + Mongoose

**Layered structure**: `routes/` → `controllers/` → `src/models/` (Mongoose models), with `src/middleware/` for auth and `src/services/` for utilities. `src/db.ts` establishes the Mongoose connection, called once at startup in `src/index.ts`.

### Models (`src/models/`)

- **Tenant**: name, branding (primaryColor, secondaryColor, logo1, logo2), apiKey (auto-UUID)
- **User**: email, passwordHash, name, role (`admin`|`operator`), isActive, tenantId ref
- **Order**: orderNum, status, material, batch, bin, qty, tenantId ref
- **IntegrationMapping**: tenantId ref, sourceHeader, targetField — per-tenant CSV column mapping config

### Auth — two middleware strategies

- `authenticateTenant` — validates `x-api-key` header; used on integration/import routes
- `authenticateJWT` — validates `Bearer` JWT; used on user-facing routes (web/mobile). JWT payload: `{ userId, tenantId, role }`. `requireAdmin` guard checks `role === 'admin'`.

### Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | none | Self-serve tenant registration → JWT |
| POST | `/auth/login` | none | Email+password → JWT + tenant branding |
| POST | `/tenant` | none | Admin: create tenant with full branding |
| GET | `/tenant/settings` | API key | Tenant branding |
| POST | `/tenants/:tenantId/branding` | JWT | Upsert branding + logo upload (multipart) |
| GET | `/users` | JWT | List tenant users |
| POST | `/users` | JWT + admin | Create user |
| PATCH | `/users/:id` | JWT + admin | Update user |
| DELETE | `/users/:id` | JWT + admin | Deactivate user |
| POST | `/orders/import` | API key | CSV import with field mapping |
| GET | `/orders/export` | API key | Export as EPCIS 2.0 JSON-LD |
| POST | `/orders/mappings` | API key | Save CSV→field mapping |
| GET | `/orders/mappings` | API key | Get CSV→field mappings |

### Key Flows

1. **Tenant registration**: `POST /tenant` creates Tenant + first admin User in one request
2. **JSON Import** (web admin): upload JSON file (including SAP EWM OData format) → apply `MappingConfig` to translate columns → bulk insert Orders → create `ImportJob` record
3. **Picking/Packing** (mobile app): operator scans barcodes → scan events attach to Orders → Order status advances (`pending → scanned → processed`)
4. **EPCIS generation** (mobile app): triggered after a picking or packing operation is completed by the mobile app, not by the web admin. `GET /orders/export` exists but is a backend utility — do not surface it as a primary web admin feature.

> **Important**: EPCIS file generation is driven entirely by the **mobile application** after warehouse operators perform scan operations. The web admin integration module is only responsible for loading order data into the system. Do not conflate the import job lifecycle with EPCIS export.

### Environment variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `PORT` | HTTP port (default 3000) |
| `BASE_URL` | Base URL for constructing local file URLs (default `http://localhost:3000`) |
| `STORAGE_TYPE` | `local` (default) or `s3` |
| `S3_BUCKET` | S3 bucket name (prod) |
| `S3_REGION` | AWS region (default `us-east-1`) |
| `S3_ENDPOINT` | Override for MinIO / S3-compatible stores |
| `S3_ACCESS_KEY_ID` | S3 credentials |
| `S3_SECRET_ACCESS_KEY` | S3 credentials |
