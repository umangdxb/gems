# Backend Changes Required: Import Job List

The Integration page in the admin UI fetches the list of past import jobs on load. The backend currently only exposes `GET /orders/jobs/:jobId` (single job status polling). A list endpoint is needed.

---

## New Endpoint: `GET /orders/jobs`

List all import jobs for the authenticated tenant, newest first.

### Request
```
GET /orders/jobs?page=1&limit=20
Authorization: Bearer <token>
```

| Query param | Type | Default | Notes |
|---|---|---|---|
| `page` | number | 1 | 1-indexed |
| `limit` | number | 20 | Max 100 |
| `status` | string | — | Optional filter: `pending`, `processing`, `done`, `failed` |

### Response `200 OK`
```json
{
  "jobs": [
    {
      "_id": "abc123",
      "filename": "WarehouseTasks_March.json",
      "status": "done",
      "rowCount": 211,
      "createdAt": "2026-03-28T10:00:00.000Z",
      "processedAt": "2026-03-28T10:00:05.000Z"
    },
    {
      "_id": "def456",
      "filename": "WarehouseTasks_April.json",
      "status": "failed",
      "rowCount": 0,
      "error": "mapping.orderNumber is required",
      "createdAt": "2026-03-28T09:00:00.000Z"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

### Implementation (orderController.ts)

```ts
export const listImportJobs = async (req: Request, res: Response) => {
  const tenantId = req.tenant!._id
  const page  = Math.max(1, parseInt(req.query['page'] as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20))
  const status = req.query['status'] as string | undefined

  const filter: Record<string, unknown> = { tenantId }
  if (status && ['pending','processing','done','failed'].includes(status)) {
    filter['status'] = status
  }

  const [jobs, total] = await Promise.all([
    ImportJob.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ImportJob.countDocuments(filter),
  ])

  res.json({ jobs, total, page, limit })
}
```

### Route to add (orderRoutes.ts)

```ts
router.get('/jobs', authenticateJWT, listImportJobs)
```

> Note: Add this **before** `router.get('/jobs/:jobId', ...)` to avoid the `:jobId` wildcard swallowing the `/jobs` path.

---

## Export endpoint note

The current `GET /orders/export` returns **all orders** for the tenant as EPCIS XML. The UI's "Export EPCIS" button on a completed job calls this global endpoint. If per-job export is needed in future, add:

```
GET /orders/jobs/:jobId/export   → EPCIS XML scoped to orders from that import job
```

This requires storing `jobId` on each `Order` document and filtering by it.
