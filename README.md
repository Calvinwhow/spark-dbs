# spark-dbs

## Getting Started

### 1. Clone the Repository
git clone https://github.com/SavirMadan13/spark-dbs.git

### 2. Navigate to frontend directory
cd spark-dbs/frontend

### 3. Install dependencies
npm install

### 4. Start
npm start

## Docker

Build and run with Docker Compose:

```bash
docker compose up --build
```

Open `http://localhost:8082`.

### Programmer Session API

The app opens a programmer session from uploaded files instead of backend-visible filesystem paths. In the browser, drop or choose the reconstruction `.mat` file and optional optimizer JSON.

Backend services can call the same API with multipart form data:

```bash
curl -X POST http://localhost:8082/api/programmer-session \
  -F "reconstruction_file=@/path/to/sub-example_desc-reconstruction.mat" \
  -F "optimization_json_file=@/path/to/optimizer.json"
```

`optimization_json_file` is optional.
