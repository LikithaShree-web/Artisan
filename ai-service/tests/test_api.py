import asyncio
import os
import unittest
from datetime import date, timedelta
from io import BytesIO
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from PIL import Image
from starlette.datastructures import Headers

from app import main
from app.schemas import DailySales, DemandRequest, PriceRequest


def png_bytes():
    image = Image.new("RGB", (16, 16), (120, 80, 40))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def uploaded_image(content, content_type="image/png"):
    headers = Headers({"content-type": content_type}) if content_type else Headers()
    return UploadFile(filename="test.png", file=BytesIO(content), headers=headers)


class CategoryEndpointTests(unittest.TestCase):
    def test_prediction_returns_prototype_metadata_from_predictor(self):
        prediction = {
            "category": "bamboo and cane crafts",
            "confidence": 0.82,
            "alternatives": [],
            "method": "zero_shot_pretrained",
        }
        with patch.object(main, "predict_category", return_value=prediction):
            result = asyncio.run(main.category_predict(uploaded_image(png_bytes())))

        self.assertEqual(result["category"], "bamboo and cane crafts")
        self.assertTrue(result["prototype"])
        self.assertEqual(result["method"], "zero_shot_pretrained")
        self.assertIn("not calibrated probabilities", result["confidence_note"])

    def test_invalid_media_and_oversized_images_return_client_errors(self):
        with self.assertRaises(HTTPException) as unsupported:
            asyncio.run(main.category_predict(uploaded_image(b"data", "text/plain")))
        self.assertEqual(unsupported.exception.status_code, 415)

        with patch.dict(os.environ, {"AI_MAX_IMAGE_BYTES": "4"}):
            with self.assertRaises(HTTPException) as oversized:
                asyncio.run(main.category_predict(uploaded_image(png_bytes())))
        self.assertEqual(oversized.exception.status_code, 413)

        with self.assertRaises(HTTPException) as invalid_image:
            asyncio.run(main.category_predict(uploaded_image(b"not an image")))
        self.assertEqual(invalid_image.exception.status_code, 422)

    def test_missing_pretrained_model_is_reported_as_service_unavailable(self):
        with patch.object(main, "predict_category", side_effect=RuntimeError("model unavailable")):
            with self.assertRaises(HTTPException) as unavailable:
                asyncio.run(main.category_predict(uploaded_image(png_bytes())))
        self.assertEqual(unavailable.exception.status_code, 503)


class GuidanceEndpointTests(unittest.TestCase):
    def test_default_browser_origins_include_localhost_and_loopback_ip(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(
                main.configured_origins(),
                ["http://localhost:5173", "http://127.0.0.1:5173"],
            )

    def test_price_endpoint_returns_cost_based_guidance(self):
        response = main.price_recommend(
            PriceRequest(
                category="Basket",
                production_cost=100,
                labor_cost=20,
                packaging_cost=10,
                target_margin=0.3,
            )
        )
        self.assertEqual(response["estimated_cost_breakdown"]["total"], 130)
        self.assertGreaterEqual(response["recommended_price"], 130 / 0.7)
        self.assertEqual(response["method"], "explainable_cost_plus_margin_baseline")

    def test_demand_endpoint_returns_baseline_only_for_complete_history(self):
        today = date.today()
        history = [
            DailySales(date=today - timedelta(days=offset), quantity=1)
            for offset in range(27, -1, -1)
        ]
        response = main.demand_forecast(
            DemandRequest(category="Basket", daily_sales=history, available_stock=2)
        )
        self.assertEqual(response["status"], "baseline_estimate")
        self.assertEqual(len(response["forecast"]), 7)
        self.assertFalse(response["model_trained"])

        insufficient = main.demand_forecast(
            DemandRequest(category="Basket", daily_sales=history[:-1])
        )
        self.assertEqual(insufficient["status"], "insufficient_data")
        self.assertEqual(insufficient["forecast"], [])


if __name__ == "__main__":
    unittest.main()
