import os
import json
import pytest
from fastapi.testclient import TestClient
from main import app

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")
client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_process_upload_csv(tmp_path):
    import shutil
    src = os.path.join(FIXTURES, "sales.csv")
    dst = tmp_path / "sales.csv"
    shutil.copy(src, dst)

    response = client.post(
        "/process/upload",
        json={"file_path": str(dst), "file_type": "csv"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["row_count"] == 5
    assert data["column_count"] == 5
    assert "profile" in data
    assert "parsed_path" in data


def test_data_query(tmp_path):
    import shutil
    src = os.path.join(FIXTURES, "sales.csv")
    dst = tmp_path / "sales.csv"
    shutil.copy(src, dst)

    # First process the file
    upload_resp = client.post(
        "/process/upload",
        json={"file_path": str(dst), "file_type": "csv"},
    )
    parsed_path = upload_resp.json()["parsed_path"]

    # Query for bar chart data
    response = client.post(
        "/data/query",
        json={
            "parsed_path": parsed_path,
            "chart_config": {
                "type": "bar",
                "x": "region",
                "y": "revenue",
            },
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) > 0
    assert "region" in data[0]
    assert "revenue" in data[0]
