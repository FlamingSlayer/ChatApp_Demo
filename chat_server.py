"""
Multi-Party Chat Application - TCP Server
CNS Concepts Demonstrated:
- Client-Server Paradigm (TCP)
- Application Layer Protocols (HTTP-like handshake, SMTP-like messaging)
- DHCP-like IP/Port assignment
- Authentication & Authorization (Security Principles)
- Caesar Cipher (Substitution Cipher - Unit IV)
- RSA Key Exchange simulation (Unit V)
- Network Packet logging (Protocol Headers)
"""

import socket
import threading
import json
import time
import hashlib
import random
import math
from datetime import datetime

# ─── CNS: Network Configuration (DHCP-like) ───────────────────────────────────
# FOR LOCAL NETWORK: Accessible from same WiFi (192.168.x.x)
# FOR GLOBAL ACCESS: Use ngrok tunnel or port forwarding
#   Step 1: ngrok tcp 9999
#   Step 2: Users connect via ngrok URL
#   OR use port forwarding on your router
SERVER_HOST = "0.0.0.0"  # Listens on all interfaces
SERVER_PORT = 9999
BUFFER_SIZE = 4096
MAX_CLIENTS = 20

# ─── CNS: Caesar Cipher (Substitution Cipher - Unit IV) ───────────────────────
def caesar_encrypt(text, shift=3):
    result = []
    for char in text:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            result.append(chr((ord(char) - base + shift) % 26 + base))
        else:
            result.append(char)
    return ''.join(result)

def caesar_decrypt(text, shift=3):
    return caesar_encrypt(text, -shift)

# ─── CNS: RSA Key Generation (Unit V - Public Key Cryptography) ───────────────
def is_prime(n):
    if n < 2: return False
    for i in range(2, int(math.sqrt(n)) + 1):
        if n % i == 0: return False
    return True

def generate_rsa_keys():
    """Simplified RSA for demonstration"""
    primes = [p for p in range(50, 200) if is_prime(p)]
    p = random.choice(primes)
    q = random.choice([x for x in primes if x != p])
    n = p * q
    phi = (p - 1) * (q - 1)
    e = 65537 % phi
    # Find d such that (d * e) % phi == 1 (modular inverse)
    d = pow(e, -1, phi) if phi > 1 else e
    return {"public": (e, n), "private": (d, n), "p": p, "q": q}

# ─── CNS: MD5 Hash (Integrity / Authentication - Unit IV) ─────────────────────
def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()

# ─── CNS: Protocol Packet Builder (Application Layer - Unit I) ────────────────
def build_packet(ptype, sender, data, room="general", encrypted=False):
    """Mimics Application Layer Protocol packet structure (like SMTP/HTTP)"""
    return json.dumps({
        "HEADER": {
            "protocol": "CNS-CHAT/1.0",
            "type": ptype,           # JOIN, MSG, LEAVE, SYS, AUTH
            "timestamp": datetime.now().isoformat(),
            "sender": sender,
            "room": room,
            "encrypted": encrypted,
            "seq": random.randint(1000, 9999)
        },
        "BODY": data
    })

# ─── User Registry (like DNS - maps names to addresses) ─────────────────────
users_db = {
    "Flaming": hash_password("Flaming123"),
    "Vidhyan": hash_password("Vidhyan123"),
    "Omkar":   hash_password("Omkar123"),
    "admin": hash_password("admin123"),
}

# ─── Server State ─────────────────────────────────────────────────────────────
clients = {}       # {conn: {"username": str, "room": str, "addr": tuple, "rsa": dict}}
rooms = {"general": set(), "tech": set(), "random": set()}
lock = threading.Lock()

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def broadcast(packet, room=None, exclude=None):
    """Broadcast to all clients in a room (like multicast)"""
    with lock:
        targets = []
        for conn, info in clients.items():
            if conn == exclude:
                continue
            if room is None or info.get("room") == room:
                targets.append(conn)
    for conn in targets:
        try:
            conn.sendall((packet + "\n").encode())
        except:
            pass

def send_to(conn, packet):
    try:
        conn.sendall((packet + "\n").encode())
    except:
        pass

