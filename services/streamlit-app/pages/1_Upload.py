import sys
import os
import tempfile

import streamlit as st
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "data-service"))
os.environ.setdefault("SKIP_PATH_VALIDATION", "1")

from parsers import parse_file
from profiler import profile_data

st.set_page_config(page_title="Upload — DashStream Pro", layout="wide")
st.title("Upload Data")

uploaded = st.file_uploader("Choose a CSV or Excel file", type=["csv", "xlsx", "xls", "txt"])

if uploaded is not None:
    suffix = "." + uploaded.name.rsplit(".", 1)[-1].lower()
    file_type = suffix.lstrip(".")
    if file_type == "xls":
        file_type = "xlsx"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(uploaded.getbuffer())
        tmp_path = tmp.name

    try:
        with st.spinner("Parsing and profiling…"):
            parsed = parse_file(tmp_path, file_type)
            profile = profile_data(parsed)
    except Exception as e:
        st.error(f"Could not parse file: {e}")
        os.unlink(tmp_path)
        st.stop()
    os.unlink(tmp_path)

    df = pd.DataFrame(parsed["data"])
    if st.session_state.get("filename") != uploaded.name:
        st.session_state["charts"] = []
    st.session_state["df"] = df
    st.session_state["profile"] = profile
    st.session_state["filename"] = uploaded.name
    if "charts" not in st.session_state:
        st.session_state["charts"] = []

    st.success(f"Loaded **{uploaded.name}** — {parsed['row_count']:,} rows × {parsed['column_count']} columns")

    st.subheader("Data Preview")
    st.dataframe(df.head(100), use_container_width=True)

    st.subheader("Column Statistics")
    rows = []
    for col, info in profile["columns"].items():
        row = {"column": col, "type": info["type"], "nulls": info["null_count"]}
        if info["type"] == "numeric":
            row.update({"min": info["min"], "max": info["max"], "mean": round(info["mean"], 2)})
        elif info["type"] == "categorical":
            row["unique"] = info.get("unique_count", "")
        rows.append(row)
    st.dataframe(pd.DataFrame(rows), use_container_width=True)

    st.page_link("pages/2_Dashboard.py", label="→ Go to Dashboard", icon="📊")
    st.page_link("pages/3_AI_Suggestions.py", label="→ Get AI Chart Suggestions", icon="🤖")
