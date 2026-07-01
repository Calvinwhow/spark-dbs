import json
import shutil
import tempfile
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from electrode import setup_app


app = FastAPI()
upload_dir = Path(tempfile.gettempdir()) / "spark-dbs-uploads"
upload_dir.mkdir(parents=True, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


def save_uploaded_file(upload: UploadFile) -> Path:
    original_name = Path(upload.filename or "uploaded-file").name
    destination = upload_dir / f"{uuid4().hex}_{original_name}"

    with destination.open("wb") as out_file:
        shutil.copyfileobj(upload.file, out_file)

    return destination


def read_optimization_json(uploaded_path: Path):
    try:
        with uploaded_path.open("r") as f:
            return json.load(f)
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"Optimization JSON is not readable text: {exc}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid optimization JSON: {exc}")


def normalize_optimization_json(optimization_json):
    if isinstance(optimization_json, dict) and "v" in optimization_json:
        return optimization_json["v"]
    return optimization_json


def normalize_electrode_models(elmodels):
    if isinstance(elmodels, str):
        elmodels = [elmodels]

    if not elmodels:
        raise HTTPException(status_code=422, detail="No electrode model found in reconstruction file")

    return elmodels


@app.post("/api/programmer-session")
def create_programmer_session(
    reconstruction_file: UploadFile = File(...),
    optimization_json_file: Optional[UploadFile] = File(None),
):
    reconstruction_path = save_uploaded_file(reconstruction_file)

    try:
        elmodels, patient_id = setup_app(str(reconstruction_path))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Uploaded reconstruction file not found")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not read uploaded reconstruction file: {exc}")

    elmodels = normalize_electrode_models(elmodels)
    optimization_json = None

    if optimization_json_file is not None and optimization_json_file.filename:
        optimization_json_path = save_uploaded_file(optimization_json_file)
        optimization_json = normalize_optimization_json(read_optimization_json(optimization_json_path))

    return {
        "patient": {
            "id": patient_id or "Prior Optimization",
            "elmodel": elmodels[0],
        },
        "electrodeModel": elmodels[0],
        "elmodels": elmodels,
        "optimizationJson": optimization_json,
    }


frontend_build_dir = Path(__file__).resolve().parent.parent / "frontend" / "build"

if frontend_build_dir.exists():
    static_dir = frontend_build_dir / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=static_dir), name="static")


    @app.get("/{requested_path:path}", include_in_schema=False)
    def serve_frontend(requested_path: str):
        requested_file = frontend_build_dir / requested_path
        if requested_path and requested_file.is_file():
            return FileResponse(requested_file)

        index_file = frontend_build_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)

        raise HTTPException(status_code=404, detail="Frontend build not found")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8082)
