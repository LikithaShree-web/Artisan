# Common Thread — AI-powered artisan marketplace

This repository contains the existing Express/MongoDB API, a new React marketplace frontend, and an optional standalone Python AI service. The existing backend source files were not changed.

## Local setup

Use three terminals. Start MongoDB first, locally or as a managed database.

### 1. Backend

Copy `backend/.env.example` to `backend/.env`, then replace the MongoDB URI and JWT secret with your own private values. From the repository root:

```powershell
cd backend
npm install
node server.js
```

The server listens on port `5000` by default. Required variables are `MONGO_URL` and `JWT_SECRET_PASSWORD`; `PORT` is optional.

### 2. Frontend

Copy `frontend/.env.example` to `frontend/.env`, adjust the API URLs if needed, then run:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite. `VITE_API_BASE_URL` points to the Express API and `VITE_AI_SERVICE_URL` points to the optional Python service.

### 3. AI service (optional)

Follow `ai-service/README.md` to install the Python dependencies, start FastAPI on port `8000`, and optionally train the image-category classifier if you have enough permissioned, labeled product images. The first image prediction downloads pretrained CLIP weights if they are not cached.

## Implemented flows

- Marketplace reads real products from the existing API and filters out unapproved or out-of-stock products.
- Customer registration/login, cart, COD checkout, and order history use existing Express routes.
- Artisan login, product submission, and per-item order status updates use existing Express routes. The UI filters catalog products by authenticated artisan ID and does not expose product edit/delete because the existing write services do not enforce ownership.
- Optional AI category suggestions use pretrained CLIP zero-shot inference; price guidance is an explainable cost-plus baseline; demand guidance is generated only from at least 28 days of actual order history.

## Known existing-backend limitations

- There is no review/rating model or API, so ratings and review-based recommendations are not displayed.
- Uploaded product images are written under `backend/uploads/`, but the existing Express server does not serve that directory; the UI shows fallback artwork when image URLs cannot load.
- Customer registration returns a raw customer document from the existing backend, which includes the password hash. The UI does not display or store that response, but the backend response itself must be changed before this can be considered safe.
- Product update/delete routes check that a token exists but do not verify that the target product belongs to the authenticated artisan. These controls are intentionally not offered in the UI.
- Some existing APIs return plain text or raw MongoDB documents rather than consistent, minimal response shapes.

AI runtime, API contracts, model limitations, evaluation, and training details are documented in `ai-service/README.md`. No sample ratings, orders, labels, or demand predictions are fabricated.
