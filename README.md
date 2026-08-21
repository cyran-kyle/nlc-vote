# 🗳️ New Life College - Secure Student Voting System

> A production-grade, containerized, cryptographically decoupled digital voting platform engineered for **New Life College Student Representative Council (SRC) Elections**. Replaces insecure Google Forms with 100% secret ballot anonymity, zero duplicate voting, automated WhatsApp One-Time Password (OTP) verification via **Levanter Bot API Gateway** on Pterodactyl VPS, an **Admin Management Dashboard with Excel/CSV Import/Export**, and a **Student Self-Registration Portal**.

---

## 📌 Architectural Overview: The "Two-Box" Decoupled Schema

```
┌──────────────────────────────────────────────┐       ┌──────────────────────────────────────────────┐
│        BOX 1: VOTER IDENTITY LEDGER          │       │        BOX 2: ANONYMOUS BALLOT VAULT         │
│               (voter_ledger)                 │       │                   (votes)                    │
├──────────────────────────────────────────────┤       ├──────────────────────────────────────────────┤
│ • student_id (PK)                            │       │ • vote_id (PK Auto-Increment)                │
│ • full_name, department, level               │ ZERO  │ • election_id (FK -> elections.id)           │
│ • phone_number (233XXXXXXXXX pre-registered) │ ◄- -► │ • position_id (FK -> positions.id)           │
│ • has_voted (BOOLEAN, default FALSE)         │ LINK  │ • candidate_id (FK -> candidates.id)         │
│ • otp_hash (SHA-256)                         │       │ • ballot_receipt_hash (SHA-256 batch hash)   │
│ • otp_expires_at (TIMESTAMP)                 │       │ • created_at (TIMESTAMP)                     │
└──────────────────────────────────────────────┘       └──────────────────────────────────────────────┘
  ✅ Closed-Loop Student ID Lookup                       ✅ 100% Decoupled Secret Ballot
  ✅ Pessimistic Row Lock (SELECT FOR UPDATE)            ✅ Zero Student ID or Phone References
  ✅ SHA-256 OTP Hash Invalidation                       ✅ Cryptographic Receipt Verification
```

---

## 🚀 Portals & Web Interfaces

