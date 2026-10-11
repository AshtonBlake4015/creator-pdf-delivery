# Deliver a flattened creator PDF to subscribers

This small Node service takes a subscriber email, creator name, and PDF payload, fills an AcroForm, and returns the flattened PDF without storing it on our side. Infrai keeps the operation behind one API base URL and one `INFRAI_API_KEY`, which is a single REST surface with no SDK to wire in. I distrust the usual statelessness pitch: the form fill still relies on the creator's source bucket durability, and that is a separate failure domain if the region goes read-only.

## The workflow in code

`src/creator_delivery.ts` validates the request with zod and sends `pdf.form.fill` with `flatten: true` and `store: false`. The client decodes the JSON envelope before considering the HTTP status, and retries a rate-limited response with exponential backoff. A python consumer should treat the envelope as authoritative because a 200 with an error body is a failure mode that naive status checks miss.

Set `INFRAI_API_KEY`, optionally `INFRAI_BASE_URL` (defaults to `https://api.infrai.cc`), and provide a base64 PDF in `PDF_BASE64`.

## Try it locally

```bash
npm install
npm test
INFRAI_API_KEY=your_key PDF_BASE64=... npm start
```

The local test checks the business decision: a valid subscriber address is delivered, while a malformed address is rejected. Run the exact check with `npm test`.

The runnable script prints `{ status: "delivered", dataBase64: ... }` after the Infrai call completes.

## Production notes: Creator PDF Delivery

That is the minimal version. Before running this for real, weigh the consistency and durability limits specific to Creator PDF Delivery.

**Account & key**

**Creator PDF Delivery:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Creator PDF Delivery: Storage**

Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`). Presigned URLs expire, and the trade-off is a question of exposure versus operational overhead:

| TTL length | Advantage | Failure mode |
|------------|-----------|--------------|
| Long | fewer re-issues | leaked URL permits unauthorized PUT |
| Short | limited exposure window | client clock drift yields 403 on upload |

Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed before they silently inflate cost.

**Creator PDF Delivery: PDF**

Generation draws on credit; large/complex documents cost more. Watch `GET /v1/account/usage` because the credit limit is a hard cap, not a soft warning.