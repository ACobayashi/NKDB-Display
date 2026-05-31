USE campus_activity_db;

-- 视图查询：活动列表与报名统计
SELECT * FROM v_activity_summary ORDER BY activity_id;

-- 触发器成功案例：学生 5 报名活动 1
INSERT INTO registrations (activity_id, user_id) VALUES (1, 5);

-- 触发器失败案例：活动 3 容量为 1 且已有报名，会提示“活动名额已满”
INSERT INTO registrations (activity_id, user_id) VALUES (3, 5);

-- 存储过程成功案例：结算活动 4，为已签到学生增加活动积分
CALL sp_finish_activity(4, 0);

-- 存储过程失败案例：再次结算活动 4，会提示避免重复加分
CALL sp_finish_activity(4, 0);

-- 事务删除案例：按顺序删除活动 2 相关通知、报名和活动
BEGIN;
DELETE FROM activity_notices WHERE activity_id = 2;
DELETE FROM registrations WHERE activity_id = 2;
DELETE FROM activities WHERE activity_id = 2;
COMMIT;
