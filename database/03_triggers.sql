USE campus_activity_db;

DROP TRIGGER IF EXISTS trg_before_registration_insert;

DELIMITER //

CREATE TRIGGER trg_before_registration_insert
BEFORE INSERT ON registrations
FOR EACH ROW
BEGIN
  DECLARE v_activity_exists INT DEFAULT 0;
  DECLARE v_capacity INT DEFAULT 0;
  DECLARE v_registered_count INT DEFAULT 0;
  DECLARE v_duplicate_count INT DEFAULT 0;
  DECLARE v_user_exists INT DEFAULT 0;
  DECLARE v_deadline DATETIME;
  DECLARE v_status VARCHAR(20);
  DECLARE v_user_role VARCHAR(20);

  SELECT COUNT(*) INTO v_activity_exists
  FROM activities
  WHERE activity_id = NEW.activity_id;

  IF v_activity_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：活动不存在';
  END IF;

  SELECT status, capacity, registration_deadline
  INTO v_status, v_capacity, v_deadline
  FROM activities
  WHERE activity_id = NEW.activity_id;

  SELECT COUNT(*) INTO v_user_exists
  FROM users
  WHERE user_id = NEW.user_id;

  IF v_user_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：用户不存在';
  END IF;

  SELECT role INTO v_user_role
  FROM users
  WHERE user_id = NEW.user_id;

  IF v_user_role <> 'student' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：只有学生用户可以报名活动';
  END IF;

  IF v_status <> 'open' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：活动不是开放报名状态';
  END IF;

  IF v_deadline < NOW() THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：活动报名已截止';
  END IF;

  SELECT COUNT(*) INTO v_duplicate_count
  FROM registrations
  WHERE activity_id = NEW.activity_id
    AND user_id = NEW.user_id
    AND status <> 'cancelled';

  IF v_duplicate_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：该学生已经报名过该活动';
  END IF;

  SELECT COUNT(*) INTO v_registered_count
  FROM registrations
  WHERE activity_id = NEW.activity_id
    AND status IN ('registered', 'checked_in', 'completed');

  IF v_registered_count >= v_capacity THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：活动名额已满';
  END IF;

  IF NEW.registered_at IS NULL THEN
    SET NEW.registered_at = NOW();
  END IF;
END//

DELIMITER ;
