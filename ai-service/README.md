# Artisan AI prototype

A standalone FastAPI service for explainable pricing, cautious demand estimates, and image categorization. It does not connect to MongoDB, retain uploaded images, access customer data, or claim a trained marketplace model. Calls are made from the frontend to this service directly so the existing backend remains unchanged.

## Setup

Use Python 3.10–3.12 and a virtual environment:

```powershell
cd ai-service
py -m venv .venv
.\.venv\Scripts\Activate.ps1
Copy-Item .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The first category prediction downloads `openai/clip-vit-base-patch32` from Hugging Face and caches it locally. Set `AI_MODEL_ID` to a reviewed local directory or approved model repository when offline. The first request returns an explicit `503` if weights are unavailable. Keep `.models/`, `.env`, and model caches out of source control.

## Endpoints

- `GET /health`: service health and API version.
- `POST /api/v1/category/predict`: multipart `image` field; validates image type/format and caps uploads at 10 MB. Uses pretrained CLIP zero-shot similarity over the craft labels until a project classifier has been trained. Scores are relative, not calibrated probabilities.
- `POST /api/v1/price/recommend`: JSON fields `category`, `production_cost`, optional `labor_cost`, `packaging_cost`, `target_margin` (0.05–0.80), and `comparable_prices`. Cost-plus baseline rounded up to the next ₹5 so rounding does not reduce the requested margin; nearby catalog prices are informational only.
- `POST /api/v1/demand/forecast`: JSON fields `category`, `daily_sales` (`[{ "date": "YYYY-MM-DD", "quantity": 0 }]`), optional `available_stock`. Requires 28 consecutive days. It returns `insufficient_data` without a forecast if those observations are missing. Uses the mean for the matching weekday across four weeks adjusted by the recent weekly trend, capped at ±50%; it is not a trained forecasting model.

All endpoints validate inputs. No customer identifiers are accepted or returned. Browser origins are configured with `AI_ALLOWED_ORIGINS`.

## Training a product-category classifier

If you obtain permissioned, correctly labeled artisan product photos, place them in one folder per label:

```text
data/
  pottery/
    item-001.jpg
  jewellery/
    item-002.jpg
```

Run `python scripts/train_classifier.py --data-dir data --artifact-dir .models`. The script computes pretrained CLIP image embeddings, trains a balanced logistic-regression classifier, holds out a stratified test set, and saves `classifier.joblib` plus `metadata.json` with accuracy, macro precision/recall/F1, per-class metrics, and split details. It requires at least two categories with five valid images per category so each class can appear in an 80/20 train/test split. The API loads these artifacts when both exist. Do not train or report metrics on the same examples used for evaluation. With too few labels or samples the training script stops instead of claiming success.

No training dataset is included. Thus the delivered classifier is pretrained CLIP zero-shot, not fine-tuned on artisan-marketplace data, and can misclassify unusual crafts, mixed products, or poorly framed images.

## Frontend connection

Set `VITE_AI_SERVICE_URL=http://localhost:8000` in `frontend/.env`. AI calls use this service directly. If it is stopped or weights are unavailable, existing shopping and product submission still work and AI guidance is shown as unavailable.

## Evaluation and data limits

The custom category classifier reports held-out accuracy and macro metrics at training time. Evaluate performance per category and collect an independently labeled test set before presenting custom-model quality. Pricing remains a deterministic, explainable baseline and is not evaluated as a learned model. Demand is not forecast until actual consecutive sales history is supplied; no sample orders or demand values are generated. Model version and method are returned by the category API for reproducibility.