def handle_client(conn, addr):
    """Handle each client in a separate thread (Concurrency - Client-Server)"""
    username = None
    rsa_keys = generate_rsa_keys()

    log(f"New TCP connection from {addr[0]}:{addr[1]}")

    # ── CNS: Send RSA Public Key to client (Diffie-Hellman-like handshake) ──
    handshake = build_packet("HANDSHAKE", "SERVER", {
        "message": "CNS-CHAT Server Ready",
        "rsa_public_key": {"e": rsa_keys["public"][0], "n": rsa_keys["public"][1]},
        "server_info": {
            "protocol": "TCP",
            "port": SERVER_PORT,
            "cipher": "Caesar-3",
            "hash": "MD5"
        },
        "available_rooms": list(rooms.keys())
    })
    send_to(conn, handshake)

    buffer = ""
    try:
        while True:
            data = conn.recv(BUFFER_SIZE).decode(errors='ignore')
            if not data:
                break
            buffer += data
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line:
                    continue
                try:
                    pkt = json.loads(line)
                    process_packet(conn, addr, pkt, rsa_keys)
                    username = clients.get(conn, {}).get("username", username)
                except json.JSONDecodeError:
                    pass
    except Exception as e:
        log(f"Client error {addr}: {e}")
    finally:
        cleanup_client(conn, username)

def process_packet(conn, addr, pkt, rsa_keys):
    """Process incoming packets - Application Layer Protocol Handler"""
    header = pkt.get("HEADER", {})
    body = pkt.get("BODY", {})
    ptype = header.get("type", "")
    
    if ptype == "AUTH":
        handle_auth(conn, addr, body, rsa_keys)
    elif ptype == "RECONNECT":
        handle_reconnect(conn, addr, body, rsa_keys)
    elif ptype == "MSG":
        handle_message(conn, body)
    elif ptype == "JOIN_ROOM":
        handle_join_room(conn, body)
    elif ptype == "PRIVATE":
        handle_private(conn, body)
    elif ptype == "CMD":
        handle_command(conn, body)

def handle_auth(conn, addr, body, rsa_keys):
    """Authentication - CNS Security: Authentication & Authorization"""
    username = body.get("username", "").strip()
    password = body.get("password", "")
    mode = body.get("mode", "login")  # login or register

    if mode == "register":
        if username in users_db:
            send_to(conn, build_packet("AUTH_FAIL", "SERVER",
                {"message": "Username already exists"}))
            return
        users_db[username] = hash_password(password)
        log(f"Registered new user: {username}")

    hashed = hash_password(password)
    if username not in users_db or users_db[username] != hashed:
        send_to(conn, build_packet("AUTH_FAIL", "SERVER",
            {"message": "Invalid credentials. Authentication failed."}))
        return

    with lock:
        # Check if already logged in
        for c, info in clients.items():
            if info.get("username") == username:
                send_to(conn, build_packet("AUTH_FAIL", "SERVER",
                    {"message": "User already logged in"}))
                return
        clients[conn] = {"username": username, "room": "general", "addr": addr, "rsa": rsa_keys}
        rooms["general"].add(username)

    log(f"AUTH OK: {username} from {addr[0]}:{addr[1]}")

    # Build user list
    all_users = [info["username"] for info in clients.values() if info.get("username")]
    room_users = [info["username"] for info in clients.values() if info.get("room") == "general"]
    
    log(f"  All users: {all_users}")
    log(f"  Room users: {room_users}")

    # Send AUTH_OK with assigned "DHCP-like" session info
    send_to(conn, build_packet("AUTH_OK", "SERVER", {
        "username": username,
        "session_id": hashlib.md5(f"{username}{time.time()}".encode()).hexdigest()[:8].upper(),
        "assigned_room": "general",
        "rsa_keys": {
            "your_private": {"d": rsa_keys["private"][0], "n": rsa_keys["private"][1]},
            "server_public": {"e": rsa_keys["public"][0], "n": rsa_keys["public"][1]},
            "p": rsa_keys["p"], "q": rsa_keys["q"]
        },
        "online_users": all_users,
        "message": f"Welcome {username}! Connected via TCP on port {SERVER_PORT}"
    }))

    # Notify room (like SMTP RCPT TO broadcast)
    broadcast(build_packet("JOIN", "SERVER", {
        "username": username,
        "message": f"{username} joined the chat",
        "online_count": len(clients)
    }, room="general"), room="general", exclude=conn)

    # Send room member list
    send_to(conn, build_packet("ROOM_INFO", "SERVER", {
        "room": "general",
        "members": room_users
    }))

