from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class PriceRequest(BaseModel):
    category: str = Field(min_length=1, max_length=80)
    production_cost: float = Field(gt=0, le=10000000)
    labor_cost: float = Field(default=0, ge=0, le=10000000)
    packaging_cost: float = Field(default=0, ge=0, le=10000000)
    target_margin: float = Field(default=0.30, ge=0.05, le=0.80)
    comparable_prices: List[float] = Field(default_factory=list, max_length=100)

    @field_validator("comparable_prices")
    @classmethod
    def validate_comparable_prices(cls, values):
        if any(value <= 0 or value > 10000000 for value in values):
            raise ValueError("Comparable prices must be greater than zero and at most 10,000,000.")
        return values


class DailySales(BaseModel):
    date: date
    quantity: int = Field(ge=0, le=100000)


class DemandRequest(BaseModel):
    category: str = Field(min_length=1, max_length=80)
    daily_sales: List[DailySales] = Field(max_length=365)
    available_stock: Optional[int] = Field(default=None, ge=0)

    @field_validator("daily_sales")
    @classmethod
    def require_unique_dates(cls, values):
        dates = [entry.date for entry in values]
        if len(dates) != len(set(dates)):
            raise ValueError("Daily sales may contain each date only once.")
        return values
