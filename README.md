# LEGALAI - "Do Not Sign Before Reviewing the Document" ⚖️🤖

> **"Do not sign a document you do not understand."**

LegalAI is a production-grade, full-stack web application designed to help ordinary people understand complex legal agreements before signing them. It processes **House Rental Agreements, Job Offer Letters, Employment Contracts, Loan Agreements, Insurance Policies, and Terms & Conditions**, translating legalese into plain English explanations and actionable insights.

---

## 🌟 Key Product Features

* **Real Document Ingestion & Storage**: Accepts PDF, DOCX, PNG, JPG, and JPEG files up to 25MB. Validates MIME type, extension, and signatures. Storage provider abstraction supporting **Supabase Storage** and **Local Encrypted Storage**.
* **Text Extraction & Tesseract OCR**: Direct text parsing for digital PDFs and DOCX files. Automatic fallback to Tesseract OCR for scanned PDF documents and images supporting **English and Tamil** languages.
* **Google Gemini AI Intelligence Pipeline**: Deep document analysis pipeline powered by the official `@google/genai` SDK with strict **Zod JSON Schema Validation**, retry limits, and prompt injection defense.
* **Granular Legal Risk Detection**: Categorizes risks as `LOW`, `MEDIUM`, or `HIGH` with exact reasons, Tamil translation, and AI Suggested Counter-Proposal Negotiation Drafts.
* **Hidden Charges & Penalty Extraction**: Identifies maintenance fees, late fees, early termination penalties, forfeiture terms, and administrative taxes.
* **Visual Legal Timeline**: Extracts agreement start dates, notice deadlines, review windows, and expiry dates into a chronological milestone timeline.
* **Clause Fairness Benchmark Analysis**: Evaluates clause balance against standard legal industry benchmarks (0.0 = one-sided/unfair to 1.0 = fair), presenting evidence and balanced alternative wording.
* **RAG Document Chat**: Ask questions directly to your uploaded document ("What is the notice period?", "What happens if I terminate early?"). Cites exact pages/clauses and provides Tamil translations.
* **Side-by-Side Agreement Comparison**: Compare Document A vs Document B to highlight added, removed, and modified clauses with before/after diffs and impact scores.
* **Voice Summary Assistant**: Browser SpeechSynthesis TTS audio player reading summary findings in English and Tamil.
* **PDF Report Generation**: Downloadable professional PDF reports generated on-the-fly using `pdfkit`.
* **Document Reminders**: Track notice deadlines, rent due dates, and agreement expiry dates.
* **Admin Telemetry & Legal Sources**: Role-based Admin Control Panel monitoring total users, processing jobs, audit logs, and verifiable legal act sources (Indian Contract Act, Model Tenancy Act, etc.).
* **Production Security**: Argon2id password hashing, JWT Access/Refresh tokens in HttpOnly cookies, Helmet headers, CORS policies, rate limiting, and structured winston audit logging.

---

## 🏗️ Architecture Stack

```
+-----------------------------------------------------------------------------------+
|                                   FRONTEND                                        |
|                        React 18 + TypeScript + Vite                               |
|                  Tailwind CSS + TanStack Query v5 + Axios                         |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS REST API
                                          v
+-----------------------------------------------------------------------------------+
|                                   BACKEND                                         |
|                       Node.js + Express.js + TypeScript                           |
|            Argon2id + JWT + Helmet + RateLimiter + Winston Logger                 |
+------------------- animate-pulse -------+-----------------------+-----------------+
                    |                     |                       |
                    v                     v                       v
        +-----------------------+ +---------------+    +--------------------+
        | PostgreSQL + Prisma   | | Storage Engine|    | Google Gemini AI   |
        | Relational Database   | | (Supabase /   |    | Structured JSON &  |
        | 19 Models & Schemas   | | Local S3)     |    | Zod Validation     |
        +-----------------------+ +---------------+    +--------------------+
                    ^                                             ^
                    |                                             |
                    +-------------------+-------------------------+
                                        |
                               +-----------------+
                               |  Redis + BullMQ |
                               |  Async Worker   |
                               +-----------------+
```

---

## 🚀 Environment Configuration

Copy `.env.example` to `.env` in the root directory:

```env
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# PostgreSQL Database
DATABASE_URL=postgresql://legalai:legalai_password@localhost:5432/legalai_db?schema=public

# Redis Queue
REDIS_URL=redis://localhost:6379

# Authentication Secrets (Min 32 characters)
JWT_SECRET=legalai_development_jwt_secret_key_32_characters_minimum
JWT_REFRESH_SECRET=legalai_development_refresh_jwt_secret_key_32_characters
SESSION_SECRET=legalai_development_session_secret_key

# Google Gemini API (Get key from https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash

# Storage Configuration (local | supabase)
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads

# Admin Initial Seed Credentials
ADMIN_INITIAL_EMAIL=admin@legalai.com
ADMIN_INITIAL_PASSWORD=AdminPass123!LegalAI
```

---

## 🛠️ Local Development & Running

### 1. Install Dependencies

```bash
# Install root, backend & frontend packages
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Database Migration & Seed

Make sure PostgreSQL is running locally, then execute:

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### 3. Run Backend & Background Worker

```bash
cd backend
npm run dev
```

### 4. Run Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Docker Deployment

To launch the full production stack using Docker Compose (PostgreSQL, Redis, Backend API, Frontend Nginx):

```bash
docker-compose up --build -d
```

The application will be accessible at:
* **Frontend**: `http://localhost:3000`
* **Backend API**: `http://localhost:5000`
* **PostgreSQL**: `localhost:5432`
* **Redis**: `localhost:6379`

---

## 🧪 Testing & Verification

Run automated backend tests:

```bash
cd backend
npm test
```

Build verification:

```bash
# Test backend TypeScript build
cd backend && npm run build

# Test frontend Vite build
cd frontend && npm run build
```

---

## 📄 Mandatory Disclaimer

> LegalAI provides AI-assisted document analysis and general legal information for informational and educational purposes. It does not constitute legal advice and does not replace consultation with a qualified legal professional.
