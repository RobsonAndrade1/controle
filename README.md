# 📱 LG Magic Remote (webOS Smart Controller)

An advanced webOS Smart TV remote control application built with **React, Vite, TypeScript, and Capacitor**, designed for Android and web. It emulates the official **LG Magic Remote (MR22GA)** with support for WebSockets (SSAP/Pointer Socket), Wake-on-LAN, network scanning, and native hardware integration.

---

## 🚀 Key Features

* **LG Magic Remote UI:** Faithful replica of the MR22GA design with responsive layout, touch/scroll emulation, and tactile feedback.
* **Dual Connection Pipeline:** WebSocket control (SSAP & Pointer Socket) combined with native bridge support.
* **Auto Discovery:** Network scanning (SSDP/Subnet discovery) to automatically locate LG webOS TVs on the local network.
* **Wake-on-LAN (WoL):** Stores the TV MAC address to turn on the TV from standby mode via UDP magic packets.
* **App Launcher:** Resolves installed apps by name dynamically with fallback IDs.

---

## 🛠️ Technical Challenges & Solutions

> *A brief overview of architectural challenges overcome during development:*

1. **Button Incompatibilities:** Standardized button payloads (`VOLUMEUP` instead of `VOLUME_UP`) and ensured button channels open before dispatching.
2. **Simulator Guardrails:** Restricted fallback/mock modes to browser environments and enforced strict real-error returns for hardware actions.
3. **webOS Protocol (SSAP):** Implemented secure pairing workflows with persistent `client-key` storage and auto-reconnecting socket paths.
4. **Self-Signed Certificates:** Integrated a custom Java native Android plugin with OkHttp to trust local TV SSL certificates over port `3001`.
5. **Race Conditions:** Added a connection generation counter to discard stale socket callbacks from superseded connections.
6. **Command Duplication:** Consolidated execution to a single primary channel, using SSAP only as a fallback reserve.
7. **Network Discovery:** Combined SSDP multicast with parallelized subnet scanning (64 threads) filtered for webOS devices.
8. **App Resolution:** Enabled dynamic app querying from the TV's installed list rather than relying strictly on hardcoded IDs.
9. **APK Cache Isolation:** Disabled PWA service workers for native Android builds (`npm run build:android`) to prevent stale assets.
10. **Bundle Optimization:** Removed bloated embedded binaries, slashing production bundle size from **6.6 MB to 443 kB**.
11. **Wake-on-LAN (Standby Power-On):** Captured TV MAC addresses during active sessions and implemented UDP magic packet broadcasting to wake up sleeping TVs.

---

## 🧪 Testing & Quality Assurance

This project includes a robust automated testing suite configured with **Vitest**, **React Testing Library**, and hardware mocks, ensuring high reliability.

### Running Tests & Validation
To run the full suite of unit and component tests, typecheck validation, and production builds, use the following commands:

```bash
# Run strict TypeScript type checking
npm run lint

# Run automated tests (Vitest)
npm test

# Build production bundle
npm run build
```
---

📦 Getting Started
Prerequisites
Node.js (v18+ recommended)

Android Studio / Android SDK (for native mobile builds)

---

Installation & Local Development

# Clone the repository
git clone [https://github.com/RobsonAndrade1/controle-lg-magic.git](https://github.com/RobsonAndrade1/controle-lg-magic.git)

# Navigate to project directory
cd controle

# Install dependencies
npm install

# Start local development server
npm run dev