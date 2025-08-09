#!/usr/bin/env python3
"""
Simple HTTP server for serving the Undersea Blaster game mockup
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Configuration
PORT = 8000
DIRECTORY = Path(__file__).parent

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)
    
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    # Change to the directory containing this script
    os.chdir(DIRECTORY)
    
    # Check if mockup.html exists
    if not Path('mockup.html').exists():
        print("❌ Error: mockup.html not found in the current directory")
        print(f"Current directory: {os.getcwd()}")
        sys.exit(1)
    
    # Create server
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"🚀 Starting Undersea Blaster game server...")
        print(f"📁 Serving files from: {os.getcwd()}")
        print(f"🌐 Server running at: http://localhost:{PORT}")
        print(f"🎮 Game available at: http://localhost:{PORT}/mockup.html")
        print(f"📱 Mobile-friendly with touch controls")
        print(f"⌨️  Desktop controls: Arrow keys or A/D to move, Space to shoot")
        print(f"\n⏹️  Press Ctrl+C to stop the server")
        print("-" * 50)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n🛑 Server stopped")

if __name__ == "__main__":
    main()
