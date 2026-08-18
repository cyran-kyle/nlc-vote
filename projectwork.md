You are an expert full-stack systems architect, Docker specialist, and cybersecurity engineer. Your task is to generate the complete, production-ready codebase for a secure, containerized Student Voting System for New Life College, replacing an insecure Google Forms setup. 

The system must guarantee strict voter eligibility, zero duplicate votes, and 100% secret ballot anonymity, using an external WhatsApp API gateway (Levanter running in API mode hosted on a Pterodactyl VPS) for One-Time Password (OTP) verification.

---

### TECH STACK & SYSTEM ARCHITECTURE
- **Frontend:** Next.js (App Router, Tailwind CSS, TypeScript, Lucide React). Mobile-first, responsive, accessible.
- **Backend:** Node.js with Express / TypeScript.
- **Database:** MySQL 8.0 with InnoDB (ACID transactions, row-level locking).
- **Orchestration:** Docker & Docker Compose (`docker-compose.yml`, multi-stage `Dockerfile` for frontend and backend, persistent volumes, internal bridge network).
- **External Integration:** Levanter WhatsApp Bot running in API Mode (HTTP POST endpoints with Bearer Token authentication).

---

### CORE SECURITY & ARCHITECTURAL REQUIREMENTS

1. **Decoupled "Two-Box" Data Schema:**
   - `voter_ledger` table: Stores `student_id` (PK), `phone_number` (international format e.g., `233XXXXXXXXX`), `has_voted` (BOOLEAN, default FALSE), `otp_hash` (VARCHAR, SHA-256), and `otp_expires_at` (TIMESTAMP).
   - `votes` table: Stores `vote_id` (PK, auto-increment), `election_id`, `candidate_id`, `position_id`, and `created_at` (TIMESTAMP).
   - **CRITICAL:** The `votes` table MUST NEVER contain a foreign key, reference, or link to `student_id` or `voter_ledger`. Voter identity and cast ballots must remain strictly decoupled.

2. **Closed-Loop Authentication Flow (No User-Provided Phone Numbers):**
   - The portal asks ONLY for `student_id`.
   - The backend checks `voter_ledger`. If the student is found and `has_voted === false`:
     - Generates a cryptographically secure 6-digit numeric OTP (`crypto.randomInt(100000, 999999)`).
     - Hashes the OTP using SHA-256 and stores it in `voter_ledger` alongside a 5-minute expiration timestamp.
     - Calls the Levanter WhatsApp API Gateway via HTTP POST (`/send` or `/messages` endpoint with Bearer auth) to dispatch the plain OTP directly to the student's pre-registered `phone_number`.
   - Returns a masked phone hint to the client (e.g., `OTP sent to ********1234`).

3. **Atomic Ballot Submission (Concurrency & Race-Condition Safe):**
   - Voting submission requires `student_id`, `otp`, and the array of selected `candidate_id`s by `position_id`.
   - The backend executes a strict SQL Transaction:
     1. Executes `SELECT has_voted, otp_hash, otp_expires_at FROM voter_ledger WHERE student_id = ? FOR UPDATE` to lock the row.
     2. Validates OTP hash against current time and ledger state. Throws explicit errors if invalid, expired, or if `has_voted === true`.
     3. Updates `voter_ledger` setting `has_voted = TRUE`, `otp_hash = NULL`, `otp_expires_at = NULL`.
     4. Inserts the candidate selections into `votes`.
     5. Commits the transaction. (Rollback completely on any failure).
     6. Triggers an asynchronous, non-blocking WhatsApp delivery confirmation receipt via the Levanter gateway (e.g., "Your vote for the New Life College Elections has been recorded. Thank you for participating!").

4. **Levanter API Integration Layer:**
   - Implement a modular `LevanterService` / client wrapper using native `fetch` or `axios`.
   - Configurable via environment variables: `LEVANTER_API_URL` (pointing to the Pterodactyl container/domain), `LEVANTER_API_KEY`, and message templates.
   - Clean handling of phone number formatting (stripping spaces, symbols, validating country codes).

5. **Docker Infrastructure:**
   - Complete `docker-compose.yml` linking three services: `db` (MySQL 8), `backend` (Node.js/Express API), and `frontend` (Next.js).
   - MySQL initialization script (`init.sql`) auto-mounted to seed the database tables and test records.
   - Internal bridge network with ports properly restricted (only `frontend` on 3000 and optionally `backend` on 5000 exposed; `db` restricted to internal network).
   - Persistent volume `db_data` for MySQL.

---

### DELIVERABLES REQUIRED

Generate the complete, robust, copy-paste-ready implementation including:
1. `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, and `.env.example` configurations.
2. `database/init.sql` (Schema DDL and sample seed data).
3. Backend source code (`src/index.ts`, `src/config/db.ts`, `src/services/levanter.ts`, `src/controllers/election.controller.ts`, `src/routes/election.routes.ts`).
4. Frontend Next.js components & pages (`app/page.tsx` for ID & OTP entry, `app/ballot/page.tsx` for voting interface, and `app/success/page.tsx` for receipt display).
5. Step-by-step instructions to boot the cluster and test end-to-end with the Levanter bot.