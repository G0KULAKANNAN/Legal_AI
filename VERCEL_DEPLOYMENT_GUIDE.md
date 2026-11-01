# 🚀 Vercel Production Deployment Guide for LegalAI

This guide provides end-to-end instructions for deploying the complete **LegalAI** application (React Vite Frontend + Express Node.js Backend API + PostgreSQL Prisma ORM + Google Gemini AI) using **Vercel only**.

---

## 🏛️ Architecture Overview on Vercel

```
                                  +------------------------------------+
                                  |         User Web Browser           |
                                  +------------------------------------+
                                                    |
                                                    v  HTTPS
                                  +------------------------------------+
                                  |       Vercel Edge Network          |
                                  |     (Single Domain / Origin)       |
                                  +------------------------------------+
                                    |                                |
                Static Web Assets   |                                |  API Requests: /api/*, /health
                /(.*)               v                                v
    +---------------------------------------+      +---------------------------------------+
    |         Frontend SPA (Vite)           |      |     Vercel Serverless Function        |
    |      React 18 + Tailwind CSS          |      |    Express.js + TypeScript Runtime    |
    |     Served directly from Vercel CDN   |      |        (`api/index.ts` Entry)         |
    +---------------------------------------+      +---------------------------------------+
                                                                   |
                                    +------------------------------+-------------------------------+
                                    |                              |                               |
                                    v                              v                               v
                     +----------------------------+  +---------------------------+  +----------------------------+
                     |  Cloud PostgreSQL (Prisma) |  |   Google Gemini 3.5 API   |  |   Supabase Storage Bucket  |
                     |  Supabase / Neon Pooler    |  |  Structured Legal Analysis|  |  Encrypted Document Store  |
                     +----------------------------+  +---------------------------+  +----------------------------+
```

### Key Highlights:
- **Same-Origin Architecture**: Frontend and Backend are hosted under the exact same domain (`https://your-app.vercel.app`).
  - No CORS conflicts between frontend and backend.
  - HttpOnly auth cookies (`accessToken`, `refreshToken`) work automatically with `sameSite: 'lax'` without being blocked as third-party cookies.
  - API base URL defaults seamlessly to `/api`.
- **Serverless-Optimized Backend**:
  - Express app is wrapped by `api/index.ts` and managed by `@vercel/node`.
  - Prisma Client uses a serverless global singleton pattern to prevent database connection spikes.
  - Binary targets `rhel-openssl-3.0.x` and `debian-openssl-3.0.x` ensure binary compatibility with AWS Lambda runtimes.
- **Automated Cron Reminders**:
  - Scheduled deadline reminders are triggered periodically via Vercel Cron (`/api/reminders/cron`) every 15 minutes without needing an always-on background server.
- **Storage Abstraction**:
  - Storage provider is abstracted to **Supabase Storage** for persistent document retention across stateless serverless invocations, with automatic `/tmp` fallback.

---

## 📋 Prerequisites