def handle_reconnect(conn, addr, body, rsa_keys):
    """Handle session reconnection after page refresh"""
    username = body.get("username", "").strip()
    session_id = body.get("session_id", "")
    
    if not username:
        send_to(conn, build_packet("ERROR", "SERVER", {"message": "No username provided"}))
        return
    
    # Check if user exists in users database
    if username not in users_db:
        send_to(conn, build_packet("ERROR", "SERVER", {"message": "User not found"}))
        return
    
    log(f"RECONNECT: {username} from {addr[0]}:{addr[1]} (session: {session_id[:8]}...)")
    
    with lock:
        # Check if already logged in elsewhere
        for c, info in clients.items():
            if info.get("username") == username and c != conn:
                # Force disconnect old connection
                try:
                    c.close()
                except:
                    pass
                del clients[c]
                log(f"  Kicked old connection for {username}")
        
        # Add/update current connection
        clients[conn] = {"username": username, "room": "general", "addr": addr, "rsa": rsa_keys}
        if username not in rooms["general"]:
            rooms["general"].add(username)
        
        all_users = [info["username"] for info in clients.values() if info.get("username")]
        room_users = [info["username"] for info in clients.values() if info.get("room") == "general"]
    
    log(f"  Now online: {all_users}")
    
    # Send reconnect confirmation
    send_to(conn, build_packet("AUTH_OK", "SERVER", {
        "username": username,
        "session_id": session_id,
        "assigned_room": "general",
        "rsa_keys": {
            "your_private": {"d": rsa_keys["private"][0], "n": rsa_keys["private"][1]},
            "server_public": {"e": rsa_keys["public"][0], "n": rsa_keys["public"][1]},
            "p": rsa_keys["p"], "q": rsa_keys["q"]
        },
        "online_users": all_users,
        "message": f"✓ Reconnected as {username}"
    }))
    
    # Notify other users
    broadcast(build_packet("JOIN", "SERVER", {
        "username": username,
        "message": f"{username} reconnected",
        "online_count": len(clients)
    }, room="general"), room="general", exclude=conn)
    
    # Send room members to newly reconnected user
    send_to(conn, build_packet("ROOM_INFO", "SERVER", {
        "room": "general",
        "members": room_users
    }))

def handle_message(conn, body):
    """Handle chat messages with optional Caesar encryption"""
    with lock:
        info = clients.get(conn)
    if not info:
        return

    username = info["username"]
    room = info["room"]
    text = body.get("text", "").strip()
    encrypted = body.get("encrypted", False)

    if not text:
        return

    # Decrypt if encrypted (Caesar Cipher - Unit IV)
    display_text = caesar_decrypt(text) if encrypted else text

    log(f"MSG [{room}] {username}: {display_text[:50]}")

    # Broadcast to room (like SMTP relay)
    packet = build_packet("MSG", username, {
        "text": display_text,
        "encrypted_text": caesar_encrypt(display_text),
        "cipher": "Caesar-3",
        "room": room
    }, room=room)
    broadcast(packet, room=room)

def handle_join_room(conn, body):
    """Handle room switching (like IRC channel join)"""
    with lock:
        info = clients.get(conn)
    if not info:
        return

    username = info["username"]
    old_room = info["room"]
    new_room = body.get("room", "general")

    if new_room not in rooms:
        send_to(conn, build_packet("ERROR", "SERVER",
            {"message": f"Room '{new_room}' does not exist"}))
        return

    with lock:
        rooms[old_room].discard(username)
        info["room"] = new_room
        rooms[new_room].add(username)

    broadcast(build_packet("LEAVE", "SERVER", {
        "username": username,
        "message": f"{username} left {old_room}"
    }, room=old_room), room=old_room)

    broadcast(build_packet("JOIN", "SERVER", {
        "username": username,
        "message": f"{username} joined {new_room}"
    }, room=new_room), exclude=conn)

    with lock:
        room_users = [i["username"] for i in clients.values() if i.get("room") == new_room]

    send_to(conn, build_packet("ROOM_JOINED", "SERVER", {
        "room": new_room,
        "members": room_users,
        "message": f"Switched to room: {new_room}"
    }))

    log(f"ROOM: {username} moved {old_room} -> {new_room}")

