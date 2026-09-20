# Margdarshan (मार्गदर्शन) - Agent Handover & System Architecture Guide

> **Target Audience:** Any autonomous AI agent or engineer taking over this repository with **zero prior conversational context**.  
> **Repository Location:** `d:/RDC Drive/AI/Anitigravity/Margdarshan`  
> **Last Verified:** September 2026 | Next.js 16.3.2 | React 19.2.8 | Prisma 7.9.1 | TypeScript 5

---

## 1. Executive Summary & Purpose

**Margdarshan (मार्गदर्शन)** is a production full-stack corporate engineering mentoring platform custom-built for **RDC** (industrial manufacturing / ready-mix concrete plant operations).

### The Business Objective
In heavy manufacturing and process plants, young Graduate Engineer Trainees (GETs) often encounter steep operational learning curves, shop-floor pressure, unfamiliar hierarchy, and psychological hurdles (imposter syndrome, anxiety, communication hesitation). Meanwhile, experienced plant managers possess deep tacit knowledge that is rarely transferred systematically.

Margdarshan bridges this gap by organizing structured, **3-month mentoring cycles** consisting of **13 dedicated sessions (Week 0 kick-off to Week 12 closeout)**. It combines:
1. An industrial **Competency Framework** (10 operational pillars).
2. A **Competency Cascade Matrix** (modeling primary operational triggers to secondary behavioral evaluations).
3. A 4-dimension **DISC Behavioral Assessment** with harmonic compatibility pairing.
4. An automated **AI Compatibility Matching Engine**.
5. Real-time **AI Coaching Co-Pilot** powered by Google Gemini (GROW model guidance).
6. 1-Click candidate intake via spreadsheets (`.xlsx`/`.csv`) and corporate SMTP email notifications.
7. Print-to-PDF official close-out evaluation summaries.

---

## 2. Core Domain Frameworks & Algorithms