Before deploying to Vercel, ensure you have:
1. **GitHub Account** (with this repository pushed).
2. **Vercel Account** (free Hobby or Pro account at [vercel.com](https://vercel.com/)).
3. **Cloud PostgreSQL Database** (Free on [Supabase](https://supabase.com/) or [Neon](https://neon.tech/)).
4. **Google Gemini API Key** (Free at [Google AI Studio](https://aistudio.google.com/)).
5. **Supabase Storage Bucket** (Free bucket for document storage).

---

## 🗄️ Step 1: Set Up Cloud PostgreSQL Database

Vercel Serverless Functions require a cloud database that supports connection pooling.

### Using Supabase (Recommended):
1. Sign in to [Supabase](https://supabase.com/) and create a new project.
2. In Supabase Dashboard, go to **Project Settings** -> **Database**.
3. Scroll down to **Connection Pooling (Supavisor)**.
4. Select **Transaction Mode** (or Session mode) on port `6543`.
5. Copy the pooled connection string:
   ```
   postgresql://postgres.[your-project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
6. Run database migrations to initialize tables:
   ```bash
   cd backend
   npx prisma db push
   ```
   *(Optional: run `npm run prisma:seed` to seed default acts and subscription plans).*

---

## 📦 Step 2: Set Up Supabase Storage for Documents

Because Vercel serverless functions have ephemeral filesystems, user uploads must be stored in persistent cloud storage.

1. In your Supabase Dashboard, click on **Storage** in the left sidebar.
2. Click **New Bucket**.
3. Name it: `legalai-documents`.
4. Make it **Private**.
5. Go to **Project Settings** -> **API**:
   - Copy **Project URL** (`SUPABASE_URL`)
   - Copy **service_role secret key** (`SUPABASE_SERVICE_KEY`) — *Note: Use service_role, not anon key, so the backend can manage files securely.*

---

## 🐙 Step 3: Push Repository to GitHub

Ensure all your latest files (including `vercel.json`, `package.json`, and `api/index.ts`) are committed and pushed to your GitHub repository:

```bash
git add .
git commit -m "Configure fullstack application for Vercel deployment"
git push origin main
```

---

## ▲ Step 4: Deploy on Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New...** -> **Project**.
2. Select your GitHub repository and click **Import**.
3. In the **Configure Project** screen:
   - **Project Name**: `legalai` (or your chosen name)
   - **Framework Preset**: `Vite` (automatically detected)
   - **Root Directory**: `./` (leave as root)
   - **Build and Output Settings**: Defaults will be used (`npm run vercel-build` -> `frontend/dist`).
4. Expand **Environment Variables** and add the following:

| Variable Name | Example / Recommended Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production environment flag |
| `DATABASE_URL` | `postgresql://postgres.[ref]:[pass]@aws-0-[reg].pooler.supabase.com:6543/postgres?pgbouncer=true` | Pooled Cloud Postgres URL |
| `JWT_SECRET` | `secure_random_jwt_secret_32_characters_minimum` | Access token signature key |
| `JWT_REFRESH_SECRET` | `secure_random_refresh_secret_32_chars_minimum` | Refresh token signature key |
| `SESSION_SECRET` | `secure_session_secret_32_characters_minimum` | Session security secret |
| `GEMINI_API_KEY` | `AQ...` or `AIzaSy...` | Google AI Studio Gemini API key |
| `GEMINI_MODEL` | `gemini-3.5-flash` | Gemini model name |
| `STORAGE_PROVIDER` | `supabase` | Storage engine type |
| `SUPABASE_URL` | `https://your-project-ref.supabase.co` | Supabase project API URL |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOi...` | Supabase Service Role Secret Key |
| `SUPABASE_BUCKET` | `legalai-documents` | Supabase Storage bucket name |
| `SMTP_HOST` | `smtp.gmail.com` | Email SMTP host (e.g. Gmail) |
| `SMTP_PORT` | `465` | Email SMTP SSL port |
| `SMTP_SECURE` | `true` | Use SSL for SMTP |
| `SMTP_USER` | `your_email@gmail.com` | SMTP email address |
| `SMTP_PASS` | `your_16_char_app_password` | Google App Password |
| `SMTP_FROM` | `LegalAI <noreply@yourdomain.com>` | Sender display name & address |
| `RAZORPAY_KEY_ID` | `rzp_test_...` | Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | `your_razorpay_secret` | Razorpay Key Secret |
| `CRON_SECRET` | `your_random_secret_for_cron` | Protects `/api/reminders/cron` |

5. Click **Deploy**.
6. Vercel will:
   - Run `npm run vercel-build` (compiles backend TypeScript, generates Prisma client for Linux, and bundles the Vite React app).
   - Package `api/index.ts` as a Serverless Function with 60s timeout.
   - Deploy your static frontend to Vercel CDN.
   - Register the automated Cron job for `/api/reminders/cron`.

---

## ✅ Step 5: Verification Checklist

Once deployment completes and Vercel assigns your URL (e.g. `https://legalai.vercel.app`):

### 1. Check API Health
Open:
`https://your-app.vercel.app/api/health`
Expected JSON output:
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "legalai-backend",
    "timestamp": "..."
  }
}
```

### 2. Verify Frontend SPA
Open:
`https://your-app.vercel.app/`
- Ensure the landing page loads cleanly with Tailwind CSS styling and images.
- Navigate to `/login` and `/register`.

### 3. Verify Authentication & Sessions
- Register a new account or log in with the admin account.
- Confirm that `accessToken` and `refreshToken` cookies are created in Application -> Cookies.
- Refresh the page to verify that the session persists.

### 4. Verify Document Ingestion & Gemini Analysis
- Go to Dashboard and click **Upload Legal Document**.
- Upload a test agreement (e.g. Rental Agreement PDF or DOCX).
- Verify that status updates from `UPLOADED` -> `ANALYZING` -> `COMPLETED`.
- Inspect the generated Plain English Summary, Tamil translation, Risk levels, and Fairness scores.

### 5. Verify PDF Report Download
- Open an analyzed document and click **Download PDF Report**.
- Ensure the downloaded PDF report is generated correctly by `pdfkit`.

### 6. Verify Document Chat
- Click on the Chat tab in any completed document.
- Ask a legal question (e.g., "What is the notice period?").
- Ensure Gemini responds with clause citations and Tamil translations.

### 7. Verify Vercel Cron
- In your Vercel Dashboard, go to **Cron Jobs**.
- Confirm that `/api/reminders/cron` is registered with schedule `*/15 * * * *`.

---

## 🛠️ Troubleshooting & Serverless Tips

### 1. Database Connection Limits (P1001 / P2024 error)
- **Symptom**: `PrismaClientInitializationError: Can't reach database server` or connection pool timeouts.
- **Cause**: Serverless lambdas scale horizontally and can exhaust direct database connections.
- **Fix**: Make sure your `DATABASE_URL` uses the **pooled connection URL** (`port 6543` on Supabase with `?pgbouncer=true`).

### 2. Function Timed Out (504 Gateway Timeout)
- **Symptom**: Large document upload hangs for 60 seconds and returns 504.
- **Fix**: The function timeout in `vercel.json` is set to `maxDuration: 60`. If you process extremely long PDFs (> 50 pages) with OCR, consider upgrading to Vercel Pro (allows up to 300 seconds) or splitting large documents.

### 3. File System Read-Only Errors (`EROFS`)
- **Symptom**: `EROFS: read-only file system, mkdir '/var/task/uploads'`
- **Fix**: Ensure `STORAGE_PROVIDER=supabase` is configured in your Vercel environment variables. The codebase is already configured to automatically fallback to `/tmp/uploads` on Vercel if local storage is used.

### 4. Cross-Domain Cookie Blocking
- **Symptom**: You log in successfully, but requests immediately return 401 Unauthorized.
- **Fix**: Keep frontend and backend deployed as a **single unified Vercel project** as configured in this repository. Because requests are on the same domain, browsers will not treat authentication cookies as third-party.

---

## 🏁 Summary of Implemented Changes

1. **`vercel.json`**: Unified full-stack routing (`/api/*` to serverless function, SPA client-side rewrite fallback `/*` to `index.html`, 60s function timeout, and 15-minute cron job).
2. **`package.json`**: Root monorepo configuration with npm workspaces linking `backend` and `frontend`.
3. **`api/index.ts`**: Root serverless entry point exporting the production Express app.
4. **`prisma/schema.prisma`**: Added Linux binary targets (`rhel-openssl-3.0.x`, `debian-openssl-3.0.x`) for Vercel lambdas.
5. **`backend/src/config/prisma.ts`**: Implemented serverless global singleton pattern to reuse database connections across warm invocations.
6. **`backend/src/app.ts`**: Configured `trust proxy`, dynamic Vercel preview CORS origins, and health check routes.
7. **`backend/src/services/ocr/tesseract.ocr.ts`**: Set `/tmp` cache path to avoid read-only filesystem errors on Vercel.
8. **`backend/src/routes/reminder.routes.ts`**: Added dedicated `/api/reminders/cron` endpoint for automated Vercel Cron deadline reminders.
9. **`backend/src/workers/document.worker.ts` & `document.controller.ts`**: Supported direct serverless execution and manual processing trigger `POST /api/documents/:id/process`.
10. **`frontend/src/api/axios.ts`**: Dynamically resolves token refresh endpoints relative to the API base URL.
