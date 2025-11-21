#!/bin/bash
# Script to start the Deriv Analyzer API server

echo "🚀 Starting Deriv Real-Time Analyzer API Server..."
echo "Installing dependencies..."
pip install -r deriv_analyzer_api/requirements.txt

echo "Starting the API server on port 8000..."
cd deriv_analyzer_api
python run_server.py