USE campus_activity_db;
DROP TRIGGER IF EXISTS trg_before_registration_insert;

DELIMITER //

-- 报名添加控制触发器。时机：向 registrations 表 INSERT 之前执行。统一检查活动、用户、状态、截止时间、重复报名和名额。
CREATE TRIGGER trg_before_registration_insert
BEFORE INSERT ON registrations
FOR EACH ROW
BEGIN
  -- 活动是否存在。
  DECLARE v_activity_exists INT DEFAULT 0;
  -- 活动容量。
  DECLARE v_capacity INT DEFAULT 0;
  -- 当前已占用名额的人数。
  DECLARE v_registered_count INT DEFAULT 0;
  -- 该学生是否已经报名过同一活动。
  DECLARE v_duplicate_count INT DEFAULT 0;
  -- 用户是否存在。
  DECLARE v_user_exists INT DEFAULT 0;
  -- 活动报名截止时间。
  DECLARE v_deadline DATETIME;
  -- 活动状态，只有 open 才能报名。
  DECLARE v_status VARCHAR(20);
  -- 用户身份，只有 student 可以报名。
  DECLARE v_user_role VARCHAR(20);

  -- 检查 NEW.activity_id 对应的活动是否存在。
  SELECT COUNT(*) INTO v_activity_exists
  FROM activities
  WHERE activity_id = NEW.activity_id;

  IF v_activity_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：活动不存在';
  END IF;

  -- 读取活动状态、容量和报名截止时间，供后续校验使用。
  SELECT status, capacity, registration_deadline
  INTO v_status, v_capacity, v_deadline
  FROM activities
  WHERE activity_id = NEW.activity_id;

  -- 检查 NEW.user_id 对应的用户是否存在。
  SELECT COUNT(*) INTO v_user_exists
  FROM users
  WHERE user_id = NEW.user_id;

  IF v_user_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：用户不存在';
  END IF;

  -- 读取用户角色，判断是否为学生。
  SELECT role INTO v_user_role
  FROM users
  WHERE user_id = NEW.user_id;

  -- 管理员不能报名活动，只有学生用户可以报名。
  IF v_user_role <> 'student' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：只有学生用户可以报名活动';
  END IF;

  -- 检查活动状态，只有 open 状态允许报名。
  IF v_status <> 'open' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：活动不是开放报名状态';
  END IF;

  -- 检查当前时间是否已经超过报名截止时间。
  IF v_deadline < NOW() THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：活动报名已截止';
  END IF;

  -- 检查重复报名，已取消的记录不计入重复。
  SELECT COUNT(*) INTO v_duplicate_count
  FROM registrations
  WHERE activity_id = NEW.activity_id
    AND user_id = NEW.user_id
    AND status <> 'cancelled';

  -- 如果存在未取消的同活动报名记录，阻止重复报名。
  IF v_duplicate_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：该学生已经报名过该活动';
  END IF;

  -- 统计已占用名额，registered/checked_in/completed 都算占用。
  SELECT COUNT(*) INTO v_registered_count
  FROM registrations
  WHERE activity_id = NEW.activity_id
    AND status IN ('registered', 'checked_in', 'completed');

  -- 如果已报名人数达到容量，阻止INSERT。
  IF v_registered_count >= v_capacity THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '报名失败：活动名额已满';
  END IF;

  -- 如果前端没有传 registered_at，自动写入当前时间
  IF NEW.registered_at IS NULL THEN
    SET NEW.registered_at = NOW();
  END IF;
END//

DELIMITER ;
