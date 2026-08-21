# 🗳️ New Life College - Secure Student Voting System

> A production-grade, containerized, cryptographically decoupled digital voting platform engineered for **New Life College Student Representative Council (SRC) Elections**. Replaces insecure Google Forms with 100% secret ballot anonymity, zero duplicate voting, automated WhatsApp One-Time Password (OTP) verification via **Levanter Bot API Gateway** on Pterodactyl VPS, an **Admin Management Dashboard with Excel/CSV Import/Export**, **Candidate Photo Uploads**, **Live Polls Lifecycle Controls**, **Automated WhatsApp Mass Broadcasts for Polls & Winners**, and a **Student Self-Registration Portal**.

---

## 📌 Architectural Overview: The "Two-Box" Decoupled Schema

```
┌──────────────────────────────────────────────┐       ┌──────────────────────────────────────────────┐
│        BOX 1: VOTER IDENTITY LEDGER          │       │        BOX 2: ANONYMOUS BALLOT VAULT         │
│               (voter_ledger)                 │       │                   (votes)                    │
├──────────────────────────────────────────────┤       ├──────────────────────────────────────────────┤
│ • student_id (PK, e.g. NLC/2026/001)         │       │ • vote_id (PK Auto-Increment)                │
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
| **Live Election Results** | [http://localhost:3000/results](http://localhost:3000/results) | Real-time turnout donut gauge, leading candidate badges, and percentage bars |
| **Admin Control Console** | [http://localhost:3000/admin](http://localhost:3000/admin) | Password-protected (`nlc_admin_2026`). Live polls toggle, approvals, candidate photos, Excel tools, WhatsApp broadcast center |

---

## 🌟 Key Features & New Additions

### 1. 🏫 Official College Branding & Centered Emblems
- Official New Life College crest integrated into the global navigation bar, login hero banner, and printable voting certificates.
- Perfectly centered and framed across all mobile and desktop screens.

### 2. 🆔 Student ID Format Validation (`NLC` Prefix)
- Enforces official Student ID formatting starting with **`NLC`** (e.g. `NLC/2026/089`).
- Real-time client-side and server-side validation with instant inline error hints and automatic uppercase conversion.

### 3. 🖼️ Candidate Photo Upload & Public Avatars
- **Admin Side**: Upload or change candidate campaign photos directly on candidate cards or attach them during nominee creation.
- **Public Ballot & Results**: Candidate avatar photos rendered on voting cards, review modal thumbnails, and live result standings with automatic icon fallbacks.

### 4. 🎛️ Live Polls Lifecycle Management (`OPEN` / `CLOSED`)
- **Admin One-Click Switch**: Instantly open or close voting polls with real-time audit logging.
- **Public Header Status**: Navigation bar dynamically reflects **"Polls Open"** (green pulsing dot) or **"Polls Closed"** (red dot).
- **Voter Guard**: When polls are closed, student authentication is locked and replaced with an official Commission announcement and direct link to live results.

### 5. 📢 Automated WhatsApp Voter Broadcast Center
Built into the **Admin Overview Tab (`/admin`)**:
- **🗳️ Polls Open Broadcast**: Mass WhatsApp announcement to all registered voters with direct voting portal link and 3-step instructions.
- **🔒 Polls Closed Broadcast**: Mass announcement alerting voters that polls have concluded and linking to live results.
- **🏆 Official Winners Announcement**: One-click computation of winning candidates across all portfolios with automated dispatch of the certified new SRC leaders announcement to all voters.
- **Rate-Limit Pacing**: Automated pacing (80ms interval) to guarantee high delivery reliability through the Levanter VPS Gateway.

### 6. 📊 Real-Time Analytics & Donut Gauge Charts
- Interactive SVG Turnout Donut Gauge chart on live results.
- Automatic 10-second polling, leading candidate badges, and floating back-to-top navigation.

---

## 🔒 Security & Administrative Governance

- **Hidden Admin Access**: The `/admin` route is secured by a master password (`ADMIN_PASSWORD=nlc_admin_2026`).
- **Self-Registration Approval Workflow**:
  1. Students submit details at `/register`.
  2. Submissions enter **`PENDING REVIEW`** status.
  3. Electoral Commission reviews and approves submissions in the **Admin Approvals** tab.
  4. Approving a student automatically dispatches a WhatsApp notification and activates their voting access.
- **Registration Portal Open / Close Switch**:
  - The Commission can instantly open or close the self-registration portal with a single click.

---

## 📱 Live Levanter WhatsApp Bot Configuration (Pterodactyl VPS)

The system communicates directly with your Levanter WhatsApp bot hosted on Pterodactyl VPS:

```env
# Live API Mode Configuration (lyfe00011/levanter)
LEVANTER_MOCK_MODE=false
LEVANTER_API_URL=http://82.208.23.107:2030
LEVANTER_API_KEY=52d192da6e86b2e9121f15079b879c57
LEVANTER_ENDPOINT_PATH=/api/send
```

### Phone Number Format:
- Numbers must start with **`233`** followed by 9 digits without the `+` sign (e.g. `233540001122`).
- The backend automatically sanitizes inputs (stripping spaces, symbols, and transforming local `054...` to `23354...`).

---

## 📊 Excel / CSV Import & Export Capabilities

From the **Admin Dashboard (`/admin`)**:

### 1. Student Voter Ledger Import:
Upload an Excel (`.xlsx` / `.csv`) spreadsheet containing:
| Student ID | Full Name | Department | Level | WhatsApp Number |
|---|---|---|---|---|
| `NLC/2026/001` | Samuel Kwaku Boakye | Computer Science | Level 300 | `233540001122` |
| `NLC/2026/002` | Akua Afriyie Osei | Business Admin | Level 200 | `233550002233` |

### 2. Nominees & Positions Import:
Upload an Excel (`.xlsx` / `.csv`) spreadsheet containing:
| Position | Candidate Name | Running Mate | Tagline | Manifesto |
|---|---|---|---|---|
| `SRC President & Vice President` | Emmanuel Kwesi Mensah | Abena Serwaa Boateng | Visionary Leadership | Campus Wi-Fi upgrade |
| `General Secretary` | Grace Akosua Antwi | | Transparent Secretariat | 24-hr query resolution |

### 3. One-Click Excel Exports:
- **Export Voter Ledger (`.xlsx`):** Full list of students with voting status (`VOTED` / `NOT VOTED`).
- **Export Election Results (`.xlsx`):** Official tally summaries with candidate vote totals.

---

## 🌐 Exposing Docker on Local Wi-Fi Network (Campus / Multi-Device Access)

Allow students and election officials on the same Wi-Fi network to access the voting portal from smartphones, tablets, or laptops:

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

### Step 3: Allow Inbound Ports in Windows Defender Firewall
Open **PowerShell as Administrator** and run:
```powershell
New-NetFirewallRule -DisplayName "NLC Voting Frontend (3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "NLC Voting Backend (5000)" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

### Step 4: Rebuild and Start Containers
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

## 🐳 Quick Start with Docker

```bash
# 1. Reset volume and launch cluster
docker compose down -v
docker compose up --build -d
```

### Service Health URLs:
- **Frontend Portal:** [http://localhost:3000](http://localhost:3000)
- **Backend Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Admin Dashboard:** [http://localhost:3000/admin](http://localhost:3000/admin) *(Password: `nlc_admin_2026`)*

---

## 👥 Pre-Seeded Test Voter Accounts

| Student ID | Student Name | Department | Academic Level | Registered Phone (Ghana) |
|---|---|---|---|---|
| `NLC/2026/001` | Samuel Kwaku Boakye | Computer Science | Level 300 | `233540001122` |
| `NLC/2026/002` | Akua Afriyie Osei | Business Administration | Level 200 | `233550002233` |
| `NLC/2026/003` | Kwame Derrick Ansah | Nursing & Midwifery | Level 400 | `233240003344` |
| `NLC/2026/004` | Blessing Mawusi Dogbe | Information Technology | Level 100 | `233270004455` |

---

## 📜 License
Developed for New Life College Electoral Commission & Student Representative Council.
