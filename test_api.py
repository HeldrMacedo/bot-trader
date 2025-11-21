#!/usr/bin/env python3
"""
Test script to verify the Deriv Analyzer API works correctly
"""
import asyncio
import json
import websockets
from datetime import datetime

async def test_websocket_connection():
    """Test WebSocket connection to the API"""
    try:
        print("Testing WebSocket connection...")
        async with websockets.connect("ws://localhost:8000/ws/updates") as websocket:
            print("✅ Connected to WebSocket server")
            
            # Wait for a few messages to confirm the connection works
            for i in range(3):
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(message)
                    print(f"✅ Received message {i+1}: {type(data)}")
                    if 'analyses' in data:
                        print(f"   - Symbols monitored: {list(data['analyses'].keys())}")
                    if 'signals' in data:
                        print(f"   - Signals: {len(data['signals'])}")
                    break  # If we get a valid message, connection is working
                except asyncio.TimeoutError:
                    print("⚠️  Timeout waiting for message, but connection is open")
                    break
            
            return True
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        return False

async def test_api_endpoints():
    """Test HTTP API endpoints"""
    import aiohttp
    
    base_url = "http://localhost:8000"
    
    endpoints = [
        "/status",
        "/config",
        "/performance",
        "/analysis"
    ]
    
    async with aiohttp.ClientSession() as session:
        for endpoint in endpoints:
            try:
                async with session.get(f"{base_url}{endpoint}") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ {endpoint}: {response.status} - OK")
                    else:
                        print(f"❌ {endpoint}: {response.status}")
            except Exception as e:
                print(f"❌ {endpoint}: Error - {e}")

async def main():
    print("🚀 Testing Deriv Analyzer API")
    print("="*50)
    
    # Test WebSocket connection
    ws_ok = await test_websocket_connection()
    
    if ws_ok:
        print("\n📡 Testing API endpoints...")
        await test_api_endpoints()
    else:
        print("\n❌ Cannot test endpoints - WebSocket connection failed")
        print("💡 Make sure the API server is running on http://localhost:8000")
    
    print("\n" + "="*50)
    print("Test completed!")

if __name__ == "__main__":
    asyncio.run(main())