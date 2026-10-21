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

The UI uses `/api/products`, `/api/products/:id`, and the authenticated artisan catalogue `/api/products/mine`; customer auth at `/api/customers/register` and `/api/customers/login`; artisan auth at `/api/auth/register`, `/api/auth/login`, and `/api/auth/check`; customer cart operations at `/api/cart/add`, `/api/cart/mycart`, `/api/cart/update-quantity`, and `/api/cart/remove-item`; customer checkout/history at `/api/orders/checkout` and `/api/orders/myorders`; artisan order operations at `/api/orders/artisan` and `/api/orders/artisan/:orderId/items/:itemId/status`; admin operations at `/api/admin/login`, `/api/admin/dashboard`, and `/api/admin/products`; and reviews at `/api/reviews/product/:productId`.

Customers can read product reviews and submit a rating and optional comment from a delivered order. The backend verifies that the customer purchased and received the product and prevents duplicate reviews for the same order.

The marketplace's top-rated sort uses a Bayesian average with a five-review prior and the actual average rating across rated, available products. Products without reviews are displayed as unrated and sort after rated products.

The backend returns login tokens as plain strings. The frontend keeps the selected role and token in `sessionStorage`, sends tokens using `Authorization: Bearer ...`, and reports API errors instead of substituting sample records.

## Current scope

- Product photos are served from `backend/uploads/`; the UI keeps fallback artwork for products whose referenced image is missing.
- Product uploads accept JPEG, PNG, and WebP images up to 5 MB and verify file signatures before saving.
- Product edits submitted through the artisan API return the listing to pending review.
- Artisan product editing and deletion are not exposed in the current UI.
- The separate `ai-service/` provides pretrained CLIP zero-shot category suggestions, an explainable cost-plus price baseline, and a real-order demand baseline that requires 28 consecutive days. It does not access MongoDB; demand input is derived in the browser from the authenticated artisan's existing order endpoint. The model is not fine-tuned and no marketplace data is used to train it.

No real ratings, purchases, maker identities, product trends, or AI outputs are fabricated.
