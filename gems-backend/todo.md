# Backend TODOs

## Auth & Tenant Management
- [x] Tenant registration endpoint (self-serve via Admin Portal)
- [x] User model: link users to tenants with roles (admin, operator)
- [x] User CRUD endpoints (add/edit/deactivate users per tenant)
- [x] Auth: JWT-based login (username/password) for web and mobile

## Theming
- [x] Endpoint to fetch tenant theme/branding by tenant ID or API key
- [x] PATCH /tenant/settings to update branding colors and logos (Base64)
- [ ] Support provisioning two logos simultaneously per tenant (uploading as files via multipart)

## Integration Module (CSV/Excel Inbound)
- [x] File upload endpoint: accept CSV and Excel (.xlsx) files via multipart
- [x] Parse and load orders from uploaded file into DB
- [x] Field mapping: per-tenant configuration of source column → Order field
- [ ] AI-based mapping: given a sample file, auto-suggest column mappings to target Order schema
- [ ] Read WSDL / API doc to infer mapping (7 Mar requirement — design approach TBD)
- [ ] Bulk file load: accept multiple files in one operation, list them as processed jobs

## Orders
- [x] Order list endpoint: return orders for tenant (paginated, filterable by status)
- [x] Order detail endpoint
- [x] Order status lifecycle: pending → scanned → processed (PATCH /orders/:id/status)
- [ ] Scan update endpoint: receive scan event (from Scandit) and attach scanned data to an existing order

## Outbound / Export
- [x] EPCIS 2.0 JSON export (GET /orders/export)
- [ ] CSV export of processed orders
- [ ] Support custom outbound structure per tenant (configurable — 7 Mar requirement)

## Scandit Integration
- [ ] Define API contract: how mobile sends scan results to backend (barcode value + order reference)
- [ ] Endpoint to receive and store scan events linked to orders
- [ ] Validate/confirm Scandit SDK API key handling on backend side

## Infrastructure
- [ ] Set up MongoDB Atlas (or hosted instance) for dev/staging/prod
- [ ] Environment-based config (dev/staging/prod)
- [ ] Android deployment target: ensure backend is reachable from deployed Android app (HTTPS, CORS)
