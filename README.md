# 💬 CNS Multi‑Party Chat Application

A full‑featured multi‑party chat application demonstrating **Computer Networks & Security (CNS)** concepts with real‑time messaging, encryption demos, and custom protocol simulation.

**[🌐 Live Demo](https://cnsmini.netlify.app/) | [📧 Contact](mailto:vidhyanjha@gmail.com) | [⭐ GitHub](https://github.com/FlamingSlayer)**

![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.8+-blue?style=flat-square)
![WebSocket](https://img.shields.io/badge/WebSocket-11.0-green?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## ✨ Features

- **Multi‑Party Chat Rooms** with real‑time messaging  
- **Private Messaging** between users  
- **Session Persistence** after refresh  
- **User Authentication** with hashing  
- **Caesar Cipher & RSA Demos**  
- **DNS & DHCP Simulations**  
- **Custom Protocol (`CNS‑CHAT/1.0`)**  
- **WebSocket Bridge** for browser ↔ server  

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **HTML5** | Page structure |
| **CSS3** | Styling |
| **JavaScript ES6+** | Frontend logic |
| **Python 3.8+** | Server + TCP |
| **WebSockets** | Real‑time communication |
| **Crypto (RSA/MD5/SHA)** | Security demos |

---

## 📁 Project Structure

```
CNS-Miniproject/
├── chat_server.py      # TCP Server (port 9999)
├── ws_bridge.py        # WebSocket Bridge (port 8765)
├── app.js              # Frontend Logic + Crypto Demos
├── index.html          # Chat UI
├── style.css           # UI Styling
├── requirements.txt    # Python dependencies
└── README.md           # Documentation
```

---

## 🚀 Quick Start

### 1️⃣ Clone Repository
```bash
git clone https://github.com/FlamingSlayer/ChatApp_Demo.git
cd CNS-Miniproject
```

### 2️⃣ Install Dependencies
```bash
pip install -r requirements.txt
```

### 3️⃣ Start TCP Server
```bash
python chat_server.py
```

### 4️⃣ Start WebSocket Bridge (new terminal)
```bash
python ws_bridge.py
```

### 5️⃣ Start Frontend
```bash
python -m http.server 8000
```

Open: `http://localhost:8000`

---

## 🌐 Live Demo

🔗 **https://cnsmini.netlify.app/**

---

## 🔐 CNS Concepts Implemented

- TCP Client‑Server model  
- Custom CNS protocol headers  
- DNS simulation  
- DHCP IP assignment  
- Authentication & Authorization  
- Caesar Cipher + RSA  
- Hashing (MD5/SHA‑256)  

---

## 📊 Demo Accounts

| Username | Password |
|---------|----------|
| Flaming | Flaming123 |
| Vidhyan | Vidhyan123 |
| Omkar | Omkar123 |

---

## 🤝 Contributing

1. Fork the repository  
2. Create feature branch: `git checkout -b feature/YourFeature`  
3. Commit changes: `git commit -m 'Add YourFeature'`  
4. Push branch: `git push origin feature/YourFeature`  
5. Open Pull Request  

---

## 📄 License

This project is open source under the **MIT License**.

---

## 👨‍💻 Author

**Vidhyan Jha** (FlamingSlayer)

- 🎓 3rd Year B.E. (Information Technology) Student  
- 💻 Full‑Stack Developer  
- 🔗 **GitHub**: [@FlamingSlayer](https://github.com/FlamingSlayer)  
- 📧 **Email**: vidhyanjha@gmail.com  
- 💼 **LinkedIn**: [Vidhyan Jha](https://www.linkedin.com/in/vidhyanjha)  
- 📸 **Instagram**: [@flaming_slayer_7](https://www.instagram.com/flaming_slayer_7/)  
- 💬 **Telegram**: [@Flaming_7](https://t.me/Flaming_7)  

---

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/FlamingSlayer/ChatApp_Demo/issues)  
- 💬 **Discussions**: [GitHub Discussions](https://github.com/FlamingSlayer/ChatApp_Demo/discussions)  
- 📧 **Email**: vidhyanjha@gmail.com  

---

**Built with ❤️ by Vidhyan Jha** | *"Crafting Efficient and Dynamic Web Experiences"*

If you find this helpful, please star ⭐ this repository!