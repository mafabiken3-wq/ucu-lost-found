-- ============================================================
-- UCU Campus Lost and Found System
-- Database schema + fictional seed data
-- CSC1202 – Advent 2026
-- ============================================================

CREATE DATABASE IF NOT EXISTS ucu_lost_found
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ucu_lost_found;

-- ----------------------------------------------------------
-- users
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- reports  (lost / found items)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id     INT NOT NULL,
  type            ENUM('lost', 'found') NOT NULL,
  title           VARCHAR(150) NOT NULL,
  category        VARCHAR(60) NOT NULL,
  public_desc     TEXT NOT NULL,
  private_details TEXT NULL COMMENT 'Visible only to reporter + admin',
  location        VARCHAR(100) NOT NULL,
  incident_date   DATE NOT NULL,
  photo_path      VARCHAR(255) NULL,
  status          ENUM('open', 'claimed', 'returned') NOT NULL DEFAULT 'open',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_reporter
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reports_search (type, status, location, incident_date),
  INDEX idx_reports_reporter (reporter_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- claims
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS claims (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  report_id      INT NOT NULL,
  claimant_id    INT NOT NULL,
  evidence       TEXT NOT NULL COMMENT 'Private; only claimant + admin',
  status         ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  admin_response TEXT NULL,
  reviewed_by    INT NULL,
  reviewed_at    TIMESTAMP NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_claims_report
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_claims_claimant
    FOREIGN KEY (claimant_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_claims_reviewer
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_claim_per_user (report_id, claimant_id),
  INDEX idx_claims_status (status),
  INDEX idx_claims_report (report_id)
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA  (fictional – passwords are bcrypt of "Password123!")
-- Hash generated with: bcrypt.hash("Password123!", 10)
-- ============================================================

-- Admin
INSERT INTO users (full_name, email, password_hash, role) VALUES
('System Administrator', 'admin@ucu.ac.ug',
 '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin');

-- Students
INSERT INTO users (full_name, email, password_hash, role) VALUES
('Okello James',   'okello@ucu.ac.ug',
 '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student'),
('Namusoke Grace', 'namusoke@ucu.ac.ug',
 '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student'),
('Achieng Sarah',  'achieng@ucu.ac.ug',
 '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student');

-- Sample found report (Namusoke found keys)
INSERT INTO reports
  (reporter_id, type, title, category, public_desc, private_details, location, incident_date, status)
VALUES
  (3, 'found', 'Set of keys with blue keyring', 'Keys',
   'Keys found under a chair in N5B after the Health and Wholeness lecture. Blue plastic keyring visible.',
   'The keyring has the initials "OJ" scratched on the reverse side. There are three keys: one Yale, one padlock, one cabinet.',
   'N5B Lecture Hall', '2026-11-20', 'open');

-- Sample lost report (another student)
INSERT INTO reports
  (reporter_id, type, title, category, public_desc, private_details, location, incident_date, status)
VALUES
  (4, 'lost', 'Black laptop charger', 'Electronics',
   'Dell 65W charger lost somewhere between Hamu Mukasa Library and Premium Hostel.',
   NULL,
   'Hamu Mukasa Library', '2026-11-19', 'open');

-- Sample claim (Okello claiming the keys)
INSERT INTO claims (report_id, claimant_id, evidence, status)
VALUES
  (1, 2, 'The blue keyring has my initials OJ on the back. I also remember the padlock key is slightly bent.', 'pending');
