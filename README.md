# Smart Inter-Branch Garment Tracking & Gate Pass System

**Course:** IS5109 – IS Project for Community  
**Group:** Group 14 — Department of Computing & Information Systems, Sabaragamuwa University of Sri Lanka  
**Internal Supervisor:** Mr. K.P.D.P. Patabandi  
**Industry Partner:** Trendy (SE Apparel Pvt Ltd, Adhikarigama, Sri Lanka)

---

## Project Architecture

1. **`backend/`** — Node.js + Express + Prisma ORM REST API (`port 4000`), JWT + bcrypt RBAC, HMAC-SHA256 Master QR code signer, and Offline Sync batch processor (supports both zero-config SQLite and PostgreSQL 15 via Docker).
2. **`mobile/`** — **React Native (Expo SDK 52 + New Architecture / Fabric + Hermes) Mobile Application** with native Android Studio project (`mobile/android`), rear camera QR scanning (`expo-camera`), Haptic feedback (`expo-haptics`), 203 DPI Thermal Gate Pass printing (`expo-print`), offline scan queue, and an **Automatic Standalone On-Device Database Engine** (`src/api/localEngine.js`) that works even without a PC connection.
3. **`frontend/`** — Companion Desktop React + Vite + Tailwind CSS Central Management Web Portal (`localhost:5173`).

---

## Team Member Contribution & Module Allocation (Group 14)

| Index No | Member Name | Role | Assigned Module | Demo Login Username |
| :--- | :--- | :--- | :--- | :--- |
| `22CIS0260` | **H.D.N.N. Sisirakumara** | Full Stack | **Module 01:** User Auth, RBAC, System Architecture & Database Design | `admin` |
| `22CIS0267` | **G.G.T. Theekshana** | Backend Dev | **Module 02:** Dispatch Note & Master QR Code Generation Module | `dispatcher` |
| `22CIS0289` | **K.J.H.P. Lakshan** | Mobile / PWA Dev | **Module 03:** Gate Scanner Module & Offline Sync | `security` |
| `22CIS0317` | **I.M.A.I.B. Idisooriya** | Backend / Logic | **Module 04:** Discrepancy Resolution & Automated Alert System | `receiver` |
| `22CIS0319` | **H.K.L.D. Kosgoda** | Frontend Dev | **Module 05:** Central Live Tracking Dashboard & Analytics | `manager` |

> **Default Password for all accounts:** `password123`

---

## Quick Start Guide

### 1. Start the Backend API Server (`http://localhost:4000`)
```powershell
cd backend
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm start
```

### 2. Run the Mobile Application (`mobile/`)

#### Option A: Run or Build APK via Android Studio / Gradle
- Open `mobile/android` in **Android Studio** and click **Run (`▶`)** on an Emulator or USB-connected Android phone.
- Or build the `.apk` directly from the terminal:
  ```powershell
  cd mobile
  npm install
  npm run apk:debug
  # or for a production release APK:
  npm run apk:release
  ```
- **Standalone Mode:** If the backend server is unreachable (e.g., running the APK on a phone away from the laptop), the mobile app automatically switches to its built-in on-device database (`src/api/localEngine.js`).

#### Option B: Run via Expo Go
```powershell
cd mobile
npm install
npm start
```

### 3. Run the Companion Web Portal (`http://localhost:5173`)
```powershell
cd frontend
npm install
npm run dev
```
