DROP DATABASE IF EXISTS campus_activity_db;

CREATE DATABASE campus_activity_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE campus_activity_db;

-- users：用户表，既保存学生，也保存管理员。
CREATE TABLE users (
  -- user_id 是用户主键，自增生成。
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  -- student_no 是学生学号，设置唯一约束，避免重复学号。
  student_no VARCHAR(20) UNIQUE,
  name VARCHAR(50) NOT NULL,
  role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  -- 学生专业和班级。
  major VARCHAR(80),
  class_name VARCHAR(80),
  -- points 保存学生积分，结算活动时由存储过程更新。
  points INT NOT NULL DEFAULT 0,
  -- created_at 记录用户创建时间。
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- clubs：主办方表，保存学生会、学院、部门、社团等预设主办方。
CREATE TABLE clubs (
  -- 主办方主键
  club_id INT PRIMARY KEY AUTO_INCREMENT,
  -- club_name 是主办方名称，唯一约束避免重复选项
  club_name VARCHAR(80) NOT NULL UNIQUE,
  contact_name VARCHAR(50),
  contact_phone VARCHAR(30),
  -- description 保存主办方说明。
  description VARCHAR(255)
) ENGINE=InnoDB;

-- venues：活动场地表，保存可选择的校内场地。
CREATE TABLE venues (
  -- 是场地主键。
  venue_id INT PRIMARY KEY AUTO_INCREMENT,
  -- 场地名称。
  venue_name VARCHAR(80) NOT NULL,
  building VARCHAR(80) NOT NULL,
  room VARCHAR(40) NOT NULL,
  -- capacity 是场地容量，必须大于 0。
  capacity INT NOT NULL,
  -- building + room 唯一，避免同一地点重复录入。
  UNIQUE KEY uq_venue_location (building, room),
  CHECK (capacity > 0)
) ENGINE=InnoDB;

-- activity_categories：活动分类表，例如学术讲座、志愿服务、竞赛活动等。
CREATE TABLE activity_categories (
  -- category_id 是分类主键。
  category_id INT PRIMARY KEY AUTO_INCREMENT,
  -- 是分类名称，唯一约束避免重复分类。
  category_name VARCHAR(50) NOT NULL UNIQUE,
  -- description 保存分类说明。
  description VARCHAR(255)
) ENGINE=InnoDB;

-- activities：活动主表，是系统的核心业务实体。
CREATE TABLE activities (
  -- activity_id 是活动主键。
  activity_id INT PRIMARY KEY AUTO_INCREMENT,
  -- 活动名称与详情。
  title VARCHAR(120) NOT NULL,
  description TEXT,
  -- category_id、club_id、venue_id 分别关联分类、主办方和场地。
  category_id INT NOT NULL,
  club_id INT NOT NULL,
  venue_id INT NOT NULL,
  -- 控制活动时间和报名截止时间。
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  registration_deadline DATETIME NOT NULL,
  -- 活动名额，活动基础积分。
  capacity INT NOT NULL,
  points INT NOT NULL DEFAULT 1,
  -- status表示活动状态，报名触发器和结算存储过程都会检查该字段。
  status ENUM('draft', 'open', 'closed', 'finished', 'cancelled') NOT NULL DEFAULT 'open',
  -- created_by关联users.user_id，表示活动创建者
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- 外键activities.category_id -> activity_categories.category_id。
  CONSTRAINT fk_activities_category
    FOREIGN KEY (category_id) REFERENCES activity_categories (category_id),
  -- 外键activities.club_id -> clubs.club_id。
  CONSTRAINT fk_activities_club
    FOREIGN KEY (club_id) REFERENCES clubs (club_id),
  -- 外键activities.venue_id -> venues.venue_id。
  CONSTRAINT fk_activities_venue
    FOREIGN KEY (venue_id) REFERENCES venues (venue_id),
  -- 外键activities.created_by -> users.user_id。
  CONSTRAINT fk_activities_created_by
    FOREIGN KEY (created_by) REFERENCES users (user_id),
  -- 检查约束，名额为正、积分非负、结束时间晚于开始时间
  CHECK (capacity > 0),
  CHECK (points >= 0),
  CHECK (end_time > start_time)
) ENGINE=InnoDB;

-- registrations：报名关系表，连接学生和活动，是多对多关系的中间表。
CREATE TABLE registrations (
  -- 报名记录主键。
  registration_id INT PRIMARY KEY AUTO_INCREMENT,
  -- 关联 activities，报名的是哪一个活动。
  activity_id INT NOT NULL,
  -- 关联 users，哪一个学生报名。
  user_id INT NOT NULL,
  -- s报名状态：已报名、已签到、已完成、已取消。
  status ENUM('registered', 'checked_in', 'completed', 'cancelled') NOT NULL DEFAULT 'registered',
  -- 保存报名时间与签到时间。
  registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_in_at DATETIME,
  -- 外键：registrations.activity_id -> activities.activity_id。
  CONSTRAINT fk_registrations_activity
    FOREIGN KEY (activity_id) REFERENCES activities (activity_id),
  -- 外键：registrations.user_id -> users.user_id。
  CONSTRAINT fk_registrations_user
    FOREIGN KEY (user_id) REFERENCES users (user_id),
  -- 同一学生同一活动只能有一条报名记录，触发器也会做重复报名校验。
  UNIQUE KEY uq_registration_activity_user (activity_id, user_id)
) ENGINE=InnoDB;

-- activity_notices：活动通知表，保存活动提醒和取消报名等操作留痕。
CREATE TABLE activity_notices (
  -- 通知主键。
  notice_id INT PRIMARY KEY AUTO_INCREMENT,
  -- 关联 activities，通知属于哪个活动。
  activity_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  content TEXT NOT NULL,
  -- 记录通知发布时间。
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- 外键：activity_notices.activity_id -> activities.activity_id。
  CONSTRAINT fk_notices_activity
    FOREIGN KEY (activity_id) REFERENCES activities (activity_id)
) ENGINE=InnoDB;

-- 索引：查询活动状态、活动时间、报名按活动/用户查询。
CREATE INDEX idx_activities_status ON activities (status);
CREATE INDEX idx_activities_start_time ON activities (start_time);
CREATE INDEX idx_registrations_activity ON registrations (activity_id);
CREATE INDEX idx_registrations_user ON registrations (user_id);
