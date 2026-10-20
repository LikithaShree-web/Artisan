from datetime import date, timedelta
from statistics import mean

from app.schemas import DemandRequest


MINIMUM_HISTORY_DAYS = 28
FORECAST_DAYS = 7


def forecast_demand(request: DemandRequest):
    observations = sorted(request.daily_sales, key=lambda entry: entry.date)
    if observations and observations[-1].date > date.today():
        return {
            "status": "invalid_data",
            "category": request.category,
            "message": "Sales history cannot include future dates.",
            "forecast": [],
            "model_trained": False,
        }
    if len(observations) < MINIMUM_HISTORY_DAYS:
        return {
            "status": "insufficient_data",
            "category": request.category,
            "minimum_days_required": MINIMUM_HISTORY_DAYS,
            "days_available": len(observations),
            "message": "Not enough real daily sales history for a demand estimate. No estimate has been generated.",
            "forecast": [],
            "model_trained": False,
        }

    by_date = {entry.date: entry.quantity for entry in observations}
    last_date = observations[-1].date
    first_date = last_date - timedelta(days=27)
    complete_dates = [first_date + timedelta(days=offset) for offset in range(28)]
    if any(day not in by_date for day in complete_dates):
        return {
            "status": "insufficient_data",
            "category": request.category,
            "minimum_days_required": MINIMUM_HISTORY_DAYS,
            "days_available": sum(day in by_date for day in complete_dates),
            "message": "Daily history must cover 28 consecutive days. No estimate has been generated.",
            "forecast": [],
            "model_trained": False,
        }

    forecasts = []
    recent_average = mean(by_date[day] for day in complete_dates[-7:])
    prior_average = mean(by_date[day] for day in complete_dates[-14:-7])
    trend_ratio = recent_average / prior_average if prior_average > 0 else 1.0
    trend_ratio = min(1.5, max(0.5, trend_ratio))
    for offset in range(1, FORECAST_DAYS + 1):
        forecast_date = last_date + timedelta(days=offset)
        weekday_values = [
            by_date[day]
            for day in complete_dates
            if day.weekday() == forecast_date.weekday()
        ]
        estimate = max(0, round(mean(weekday_values) * trend_ratio))
        forecasts.append({"date": forecast_date.isoformat(), "estimated_units": estimate})

    result = {
        "status": "baseline_estimate",
        "category": request.category,
        "forecast": forecasts,
        "method": "four_week_same_weekday_mean_with_capped_recent_trend",
        "history_days": MINIMUM_HISTORY_DAYS,
        "model_trained": False,
        "explanation": (
            "Each daily estimate uses the average for that weekday across the last four weeks, "
            "adjusted by the recent 7-day versus previous 7-day sales ratio (capped at ±50%). "
            "This is a baseline, not a guarantee."
        ),
        "generated_for": date.today().isoformat(),
    }
    if request.available_stock is not None:
        result["stock_context"] = {
            "available_stock": request.available_stock,
            "estimated_seven_day_demand": sum(item["estimated_units"] for item in forecasts),
            "may_need_restock": request.available_stock < sum(item["estimated_units"] for item in forecasts),
        }
    return result
