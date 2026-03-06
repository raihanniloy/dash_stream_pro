#!/bin/bash

# Start Python data service
echo "Starting Python data service..."
cd services/data-service
source .venv/bin/activate
uvicorn main:app --reload --port 8000 &
PYTHON_PID=$!
cd ../..

# Start Next.js
echo "Starting Next.js..."
npm run dev &
NEXT_PID=$!

# Cleanup on exit
trap "kill $PYTHON_PID $NEXT_PID 2>/dev/null" EXIT

echo ""
echo "DashStream Pro running:"
echo "  Frontend: http://localhost:3000"
echo "  Data API: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both services."

wait
