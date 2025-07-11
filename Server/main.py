
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import workflow, run


app = FastAPI(
    title="AI Workflow Automation Backend",
    description="Backend for managing AI workflows, knowledge bases, and chat interactions.",
    version="0.1.0",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(workflow.router, prefix="/api/workflow", tags=["Workflow"])
app.include_router(run.router, prefix="/api", tags=["Run"])


@app.get("/")
async def root():
    return {"message": "Welcome to the AI Workflow Automation Backend!"}
