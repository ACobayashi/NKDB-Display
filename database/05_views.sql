USE campus_activity_db;

DROP VIEW IF EXISTS v_activity_summary;

CREATE VIEW v_activity_summary AS
SELECT
  a.activity_id,
  a.title,
  ac.category_name,
  c.club_name,
  v.venue_name,
  v.venue_name AS venue_location,
  a.start_time,
  a.end_time,
  a.registration_deadline,
  a.capacity,
  a.points,
  a.status,
  COUNT(CASE WHEN r.status IN ('registered', 'checked_in', 'completed') THEN 1 END) AS registered_count,
  a.capacity - COUNT(CASE WHEN r.status IN ('registered', 'checked_in', 'completed') THEN 1 END) AS remaining_slots
FROM activities AS a
JOIN activity_categories AS ac ON a.category_id = ac.category_id
JOIN clubs AS c ON a.club_id = c.club_id
JOIN venues AS v ON a.venue_id = v.venue_id
LEFT JOIN registrations AS r ON a.activity_id = r.activity_id
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
