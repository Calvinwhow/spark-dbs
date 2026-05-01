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

Build the single-container viewer:

```bash
docker build -t spark-dbs-viewer .
```

Run it:

```bash
docker run --rm -p 8000:8000 spark-dbs-viewer
```

Open `http://localhost:8000`.

The backend reads reconstruction and JSON files from inside the container. To open files from your host machine, mount the folder that contains them and use the mounted path in the app:

```bash
docker run --rm -p 8000:8000 \
  -v /Users/cu135/Documents:/data/Documents:ro \
  spark-dbs-viewer
```

Then enter paths like `/data/Documents/path/to/file.json`.
