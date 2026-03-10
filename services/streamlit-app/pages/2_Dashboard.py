import sys
import os

import streamlit as st

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from chart_builder import build_chart

st.set_page_config(page_title="Dashboard — DashStream Pro", layout="wide")
st.title("Dashboard")

if "df" not in st.session_state:
    st.warning("No data loaded. Go to the Upload page first.")
    st.page_link("pages/1_Upload.py", label="→ Upload a file")
    st.stop()

df = st.session_state["df"]
columns = list(df.columns)

st.subheader("Add a Chart")
with st.form("add_chart"):
    col1, col2, col3, col4 = st.columns(4)
    chart_type = col1.selectbox("Type", ["bar", "line", "area", "scatter", "pie"])
    x_col = col2.selectbox("X axis", columns)
    y_col = col3.selectbox("Y axis", [c for c in columns if c != x_col])
    title = col4.text_input("Title", value=f"{y_col} by {x_col}")
    submitted = st.form_submit_button("Add chart")

if submitted:
    st.session_state.setdefault("charts", []).append(
        {"type": chart_type, "x": x_col, "y": y_col, "title": title}
    )

charts = st.session_state.get("charts", [])

if not charts:
    st.info("No charts yet. Add one above or get AI suggestions.")
else:
    to_remove = None
    pairs = [charts[i : i + 2] for i in range(0, len(charts), 2)]
    for pair in pairs:
        cols = st.columns(2)
        for col, chart in zip(cols, pair):
            with col:
                try:
                    fig = build_chart(df, chart)
                    st.plotly_chart(fig, use_container_width=True)
                except Exception as e:
                    st.error(f"Could not render '{chart['title']}': {e}")
                if st.button("Remove", key=f"rm_{chart['title']}_{chart['x']}"):
                    to_remove = chart

    if to_remove is not None:
        st.session_state["charts"].remove(to_remove)
        st.rerun()
