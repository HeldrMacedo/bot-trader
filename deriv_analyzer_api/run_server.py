#!/usr/bin/env python3
"""
Script to run the Deriv Analyzer API server
"""
import asyncio
import uvicorn
import sys
import os

# Add the workspace to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def main():
    print("🚀 Starting Deriv Real-Time Analyzer API Server...")
    print("API will be available at: http://localhost:8000")
    print("WebSocket updates available at: ws://localhost:8000/ws/updates")
    
    # Run the FastAPI server with uvicorn
    uvicorn.run(
        "deriv_analyzer_api.server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )

if __name__ == "__main__":
    main()