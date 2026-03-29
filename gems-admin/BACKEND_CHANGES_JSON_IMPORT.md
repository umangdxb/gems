# Backend Changes Required: JSON Import Support

This document outlines the backend changes needed to support the JSON-based integration module in the GEMS Admin Portal.

---

## 1. Import Endpoint — Accept JSON

### Current (assumed)
`POST /orders/import` accepts CSV or Excel via `multipart/form-data`.

### Required
Accept **JSON** files. The uploaded file will be a `.json` that may be:
- A root-level array: `[{ ... }, { ... }]`
- An OData/SAP wrapper: `{ "@odata.context": "...", "value": [{ ... }, { ... }] }`
- A single object: `{ ... }`

The UI sends the raw JSON file as a `multipart/form-data` upload with the file field named `file`.

### Request body
```
POST /orders/import
Content-Type: multipart/form-data

file: <JSON file>
mapping: JSON string of MappingConfig (see §2)
```

### MappingConfig (sent as JSON string)
```json
{
  "orderNumber": "WarehouseTask",
  "materialBatch": "Batch",
  "sourceBin": "SourceStorageBin",
  "quantity": "TargetQuantityInBaseUnit"
}
```

### Processing logic
1. Parse the uploaded JSON file.
2. Extract the records array (unwrap `value[]` if present).
3. For each record, apply the mapping — read `record[mapping.orderNumber]`, `record[mapping.materialBatch]`, etc.
4. Map to internal field names (see §2) and persist.

---

## 2. Field Name Mapping (Frontend → Backend)

| UI MappingConfig key | Backend field name | Notes |
|---|---|---|
| `orderNumber` | `orderNum` | Required — reject import if absent or null |
| `materialBatch` | `batch` | Optional |
| `sourceBin` | `bin` | Optional |
| `quantity` | `qty` | Optional — should be stored as a number |

---

## 3. Import Response

```json
{
  "jobId": "abc123",
  "status": "pending",
  "rowCount": 211,
  "filename": "WarehouseTasks_March.json"
}
```

The UI polls or displays status based on job lifecycle: `pending → processing → done | failed`.

---

## 4. Job Status Endpoint (optional, for polling)

```
GET /orders/jobs/:jobId
```

Response:
```json
{
  "jobId": "abc123",
  "status": "done",
  "rowCount": 211,
  "processedAt": "2026-03-28T10:00:00.000Z"
}
```

---

## 5. Saved Mappings (Phase 2)

To avoid users re-mapping every time, store and retrieve the last-used mapping per tenant.

```
POST /orders/mappings        — save a mapping config
GET  /orders/mappings        — list saved mappings for tenant
DELETE /orders/mappings/:id  — remove a saved mapping
```

---

## 6. Sample SAP/EWM JSON Shape

The UI is designed around SAP EWM OData responses. Key fields from a typical record:

```json
{
  "WarehouseTask": "100000701",
  "WarehouseOrder": "702",
  "Batch": "BATCH-A1",
  "SourceStorageBin": "Y910.01",
  "TargetQuantityInBaseUnit": 50,
  "Product": "41",
  "StorageType": "WA",
  "HandlingUnitInternalID": "",
  ...
}
```

Auto-suggest in the UI will pre-fill the mapping for these field names automatically.
