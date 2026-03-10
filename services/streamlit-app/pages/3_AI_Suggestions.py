import sys
import os

import streamlit as st

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "data-service"))

from ai_engine import suggest_charts

st.set_page_config(page_title="AI Suggestions — DashStream Pro", layout="wide")
st.title("AI Chart Suggestions")

if "profile" not in st.session_state:
    st.warning("No data loaded. Go to the Upload page first.")
    st.page_link("pages/1_Upload.py", label="→ Upload a file")
    st.stop()

profile = st.session_state["profile"]
existing = st.session_state.get("charts", [])

if st.button("Generate suggestions"):
    with st.spinner("Asking AI…"):
        try:
            suggestions = suggest_charts(profile, num_suggestions=5, existing_charts=existing)
            st.session_state["suggestions"] = suggestions
        except Exception as e:
            st.error(f"AI request failed: {e}")

suggestions = st.session_state.get("suggestions", [])

for i, s in enumerate(suggestions):
    with st.container(border=True):
        col1, col2 = st.columns([4, 1])
        col1.markdown(f"**{s['title']}** — `{s['type']}` · x=`{s['x']}` y=`{s['y']}`")
        col1.caption(s.get("reason", ""))
        if col2.button("Add to dashboard", key=f"add_{i}"):
            st.session_state.setdefault("charts", []).append(
                {"type": s["type"], "x": s["x"], "y": s["y"], "title": s["title"]}
            )
            st.success(f"Added '{s['title']}' to dashboard.")