def handle_private(conn, body):
    """Peer-to-Peer private message (P2P Paradigm - Unit I)"""
    with lock:
        sender_info = clients.get(conn)
    if not sender_info:
        return

    sender = sender_info["username"]
    target = body.get("to", "")
    text = body.get("text", "")

    # Find target connection
    target_conn = None
    with lock:
        for c, info in clients.items():
            if info.get("username") == target:
                target_conn = c
                break

    if not target_conn:
        send_to(conn, build_packet("ERROR", "SERVER",
            {"message": f"User '{target}' not found or offline"}))
        return

    pm_packet = build_packet("PRIVATE", sender, {
        "text": text,
        "from": sender,
        "to": target,
        "note": "P2P Direct Message (routed via server)"
    })
    send_to(target_conn, pm_packet)
    send_to(conn, pm_packet)  # Echo back to sender

def handle_command(conn, body):
    """Handle /commands"""
    with lock:
        info = clients.get(conn)
    if not info:
        return

    cmd = body.get("cmd", "")
    
    if cmd == "users":
        with lock:
            user_list = [(i["username"], i["room"]) for i in clients.values()]
        send_to(conn, build_packet("SYS", "SERVER", {
            "command": "users",
            "data": [{"username": u, "room": r} for u, r in user_list]
        }))
    elif cmd == "rooms":
        with lock:
            room_data = {r: list(members) for r, members in rooms.items()}
        send_to(conn, build_packet("SYS", "SERVER", {
            "command": "rooms",
            "data": room_data
        }))
    elif cmd == "whoami":
        send_to(conn, build_packet("SYS", "SERVER", {
            "command": "whoami",
            "data": {"username": info["username"], "room": info["room"],
                     "addr": f"{info['addr'][0]}:{info['addr'][1]}"}
        }))

def cleanup_client(conn, username):
    """Clean up disconnected client"""
    with lock:
        info = clients.pop(conn, {})
        room = info.get("room", "general")
        if username:
            rooms.get(room, set()).discard(username)
    conn.close()
    if username:
        log(f"DISCONNECT: {username} left")
        broadcast(build_packet("LEAVE", "SERVER", {
            "username": username,
            "message": f"{username} disconnected",
            "online_count": len(clients)
        }, room=room), room=room)

def start_server():
    """Start TCP Server (Client-Server Paradigm - Unit I)"""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)  # TCP
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((SERVER_HOST, SERVER_PORT))
    server.listen(MAX_CLIENTS)

    print("=" * 60)
    print("  CNS Multi-Party Chat Server")
    print("  Savitribai Phule Pune University - IT 2019 Course")
    print("=" * 60)
    print(f"  Protocol  : TCP (Client-Server Paradigm)")
    print(f"  Port      : {SERVER_PORT}")
    print(f"  Cipher    : Caesar Cipher (Shift-3)")
    print(f"  Auth      : MD5 Hash")
    print(f"  Crypto    : RSA Key Pairs")
    print(f"  Rooms     : {list(rooms.keys())}")
    print("=" * 60)
    print(f"  Default users: Flaming/Flaming123, Vidhyan/Vidhyan123, Omkar/Omkar123")
    print("=" * 60)
    print(f"  Server listening on port {SERVER_PORT}...")
    print()

    while True:
        try:
            conn, addr = server.accept()
            t = threading.Thread(target=handle_client, args=(conn, addr), daemon=True)
            t.start()
        except KeyboardInterrupt:
            print("\nServer shutting down...")
            break
    server.close()

if __name__ == "__main__":
    start_server()
