import pandas as pd
import plotly.graph_objects as go


def build_chart(df: pd.DataFrame, config: dict) -> go.Figure:
    chart_type = config["type"]
    x = config["x"]
    y = config["y"]
    title = config.get("title", "")

    if df.empty:
        raise ValueError("DataFrame is empty")

    if chart_type == "bar":
        grouped = df.groupby(x)[y].sum().reset_index()
        fig = go.Figure(go.Bar(x=grouped[x], y=grouped[y], name=y))

    elif chart_type == "line":
        sorted_df = df.sort_values(x)
        fig = go.Figure(go.Scatter(x=sorted_df[x], y=sorted_df[y], mode="lines", name=y))

    elif chart_type == "area":
        sorted_df = df.sort_values(x)
        fig = go.Figure(go.Scatter(x=sorted_df[x], y=sorted_df[y], fill="tozeroy", mode="lines", name=y))

    elif chart_type == "scatter":
        fig = go.Figure(go.Scatter(x=df[x], y=df[y], mode="markers", name=y))

    elif chart_type == "pie":
        grouped = df.groupby(x)[y].sum().reset_index()
        fig = go.Figure(go.Pie(labels=grouped[x], values=grouped[y], name=y))

    else:
        raise ValueError(f"Unsupported chart type: {chart_type}")

    fig.update_layout(title=title, margin=dict(t=40, b=20, l=20, r=20))
    return fig
