import streamlit as st

st.set_page_config(
    page_title="DashStream Pro",
    page_icon=":bar_chart:",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("DashStream Pro")
st.markdown(
    "Upload a CSV or Excel file to profile your data, get AI chart suggestions, "
    "and build an interactive dashboard."
)
st.page_link("pages/1_Upload.py", label="Get started → Upload a file", icon="📂")
