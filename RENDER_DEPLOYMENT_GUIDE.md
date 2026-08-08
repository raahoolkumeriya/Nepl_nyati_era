# 🚀 Render.com + MongoDB Atlas Production Deployment Guide

Follow these 4 essential steps to ensure your NEPL Box Cricket League web application and MongoDB Atlas database operate seamlessly on Render.com.

---

## 1. 🌐 MongoDB Atlas IP Whitelist (CRITICAL)
Render.com backend web services run on dynamic cloud container IP addresses. You **MUST** whitelist global IP access in MongoDB Atlas so Render can connect:

1. Open [MongoDB Atlas Dashboard](https://cloud.mongodb.com).
2. Go to **Network Access** under Security in the left sidebar.
3. Click **+ Add IP Address**.
4. Click **Allow Access from Anywhere** (adds `0.0.0.0/0`).
5. Click **Confirm** and wait 1 minute for changes to take effect.

---

## 2. 🔑 Render Web Service Environment Variables
In your [Render Dashboard](https://nepl-nyati-era.onrender.com), navigate to your **Web Service** -> **Environment**:

Add the following Environment Variables:

| Key | Value | Notes |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://codelocked:***************@nyatiera.v653v8g.mongodb.net/?appName=nyatiera` | MongoDB Atlas Connection String |
| `API_KEY` | `******************************-kwo` | Server API Authentication Key |
| `VITE_API_KEY` | `**************************-kwo` | Client-side API Authentication Key |
| `VITE_API_URL` | `/api` | Relative API path (proxied automatically) |
| `NODE_ENV` | `production` | Production environment mode |

---

## 3. ⚙️ Render Web Service Configuration

- **Environment**: Node
- **Build Command**: `npm run build`
- **Start Command**: `node server/index.js`

---

## 4. 🧪 Health Check Verification
Once deployed on Render.com, navigate to:
`https://nepl-nyati-era.onrender.com/api/health`

**Expected JSON Response:**
```json
{
  "status": "ok",
  "db": "connected",
  "dbState": 1,
  "timestamp": "2026-08-08T11:00:00.000Z"
}
```

- If `db` is `"connected"`, MongoDB Atlas is connected and reading/writing live!
- If `db` is `"disconnected"`, verify Step 1 (MongoDB Atlas Network Access `0.0.0.0/0`).
