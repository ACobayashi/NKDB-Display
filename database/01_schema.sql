DROP DATABASE IF EXISTS campus_activity_db;
CREATE DATABASE campus_activity_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE campus_activity_db;

CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  student_no VARCHAR(20) UNIQUE,
  name VARCHAR(50) NOT NULL,
  role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  major VARCHAR(80),
  class_name VARCHAR(80),
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE clubs (
  club_id INT PRIMARY KEY AUTO_INCREMENT,
  club_name VARCHAR(80) NOT NULL UNIQUE,
  contact_name VARCHAR(50),
  contact_phone VARCHAR(30),
  description VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE venues (
  venue_id INT PRIMARY KEY AUTO_INCREMENT,
  venue_name VARCHAR(80) NOT NULL,
  building VARCHAR(80) NOT NULL,
  room VARCHAR(40) NOT NULL,
  capacity INT NOT NULL,
  UNIQUE KEY uq_venue_location (building, room),
  CHECK (capacity > 0)
) ENGINE=InnoDB;

CREATE TABLE activity_categories (
  category_id INT PRIMARY KEY AUTO_INCREMENT,
  category_name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE activities (
  activity_id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  category_id INT NOT NULL,
  club_id INT NOT NULL,
  venue_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  registration_deadline DATETIME NOT NULL,
  capacity INT NOT NULL,
  points INT NOT NULL DEFAULT 1,
  status ENUM('draft', 'open', 'closed', 'finished', 'cancelled') NOT NULL DEFAULT 'open',
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activities_category
    FOREIGN KEY (category_id) REFERENCES activity_categories (category_id),
  CONSTRAINT fk_activities_club
    FOREIGN KEY (club_id) REFERENCES clubs (club_id),
  CONSTRAINT fk_activities_venue
    FOREIGN KEY (venue_id) REFERENCES venues (venue_id),
  CONSTRAINT fk_activities_created_by
    FOREIGN KEY (created_by) REFERENCES users (user_id),
  CHECK (capacity > 0),
  CHECK (points >= 0),
  CHECK (end_time > start_time)
) ENGINE=InnoDB;

CREATE TABLE registrations (
  registration_id INT PRIMARY KEY AUTO_INCREMENT,
  activity_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('registered', 'checked_in', 'completed', 'cancelled') NOT NULL DEFAULT 'registered',
  registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_in_at DATETIME,
  CONSTRAINT fk_registrations_activity
    FOREIGN KEY (activity_id) REFERENCES activities (activity_id),
  CONSTRAINT fk_registrations_user
    FOREIGN KEY (user_id) REFERENCES users (user_id),
  UNIQUE KEY uq_registration_activity_user (activity_id, user_id)
) ENGINE=InnoDB;

CREATE TABLE activity_notices (
  notice_id INT PRIMARY KEY AUTO_INCREMENT,
  activity_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  content TEXT NOT NULL,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notices_activity
    FOREIGN KEY (activity_id) REFERENCES activities (activity_id)
) ENGINE=InnoDB;

CREATE INDEX idx_activities_status ON activities (status);
CREATE INDEX idx_activities_start_time ON activities (start_time);
CREATE INDEX idx_registrations_activity ON registrations (activity_id);
CREATE INDEX idx_registrations_user ON registrations (user_id);
