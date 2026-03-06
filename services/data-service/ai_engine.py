import json
import os
from typing import Any
import anthropic

anthropic_client = anthropic.Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
)


def build_prompt(profile: dict[str, Any], num_suggestions: int = 5, existing_charts: list | None = None) -> str:
    columns_desc = []
    for col_name, col_info in profile["columns"].items():
        desc = f"- {col_name}: type={col_info['type']}, nulls={col_info['null_count']}, unique={col_info.get('unique_count', 'N/A')}"
        if col_info["type"] == "numeric":
            desc += f", min={col_info['min']}, max={col_info['max']}, mean={col_info['mean']}"
        if col_info["type"] == "categorical" and "top_values" in col_info:
            top = list(col_info["top_values"].keys())[:5]
            desc += f", top_values={top}"
        if col_info["type"] == "datetime":
            desc += f", range={col_info.get('min')} to {col_info.get('max')}"
        columns_desc.append(desc)

    columns_text = "\n".join(columns_desc)

    exclude_text = ""
    if existing_charts:
        exclude_text = f"\n\nAlready created charts (do NOT suggest these again):\n{json.dumps(existing_charts)}"

    return f"""Analyze this dataset and suggest the {num_suggestions} most insightful charts for a marketing/sales team.

Dataset: {profile['row_count']} rows, {profile['column_count']} columns

Columns:
{columns_text}
{exclude_text}

Return ONLY a JSON array. Each element must have:
- "type": one of "bar", "line", "pie", "area", "scatter"
- "x": column name for x-axis
- "y": column name for y-axis (or value column for pie)
- "groupBy": optional column name for grouping/color
- "title": short descriptive title
- "reason": one sentence explaining why this chart is useful

Return valid JSON only, no markdown formatting."""


def suggest_charts(
    profile: dict[str, Any],
    num_suggestions: int = 5,
    existing_charts: list | None = None,
) -> list[dict[str, Any]]:
    prompt = build_prompt(profile, num_suggestions, existing_charts)

    try:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text
        suggestions = json.loads(text)
        if isinstance(suggestions, list):
            return suggestions
    except Exception:
        pass

    return FALLBACK_RULES(profile)


def FALLBACK_RULES(profile: dict[str, Any]) -> list[dict[str, Any]]:
    suggestions = []
    columns = profile["columns"]

    numeric_cols = [c for c, info in columns.items() if info["type"] == "numeric"]
    categorical_cols = [c for c, info in columns.items() if info["type"] == "categorical"]
    datetime_cols = [c for c, info in columns.items() if info["type"] == "datetime"]

    for num_col in numeric_cols:
        if datetime_cols:
            suggestions.append({
                "type": "line",
                "x": datetime_cols[0],
                "y": num_col,
                "title": f"{num_col} Over Time",
                "reason": f"Track {num_col} trends over time",
            })
        if categorical_cols:
            suggestions.append({
                "type": "bar",
                "x": categorical_cols[0],
                "y": num_col,
                "title": f"{num_col} by {categorical_cols[0]}",
                "reason": f"Compare {num_col} across {categorical_cols[0]}",
            })

    if categorical_cols and numeric_cols:
        suggestions.append({
            "type": "pie",
            "x": categorical_cols[0],
            "y": numeric_cols[0],
            "title": f"{numeric_cols[0]} Distribution by {categorical_cols[0]}",
            "reason": f"See proportional breakdown of {numeric_cols[0]}",
        })

    return suggestions[:5]
