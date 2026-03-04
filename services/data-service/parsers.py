from __future__ import annotations

import os
import pathlib
from typing import Any

import pandas as pd

# Base upload directory — all processed files must be under this path
UPLOADS_BASE = pathlib.Path(os.environ.get("UPLOADS_DIR", "/home/raihan-niloy/work/dash_stream_pro/uploads")).resolve()


def _validate_path(file_path: str) -> pathlib.Path:
    """Ensure the file path is within the allowed uploads directory."""
    if os.environ.get("SKIP_PATH_VALIDATION") == "1":
        return pathlib.Path(file_path).resolve()
    resolved = pathlib.Path(file_path).resolve()
    try:
        resolved.relative_to(UPLOADS_BASE)
    except ValueError:
        raise ValueError(f"File path is outside the allowed directory: {file_path}")
    return resolved


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

    # Validate path is within uploads directory
    validated_path = _validate_path(file_path)
    file_path = str(validated_path)

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
    with pd.ExcelFile(file_path) as xls:
        return list(xls.sheet_names)
