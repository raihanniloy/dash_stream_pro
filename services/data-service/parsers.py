from __future__ import annotations

import os
from typing import Any

import pandas as pd


SUPPORTED_TYPES = {"csv", "xlsx", "txt"}


def parse_file(
    file_path: str,
    file_type: str,
    sheet_name: str | None = None,
) -> dict[str, Any]:
    """Parse a file into a structured dict with data, columns, dtypes, and counts."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    if file_type not in SUPPORTED_TYPES:
        raise ValueError(f"Unsupported file type: {file_type}. Supported: {', '.join(sorted(SUPPORTED_TYPES))}")

    if file_type == "csv":
        df = pd.read_csv(file_path)
    elif file_type == "txt":
        df = pd.read_csv(file_path, sep=None, engine="python")
    else:  # xlsx
        df = pd.read_excel(file_path, sheet_name=sheet_name)

    # Replace NaN with None for JSON serialization
    data = df.where(df.notna(), other=None).to_dict(orient="records")

    return {
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "row_count": len(df),
        "column_count": len(df.columns),
        "data": data,
    }


def get_sheet_names(file_path: str) -> list[str]:
    """Return the sheet names for an XLSX file."""
    xls = pd.ExcelFile(file_path)
    return xls.sheet_names  # type: ignore[return-value]
