-- ==============================================================================
-- New Life College - Secure Student Voting System Database Schema
-- Database Initialization & Seed Script (MySQL 8.0 / InnoDB)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS nlc_voting_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nlc_voting_db;

-- ------------------------------------------------------------------------------
-- 1. VOTER LEDGER TABLE (Box 1: Identity & Eligibility)
-- Stores pre-registered student details, phone numbers, and temporary OTP hashes.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voter_ledger (
    student_id VARCHAR(32) NOT NULL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    department VARCHAR(100) NOT NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'Level 100',
    phone_number VARCHAR(20) NOT NULL COMMENT 'International E.164 format, e.g. 233XXXXXXXXX',
    has_voted BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('APPROVED', 'PENDING_APPROVAL', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    otp_hash VARCHAR(64) NULL COMMENT 'SHA-256 hash of generated 6-digit OTP',
    otp_expires_at TIMESTAMP NULL COMMENT '5-minute expiration timestamp',
    last_otp_request_at TIMESTAMP NULL COMMENT 'Used for rate-limiting OTP dispatches',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone_number (phone_number),
    INDEX idx_has_voted (has_voted),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. ELECTIONS TABLE
-- Metadata for election periods.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS elections (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    academic_year VARCHAR(20) NOT NULL DEFAULT '2026/2027',
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_registration_open BOOLEAN NOT NULL DEFAULT TRUE,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 14 DAY),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. POSITIONS TABLE
-- Executive portfolios open for voting in an election.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS positions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    election_id VARCHAR(36) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    max_selections INT NOT NULL DEFAULT 1,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    INDEX idx_election_order (election_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. CANDIDATES TABLE
-- Vetted candidates contesting for positions.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    position_id VARCHAR(36) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    running_mate VARCHAR(120) NULL,
    tagline VARCHAR(200) NULL,
    manifesto TEXT NULL,
    avatar_url VARCHAR(255) NULL,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
    INDEX idx_position_order (position_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. VOTES TABLE (Box 2: Anonymous Ballot Vault)
-- CRITICAL SECURITY RULE:
-- Strictly decoupled from voter_ledger. Zero FKs, student IDs, or voter links!
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS votes (
    vote_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    election_id VARCHAR(36) NOT NULL,
    position_id VARCHAR(36) NOT NULL,
    candidate_id VARCHAR(36) NOT NULL,
    ballot_receipt_hash CHAR(64) NOT NULL COMMENT 'Anonymized cryptographic submission batch verification hash',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    INDEX idx_election_position (election_id, position_id),
    INDEX idx_candidate (candidate_id),
    INDEX idx_receipt_hash (ballot_receipt_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. AUDIT LOGS TABLE
-- Security and event tracking without voter-candidate correlation.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- SEED DATA: NEW LIFE COLLEGE SRC ELECTIONS (2026/2027)
-- ==============================================================================

-- 1. Insert Active Election
INSERT INTO elections (id, title, academic_year, description, is_active)
VALUES (
    'el-nlc-2026',
    'New Life College 2026/2027 Student Representative Council (SRC) General Elections',
    '2026/2027',
    'Official digital polling for New Life College Executive Leadership. Exercise your democratic right with complete anonymity.',
    TRUE
) ON DUPLICATE KEY UPDATE title = VALUES(title);

-- 2. Insert Positions
INSERT INTO positions (id, election_id, title, description, max_selections, display_order)
VALUES
    ('pos-pres', 'el-nlc-2026', 'SRC President & Vice President', 'Chief Executive leadership of the Student Body', 1, 1),
    ('pos-gen-sec', 'el-nlc-2026', 'General Secretary', 'Chief Administrator, Secretariat & Official Communications', 1, 2),
    ('pos-fin-con', 'el-nlc-2026', 'Financial Controller', 'Budgeting, Student Fund Management & Financial Auditing', 1, 3),
    ('pos-org-sec', 'el-nlc-2026', 'Organizing Secretary', 'Campus Programs, Events & Student Welfare Logistics', 1, 4),
    ('pos-wocom', 'el-nlc-2026', 'Women''s Commissioner', 'Advocacy, Gender Inclusivity & Female Student Empowerment', 1, 5)
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- 3. Insert Candidates with realistic profiles, taglines and manifestos
INSERT INTO candidates (id, position_id, full_name, running_mate, tagline, manifesto, avatar_url, display_order)
VALUES
    -- SRC President & Vice President
    (
        'cand-pres-1',
        'pos-pres',
        'Emmanuel Kwesi Mensah',
        'Abena Serwaa Boateng',
        'Visionary Leadership • Student Welfare • Digital Innovation',
        'Committed to upgrading campus Wi-Fi infrastructure, establishing an emergency student relief fund, advocating for 24/7 library power backups, and introducing transparent quarterly SRC financial disclosures.',
        '/avatars/president-1.png',
        1
    ),
    (
        'cand-pres-2',
        'pos-pres',
        'Michael Kofi Darko',
        'Priscilla Naa Ashitey',
        'Empowerment • Accountability • Excellence',
        'Dedicated to expanding internship and corporate mentorship pipelines, modernizing campus shuttle routes, reducing student guild levies, and launching modern extracurricular sports leagues.',
        '/avatars/president-2.png',
        2
    ),

    -- General Secretary
    (
        'cand-sec-1',
        'pos-gen-sec',
        'Grace Akosua Antwi',
        NULL,
        'Speed, Accuracy, and Transparent Communication',
        'Pledging 100% digitized student query tracking, prompt release of senate communiqués within 24 hours of meetings, and establishing interactive monthly town-hall forums.',
        '/avatars/sec-1.png',
        1
    ),
    (
        'cand-sec-2',
        'pos-gen-sec',
        'Joshua Selorm Agbovi',
        NULL,
        'A Responsive and Accessible Secretariat',
        'Focusing on institutional memory through a centralized cloud document archive, automated WhatsApp announcements bot, and streamlined academic grievances handling.',
        '/avatars/sec-2.png',
        2
    ),

    -- Financial Controller
    (
        'cand-fin-1',
        'pos-fin-con',
        'David Osei Tutu',
        NULL,
        'Fiduciary Integrity & Prudent Resource Allocation',
        'Championing zero-waste budgeting, real-time public balance sheet tracking, automated dues payment receipts, and micro-grants for student-led campus startups.',
        '/avatars/fin-1.png',
        1
    ),
    (
        'cand-fin-2',
        'pos-fin-con',
        'Benjamin Kwabena Yeboah',
        NULL,
        'Accountability First, Student Value Always',
        'Implementing strict vendor auditing for all SRC procurement, negotiating student discounts with local food vendors and tech stores, and transparent sponsorship reports.',
        '/avatars/fin-2.png',
        2
    ),

    -- Organizing Secretary
    (
        'cand-org-1',
        'pos-org-sec',
        'Kofi Asante Poku',
        NULL,
        'Vibrant Campus Life • Inclusive Events • Seamless Logistics',
        'Revitalizing the Annual NLC Hall Week, hosting premier tech and entrepreneurship hackathons, organizing career fairs, and enhancing sanitation facilities during events.',
        '/avatars/org-1.png',
        1
    ),
    (
        'cand-org-2',
        'pos-org-sec',
        'Daniel Nana Kwame',
        NULL,
        'Campus Synergy & Student Well-being',
        'Focusing on inter-departmental sports festivals, mental health wellness retreats, organized academic study bootcamps, and subsidized student educational tours.',
        '/avatars/org-2.png',
        2
    ),

    -- Women's Commissioner
    (
        'cand-woc-1',
        'pos-wocom',
        'Eunice Mansa Tetteh',
        NULL,
        'Inspire, Empower, and Elevate Every Woman',
        'Expanding female leadership masterclasses, providing subsidized emergency sanitary hygiene dispensaries in all academic blocks, and organizing tech coding bootcamps for women.',
        '/avatars/woc-1.png',
        1
    ),
    (
        'cand-woc-2',
        'pos-wocom',
        'Adwoa Beatrice Frimpong',
        NULL,
        'Equity, Wellness, and Unstoppable Ambition',
        'Establishing mentorship circles with distinguished alumnae, conducting campus-wide safety and anti-harassment campaigns, and offering entrepreneurial seed funding for women creators.',
        '/avatars/woc-2.png',
        2
    )
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

