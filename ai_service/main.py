from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "AI Service Running", "model": "Isolation Forest (Pending)"}

@app.get("/health")
def health_check():
    return {"status": "ok"}