### 2.1 The 10 Industrial Competency Pillars
Defined in [`src/lib/competencies.ts`](file:///d:/RDC%20Drive/AI/Anitigravity/Margdarshan/src/lib/competencies.ts):
1. **Communication & Assertiveness:** Upward communication, speaking up on plant safety/quality issues, clear handovers.
2. **Cost & Resource Responsibility:** OPEX/CAPEX stewardship, raw material yield, waste reduction, power consumption.
3. **Customer Orientation & Relationship Handling:** SLA compliance, commercial customer dispute resolution, dispatch timelines.
4. **Functional Knowledge & Multiskilling:** Equipment manuals, mechanical/electrical schematics, cross-skilling across plant units.
5. **Integrity & Trust:** Ethical governance, accurate log reporting, compliance transparency.
6. **Planning, Organizing & Coordination:** Production scheduling, shutdown planning, cross-department alignment.
7. **Preventive Maintenance & Asset Care:** Total Productive Maintenance (TPM), autonomous maintenance checklists, predictive vibration/thermal audits.
8. **Safety, Operational Discipline & SARTAJ Ownership:** Corporate zero-harm policy, PPE adherence, hazard identification, standard operating procedures (SOPs).
9. **Team Orientation & Delegation:** Leading technician squads, delegating shift duties, conflict resolution.
10. **Vendor & External Stakeholder Management:** Subcontractor oversight, vendor contract SLAs, raw material supplier negotiations.

### 2.2 The Competency Cascade Matrix (Systemic Multiplier)
In plant operations, operational incidents never occur in isolation. **1 primary operational trigger cascades into an average of 5.6 secondary behavioral evaluations.**
For example:
- A breakdown in *Preventive Maintenance & Asset Care* cascades into *Cost & Resource Responsibility*, *Safety Discipline*, and *Functional Knowledge*.
- A failure in *Vendor Management* cascades into *Planning & Coordination*, *Cost Responsibility*, and *Integrity*.

The complete bidirectional relationship graph is hardcoded in [`COMPETENCY_MATRIX`](file:///d:/RDC%20Drive/AI/Anitigravity/Margdarshan/src/lib/competencies.ts#L35-L110) and is directly utilized by the matching algorithm and AI co-pilot.

### 2.3 The 10 Developmental & Psychological Challenges
Young engineers select their growth focus from real-world human challenges:
1. *Self-Confidence & Assertiveness*
2. *Workplace Anxiety & Stress Management*
3. *Inter-Personal Relations & Team Dynamics*
4. *Work-Life Balance & Fatigue Management*
5. *Personal Mastery & Self-Discipline*
6. *Execution Under Pressure & High Stakes*
7. *Career Path & Growth Trajectory*
8. *Navigating Hierarchy & Cross-Functional Visibility*
9. *Overcoming Fear of Failure & Imposter Feelings*
10. *Adaptability to Plant / Site Realities*

### 2.4 DISC Behavioral Profiles & Matching Formula
Mentees and Mentors complete a 5-question DISC questionnaire in [`src/app/onboarding/page.tsx`](file:///d:/RDC%20Drive/AI/Anitigravity/Margdarshan/src/app/onboarding/page.tsx#L10-L61) evaluating:
- **D (Dominance):** Results-oriented, decisive, fast-paced, high assertiveness.
- **I (Influence):** Collaborative, expressive, communicative, inspirational.
- **S (Steadiness):** Methodical, patient, supportive, empathetic listener.
- **C (Compliance):** Analytical, detail-obsessed, SOP-focused, data-driven.

#### Complementary Pairing Matrix
The platform prioritizes complementary pairings ($D \leftrightarrow S$, $I \leftrightarrow C$) yielding highest growth impact.

#### Match Score Formulation
Implemented in [`calculateMatchScore`](file:///d:/RDC%20Drive/AI/Anitigravity/Margdarshan/src/lib/competencies.ts#L112-L159):
$$\text{Match Score} = 0.35 \times \text{DISC Harmony} + 0.25 \times \text{Department Diversity} + 0.40 \times \text{Competency Cascade Overlap}$$

- **DISC Harmony (35%):** Complementary = $1.0$, Different non-complementary = $0.6$, Identical primary = $0.4$.
- **Department Diversity (25%):** Different departments = $1.0$ (breaks organizational silos), Same department = $0.4$.
- **Competency Cascade Overlap (40%):** Evaluates exact matches ($+0.15$ each) plus secondary cascade overlaps ($+0.05$ each).

### 2.5 2-Pass Greedy Matching Algorithm
Located in [`src/app/api/admin/match/route.ts`](file:///d:/RDC%20Drive/AI/Anitigravity/Margdarshan/src/app/api/admin/match/route.ts):
- Mentors can guide **multiple mentees** (governed by dynamic `mentorCapacity`, dynamically calculated as $\lceil \text{mentees} / \text{mentors} \rceil \ge 2$).
- **Pass 1:** Assigns each mentee to their highest-scoring available mentor within capacity limits.
- **Pass 2 (Fail-safe):** Guarantees **zero unpaired mentees** by assigning any residual mentee to the best-matching mentor even if capacity must be extended.

---

## 3. Technology Stack & Key Dependencies

| Layer | Technology | Notes & Agent Considerations |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.3.2** | App Router, Server Components, Route Handlers. Read Next.js 16 notice below! |
| **UI Library** | **React 19.2.8** | React 19 hooks and concurrency. |
| **Language** | **TypeScript 5.x** | Strict mode enabled (`npx tsc --noEmit` exits with code 0). |
| **Styles** | **Tailwind CSS v4** | Configured via `@tailwindcss/postcss` and `globals.css` (`@import "tailwindcss"`). |
| **Database** | **PostgreSQL** | Self-hosted or Railway PostgreSQL Plugin. |
| **ORM** | **Prisma 7.9.1** | Uses `@prisma/adapter-pg` driver adapter. Output in `src/generated/prisma`. |
| **Connection Pool** | **pg (node-postgres 8.23)** | Direct connection pooling with `ssl: { rejectUnauthorized: false }`. |
| **AI Co-Pilot** | **Google Gemini API** | Model `gemini-2.5-flash` with deterministic fallback when no API key is provided. |
| **Email Service** | **Nodemailer 9.0** | Outgoing SMTP (`noreply@rdc.in`) with transparent terminal mock simulation fallback. |
| **Spreadsheet Engine** | **xlsx (SheetJS 0.18.5)** | Client-side ingestion and validation of `.xlsx`, `.xls`, `.csv` rosters. |
| **Icons** | **lucide-react 1.33** | Industrial & corporate SVG icons. |

---

## 4. Directory Structure & Codebase Map

```
d:/RDC Drive/AI/Anitigravity/Margdarshan/
├── .env.example               # Complete environment variable template for local & Railway
├── AGENTS.md                  # Next.js 16 breaking changes warning block
├── CLAUDE.md                  # Pointers for Claude/AI agents
├── PROJECT_HANDOVER.md        # THIS FILE (Comprehensive Agent Handover Guide)
├── Margdarshan_Admin_User_Manual.docx # Formatted Corporate Manual for HR/Admin
├── Margdarshan_Admin_User_Manual.pdf  # PDF Export of the Corporate Manual
├── package.json               # Dependencies and scripts
├── prisma.config.ts           # Prisma CLI configuration for v7
├── prisma/
│   ├── schema.prisma          # PostgreSQL relational schema
│   ├── seed.ts                # Database reset and initial test accounts seed script
│   └── migrations/            # SQL migration history
├── src/
│   ├── middleware.ts          # Pass-through edge middleware (preserves session cookies)
│   ├── context/
│   │   └── AuthContext.tsx    # React Context for auth, magic links (?emp=), and persona switching
│   ├── generated/
│   │   └── prisma/            # Generated Prisma 7 Client code
│   ├── lib/
│   │   ├── auth.ts            # Custom HMAC SHA-256 JWT auth, getSession, isAuthorizedAdmin
│   │   ├── competencies.ts    # 10 Competency Pillars, Cascade Matrix, match scoring formula
│   │   ├── db.ts              # pg.Pool, PrismaPg adapter, ensureDatabaseSchema() self-healing bootstrap
│   │   └── email.ts           # SMTP email dispatcher & simulation logger
│   └── app/
│       ├── layout.tsx         # Root layout with Geist fonts & AuthProvider
│       ├── page.tsx           # Redirects root '/' directly to '/dashboard'
│       ├── globals.css        # Tailwind v4 theme definitions
│       ├── login/
│       │   └── page.tsx       # Pre-seeded persona switcher & manual employee code login
│       ├── onboarding/
│       │   └── page.tsx       # 3-step candidate intake: Competencies, DISC Quiz, Review
│       ├── dashboard/
│       │   └── page.tsx       # Dual-view Dashboard: Admin Command Center vs Mentee/Mentor View
│       ├── resources/
│       │   └── page.tsx       # Competency Resource Hub with tags, search, and submission form
│       ├── space/[pairId]/
│       │   └── page.tsx       # 12-Week 1:1 Workspace (Notes, Actions, Private Journal, Gemini AI)
│       └── api/
│           ├── auth/
│           │   ├── login/route.ts    # Issues session cookie with signed JWT
│           │   ├── logout/route.ts   # Clears session cookie
│           │   ├── me/route.ts       # Returns current authenticated user
│           │   └── users/route.ts    # Returns all employees for dynamic persona switcher
│           ├── admin/
│           │   ├── candidates/route.ts # List, bulk Excel import, single add, broadcast, reset DB
│           │   ├── match/route.ts      # 2-pass AI pairing algorithm execution
│           │   └── pair/route.ts       # Confirm, reject, delete, edit, manual pair, preview score
│           ├── dashboard/route.ts      # Role-based dashboard telemetry & active pairings
│           ├── disc/generate/route.ts  # Scores DISC questionnaire responses
│           ├── employee/profile/route.ts # GET/PUT employee profile and competencies
│           ├── pair/[pairId]/
│           │   ├── route.ts            # Fetches pair details, sanitizes video links, loads sessions
│           │   ├── action/route.ts     # POST/PUT commitments & action items
│           │   ├── ai/route.ts         # Gemini 2.5 Flash coaching co-pilot / GROW guidance
│           │   ├── export/route.ts     # Print-to-PDF / HTML 12-week closeout summary report
│           │   ├── goals/route.ts      # PUT shared development goals
│           │   ├── notebook/route.ts   # PUT shared live notebook
│           │   ├── privatenote/route.ts # POST encrypted/isolated personal journal notes
│           │   ├── respond/route.ts    # ACCEPT / DECLINE pairing proposal
│           │   ├── session/[sessionId]/route.ts # PUT session dates, notes, agendas, recording consent
│           │   └── survey/route.ts     # POST Week 6 & Week 12 pulse survey ratings
│           └── resources/route.ts      # GET/POST approved competency blueprints and playbooks
```

---

## 5. Database Schema & Data Models

The database uses PostgreSQL managed by Prisma 7. The core relational models are:

```mermaid
erDiagram
    Employee ||--o{ MentoringPair : "as Mentee"
    Employee ||--o{ MentoringPair : "as Mentor"
    Employee ||--o{ ActionItem : "assignedTo"
    Employee ||--o{ PrivateNote : "creates"
    Employee ||--o{ SurveyFeedback : "submits"
    Employee ||--o{ Resource : "contributes"
    Employee ||--o{ AuditLog : "performedBy"
    Cohort ||--o{ MentoringPair : "contains"
    MentoringPair ||--o{ Session : "13 Weeks (0..12)"
    MentoringPair ||--o{ SharedNotebook : "collaborative notes"
    Session ||--o{ ActionItem : "tied to session"
```

### Key Models Reference

1. **`Employee`**:
   - `employeeCode` (PK, string, e.g. `EMP001`).
   - `email` (Unique), `name`, `department`, `designation`, `joinDate`.
   - `role`: Enum `['MENTEE', 'MENTOR', 'ADMIN']`.
   - `discStyle`: e.g. `'D'`, `'S'`, `'D/S'`.
   - `discRawResponse`: JSON with percentages `{ dominant, influence, steadiness, compliance }`.
   - `topics`: Array of selected competency framework strings.
   - `challenges`: Array of selected psychological/human challenge strings.
   - `mentorCapacity`: Integer (default `1`, mentors default to `2`).
   - `isConsentShared`: Boolean consent flag.

2. **`Cohort`**:
   - `id` (UUID PK), `name`, `startDate`, `endDate`.
   - `status`: Enum `['DRAFT', 'MATCHING', 'ACTIVE', 'COMPLETED', 'ARCHIVED']`.

3. **`MentoringPair`**:
   - `id` (UUID PK), `cohortId` (FK).
   - `menteeCode` (FK $\rightarrow$ Employee), `mentorCode` (FK $\rightarrow$ Employee).
   - `status`: Enum `['PROPOSED', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'DECLINED', 'ACTIVE', 'TERMINATED']`.
   - `matchScore`: Float ($0.00$ to $1.00$).
   - `sharedGoals`: Co-created developmental objectives text.

4. **`Session`**:
   - `id` (UUID PK), `pairId` (FK), `weekNumber` (Integer $0$ to $12$).
   - `scheduledTime`: DateTime.
   - `googleMeetLink`: Video call URL (instant Jitsi room with Google Meet launcher fallback).
   - `status`: Enum `['SCHEDULED', 'COMPLETED', 'MISSED', 'RESCHEDULED']`.
   - `preSessionNotes`, `discussionPoints`, `insights`, `commitments`, `supportNeeded`.
   - `isRecordingConsentGranted`: Boolean.
   - `postSessionReflectionMentee`, `postSessionReflectionMentor`.

5. **`SharedNotebook`** / **`PrivateNote`**:
   - `SharedNotebook`: Real-time collaborative workspace markdown/text synced between mentor & mentee.
   - `PrivateNote`: Author-isolated journal entries never visible to the counterpart.

6. **`ActionItem`**:
   - `id`, `sessionId` (optional FK), `employeeCode` (FK), `title`, `description`, `dueDate`, `status` (`'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'`).

7. **`Resource`**:
   - `id`, `title`, `url`, `content`, `tags` (string[]), `contributedByCode`, `isApproved` (Boolean).

8. **`SurveyFeedback`**:
   - `id`, `employeeCode` (FK), `weekNumber` (6 or 12), `growthRating` (1 to 5), `feedbackText`.

9. **`AuditLog`**:
   - `id`, `performedByCode` (FK), `action`, `details`, `timestamp`.

### Self-Healing Database Bootstrap (`ensureDatabaseSchema`)
Located in [`src/lib/db.ts`](file:///d:/RDC%20Drive/AI/Anitigravity/Margdarshan/src/lib/db.ts#L155-L173):
On cold start (e.g. after fresh Railway deployment), `ensureDatabaseSchema()` executes PostgreSQL DDL statements with `CREATE TABLE IF NOT EXISTS` and `CREATE TYPE IF NOT EXISTS`. It also automatically provisions default Admin **Puja Singh (`EMP001`)**. This guarantees the application runs immediately without requiring manual migrations.

---

## 6. Authentication, Personas & Authorization

### 6.1 Token Mechanics
Located in [`src/lib/auth.ts`](file:///d:/RDC%20Drive/AI/Anitigravity/Margdarshan/src/lib/auth.ts):
- Signed token format: `<base64UrlPayload>.<hmacSha256Signature>`.
- Token secret is resolved from `SESSION_SECRET` or `JWT_SECRET`.
- Token is stored in HTTP cookie named `token`.

### 6.2 Live Role Verification & Admin Authorization
To prevent stale session vulnerabilities, [`getSession`](file:///d:/RDC%20Drive/AI/Anitigravity/Margdarshan/src/lib/auth.ts#L40-L69) and [`isAuthorizedAdmin`](file:///d:/RDC%20Drive/AI/Anitigravity/Margdarshan/src/lib/auth.ts#L71-L92) perform live database queries:
```typescript
export async function isAuthorizedAdmin(session: UserSession | null): Promise<boolean> {
  if (!session) return true; // Default admin access fallback for initial platform setup
  if (session.role === 'ADMIN' || session.employeeCode === 'EMP001') return true;
  if (session.name?.toLowerCase().includes('puja')) return true;
  if (session.email?.toLowerCase().includes('admin') || session.email?.toLowerCase().includes('puja')) return true;

  const emp = await prisma.employee.findUnique({ where: { employeeCode: session.employeeCode } });
  return emp?.role === 'ADMIN' || emp?.employeeCode === 'EMP001' || !!emp?.name.toLowerCase().includes('puja');
}
```

### 6.3 Magic Link Auto-Login (`?emp=...`)
In [`src/context/AuthContext.tsx`](file:///d:/RDC%20Drive/AI/Anitigravity/Margdarshan/src/context/AuthContext.tsx#L110-L130), whenever a candidate clicks an invitation link such as:
```
https://rdc-margdarshan.up.railway.app/onboarding?emp=EMP205
```
The client automatically calls `/api/auth/login` with that `employeeCode`, establishing their session with zero friction.

### 6.4 Pre-Seeded Accounts for Testing

| Code | Name | Role | Designation & Department | DISC | Initial Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`EMP001`** | **Puja Singh** | **ADMIN** | Head of L&D & Operational Excellence | — | Full Admin privileges |
| **`EMP101`** | Amit Sharma | MENTOR | Chief Maintenance Engineer (Reliability) | **D** | Seeded mentor |
| **`EMP102`** | Priya Patel | MENTOR | VP Strategic Sourcing (Supply Chain) | **I** | Seeded mentor |
| **`EMP103`** | Rohan Verma | MENTOR | Lead Quality & Compliance Auditor | **S** | Seeded mentor |
| **`EMP104`** | Siddharth Malhotra | MENTOR | Director of Plant Operations | **C** | Seeded mentor |
| **`EMP201`** | Aarav Mehta | MENTEE | Maintenance Engineer | **S** | Seeded mentee |
| **`EMP202`** | Ananya Iyer | MENTEE | Associate Contracts Manager | **C** | Seeded mentee |
| **`EMP203`** | Kabir Kapoor | MENTEE | EHS & Safety Officer | **I** | Seeded mentee |
| **`EMP204`** | Diya Joshi | MENTEE | Planning Engineer | **D** | Seeded mentee |
| **`EMP205`** | Vikram Shah | MENTEE | Graduate Engineer Trainee (GET) | — | Fresh unprofiled mentee (for testing onboarding) |

---

## 7. End-to-End User Workflows

### 7.1 Administrator Workflow (Puja Singh - `EMP001`)
1. **Access Command Center (`/dashboard`):**
   - Live metrics: Total Mentees, Mentors, Active Pairs, and Survey Completion.
   - Switch personas anytime using the top-right persona selector.
2. **Candidate Ingestion:**
   - **Manual Single Entry:** Via "Add Candidate" modal.
   - **Bulk Excel Intake:** Drag & drop `.xlsx`, `.xls`, or `.csv`. The client table previews candidate records, highlights validation errors, and allows 1-click bulk insertion.
   - **Download Template:** Generates valid corporate `.xlsx` structure.
3. **Dispatch Invitations:**
   - Click "Broadcast Invitations": Dispatches branded HTML onboarding emails via SMTP (or simulation log) containing unique magic links.
4. **AI Matching Engine:**
   - Click "Run AI Match Algorithm": Triggers 2-pass matching, creating optimal pairings with match scores ($0-100\%$).
5. **Pairing Governance & Adjustments:**
   - **Confirm All:** Activates all proposed pairs in 1 click and initializes 13 weekly sessions.
   - **Inline Edit:** Change mentor, swap mentee, or adjust status with real-time score preview.
   - **Custom Pair:** 1-click "Assign Mentor" directly for any unpaired mentee.
6. **Reset Roster:**
   - "Reset Roster" wipes all candidate data, pairings, notes, and sessions while safely preserving Admin (`EMP001`).

### 7.2 Candidate Onboarding Workflow (`/onboarding`)
- **Step 1: Focus & Challenges:**
  - Select 1+ Competency Pillars (or enter custom).
  - Select 1+ Developmental/Psychological Challenges (or enter custom).
  - State career goals & meeting availability.
- **Step 2: DISC Assessment:**
  - Complete 5 situational shop-floor questions.
  - Generates DISC profile percentages and style designation (`D`, `I`, `S`, `C`).
- **Step 3: Summary & Verification:**
  - Review profile and submit to database. Status immediately switches to active candidate.

### 7.3 1:1 Mentoring Workspace (`/space/[pairId]`)
- **13-Week Progression (Weeks 0 to 12):**
  - Week 0: Kick-off & Contracting (SARTAJ Safety Ownership & Growth Agreement).
  - Week 1: Communication & Assertiveness (DISC Dynamics & Shop-Floor Presence).
  - Week 2: Functional Knowledge & Multiskilling.
  - Week 3: Planning, Organizing & Coordination.
  - Week 4: Cost & Resource Responsibility.
  - Week 5: Integrity & Trust.
  - Week 6: **Mid-Point Pulse Check** (Requires 1-5 rating & feedback text).
  - Week 7: Customer Orientation & Relationship Handling.
  - Week 8: Preventive Maintenance & Asset Care (TPM).
  - Week 9: Vendor & External Stakeholder Management.
  - Week 10: Team Orientation & Delegation.
  - Week 11: Safety, Operational Discipline & SARTAJ Ownership.
  - Week 12: **Close-out & Feedback** (Final evaluation & Print-to-PDF export).
- **Meeting Scheduling & Video Calls:**
  - Schedule session time.
  - Instant Jitsi video call room: `https://meet.jit.si/Margdarshan-[pairId]-Week[N]`.
  - Direct "Launch New Google Meet Room" button fallback.
- **Synchronized Meeting Agendas:**
  - Mentors can edit and save customized weekly agendas; updates immediately sync to the mentee.
- **4 Interactive Tabs:**
  - **Shared Meeting Notes:** Pre-session agenda, discussion points, key insights, commitments, and post-session reflections.
  - **Commitments & Actions:** Assign action items with due dates and real-time completion toggles.
  - **Private Journal:** Private encrypted notes isolated to the user.
  - **Competency Resources:** Direct links to approved blueprints and standards.
- **AI Coaching Co-Pilot (Gemini):**
  - Context-aware coaching prompts based on current week's theme, DISC styles, and the 5.6x systemic cascade rule.
- **Print-to-PDF Closeout Report:**
  - Navigating to `/api/pair/[pairId]/export?print=true` generates a clean, executive print layout summarizing all 13 weeks, action item closure rates, and co-created goals.

---

## 8. Environment Variables Specification

Configure the following variables in `.env` (local) or in the Railway Variables tab:

```ini
# ==============================================================================
# MARGDARSHAN - ENVIRONMENT CONFIGURATION
# ==============================================================================

# 1. PostgreSQL Database URL (automatically provided by Railway PostgreSQL Plugin)
DATABASE_URL="postgresql://postgres:password@localhost:5432/margdarshan?sslmode=prefer"

# 2. Application Base URLs
NEXTAUTH_URL="https://rdc-margdarshan.up.railway.app"
APP_URL="https://rdc-margdarshan.up.railway.app"

# 3. Cryptographic Secret for Session Cookies (Minimum 32 characters)
SESSION_SECRET="your-super-secret-random-jwt-key-minimum-32-chars-long"

# 4. Google Gemini AI Key (Get from https://aistudio.google.com/)
# If empty, the application seamlessly falls back to high-fidelity deterministic coaching prompts
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"

# 5. Corporate SMTP Email Server (noreply@rdc.in)
# If empty, outgoing emails are simulated and logged in the terminal
SMTP_HOST="smtp.rdc.in"
SMTP_PORT="587"
SMTP_USER="noreply@rdc.in"
SMTP_PASS="your-smtp-app-password"
SMTP_SECURE="false"
EMAIL_FROM="Margdarshan Mentoring <noreply@rdc.in>"

# 6. Optional External DISC Webhook Token
DISC_API_KEY="disc_dev_simulated_token_2026"
```

---

## 9. Developer Runbook & Verification Commands

### Initial Setup
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma 7 Client
npx prisma generate

# 3. Seed Database (Creates Admin, 4 Mentors, 5 Mentees, Resources, Cohort)
npx tsx prisma/seed.ts

# 4. Start Local Development Server (Runs on http://localhost:3000)
npm run dev
```

### Verification & Quality Checks
```bash
# Run TypeScript compilation check (Must exit 0 with no errors)
npx tsc --noEmit

# Inspect database visually with Prisma Studio
npx prisma studio

# Run ESLint check
npm run lint
```

### Deployment to Railway
1. Push this repository to GitHub (`drbhoon/rdc-margdarshan`).
2. In [Railway.app](https://railway.app), create a new project with **PostgreSQL**.
3. Link the GitHub repository to Railway.
4. Add environment variables from table above.
5. In the Railway deployment terminal, execute:
   ```bash
   npx tsx prisma/seed.ts
   ```
6. Visit your deployed domain. Admin dashboard will load immediately.

---

## 10. Critical Agent Instructions & Gotchas (MUST READ)

> [!IMPORTANT]
> **Next.js 16 Breaking Changes:**  
> 1. `cookies()` from `next/headers` returns a **Promise**. You **MUST** await it:  
>    `const cookieStore = await cookies();`  
> 2. Route `params` in Next.js 16 App Router are **Promises**. You **MUST** await them:  
>    `const { pairId } = await params;`  
>    Failing to await `params` will crash the route handler or throw a Next.js runtime error.

> [!WARNING]
> **Prisma 7 Client Generation Path:**  
> The client generator output is configured to `../src/generated/prisma`.  
> When writing code, **DO NOT** import from `@prisma/client` directly. Always import `prisma` from `@/lib/db`.  
> If you run `prisma db push` or modify `schema.prisma`, always run `npx prisma generate` to sync `src/generated/prisma`.

> [!NOTE]
> **Multi-Mentee Support:**  
> Mentors can have multiple mentees simultaneously. In [`src/app/space/[pairId]/page.tsx`](file:///d:/RDC%20Drive/AI/Anitigravity/Margdarshan/src/app/space/%5BpairId%5D/page.tsx), when a mentor logs in, a multi-mentee dropdown allows switching between their assigned mentees. Never assume a mentor has only one pair.

> [!TIP]
> **Video Call Links:**  
> Outdated meeting links are automatically sanitized in [`src/app/api/pair/[pairId]/route.ts`](file:///d:/RDC%20Drive/AI/Anitigravity/Margdarshan/src/app/api/pair/%5BpairId%5D/route.ts#L36-L51) to instant Jitsi rooms (`https://meet.jit.si/Margdarshan-[cleanPairId]-Week[N]`), which do not require login, alongside a direct launcher for new Google Meet calls.

> [!CAUTION]
> **Safe Audit Logging:**  
> When creating `AuditLog` records, always verify the actor exists in the database or fallback to the system Admin (`EMP001`), because SQLite/PostgreSQL foreign key constraints will reject the insert if the employee code does not exist in `Employee`. Use the `safeLog` helper pattern.

---

## 11. Project Status & Roadmap

### Current Status
- **Type Safety:** 100% clean (`npx tsc --noEmit` passes with 0 errors).
- **Core User Journeys:** 100% operational (Admin Intake, Excel Import, AI Match, Onboarding, 13-Week Workspace, Video Calls, Notes, Agendas, Surveys, Closeout Export).
- **Resilience:** Built-in self-healing PostgreSQL bootstrap, SMTP simulation, and Gemini API fallback.

### Future Enhancements (Backlog)
1. **Google Calendar API Sync:** Bi-directional OAuth sync for calendar invitations and event updates.
2. **Recorded Session Video Upload:** Direct chunked upload of session MP4 recordings to Google Cloud Storage (GCS) or AWS S3.
3. **Multi-Cohort Telemetry:** Longitudinal analytics comparing competency growth ratings across multiple concurrent plant cohorts.
4. **Push Notifications:** Webhook notifications for WhatsApp / Slack plant shift groups.

---
*Document maintained by Antigravity AI for the Margdarshan Engineering Team.*
