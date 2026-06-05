USE campus_activity_db;

DROP PROCEDURE IF EXISTS sp_finish_activity;

DELIMITER //

-- 活动积分结算存储过程。p_activity_id 表示要结算的活动，p_extra_points 表示额外奖励积分。
CREATE PROCEDURE sp_finish_activity(
  IN p_activity_id INT,
  IN p_extra_points INT
)
BEGIN
  -- 活动是否存在。
  DECLARE v_exists INT DEFAULT 0;
  -- 动当前状态，只有 open 状态允许结算。
  DECLARE v_status VARCHAR(20);
  -- 活动本身的基础积分。
  DECLARE v_activity_points INT DEFAULT 0;
  -- 该活动已签到报名记录数量。
  DECLARE v_checked_count INT DEFAULT 0;


  IF p_extra_points < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '结算失败：额外积分不能为负数';
  END IF;

  SELECT COUNT(*) INTO v_exists
  FROM activities
  WHERE activity_id = p_activity_id;

  -- 活动不存在时，抛出错误并终止存储过程。
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '结算失败：活动不存在';
  END IF;

  -- 读取活动状态和基础积分。
  SELECT status, points
  INTO v_status, v_activity_points
  FROM activities
  WHERE activity_id = p_activity_id;

  -- 检查活动状态，避免 finished 活动被重复结算、重复加分
  IF v_status <> 'open' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '结算失败：只有 open 状态的活动可以结算，避免重复加分';
  END IF;

  -- 统计已签到人数，只有 checked_in 的报名记录才参与加分。
  SELECT COUNT(*) INTO v_checked_count
  FROM registrations
  WHERE activity_id = p_activity_id
    AND status = 'checked_in';

  -- 如果没有已签到学生，则不能执行批量加分。
  IF v_checked_count = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '结算失败：没有已签到学生，不能批量加分';
  END IF;

  -- 更新users.points。连接关系：users.user_id = registrations.user_id。学生原积分 + 活动基础积分 + 额外积分。
  UPDATE users AS u
  JOIN registrations AS r ON u.user_id = r.user_id
  SET u.points = u.points + v_activity_points + p_extra_points
  WHERE r.activity_id = p_activity_id
    AND r.status = 'checked_in'
    AND u.role = 'student';

  -- 把该活动已签到报名记录改为completed，表示已完成结算。
  UPDATE registrations
  SET status = 'completed'
  WHERE activity_id = p_activity_id
    AND status = 'checked_in';

  -- 把活动状态改为finished，防止之后再次结算。
  UPDATE activities
  SET status = 'finished'
  WHERE activity_id = p_activity_id;
END//

DELIMITER ;
