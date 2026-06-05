USE campus_activity_db;
DROP VIEW IF EXISTS v_activity_summary;

-- 活动总览视图。活动、分类、主办方、场地、报名统计整合成一个查询结果。
CREATE VIEW v_activity_summary AS
SELECT
  -- 活动基础属性，activities 表。
  a.activity_id,
  a.title,
  -- 活动分类名称，来自categories表。
  ac.category_name,
  -- 主办方名称，clubs表。
  c.club_name,
  -- 场地名称，来自venues表。
  v.venue_name,
  v.venue_name AS venue_location,
  -- 活动时间、报名截止时间、容量、积分和状态。
  a.start_time,
  a.end_time,
  a.registration_deadline,
  a.capacity,
  a.points,
  a.status,
  -- registered_count：统计有效报名人数，取消报名 cancelled 不占名额。
  COUNT(CASE WHEN r.status IN ('registered', 'checked_in', 'completed') THEN 1 END) AS registered_count,
  -- remaining_slots：剩余名额 = 活动容量 - 有效报名人数。
  a.capacity - COUNT(CASE WHEN r.status IN ('registered', 'checked_in', 'completed') THEN 1 END) AS remaining_slots
FROM activities AS a

JOIN activity_categories AS ac ON a.category_id = ac.category_id
JOIN clubs AS c ON a.club_id = c.club_id
JOIN venues AS v ON a.venue_id = v.venue_id
-- LEFT JOIN 保证即使活动还没人报名，也能在活动总览中显示。
LEFT JOIN registrations AS r ON a.activity_id = r.activity_id
-- GROUP BY 活动及其关联属性，配合 COUNT 统计每个活动的报名人数
GROUP BY
  a.activity_id,
  a.title,
  ac.category_name,
  c.club_name,
  v.venue_name,
  v.building,
  v.room,
  a.start_time,
  a.end_time,
  a.registration_deadline,
  a.capacity,
  a.points,
  a.status;
