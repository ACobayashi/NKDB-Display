USE campus_activity_db;

DROP PROCEDURE IF EXISTS sp_finish_activity;

DELIMITER //

CREATE PROCEDURE sp_finish_activity(
  IN p_activity_id INT,
  IN p_extra_points INT
)
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  DECLARE v_status VARCHAR(20);
  DECLARE v_activity_points INT DEFAULT 0;
  DECLARE v_checked_count INT DEFAULT 0;

  IF p_extra_points < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '结算失败：额外积分不能为负数';
  END IF;

  SELECT COUNT(*) INTO v_exists
  FROM activities
  WHERE activity_id = p_activity_id;

  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '结算失败：活动不存在';
  END IF;

  SELECT status, points
  INTO v_status, v_activity_points
  FROM activities
  WHERE activity_id = p_activity_id;

  IF v_status <> 'open' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '结算失败：只有 open 状态的活动可以结算，避免重复加分';
  END IF;

  SELECT COUNT(*) INTO v_checked_count
  FROM registrations
  WHERE activity_id = p_activity_id
    AND status = 'checked_in';

  IF v_checked_count = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '结算失败：没有已签到学生，不能批量加分';
  END IF;

  UPDATE users AS u
  JOIN registrations AS r ON u.user_id = r.user_id
  SET u.points = u.points + v_activity_points + p_extra_points
  WHERE r.activity_id = p_activity_id
    AND r.status = 'checked_in'
    AND u.role = 'student';

  UPDATE registrations
  SET status = 'completed'
  WHERE activity_id = p_activity_id
    AND status = 'checked_in';

  UPDATE activities
  SET status = 'finished'
  WHERE activity_id = p_activity_id;
END//

DELIMITER ;
