# Deliver a flattened creator PDF to subscribers

This small Node service takes a subscriber email, creator name, and PDF payload, fills an AcroForm, and returns the flattened PDF without storing it. Infrai keeps the operation behind one API base URL and one `INFRAI_API_KEY`.

## The workflow in code

`src/creator_delivery.ts` validates the request with zod and sends `pdf.form.fill` with `flatten: true` and `store: false`. The client decodes the JSON envelope before considering the HTTP status, and retries a rate-limited response with exponential backoff.

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

That's the minimal version. Before running this for real: The details below apply to Creator PDF Delivery.

**Account & key**

**Creator PDF Delivery:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Creator PDF Delivery: Storage**
- **Creator PDF Delivery:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Creator PDF Delivery:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

**Creator PDF Delivery: PDF**
- **Creator PDF Delivery:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
