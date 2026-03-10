# services/streamlit-app/app.py
import streamlit as st

st.set_page_config(page_title="DashStream Pro", layout="wide")

st.title("DashStream Pro")
st.markdown(
    "Upload a CSV or Excel file to profile your data, get AI chart suggestions, "
    "and build an interactive dashboard."
)
st.page_link("pages/1_Upload.py", label="Get started → Upload a file", icon="📂")
