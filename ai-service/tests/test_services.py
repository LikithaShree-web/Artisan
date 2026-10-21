import unittest
from datetime import date, timedelta

from app.schemas import DailySales, DemandRequest, PriceRequest
from app.services.demand import forecast_demand
from app.services.preprocessing import preprocess_image
from app.services.pricing import recommend_price
from PIL import Image
from io import BytesIO


class DemandForecastTests(unittest.TestCase):
    def test_insufficient_history_does_not_generate_forecast(self):
        request = DemandRequest(
            category="basket",
            daily_sales=[DailySales(date=date.today(), quantity=2)],
        )

        result = forecast_demand(request)

        self.assertEqual(result["status"], "insufficient_data")
        self.assertEqual(result["forecast"], [])
        self.assertFalse(result["model_trained"])

    def test_complete_history_returns_weekly_baseline_and_stock_context(self):
        last_day = date.today()
        history = [
            DailySales(date=last_day - timedelta(days=offset), quantity=2)
            for offset in range(27, -1, -1)
        ]
        request = DemandRequest(category="basket", daily_sales=history, available_stock=10)

        result = forecast_demand(request)

        self.assertEqual(result["status"], "baseline_estimate")
        self.assertEqual(len(result["forecast"]), 7)
        self.assertTrue(all(row["estimated_units"] == 2 for row in result["forecast"]))
        self.assertEqual(result["stock_context"]["estimated_seven_day_demand"], 14)
        self.assertTrue(result["stock_context"]["may_need_restock"])


class PricingTests(unittest.TestCase):
    def test_recommendation_accounts_for_all_entered_costs(self):
        result = recommend_price(
            PriceRequest(
                category="basket",
                production_cost=100,
                labor_cost=50,
                packaging_cost=10,
                target_margin=0.3,
                comparable_prices=[200, 220, 240],
            )
        )

        self.assertEqual(result["estimated_cost_breakdown"]["total"], 160)
        self.assertGreaterEqual(result["recommended_price"], 160 / 0.7)
        self.assertEqual(result["comparable_price_median"], 220)
        self.assertFalse(result["model_trained"])


class ImagePreprocessingTests(unittest.TestCase):
    def test_valid_image_is_normalized_and_invalid_bytes_are_rejected(self):
        buffer = BytesIO()
        Image.new("RGBA", (32, 24), (255, 0, 0, 128)).save(buffer, format="PNG")

        result = preprocess_image(buffer.getvalue())

        self.assertEqual(result.mode, "RGB")
        self.assertEqual(result.size, (32, 24))
        with self.assertRaisesRegex(ValueError, "not a valid image"):
            preprocess_image(b"not an image")


if __name__ == "__main__":
    unittest.main()
