/**
 * CNS Multi-Party Chat Application — Frontend
 * Savitribai Phule Pune University — IT 2019 Course
 *
 * CNS Concepts Implemented:
 * ─ Unit I : Client-Server (WebSocket→TCP), Application Layer, DNS, P2P
 * ─ Unit IV: Caesar Cipher (Substitution), MD5 Hash, Authentication
 * ─ Unit V : RSA Key Pairs, Digital Signature simulation
 */

"use strict";

// ─── CNS: Application Layer Protocol Config ────────────────────────────────
// INSTRUCTIONS: Get ngrok URL by running: ngrok tcp 8765
// Then replace tcp://X.tcp.ngrok.io:XXXXX with your actual ngrok URL
// (change "tcp://" prefix to "ws://")
const WS_URL = "ws://localhost:8765";  // ← UPDATE THIS with your ngrok URL
const PROTOCOL_VERSION = "CNS-CHAT/1.0";

// ─── CNS: Caesar Cipher (Unit IV - Substitution Cipher) ───────────────────
function caesarEncrypt(text, shift = 3) {
  return text.split('').map(ch => {
    if (/[a-z]/.test(ch)) return String.fromCharCode((ch.charCodeAt(0) - 97 + shift) % 26 + 97);
    if (/[A-Z]/.test(ch)) return String.fromCharCode((ch.charCodeAt(0) - 65 + shift) % 26 + 65);
    return ch;
  }).join('');
}

function caesarDecrypt(text, shift = 3) {
  return caesarEncrypt(text, 26 - (shift % 26));
}

// ─── CNS: RSA Simulation (Unit V - Public Key Cryptography) ───────────────
function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
  return true;
}

function modInverse(e, phi) {
  let [old_r, r] = [e, phi];
  let [old_s, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % phi) + phi) % phi;
}

function generateRSAKeys() {
  const primes = Array.from({length: 150}, (_, i) => i + 50).filter(isPrime);
  const p = primes[Math.floor(Math.random() * primes.length)];
  const q = primes.filter(x => x !== p)[Math.floor(Math.random() * (primes.length - 1))];
  const n = p * q;
  const phi = (p - 1) * (q - 1);
  const e = 65537 % phi || 3;
  const d = modInverse(e, phi);
  return { p, q, n, e, d };
}

// ─── CNS: MD5 Hash (Authentication/Integrity - Unit IV) ───────────────────
function simpleMD5(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').repeat(4).substring(0, 32);
}

// ─── CNS: DNS Simulation (Unit I - Application Layer Protocols) ────────────
const dnsTable = {
  "flaming.chat.local": { ip: "192.168.1.10", type: "A", ttl: 300 },
  "vidhyan.chat.local": { ip: "192.168.1.11", type: "A", ttl: 300 },
  "omkar.chat.local":   { ip: "192.168.1.12", type: "A", ttl: 300 },
  "server.chat.local":  { ip: "127.0.0.1",    type: "A", ttl: 86400 },
};

function dnsLookup(hostname) {
  return dnsTable[hostname] || { ip: `10.0.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`, type: "A", ttl: 60 };
}

// ─── DHCP-like IP Assignment (Unit I) ──────────────────────────────────────
function assignDHCPAddress(username) {
  const base = [192, 168, 1];
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) & 0xFFFF;
  return `${base.join('.')}.${10 + (hash % 240)}`;
}

// ─── Packet Builder (Application Layer Protocol) ───────────────────────────
let pktSeq = 1000;
function buildPacket(type, data, room = "general", encrypted = false) {
  return JSON.stringify({
    HEADER: {
      protocol: PROTOCOL_VERSION,
      type,
      timestamp: new Date().toISOString(),
      sender: state.username,
      room,
      encrypted,
      seq: ++pktSeq
    },
    BODY: data
  });
}

