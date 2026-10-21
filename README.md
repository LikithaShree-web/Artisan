# Common Thread — AI-powered artisan marketplace

This repository contains an Express/MongoDB backend, a React storefront/admin frontend, and an optional Python AI guidance service for artisan pricing and product suggestions.

## Quick start

Use three terminals. Start MongoDB first, then run the backend, frontend, and optional AI service.

### 1) Backend

Copy `backend/.env.example` to `backend/.env` and set your own values. The app expects MongoDB, a `JWT_SECRET_PASSWORD` with at least 32 random characters, and optional `API_ALLOWED_ORIGINS` settings.

Generate a local secret without reusing or displaying the current one:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Copy that generated value into `JWT_SECRET_PASSWORD` in `backend/.env`. Rotating it invalidates existing login tokens, so users must sign in again. `.env` files are ignored by Git; commit only the placeholder `.env.example` files.

```powershell
cd backend
npm install
node server.js
```

There is no committed default administrator. To bootstrap an administrator on a new database, set both `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` (at least 12 characters) in `backend/.env` before the first start. Remove `ADMIN_PASSWORD` after the admin record is created. If an admin already exists, bootstrap variables do not reset its password.

### Optional local staging backend

Staging uses a separate, local-only MongoDB database named `artisan_marketplace_staging`. It does not change the regular `node server.js` startup or `backend/.env`. The staging launcher refuses to start unless the normal `.env` is present, its database name can be identified, the staging URI points to loopback MongoDB and the dedicated staging database, and the staging JWT secret is strong and different from the normal one. It also disables admin bootstrap variables for staging.

Start a local MongoDB instance, then use PowerShell from the repository root:

```powershell
Copy-Item backend/.env.staging.example backend/.env.staging
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Put the newly generated value into `JWT_SECRET_PASSWORD` in `backend/.env.staging`; do not reuse the normal backend secret. Keep both `.env` files private and uncommitted. Then start staging:

```powershell
cd backend
npm run start:staging
```

The staging API defaults to port `5001`. Startup does not delete, reset, or seed databases. Registration, checkout, reviews, and other API writes made while staging is running persist in `artisan_marketplace_staging`; only use test accounts and data there. The staging example contains no MongoDB credentials or production URI.

To point the local Vite frontend at staging, create `frontend/.env.local` with `VITE_API_BASE_URL=http://localhost:5001/api` and restart Vite. Remove that local override to return the frontend to its normal API URL.

### 2) Frontend

```powershell
cd frontend
npm install
npm run dev
```

The app reads `VITE_API_BASE_URL` and `VITE_AI_SERVICE_URL` from `frontend/.env` or `.env.example`.
When running the frontend at `http://127.0.0.1:5173`, the AI service's default allowed origins include both `localhost` and `127.0.0.1`.

### 3) AI service (optional)

Follow the local instructions in `ai-service/README.md` to start the FastAPI service on port `8000`.

## What is implemented

- Customer and artisan registration/login with secure JWT auth and sanitized responses.
- Admin bootstrap, admin login, and protected admin dashboard.
- Product submission defaults to `pending`, with admin approval/rejection flow.
- Marketplace listing filters only approved, in-stock products.
- Artisans can view their full product submissions and review feedback through an authenticated endpoint.
- Artisan ownership checks so only the owning artisan can manage their own products.
- Product pages show customer reviews; customers can review purchased products after delivery.
- Static upload serving from `backend/uploads` so product photos load correctly.
- Frontend sign-in flow for customer, artisan, and admin roles.
- Admin dashboard with stats and product review queue.
- Product ratings use actual customer reviews; the top-rated sort applies a five-review Bayesian prior using the marketplace's rated-product average, so unrated products do not receive an invented score.

## Backend API overview

The API remains mounted under `/api`, with these core routes:

- `/api/auth` — artisan register/login
- `/api/customers` — customer register/login and profile flows
- `/api/products` — marketplace and artisan product operations
- `/api/admin` — admin login, stats, approval queue, and status updates
- `/api/cart` and `/api/orders` — customer cart and order flow
- `/api/reviews` — review submission and retrieval

## Notes

- The backend preserves the existing Express/Mongo architecture rather than replacing it.
- The app is designed to work with a real MongoDB instance and optional AI service, not with fabricated demo data.
- Backend integration tests use a disposable in-memory MongoDB database whose generated URI is checked for a loopback host and an `artisan_marketplace_test_` database name. They do not read or connect to the configured `MONGO_URL`.
- Run backend checks with `cd backend; npm test`, the frontend production build with `cd frontend; npm run build`, and AI checks with `cd ai-service; .\\.venv\\Scripts\\python.exe -m unittest discover -s tests`.
- These isolated tests do not replace verification against a separately provisioned deployment environment. Do not run test checkout/review flows against the configured marketplace database.