| Interface | URL | Purpose |
|---|---|---|
| **Student Voting Portal** | [http://localhost:3000](http://localhost:3000) | Authenticate with Student ID, receive WhatsApp OTP, and cast ballot |
| **Student Self-Registration** | [http://localhost:3000/register](http://localhost:3000/register) | Onboarding form for students to submit details (submits for Commission approval) |
| **Live Election Results** | [http://localhost:3000/results](http://localhost:3000/results) | Real-time voter turnout rate and live candidate vote counts & percentage bars |
| **Admin Control Console** | [http://localhost:3000/admin](http://localhost:3000/admin) | Hidden from public nav. Approvals, registration portal open/close toggle, Excel import/export, WhatsApp diagnostics |

---

## 🔒 Security & Administrative Governance

- **Hidden Admin Access**: The `/admin` route is completely hidden from regular voters in the navigation header. Access is secured by a master password (`ADMIN_PASSWORD=nlc_admin_2026`).
- **Self-Registration Approval Workflow**:
  1. Students submit their Name, ID, Department, Level, and WhatsApp Number at `/register`.
  2. Submissions enter **`PENDING REVIEW`** status.
  3. The Electoral Commission reviews submissions in the **Admin Approvals** tab.
  4. Clicking **"Approve"** immediately sends an automated WhatsApp message to the student and activates their ability to vote.
  5. Unapproved students cannot request OTP or cast ballots.
- **Registration Portal Open / Close Switch**:
  - The Commission can instantly open or close the self-registration portal with a single click in the Admin Dashboard.
- **100% Mobile Responsive**:
  - Optimized for smartphones, tablets, and desktops with touch-friendly controls.

---

## 📱 Live Levanter WhatsApp Bot Configuration (Pterodactyl VPS)

The system is configured in **Live API Mode** to communicate with your Levanter bot hosted on Pterodactyl VPS:

```env
# Live API Mode Configuration (lyfe00011/levanter)
LEVANTER_MOCK_MODE=false
LEVANTER_API_URL=http://82.208.23.107:2030
LEVANTER_API_KEY=52d192da6e86b2e9121f15079b879c57
LEVANTER_ENDPOINT_PATH=/api/send
```

### Levanter Official API Schema Specification:
- **HTTP Method:** `POST /api/send`
- **Header:** `x-api-key: 52d192da6e86b2e9121f15079b879c57`
- **Request Body JSON:**
  ```json
  {
    "to": "233540001122",
    "type": "text",
    "text": "Your New Life College OTP is: 123456",
    "session": 0
  }
  ```

### Phone Number Format Requirements:
- Numbers must start with **`233`** followed by 9 digits without the `+` sign (e.g. `233540001122`).
- The backend automatically handles sanitization (stripping spaces, symbols, and transforming local `054...` to `23354...`).

---

## 📊 Excel / CSV Import & Export Capabilities

From the **Admin Dashboard (`/admin`)** (Default password: `nlc_admin_2026`):

### 1. Student Voter Ledger Import:
Upload an Excel (`.xlsx` / `.csv`) spreadsheet containing the following columns:
| Student ID | Full Name | Department | Level | WhatsApp Number |
|---|---|---|---|---|
| `NLC/2026/001` | Samuel Kwaku Boakye | Computer Science | Level 300 | `233540001122` |
| `NLC/2026/002` | Akua Afriyie Osei | Business Admin | Level 200 | `233550002233` |

*(You can click **"Voter Template (.xlsx)"** in the Admin Dashboard to download a ready-made template.)*

### 2. Nominees & Positions Import:
Upload an Excel (`.xlsx` / `.csv`) spreadsheet containing:
| Position | Candidate Name | Running Mate | Tagline | Manifesto |
|---|---|---|---|---|
| `SRC President & Vice President` | Emmanuel Kwesi Mensah | Abena Serwaa Boateng | Visionary Leadership | Campus Wi-Fi upgrade |
| `General Secretary` | Grace Akosua Antwi | | Transparent Secretariat | 24-hr query resolution |

### 3. One-Click Excel Exports:
- **Export Voter Ledger (`.xlsx`):** Download the full list of students with voting status (`VOTED` / `PENDING`).
- **Export Election Results (`.xlsx`):** Download official tally summaries with candidate vote totals.

---

## 🐳 Quick Start with Docker

```bash
# 1. Reset volume and launch cluster
docker compose down -v
docker compose up --build
```

### Service Health URLs:
- **Frontend Portal:** [http://localhost:3000](http://localhost:3000)
- **Backend Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Admin Dashboard:** [http://localhost:3000/admin](http://localhost:3000/admin) *(Password: `nlc_admin_2026`)*

---

## 🌐 Exposing Docker on Local Wi-Fi Network (Campus / Multi-Device Access)

You can allow students and election officials on the same Wi-Fi network to access the voting portal from their smartphones, tablets, or laptops:

### Step 1: Find Your Computer's Local Wi-Fi IP
Open PowerShell or Command Prompt on the host machine:
```powershell
ipconfig
```
Look for **IPv4 Address** under your Wireless LAN adapter (e.g. `192.168.100.8`).

### Step 2: Configure Environment Variables
Update the root [`.env`](.env) and [`backend/.env`](backend/.env) files with your machine's Wi-Fi IP:
```env
CLIENT_URL=http://192.168.100.8:3000
NEXT_PUBLIC_API_URL=http://192.168.100.8:5000/api
```
*(Replace `192.168.100.8` with your actual local IP).*

### Step 3: Allow Inbound Ports in Windows Defender Firewall
Open **PowerShell as Administrator** and run:
```powershell
New-NetFirewallRule -DisplayName "NLC Voting Frontend (3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "NLC Voting Backend (5000)" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

### Step 4: Rebuild and Start Containers
Next.js bakes `NEXT_PUBLIC_API_URL` during build. Rebuild the cluster:
```bash
docker compose down
docker compose up --build -d
```

### Step 5: Connect from Any Device on the Wi-Fi
| Interface | Wi-Fi Device Access URL |
|---|---|
| **🗳️ Voter Authentication & Ballot** | `http://192.168.100.8:3000` |
| **📝 Student Self-Registration** | `http://192.168.100.8:3000/register` |
| **📊 Live Election Results** | `http://192.168.100.8:3000/results` |
| **🔒 Electoral Commission Admin** | `http://192.168.100.8:3000/admin` |

---

## 📜 License
Developed for New Life College Electoral Commission & Student Representative Council.
