from math import ceil
from statistics import median

from app.schemas import PriceRequest


def recommend_price(request: PriceRequest):
    production_cost = request.production_cost
    labor_cost = request.labor_cost
    packaging_cost = request.packaging_cost
    total_cost = production_cost + labor_cost + packaging_cost
    target_price = total_cost / (1 - request.target_margin)
    recommended_price = ceil(target_price / 5) * 5
    estimated_profit = max(0.0, recommended_price - total_cost)
    comparable_prices = request.comparable_prices

    return {
        "recommended_price": round(recommended_price, 2),
        "currency": "INR",
        "estimated_cost_breakdown": {
            "production": round(production_cost, 2),
            "labor": round(labor_cost, 2),
            "packaging": round(packaging_cost, 2),
            "total": round(total_cost, 2),
        },
        "estimated_profit": round(estimated_profit, 2),
        "achieved_margin": round(estimated_profit / recommended_price, 4) if recommended_price else 0,
        "target_margin": request.target_margin,
        "category": request.category,
        "comparable_price_median": round(median(comparable_prices), 2) if comparable_prices else None,
        "method": "explainable_cost_plus_margin_baseline",
        "explanation": (
            f"The suggested amount covers ₹{total_cost:.2f} in entered costs and targets "
            f"a {request.target_margin:.0%} margin, rounded up to the next ₹5. "
            "Comparable prices are context only; they do not override your cost or guarantee a sale."
        ),
        "model_trained": False,
    }