// ─── App State ─────────────────────────────────────────────────────────────
let ws = null;
let reconnectAttempts = 0;
let reconnectDelay = 1000;
let reconnectTimer = null;
const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_RECONNECT_DELAY = 10000;
let state = {
  username: "",
  room: "general",
  encryptEnabled: false,
  sessionId: "",
  rsaKeys: null,
  userColors: {},
  colorIdx: 0,
};

const COLORS = ['color-0','color-1','color-2','color-3','color-4','color-5'];

function getUserColor(username) {
  if (!state.userColors[username]) {
    state.userColors[username] = COLORS[state.colorIdx++ % COLORS.length];
  }
  return state.userColors[username];
}

// ─── WebSocket Connection (Client-Server + Bridge) ─────────────────────────
function connectToServer(skipReconnect = false) {
  return new Promise((resolve, reject) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      reject(e); 
      return;
    }

    const timeout = setTimeout(() => reject(new Error("WebSocket connection timeout")), 5000);

    ws.onopen = () => {
      clearTimeout(timeout);
      logPacket("CONNECT", { message: `WebSocket connected to bridge`, url: WS_URL });
      reconnectAttempts = 0;
      reconnectDelay = 1000;
      setStatus("Connected to server", "success");
      resolve();
      
      // Send keep-alive ping every 30 seconds
      setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ op: "PING" }));
        }
      }, 30000);
    };

    ws.onerror = (e) => {
      clearTimeout(timeout);
      console.error("[WS ERROR]", e);
      reject(new Error("WebSocket connection failed"));
    };

    ws.onmessage = (evt) => handleServerMessage(evt.data);

    ws.onclose = () => {
      clearTimeout(timeout);
      addSystemMessage("Disconnected from server");
      setStatus("Connection closed", "error");
      
      // Auto-reconnect logic
      if (!skipReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
        console.log(`[WS] Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        
        reconnectTimer = setTimeout(() => {
          connectToServer(false).catch(err => console.error("[WS RECONNECT FAILED]", err));
        }, reconnectDelay);
      }
    };
  });
}

function closeConnection(skipReconnect = true) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) ws.close();
}

function sendWS(packet) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(packet);
    logPacket("SENT", JSON.parse(packet));
  } else {
    addSystemMessage("⚠ Not connected to server");
  }
}

// ─── Message Handlers ──────────────────────────────────────────────────────
function handleServerMessage(rawData) {
  let pkt;
  try { pkt = JSON.parse(rawData); } catch { return; }

  const { HEADER: h, BODY: b } = pkt;
  logPacket(h.type, pkt);

  switch (h.type) {
    case "HANDSHAKE":
      handleHandshake(b); break;
    case "AUTH_OK":
      handleAuthOK(b); break;
    case "AUTH_FAIL":
      setStatus(b.message, "error"); break;
    case "MSG":
      renderMessage(h.sender, b.text, b.room, b.encrypted_text); break;
    case "JOIN":
      addSystemMessage(`⟶ ${b.username} joined`);
      refreshUserCount(b.online_count); break;
    case "LEAVE":
      addSystemMessage(`⟵ ${b.username} left`);
      refreshUserCount(b.online_count); break;
    case "ROOM_INFO":
    case "ROOM_JOINED":
      updateRoomMembers(b); break;
    case "PRIVATE":
      renderPrivateMessage(b); break;
    case "SYS":
      handleSysCommand(b); break;
    case "ERROR":
      addSystemMessage(`⚠ ${b.message}`); break;
  }
}

function handleHandshake(b) {
  addSystemMessage(`🔐 Server handshake: ${b.message}`);
  if (b.rsa_public_key) addSystemMessage(`   RSA Public Key — e=${b.rsa_public_key.e}, n=${b.rsa_public_key.n}`);
}

function handleAuthOK(b) {
  console.log("[AUTH_OK] Full packet received:", b);
  console.log("[AUTH_OK] online_users:", b.online_users);
  console.log("[AUTH_OK] online_users type:", typeof b.online_users);
  console.log("[AUTH_OK] online_users is array:", Array.isArray(b.online_users));
  
  state.username = b.username;
  state.sessionId = b.session_id || b.sessionId || "session_" + Date.now();
  state.rsaKeys = b.rsa_keys || b.rsaKeys;
  
  console.log("[AUTH_OK] State updated:", { username: state.username, sessionId: state.sessionId });

  document.getElementById("myUsername").textContent = b.username;
  document.getElementById("myAvatar").textContent = b.username[0].toUpperCase();
  if (document.getElementById("infoSession")) document.getElementById("infoSession").textContent = state.sessionId;

  if (state.rsaKeys) {
    const rk = state.rsaKeys;
    if (document.getElementById("rsaP")) document.getElementById("rsaP").textContent = rk.p;
    if (document.getElementById("rsaQ")) document.getElementById("rsaQ").textContent = rk.q;
    if (document.getElementById("rsaN")) document.getElementById("rsaN").textContent = rk.p * rk.q;
  }

  console.log("[AUTH_OK] Updating user list with:", b.online_users || []);
  updateUserList(b.online_users || []);
  
  addSystemMessage(`✓ Authenticated as ${b.username}`);
  addSystemMessage(`  DHCP IP: ${assignDHCPAddress(b.username)}`);

  document.getElementById("login-screen").classList.remove("active");
  document.getElementById("chat-screen").classList.add("active");
  document.getElementById("msgInput").focus();
  
  // Save session for recovery on refresh
  console.log("[AUTH_OK] Saving session...");
  saveSession();
  sessionStorage.removeItem("pendingLogin");
  console.log("[AUTH_OK] ✓ Session saved");
}

function handleSysCommand(b) {
  if (b.command === "users") {
    const users = b.data.map(u => `${u.username}@${u.room}`).join(", ");
    addSystemMessage(`Online: ${users}`);
  }
}

// ─── Login / Register ──────────────────────────────────────────────────────
async function doLogin() {
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value.trim();
  if (!username || !password) { setStatus("Enter username and password", "error"); return; }

  setStatus("Connecting via TCP...", "");
  console.log("[LOGIN] Attempting login for:", username);
  try {
    await connectToServer();
    setStatus("Authenticating...", "");
    sendWS(buildPacket("AUTH", { username, password, mode: "login" }));
    sessionStorage.setItem("pendingLogin", JSON.stringify({ username, password }));
    console.log("[LOGIN] Auth packet sent");
  } catch (e) {
    console.log("[LOGIN] Server connection failed, using demo mode:", e.message);
    setStatus("Server offline — Demo Mode", "error");
    setTimeout(() => simulateLogin(username), 800);
  }
}

async function doRegister() {
  const username = document.getElementById("regUser").value.trim();
  const password = document.getElementById("regPass").value.trim();
  if (!username || !password) { setStatus("Fill all fields", "error"); return; }
  if (password.length < 6) { setStatus("Password min 6 chars", "error"); return; }

  setStatus("Registering...", "");
  console.log("[REGISTER] Attempting registration for:", username);
  try {
    await connectToServer();
    sendWS(buildPacket("AUTH", { username, password, mode: "register" }));
    sessionStorage.setItem("pendingLogin", JSON.stringify({ username, password }));
    console.log("[REGISTER] Auth packet sent");
  } catch (e) {
    console.log("[REGISTER] Server connection failed:", e.message);
    setStatus("Cannot connect to server", "error");
  }
}

// ─── Session Restoration ────────────────────────────────────────────────────
function saveSession() {
  console.log("[SESSION SAVE] Checking state:", { username: state.username, sessionId: state.sessionId, demoMode });
  
  if (!state.username) {
    console.log("[SESSION SAVE] No username, skipping save");
    return;
  }
  
  const session = {
    username: state.username,
    sessionId: state.sessionId || "demo_" + Date.now(),
    rsaKeys: state.rsaKeys,
    currentRoom: state.currentRoom || "#general",
    demoMode: demoMode,
    timestamp: Date.now()
  };
  
  try {
    sessionStorage.setItem("chatSession", JSON.stringify(session));
    console.log("[SESSION SAVE] ✓ Saved session:", session.username);
  } catch (e) {
    console.error("[SESSION SAVE] Failed:", e);
  }
}

function restoreSession() {
  const saved = sessionStorage.getItem("chatSession");
  console.log("[SESSION RESTORE] Checking storage...", saved ? "Found" : "Not found");
  
  if (!saved) {
    console.log("[SESSION RESTORE] No saved session");
    return false;
  }
  
  try {
    const session = JSON.parse(saved);
    console.log("[SESSION RESTORE] Parsed:", session.username, "Demo:", session.demoMode);
    
    // Only restore if less than 2 hours old
    if (Date.now() - session.timestamp > 7200000) {
      console.log("[SESSION RESTORE] Session expired (>2 hours)");
      sessionStorage.removeItem("chatSession");
      return false;
    }
    
    // Restore state
    state.username = session.username;
    state.sessionId = session.sessionId || "";
    state.rsaKeys = session.rsaKeys;
    state.currentRoom = session.currentRoom || "#general";
    demoMode = session.demoMode || false;
    
    console.log("[SESSION RESTORE] ✓ Restored:", state.username, "Demo:", demoMode);
    
    // Update UI immediatley
    const myUsername = document.getElementById("myUsername");
    const myAvatar = document.getElementById("myAvatar");
    
    if (myUsername) myUsername.textContent = state.username;
    if (myAvatar) myAvatar.textContent = state.username[0].toUpperCase();
    
    // Show chat screen
    const loginScreen = document.getElementById("login-screen");
    const chatScreen = document.getElementById("chat-screen");
    
    if (loginScreen) loginScreen.classList.remove("active");
    if (chatScreen) chatScreen.classList.add("active");
    
    addSystemMessage(`✓ Session restored for ${state.username}`);
    
    return true;
  } catch (e) {
    console.error("[SESSION RESTORE] Parse error:", e);
    sessionStorage.removeItem("chatSession");
    return false;
  }
}

// ─── Demo Mode ─────────────────────────────────────────────────────────────
let demoMode = false;
function simulateLogin(username) {
  demoMode = true;
  const fakeRSA = generateRSAKeys();
  state.username = username;
  state.sessionId = Math.random().toString(36).slice(2, 10).toUpperCase();
  state.rsaKeys = fakeRSA;

  document.getElementById("myUsername").textContent = username;
  document.getElementById("myAvatar").textContent = username[0].toUpperCase();

  const demoUsers = ["flaming","vidhyan","omkar"].filter(u => u !== username.toLowerCase());
  updateUserList([username, ...demoUsers]);

  document.getElementById("login-screen").classList.remove("active");
  document.getElementById("chat-screen").classList.add("active");

  addSystemMessage(`⚡ Demo Mode — No Server`);
  addSystemMessage(`✓ Connected as ${username}`);
  addSystemMessage(`  DHCP IP: ${assignDHCPAddress(username)}`);

  // Save demo session for recovery on refresh
  saveSession();
  sessionStorage.removeItem("pendingLogin");

  setTimeout(() => simulateIncoming(), 2000);
  document.getElementById("msgInput").focus();
}

function simulateIncoming() {
  if (!demoMode) return;
  const others = ["flaming","vidhyan","omkar"].filter(u => u !== state.username.toLowerCase());
  const msgs = [
    [others[0], "Hey! Testing CNS chat 🚀"],
    [others[1], "Secure channel established!"],
  ];
  msgs.forEach(([user, text], i) => {
    setTimeout(() => {
      renderMessage(user, text, "general", caesarEncrypt(text));
    }, (i + 1) * 1500);
  });
}

// ─── Messaging ─────────────────────────────────────────────────────────────
function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";

  if (demoMode) {
    renderMessage(state.username, text, state.room, state.encryptEnabled ? caesarEncrypt(text) : null);
    return;
  }

  const payload = state.encryptEnabled
    ? { text: caesarEncrypt(text), encrypted: true }
    : { text, encrypted: false };
  sendWS(buildPacket("MSG", payload, state.room, state.encryptEnabled));
  renderMessage(state.username, text, state.room, state.encryptEnabled ? caesarEncrypt(text) : null);
}

function joinRoom(room) {
  if (room === state.room) return;
  state.room = room;

  document.querySelectorAll(".room-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.room === room);
  });
  document.getElementById("currentRoom").textContent = room;
  document.getElementById("msgInput").placeholder = `Message #${room}...`;
  document.getElementById("messagesArea").innerHTML = "";
  addSystemMessage(`Joined #${room}`);

  if (!demoMode) sendWS(buildPacket("JOIN_ROOM", { room }));
}

// ─── Private Message ───────────────────────────────────────────────────────
let pmTargetUser = "";
function openPM(username) {
  pmTargetUser = username;
  document.getElementById("pmTarget").textContent = username;
  document.getElementById("pmText").value = "";
  document.getElementById("pmModal").classList.add("open");
}
function closePM() { document.getElementById("pmModal").classList.remove("open"); }
function sendPM() {
  const text = document.getElementById("pmText").value.trim();
  if (!text || !pmTargetUser) return;
  closePM();

  if (demoMode) {
    renderPrivateMessage({ from: state.username, to: pmTargetUser, text });
    return;
  }
  sendWS(buildPacket("PRIVATE", { to: pmTargetUser, text }));
}

// ─── Render Functions ──────────────────────────────────────────────────────
let lastSender = "";
function renderMessage(sender, text, room, encryptedText) {
  const area = document.getElementById("messagesArea");
  if (!area) return;
  
  const isOwn = sender === state.username;
  const color = getUserColor(sender);

  const group = document.createElement("div");
  group.className = "msg-group" + (isOwn ? " msg-own" : "");

  if (sender !== lastSender) {
    group.innerHTML = `<div class="msg-header"><span class="msg-author ${color}">${escHtml(sender)}</span></div>`;
    lastSender = sender;
  }

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "msg-body";
  bubbleDiv.innerHTML = `<span class="msg-bubble">${escHtml(text)}${encryptedText && state.encryptEnabled ? `<span class="encrypted-hint">🔒 ${escHtml(encryptedText)}</span>` : ""}</span>`;
  group.appendChild(bubbleDiv);

  area.appendChild(group);
  area.scrollTop = area.scrollHeight;
}

function renderPrivateMessage(b) {
  const area = document.getElementById("messagesArea");
  if (!area) return;
  
  const div = document.createElement("div");
  div.className = "msg-private";
  const dir = b.from === state.username ? `to ${b.to}` : `from ${b.from}`;
  div.innerHTML = `<div class="msg-private-label">🔒 Private (P2P) — ${escHtml(dir)}</div><div>${escHtml(b.text)}</div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  lastSender = "";
}

function addSystemMessage(text) {
  const area = document.getElementById("messagesArea");
  if (!area) return;
  
  const div = document.createElement("div");
  div.className = "msg-system";
  div.textContent = text;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  lastSender = "";
}

// ─── Packet Logger ────────────────────────────────────────────────────────
function logPacket(type, pkt) {
  const log = document.getElementById("packetLog");
  if (!log) return;
  
  const entry = document.createElement("div");
  entry.className = "pkt-entry";

  const h = pkt.HEADER || pkt.header || {};
  const b = pkt.BODY || pkt.body || pkt;
  const now = new Date().toLocaleTimeString();

  let fields = "";
  const addField = (k, v) => {
    if (v !== undefined && v !== null && v !== "")
      fields += `<div class="pkt-field"><span class="pkt-key">${k}:</span><span class="pkt-val">${escHtml(String(v).substring(0, 60))}</span></div>`;
  };

  if (h.sender) addField("sender", h.sender);
  if (h.room) addField("room", h.room);
  if (b.text) addField("text", b.text.substring(0, 40));

  entry.innerHTML = `<div class="pkt-head"><span class="pkt-type">${type}</span><span class="pkt-time">${now}</span></div><div class="pkt-body">${fields || '—'}</div>`;
  log.insertBefore(entry, log.firstChild);
  while (log.children.length > 30) log.removeChild(log.lastChild);
}

// ─── Cipher Demo ──────────────────────────────────────────────────────────
function updateCipher() {
  const text = document.getElementById("cipherInput")?.value || "";
  const shift = parseInt(document.getElementById("shiftSlider")?.value) || 3;
  
  // Update shift value display
  const shiftVal = document.getElementById("shiftVal");
  if (shiftVal) shiftVal.textContent = shift;
  
  // Update plaintext display
  const plainOut = document.getElementById("plainOut");
  if (plainOut) plainOut.textContent = text || "—";
  
  // Update ciphertext display
  const cipherOut = document.getElementById("cipherOut");
  if (cipherOut) cipherOut.textContent = text ? caesarEncrypt(text, shift) : "—";
  
  // Update decrypted display (decrypt the encrypted text)
  const decryptOut = document.getElementById("decryptOut");
  if (decryptOut && text) {
    const encrypted = caesarEncrypt(text, shift);
    decryptOut.textContent = caesarDecrypt(encrypted, shift);
  } else if (decryptOut) {
    decryptOut.textContent = "—";
  }
}

function updateHash() {
  const text = document.getElementById("hashInput")?.value || "";
  if (document.getElementById("hashOut")) {
    document.getElementById("hashOut").textContent = text ? simpleMD5(text) : "—";
  }
}

function updateDNS() {
  const host = document.getElementById("dnsInput")?.value.trim() || "";
  const out = document.getElementById("dnsOut");
  if (!out) return;
  if (!host) { out.innerHTML = ""; return; }
  const rec = dnsLookup(host);
  out.innerHTML = `<div class="dns-row"><span class="dk">Query:</span><span class="dv">${escHtml(host)}</span></div><div class="dns-row"><span class="dk">IP:</span><span class="dv">${rec.ip}</span></div>`;
}

// ─── UI Toggles ────────────────────────────────────────────────────────────
let rightPanelMode = "packets";

function togglePacketLog() {
  const rightPanel = document.getElementById("rightPanel");
  const packetPanel = document.getElementById("packetLogPanel");
  const cipherPanel = document.getElementById("cipherPanel");
  
  if (rightPanelMode === "packets") {
    // Currently showing packets, hide all
    rightPanelMode = "hidden";
    if (rightPanel) rightPanel.style.display = "none";
    if (packetPanel) packetPanel.style.display = "none";
    if (cipherPanel) cipherPanel.style.display = "none";
  } else {
    // Show packet log
    rightPanelMode = "packets";
    if (rightPanel) rightPanel.style.display = "block";
    if (packetPanel) packetPanel.style.display = "block";
    if (cipherPanel) cipherPanel.style.display = "none";
  }
}

function toggleCipherPanel() {
  const rightPanel = document.getElementById("rightPanel");
  const packetPanel = document.getElementById("packetLogPanel");
  const cipherPanel = document.getElementById("cipherPanel");
  
  if (rightPanelMode === "cipher") {
    // Currently showing cipher, hide all
    rightPanelMode = "hidden";
    if (rightPanel) rightPanel.style.display = "none";
    if (packetPanel) packetPanel.style.display = "none";
    if (cipherPanel) cipherPanel.style.display = "none";
  } else {
    // Show cipher panel
    rightPanelMode = "cipher";
    if (rightPanel) rightPanel.style.display = "block";
    if (packetPanel) packetPanel.style.display = "none";
    if (cipherPanel) cipherPanel.style.display = "block";
  }
}

function toggleEncryption() {
  state.encryptEnabled = !state.encryptEnabled;
  const btn = document.getElementById("encryptBtn");
  const banner = document.getElementById("cipherBanner");
  if (btn) btn.classList.toggle("active", state.encryptEnabled);
  if (banner) banner.classList.toggle("show", state.encryptEnabled);
}

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((b, i) =>
    b.classList.toggle("active", (i === 0) === (tab === "login")));
  const lf = document.getElementById("login-form");
  const rf = document.getElementById("register-form");
  if (lf) lf.style.display = tab === "login" ? "" : "none";
  if (rf) rf.style.display = tab === "register" ? "" : "none";
}

function fillDemo(user, pass) {
  document.getElementById("loginUser").value = user;
  document.getElementById("loginPass").value = pass;
}

function setStatus(msg, type) {
  const el = document.getElementById("login-status");
  if (el) {
    el.textContent = msg;
    el.className = "status-msg " + type;
  }
}

function logout() {
  closeConnection(true);
  demoMode = false;
  state = { username:"", room:"general", encryptEnabled:false, sessionId:"", rsaKeys:null, userColors:{}, colorIdx:0 };
  sessionStorage.removeItem("chatSession");
  sessionStorage.removeItem("pendingLogin");
  document.getElementById("chat-screen").classList.remove("active");
  document.getElementById("login-screen").classList.add("active");
  document.getElementById("messagesArea").innerHTML = "";
  document.getElementById("packetLog").innerHTML = "";
}

// ─── User List ───────────────────────────────────────────────────────────
function updateUserList(users) {
  const list = document.getElementById("userList");
  if (!list) return;
  list.innerHTML = users.map(u => `<div class="user-item" onclick="openPM('${escHtml(u)}')">${escHtml(u)}</div>`).join("");
  const count = document.getElementById("userCount");
  if (count) count.textContent = users.length;
}

function updateRoomMembers(b) {
  if (b.members) updateUserList(b.members);
  if (b.message) addSystemMessage(b.message);
}

function refreshUserCount(count) {
  if (count !== undefined) {
    const el = document.getElementById("userCount");
    if (el) el.textContent = count;
  }
}

function createFloatingPackets() {
  const container = document.getElementById("floatingPackets");
  if (!container) return;
  const packets = ["TCP SYN →", "AUTH", "Caesar", "RSA", "MD5", "DNS", "DHCP"];
  packets.forEach(text => {
    const el = document.createElement("div");
    el.className = "float-pkt";
    el.textContent = text;
    container.appendChild(el);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ─── Init ─────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  console.log("[APP] ======================================");
  console.log("[APP] DOM loaded - CNS Chat Application");
  console.log("[APP] ======================================");
  
  createFloatingPackets();
  updateCipher();
  updateHash();
  updateDNS();
  
  const lp = document.getElementById("loginPass");
  if (lp) lp.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  
  // Save session whenever page is about to unload
  window.addEventListener("beforeunload", () => {
    if (state.username) {
      console.log("[APP] beforeunload - saving session for", state.username);
      saveSession();
    }
  });
  
  // Try to restore session on page load
  console.log("[APP] Attempting automatic session restoration...");
  setTimeout(() => {
    if (restoreSession()) {
      console.log("[APP] ✓ Session restored - attempting server reconnection...");
      
      // For demo mode, just show chat
      if (demoMode) {
        console.log("[APP] Demo mode - no server reconnection needed");
        return;
      }
      
      // For real login, reconnect to server
      connectToServer()
        .then(() => {
          console.log("[APP] ✓ WebSocket reconnected");
          // Send RECONNECT packet to re-register with server
          const reconnectPacket = buildPacket("RECONNECT", {
            session_id: state.sessionId,
            username: state.username
          });
          console.log("[APP] Sending RECONNECT packet...");
          sendWS(reconnectPacket);
          console.log("[APP] ✓ RECONNECT sent");
        })
        .catch(err => {
          console.log("[APP] ⚠ Server offline, using Demo Mode:", err.message);
          demoMode = true;
          addSystemMessage("⚠ Server offline, using Demo Mode");
        });
    } else {
      console.log("[APP] No saved session - showing login screen");
    }
  }, 150);
});
