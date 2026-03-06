import json
import os
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd

from parsers import parse_file, get_sheet_names
from profiler import profile_data
from ai_engine import suggest_charts

router = APIRouter()


class UploadRequest(BaseModel):
    file_path: str
    file_type: str
    sheet_name: str | None = None


class SuggestRequest(BaseModel):
    profile_json: dict[str, Any]
    num_suggestions: int = 5
    existing_charts: list[dict[str, Any]] | None = None


class QueryRequest(BaseModel):
    parsed_path: str
    chart_config: dict[str, Any]


@router.post("/process/upload")
async def process_upload(req: UploadRequest):
    if not os.path.exists(req.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        parsed = parse_file(req.file_path, req.file_type, req.sheet_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    profile = profile_data(parsed)

    # Cache parsed data
    parsed_path = req.file_path.rsplit(".", 1)[0] + "_parsed.json"
    with open(parsed_path, "w") as f:
        json.dump(parsed["data"], f)

    return {
        "row_count": parsed["row_count"],
        "column_count": parsed["column_count"],
        "columns": parsed["columns"],
        "profile": profile,
        "parsed_path": parsed_path,
    }


@router.post("/ai/suggest-charts")
async def ai_suggest_charts(req: SuggestRequest):
    suggestions = suggest_charts(
        req.profile_json, req.num_suggestions, req.existing_charts
    )
    return {"suggestions": suggestions}


@router.post("/data/query")
async def data_query(req: QueryRequest):
    if not os.path.exists(req.parsed_path):
        raise HTTPException(status_code=404, detail="Parsed data not found")

    with open(req.parsed_path) as f:
        records = json.load(f)

    df = pd.DataFrame(records)
    config = req.chart_config
    x_col = config.get("x")
    y_col = config.get("y")
    group_col = config.get("groupBy")

    if x_col not in df.columns or y_col not in df.columns:
        raise HTTPException(status_code=400, detail="Invalid column names")

    if config["type"] in ("bar", "pie"):
        if group_col:
            result = df.groupby([x_col, group_col])[y_col].sum().reset_index()
        else:
            result = df.groupby(x_col)[y_col].sum().reset_index()
    elif config["type"] in ("line", "area"):
        result = df.sort_values(x_col)
        if group_col:
            result = result[[x_col, y_col, group_col]]
        else:
            result = result[[x_col, y_col]]
    elif config["type"] == "scatter":
        result = df[[x_col, y_col]]
        if group_col:
            result = df[[x_col, y_col, group_col]]
    else:
        result = df[[x_col, y_col]]

    return {"data": result.to_dict(orient="records")}
