from typing import Any
import pandas as pd


def _detect_type(series: pd.Series) -> str:
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"

    try:
        pd.to_datetime(series)
        return "datetime"
    except (ValueError, TypeError):
        pass

    if series.nunique() / max(len(series), 1) < 0.5:
        return "categorical"

    return "text"


def _column_profile(series: pd.Series, col_type: str) -> dict[str, Any]:
    profile: dict[str, Any] = {
        "type": col_type,
        "null_count": int(series.isna().sum()),
        "unique_count": int(series.nunique()),
    }

    if col_type == "numeric":
        profile["min"] = float(series.min())
        profile["max"] = float(series.max())
        profile["mean"] = round(float(series.mean()), 2)
        profile["median"] = float(series.median())

    elif col_type == "categorical":
        profile["top_values"] = series.value_counts().head(10).to_dict()

    elif col_type == "datetime":
        dates = pd.to_datetime(series, errors="coerce")
        profile["min"] = str(dates.min())
        profile["max"] = str(dates.max())

    return profile


def profile_data(parsed: dict[str, Any]) -> dict[str, Any]:
    df = pd.DataFrame(parsed["data"])
    columns_profile = {}

    for col in df.columns:
        col_type = _detect_type(df[col])
        columns_profile[col] = _column_profile(df[col], col_type)

    return {
        "row_count": parsed["row_count"],
        "column_count": parsed["column_count"],
        "columns": columns_profile,
    }
