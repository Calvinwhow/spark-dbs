import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from electrode import setup_app


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


class RetrieveElectrodeDataRequest(BaseModel):
    file_path: str


class FilePathRequest(BaseModel):
    file_path: str


@app.post("/api/retrieve-optimization-json")
def retrieve_optimization_json(payload: FilePathRequest):
    try:
        with open(payload.file_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Optimization JSON not found")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid optimization JSON: {exc}")


@app.post("/api/retrieve-electrode-data")
def retrieve_electrode_data(request: RetrieveElectrodeDataRequest):
    try:
        elmodels, patient_id = setup_app(request.file_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Reconstruction file not found")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not read reconstruction file: {exc}")

    if isinstance(elmodels, str):
        elmodels = [elmodels]

    if not elmodels:
        raise HTTPException(status_code=422, detail="No electrode model found in reconstruction file")

    return {"elmodels": elmodels, "patient_id": patient_id}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000)
