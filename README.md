# Margdarshan (मार्गदर्शन) - Corporate Engineering Mentoring Platform

**Margdarshan** is a full-stack corporate mentoring platform purpose-built for structured 3-month mentoring relationships between young engineers (mentees) and managers (mentors).

---

## 🌟 Key Capabilities

1. **Competency Framework Integration:**
   - 10 Core Industrial Pillars (TPM & Asset Care, SARTAJ Safety Ownership, Cost Governance, Vendor Management, Planning & Coordination, etc.).
   - Multi-factor Cascade Matrix modeling primary-to-secondary behavioral impacts.
2. **Real-World Growth & Psychological Mastery:**
   - Mentee development tracking across Self-Confidence, Plant Realities, Imposter Feelings, and Execution Under Pressure.
3. **Automated AI Compatibility Matching:**
   - Greedy matching engine evaluating Competency Cascade overlap (40%), DISC behavioral harmony (35%), and Department diversity (25%).
4. **Interactive Excel Candidate Intake:**
   - Bulk candidate ingestion via `.xlsx`, `.xls`, or `.csv` spreadsheets with live table validation and 1-click template downloads.
5. **Real-Time AI Co-Pilot:**
   - GROW coaching model prompts, systemic rippling questions, and DISC-tailored conversation advice powered by Google Gemini.
6. **Corporate SMTP Emailing:**
   - Dispatches official onboarding invitations and pairing alerts from `noreply@rdc.in`.
7. **12-Week Roadmap & Telemetry:**
   - Structured milestones, Shared Notebooks, Private Journals, Week 6 Mid-point / Week 12 Final Surveys, and Print-to-PDF Closeout Reports.

---

## ⚙️ Environment Variables (Railway Configuration)

When deploying to **Railway**, configure the following environment variables in your project settings:

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | *Provided automatically by Railway PostgreSQL plugin* |
| `SESSION_SECRET` | 32+ character JWT / session signing key | `openssl rand -base64 32` |
| `APP_URL` | Deployed URL of your application | `https://rdc-margdarshan.up.railway.app` |
| `NEXTAUTH_URL` | Authentication base URL | `https://rdc-margdarshan.up.railway.app` |
| `GEMINI_API_KEY` | Google AI Studio key for live coaching | `AIzaSy...` |
| `SMTP_HOST` | Outgoing SMTP mail server | `smtp.rdc.in` or `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` (TLS) or `465` (SSL) |
| `SMTP_USER` | SMTP username / email address | `noreply@rdc.in` |
| `SMTP_PASS` | SMTP application password | `your-smtp-password` |
| `SMTP_SECURE` | Secure SSL toggle | `false` (for 587) / `true` (for 465) |
| `EMAIL_FROM` | Outgoing email sender header | `Margdarshan Mentoring <noreply@rdc.in>` |

---

## 🚀 Railway Deployment Guide

### Step 1: Provision PostgreSQL on Railway
1. Create a new project or service on [Railway.app](https://railway.app).
2. Click **`New` ➔ `Database` ➔ `Add PostgreSQL`**.
3. Railway automatically populates the `DATABASE_URL` environment variable.

### Step 2: Deploy Code from GitHub
1. In Railway, click **`New` ➔ `GitHub Repo` ➔ select `drbhoon/rdc-margdarshan`**.
2. Go to the **Variables** tab of the service and add the environment variables listed above.

### Step 3: Initialize Database Schema
Run database migrations using the Railway CLI or during the build command:
```bash
npx prisma db push
```

To seed initial competency resources and administrative roles:
```bash
npx tsx prisma/seed.ts
```

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Push schema to local or development database
npx prisma db push

# Seed competency framework & test accounts
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
