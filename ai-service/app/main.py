import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from app.schemas import DemandRequest, PriceRequest
from app.services.classifier import predict_category
from app.services.demand import forecast_demand
from app.services.pricing import recommend_price
from app.services.preprocessing import preprocess_image


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(
    title="Common Thread Artisan AI",
    version="0.1.0",
    description="Transparent prototype endpoints for artisan product guidance.",
    lifespan=lifespan,
)

origins = [
    origin.strip()
    for origin in os.getenv("AI_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "common-thread-ai", "version": app.version}


@app.post("/api/v1/category/predict")
async def category_predict(image: UploadFile = File(...)):
    max_bytes = int(os.getenv("AI_MAX_IMAGE_BYTES", "10485760"))
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload an image file.")

    raw = await image.read(max_bytes + 1)
    if len(raw) > max_bytes:
        raise HTTPException(status_code=413, detail="Image exceeds the 10 MB limit.")
    try:
        processed = preprocess_image(raw)
        result = await run_in_threadpool(predict_category, processed)
        return {
            **result,
            "model_version": os.getenv("AI_MODEL_VERSION", "clip-vit-base-patch32"),
            "prototype": result["method"] == "zero_shot_pretrained",
            "confidence_note": "Scores are relative across these craft labels and are not calibrated probabilities.",
        }
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/api/v1/price/recommend")
def price_recommend(request: PriceRequest):
    return recommend_price(request)


@app.post("/api/v1/demand/forecast")
def demand_forecast(request: DemandRequest):
    return forecast_demand(request)
