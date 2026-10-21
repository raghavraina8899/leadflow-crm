CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('admin', 'sales') NOT NULL DEFAULT 'sales',
  title         VARCHAR(100),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  company        VARCHAR(150),
  job_title      VARCHAR(100),
  email          VARCHAR(150),
  phone          VARCHAR(40),
  website        VARCHAR(200),
  city           VARCHAR(100),
  source         VARCHAR(50),
  status         ENUM('new', 'contacted', 'qualified', 'proposal', 'converted', 'lost') NOT NULL DEFAULT 'new',
  priority       ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  value          DECIMAL(12, 2) NOT NULL DEFAULT 0,
  expected_close DATE NULL,
  tags           JSON NULL,
  notes          TEXT,
  lost_reason    VARCHAR(255),
  assigned_to    INT UNSIGNED NULL,
  created_by     INT UNSIGNED NOT NULL,
  converted_at   DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_leads_status (status),
  INDEX idx_leads_assigned (assigned_to),
  INDEX idx_leads_created (created_at),
  INDEX idx_leads_converted (converted_at)
);

CREATE TABLE IF NOT EXISTS activities (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id      INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  type         ENUM('call', 'meeting', 'email', 'note', 'follow_up', 'status_change') NOT NULL,
  subject      VARCHAR(200) NOT NULL,
  notes        TEXT,
  due_at       DATETIME NULL,
  completed_at DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_activities_lead (lead_id, created_at),
  INDEX idx_activities_due (due_at, completed_at)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  actor_id   INT UNSIGNED NULL,
  lead_id    INT UNSIGNED NULL,
  type       VARCHAR(40) NOT NULL,
  message    VARCHAR(255) NOT NULL,
  read_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id, read_at)
);
