# Common Thread frontend

React + Vite frontend for the existing Express/MongoDB marketplace. The frontend consumes the backend API and does not add or modify backend routes.

## Run locally

1. Start MongoDB and the backend from `backend/`.
2. In `frontend/`, copy `.env.example` to `.env` if either service uses a different URL, then set `VITE_API_BASE_URL` and `VITE_AI_SERVICE_URL`.
3. Run:

   ```powershell
   npm install
   npm run dev
   ```

4. Optionally start the AI service using the instructions in `ai-service/README.md`. Open the local Vite URL. The existing backend currently enables permissive CORS.

## Existing API integration

The UI uses `/api/products` and `/api/products/:id`; customer auth at `/api/customers/register` and `/api/customers/login`; artisan auth at `/api/auth/register`, `/api/auth/login`, and `/api/auth/check`; customer cart operations at `/api/cart/add`, `/api/cart/mycart`, `/api/cart/update-quantity`, and `/api/cart/remove-item`; customer checkout/history at `/api/orders/checkout`, `/api/orders/myorders`; and artisan order operations at `/api/orders/artisan` and `/api/orders/artisan/:orderId/items/:itemId/status`.

The backend returns login tokens as plain strings. The frontend keeps the selected role and token in `sessionStorage`, sends tokens using `Authorization: Bearer ...`, and reports API errors instead of substituting sample records.

## Current backend gaps

- Reviews and customer recommendation data are not represented by a route or model.
- The backend writes uploaded images into `backend/uploads/` but does not expose that folder as static content, so the UI uses its designed fallback artwork when an image URL cannot load.
- The separate `ai-service/` provides pretrained CLIP zero-shot category suggestions, an explainable cost-plus price baseline, and a real-order demand baseline that requires 28 consecutive days. It does not access MongoDB; demand input is derived in the browser from the authenticated artisan's existing order endpoint. The model is not fine-tuned and no marketplace data is used to train it.
- Artisan product editing and deletion are intentionally not exposed. Although those backend routes require an artisan token, their service methods do not scope modifications to the authenticated artisan, so calling them from the UI could permit cross-artisan changes.
- Registration and some CRUD endpoints return plain text or raw documents and don't consistently use structured validation/error responses. The frontend handles the current responses but those contracts should be improved in a later, explicitly approved backend change.

No real ratings, purchases, maker identities, product trends, or AI outputs are fabricated.
