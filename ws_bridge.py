#!/usr/bin/env python3
"""
WebSocket-TCP Bridge for CNS Chat Application
Converts WebSocket connections (browser) to TCP connections (chat server)
"""

import asyncio
import json
import sys

try:
    from websockets.asyncio.server import serve
except ImportError:
    print("[ERROR] websockets library not found. Install with: pip install websockets")
    sys.exit(1)

# Configuration
WS_HOST = "0.0.0.0"
WS_PORT = 8765
TCP_HOST = "127.0.0.1"
TCP_PORT = 9999


class BridgeConnection:
    def __init__(self, websocket, client_id):
        self.websocket = websocket
        self.client_id = client_id
        self.reader = None
        self.writer = None
        
    async def connect_to_tcp(self):
        """Connect to TCP server"""
        try:
            self.reader, self.writer = await asyncio.open_connection(TCP_HOST, TCP_PORT)
            print(f"[TCP] {self.client_id} connected to {TCP_HOST}:{TCP_PORT}")
            return True
        except ConnectionRefusedError:
            print(f"[ERROR] {self.client_id} - TCP server at {TCP_HOST}:{TCP_PORT} offline")
            return False
        except Exception as e:
            print(f"[ERROR] {self.client_id} - TCP connection failed: {e}")
            return False
    
    async def forward_ws_to_tcp(self):
        """Forward WebSocket messages to TCP server"""
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    packet = json.dumps(data) + "\n"
                    self.writer.write(packet.encode())
                    await self.writer.drain()
                    msg_type = data.get('HEADER', {}).get('type', 'UNKNOWN')
                    print(f"[WS→TCP] {self.client_id}: {msg_type}")
                except json.JSONDecodeError:
                    print(f"[ERROR] {self.client_id} - Invalid JSON from client")
                except Exception as e:
                    print(f"[ERROR] {self.client_id} - WS→TCP forward failed: {e}")
                    break
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[ERROR] {self.client_id} - WS receive loop error: {e}")
    
    async def forward_tcp_to_ws(self):
        """Forward TCP server messages to WebSocket client"""
        buffer = ""
        try:
            while True:
                try:
                    chunk = await asyncio.wait_for(
                        self.reader.read(4096),
                        timeout=60.0
                    )
                except asyncio.TimeoutError:
                    print(f"[WARN] {self.client_id} - TCP read timeout")
                    break
                except Exception as e:
                    print(f"[ERROR] {self.client_id} - TCP read failed: {e}")
                    break
                
                if not chunk:
                    print(f"[TCP] {self.client_id} - Server closed connection")
                    break
                
                buffer += chunk.decode(errors='ignore')
                
                # Process complete lines
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    if line.strip():
                        try:
                            data = json.loads(line)
                            await self.websocket.send(json.dumps(data))
                            msg_type = data.get('HEADER', {}).get('type', 'UNKNOWN')
                            print(f"[TCP→WS] {self.client_id}: {msg_type}")
                        except json.JSONDecodeError:
                            print(f"[WARN] {self.client_id} - Invalid JSON from TCP server")
                        except Exception as e:
                            print(f"[ERROR] {self.client_id} - WS send failed: {e}")
                            break
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[ERROR] {self.client_id} - TCP→WS loop error: {e}")
        finally:
            await self.close()
    
    async def close(self):
        """Clean up connection"""
        try:
            if self.writer:
                self.writer.close()
                await self.writer.wait_closed()
        except:
            pass
        try:
            await self.websocket.close()
        except:
            pass


async def handle_client(websocket):
    """Handle new WebSocket client connection"""
    try:
        remote_addr = websocket.remote_address
        client_id = f"{remote_addr[0]}:{remote_addr[1]}" if remote_addr else "unknown"
    except:
        client_id = "unknown"
    
    print(f"[WS] {client_id} connected")
    
    bridge = BridgeConnection(websocket, client_id)
    
    try:
        if not await bridge.connect_to_tcp():
            await websocket.close()
            return
        
        ws_to_tcp = asyncio.create_task(bridge.forward_ws_to_tcp())
        tcp_to_ws = asyncio.create_task(bridge.forward_tcp_to_ws())
        
        done, pending = await asyncio.wait(
            [ws_to_tcp, tcp_to_ws],
            return_when=asyncio.FIRST_COMPLETED
        )
        
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
    
    except Exception as e:
        print(f"[ERROR] Bridge error for {client_id}: {e}")
    finally:
        await bridge.close()
        print(f"[WS] {client_id} disconnected")


async def main():
    """Start WebSocket server"""
    print(f"\n{'='*60}")
    print(f"WebSocket Bridge v2")
    print(f"  Listening: ws://{WS_HOST}:{WS_PORT}")
    print(f"  Bridging to: tcp://{TCP_HOST}:{TCP_PORT}")
    print(f"{'='*60}\n")
    
    try:
        async with serve(handle_client, WS_HOST, WS_PORT):
            print("[WS] Server started. Waiting for connections...")
            await asyncio.Future()
    except OSError as e:
        print(f"[FATAL] Failed to start server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n[WS] Server stopped")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[WS] Bridge stopped")
    except Exception as e:
        print(f"[FATAL] {e}")
        sys.exit(1)
