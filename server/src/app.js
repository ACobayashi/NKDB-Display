const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { pool } = require('./db');

const PORT = Number(process.env.PORT || 3000);
const WEB_DIR = path.resolve(__dirname, '..', '..', 'web');
let presetsReady = false;

const presetCategories = [
  ['学术讲座', '学术讲座、经验分享、职业规划等'],
  ['志愿服务', '校内外公益和服务类活动'],
  ['竞赛活动', '程序设计、创新创业、数据分析等竞赛'],
  ['社团沙龙', '社团招新、沙龙、工作坊等'],
  ['体育美育', '体育锻炼、美育实践和校园文化活动']
];

const presetClubs = [
  ['学生会', '王老师', '022-10000001', '负责校园讲座、竞赛与学生活动组织'],
  ['创新创业学会', '李老师', '022-10000002', '组织创新创业训练和项目交流活动'],
  ['文学院', '办公室', '022-10000003', '学院主办的校园活动'],
  ['历史学院', '办公室', '022-10000004', '学院主办的校园活动'],
  ['哲学院', '办公室', '022-10000005', '学院主办的校园活动'],
  ['外国语学院', '办公室', '022-10000006', '学院主办的校园活动'],
  ['法学院', '办公室', '022-10000007', '学院主办的校园活动'],
  ['周恩来政府管理学院', '办公室', '022-10000008', '学院主办的校园活动'],
  ['马克思主义学院', '办公室', '022-10000009', '学院主办的校园活动'],
  ['国际教育学院', '办公室', '022-10000010', '学院主办的校园活动'],
  ['汉语言文化学院', '办公室', '022-10000011', '学院主办的校园活动'],
  ['经济学院', '办公室', '022-10000012', '学院主办的校园活动'],
  ['商学院', '办公室', '022-10000013', '学院主办的校园活动'],
  ['旅游与服务学院', '办公室', '022-10000014', '学院主办的校园活动'],
  ['金融学院', '办公室', '022-10000015', '学院主办的校园活动'],
  ['数学科学学院', '办公室', '022-10000016', '学院主办的校园活动'],
  ['物理科学学院', '办公室', '022-10000017', '学院主办的校园活动'],
  ['化学学院', '办公室', '022-10000018', '学院主办的校园活动'],
  ['生命科学学院', '办公室', '022-10000019', '学院主办的校园活动'],
  ['环境科学与工程学院', '办公室', '022-10000020', '学院主办的校园活动'],
  ['医学院', '办公室', '022-10000021', '学院主办的校园活动'],
  ['药学院', '办公室', '022-10000022', '学院主办的校园活动'],
  ['电子信息与光学工程学院', '办公室', '022-10000023', '学院主办的校园活动'],
  ['材料科学与工程学院', '办公室', '022-10000024', '学院主办的校园活动'],
  ['计算机学院', '办公室', '022-10000025', '学院主办的校园活动'],
  ['密码与网络空间安全学院', '办公室', '022-10000026', '学院主办的校园活动'],
  ['人工智能学院', '办公室', '022-10000027', '学院主办的校园活动'],
  ['软件学院', '办公室', '022-10000028', '学院主办的校园活动'],
  ['统计与数据科学学院', '办公室', '022-10000029', '学院主办的校园活动'],
  ['信息与传播学院', '办公室', '022-10000030', '学院主办的校园活动'],
  ['社会学院', '办公室', '022-10000031', '学院主办的校园活动'],
  ['卓越工程师学院', '办公室', '022-10000032', '学院主办的校园活动'],
  ['就业指导发展部门', '就业指导中心', '022-10000033', '负责就业指导、职业规划与发展活动'],
  ['社团', '社团负责人', '022-10000034', '校内学生社团主办活动']
];

const presetClubNames = presetClubs.map(club => club[0]);

const presetVenues = [
  ['主楼报告厅', '八里台校区主楼', '201', 120],
  ['综合实验室', '津南校区综合实验楼', 'B305', 45],
  ['大学生活动中心', '大学生活动中心', '101', 80],
  ['图书馆报告厅', '图书馆', '一层报告厅', 100],
  ['体育中心多功能厅', '体育中心', '多功能厅', 150]
];

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, error) {
  const message = error && (error.sqlMessage || error.message) ? (error.sqlMessage || error.message) : String(error);
  sendJson(res, statusCode, { ok: false, message });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('请求体过大'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('请求体不是合法 JSON'));
      }
    });
    req.on('error', reject);
  });
}

function parseId(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} 必须是正整数`);
  }
  return parsed;
}

function requireText(value, fieldName, maxLength) {
  const text = String(value || '').trim();
  if (!text) {
    throw new Error(`${fieldName} 不能为空`);
  }
  if (text.length > maxLength) {
    throw new Error(`${fieldName} 不能超过 ${maxLength} 个字符`);
  }
  return text;
}

function parseDateTime(value, fieldName) {
  const text = requireText(value, fieldName, 19).replace('T', ' ');
  const normalized = text.length === 16 ? `${text}:00` : text;
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    throw new Error(`${fieldName} 格式不正确`);
  }
  if (!Number.isFinite(new Date(normalized.replace(' ', 'T')).getTime())) {
    throw new Error(`${fieldName} 不是有效时间`);
  }
  return normalized;
}

function dateTimeMillis(value) {
  return new Date(value.replace(' ', 'T')).getTime();
}

async function ensurePresetReferenceData() {
  if (presetsReady) {
    return;
  }

  await pool.query(
    "INSERT IGNORE INTO users (student_no, name, role, major, class_name, points) VALUES ('ADMIN001', '系统管理员', 'admin', '数据库工程', '管理员', 0)"
  );

  for (const category of presetCategories) {
    await pool.query(
      'INSERT IGNORE INTO activity_categories (category_name, description) VALUES (?, ?)',
      category
    );
  }

  for (const club of presetClubs) {
    await pool.query(
      'INSERT IGNORE INTO clubs (club_name, contact_name, contact_phone, description) VALUES (?, ?, ?, ?)',
      club
    );
  }

  for (const venue of presetVenues) {
    await pool.query(
      'INSERT IGNORE INTO venues (venue_name, building, room, capacity) VALUES (?, ?, ?, ?)',
      venue
    );
  }

  presetsReady = true;
}

async function getDashboardData() {
  await ensurePresetReferenceData();

  const [activities] = await pool.query('SELECT * FROM v_activity_summary ORDER BY activity_id');
  const [students] = await pool.query(
    "SELECT user_id, student_no, name, major, class_name, points FROM users WHERE role = 'student' ORDER BY user_id"
  );
  const [categories] = await pool.query(
    'SELECT category_id, category_name FROM activity_categories ORDER BY category_id'
  );
  const [clubRows] = await pool.query(
    'SELECT club_id, club_name FROM clubs ORDER BY club_id'
  );
  const clubs = clubRows
    .filter(club => presetClubNames.includes(club.club_name))
    .sort((left, right) => presetClubNames.indexOf(left.club_name) - presetClubNames.indexOf(right.club_name));
  const [venues] = await pool.query(
    "SELECT venue_id, venue_name, building, room, capacity FROM venues ORDER BY venue_id"
  );
  const [registrations] = await pool.query(`
    SELECT
      r.registration_id,
      r.activity_id,
      a.title AS activity_title,
      r.user_id,
      u.name AS student_name,
      r.status,
      r.registered_at,
      r.checked_in_at
    FROM registrations AS r
    JOIN activities AS a ON r.activity_id = a.activity_id
    JOIN users AS u ON r.user_id = u.user_id
    ORDER BY r.registration_id
  `);

  return { activities, students, registrations, categories, clubs, venues };
}

async function handleApi(req, res, url) {
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      const [rows] = await pool.query('SELECT DATABASE() AS database_name, 1 AS connected');
      sendJson(res, 200, { ok: true, ...rows[0] });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/dashboard') {
      sendJson(res, 200, { ok: true, data: await getDashboardData() });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/activities') {
      await ensurePresetReferenceData();
      const [rows] = await pool.query('SELECT * FROM v_activity_summary ORDER BY activity_id');
      sendJson(res, 200, { ok: true, data: rows });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/activities') {
      await ensurePresetReferenceData();
      const body = await readBody(req);
      const title = requireText(body.title, '活动名称', 120);
      const description = String(body.description || '').trim();
      const categoryId = parseId(body.categoryId, 'categoryId');
      const clubId = parseId(body.clubId, 'clubId');
      const venueId = parseId(body.venueId, 'venueId');
      const startTime = parseDateTime(body.startTime, '开始时间');
      const endTime = parseDateTime(body.endTime, '结束时间');
      const registrationDeadline = parseDateTime(body.registrationDeadline, '报名截止时间');
      const capacity = Number(body.capacity || 0);
      const points = Number(body.points || 0);

      if (!Number.isInteger(capacity) || capacity <= 0) {
        throw new Error('活动容量必须是正整数');
      }
      if (!Number.isInteger(points) || points < 0) {
        throw new Error('活动积分必须是非负整数');
      }
      if (dateTimeMillis(endTime) <= dateTimeMillis(startTime)) {
        throw new Error('结束时间必须晚于开始时间');
      }
      if (dateTimeMillis(registrationDeadline) > dateTimeMillis(startTime)) {
        throw new Error('报名截止时间不能晚于活动开始时间');
      }

      const [creatorRows] = await pool.query(
        "SELECT user_id FROM users WHERE role = 'admin' ORDER BY user_id LIMIT 1"
      );

      const [result] = await pool.query(
        `
          INSERT INTO activities
            (title, description, category_id, club_id, venue_id, start_time, end_time, registration_deadline, capacity, points, status, created_by)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
        `,
        [
          title,
          description,
          categoryId,
          clubId,
          venueId,
          startTime,
          endTime,
          registrationDeadline,
          capacity,
          points,
          creatorRows[0].user_id
        ]
      );
      sendJson(res, 201, {
        ok: true,
        message: '活动创建成功，已进入开放报名状态。',
        activityId: result.insertId,
        data: await getDashboardData()
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/students') {
      const body = await readBody(req);
      const studentNo = requireText(body.studentNo, '学号', 20);
      const name = requireText(body.name, '姓名', 50);
      const major = requireText(body.major || '未填写专业', '专业', 80);
      const className = requireText(body.className || '未填写班级', '班级', 80);
      const points = Number(body.points || 0);
      if (!Number.isInteger(points) || points < 0) {
        throw new Error('初始积分必须是非负整数');
      }

      const [result] = await pool.query(
        "INSERT INTO users (student_no, name, role, major, class_name, points) VALUES (?, ?, 'student', ?, ?, ?)",
        [studentNo, name, major, className, points]
      );
      sendJson(res, 201, {
        ok: true,
        message: '学生成员添加成功：已写入 users 表',
        userId: result.insertId,
        data: await getDashboardData()
      });
      return;
    }

    const deleteStudentMatch = url.pathname.match(/^\/api\/admin\/students\/(\d+)$/);
    if (req.method === 'DELETE' && deleteStudentMatch) {
      const studentId = parseId(deleteStudentMatch[1], 'studentId');
      const connection = await pool.getConnection();

      try {
        await connection.query('BEGIN');
        const [studentRows] = await connection.query(
          "SELECT user_id, name FROM users WHERE user_id = ? AND role = 'student' FOR UPDATE",
          [studentId]
        );
        if (studentRows.length === 0) {
          throw new Error('删除失败：学生成员不存在。');
        }

        const [registrationResult] = await connection.query(
          'DELETE FROM registrations WHERE user_id = ?',
          [studentId]
        );
        const [studentResult] = await connection.query(
          "DELETE FROM users WHERE user_id = ? AND role = 'student'",
          [studentId]
        );

        await connection.query('COMMIT');
        sendJson(res, 200, {
          ok: true,
          message: `学生成员“${studentRows[0].name}”已删除，相关报名记录已同步清理。`,
          deleted: {
            student_registrations: registrationResult.affectedRows,
            users: studentResult.affectedRows
          },
          data: await getDashboardData()
        });
      } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
      } finally {
        connection.release();
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/registrations') {
      const body = await readBody(req);
      const studentId = parseId(body.studentId, 'studentId');
      const activityId = parseId(body.activityId, 'activityId');

      const [result] = await pool.query(
        'INSERT INTO registrations (activity_id, user_id) VALUES (?, ?)',
        [activityId, studentId]
      );
      sendJson(res, 201, {
        ok: true,
        message: '报名成功，系统已完成活动状态、名额和重复报名校验。',
        registrationId: result.insertId,
        data: await getDashboardData()
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/check-in') {
      const body = await readBody(req);
      const registrationId = parseId(body.registrationId, 'registrationId');
      const [result] = await pool.query(
        "UPDATE registrations SET status = 'checked_in', checked_in_at = NOW() WHERE registration_id = ? AND status = 'registered'",
        [registrationId]
      );
      if (result.affectedRows === 0) {
        throw new Error('签到失败：只能把 registered 状态的报名记录改为 checked_in');
      }
      sendJson(res, 200, {
        ok: true,
        message: '签到成功，该记录可参与活动积分结算。',
        data: await getDashboardData()
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/finish-activity') {
      const body = await readBody(req);
      const activityId = parseId(body.activityId, 'activityId');
      const extraPoints = Number(body.extraPoints || 0);
      if (!Number.isInteger(extraPoints) || extraPoints < 0) {
        throw new Error('extraPoints 必须是非负整数');
      }

      await pool.query('CALL sp_finish_activity(?, ?)', [activityId, extraPoints]);
      sendJson(res, 200, {
        ok: true,
        message: '结算成功，已更新学生积分、报名状态和活动状态。',
        data: await getDashboardData()
      });
      return;
    }

    const deleteActivityMatch = url.pathname.match(/^\/api\/admin\/activities\/(\d+)$/);
    if (req.method === 'DELETE' && deleteActivityMatch) {
      const activityId = parseId(deleteActivityMatch[1], 'activityId');
      const connection = await pool.getConnection();

      try {
        await connection.query('BEGIN');
        const [noticeResult] = await connection.query(
          'DELETE FROM activity_notices WHERE activity_id = ?',
          [activityId]
        );
        const [registrationResult] = await connection.query(
          'DELETE FROM registrations WHERE activity_id = ?',
          [activityId]
        );
        const [activityResult] = await connection.query(
          'DELETE FROM activities WHERE activity_id = ?',
          [activityId]
        );

        if (activityResult.affectedRows === 0) {
          throw new Error('删除失败：活动不存在，数据未发生变化。');
        }

        await connection.query('COMMIT');
        sendJson(res, 200, {
          ok: true,
          message: '删除成功，相关通知和报名记录已同步清理。',
          deleted: {
            activity_notices: noticeResult.affectedRows,
            registrations: registrationResult.affectedRows,
            activities: activityResult.affectedRows
          },
          data: await getDashboardData()
        });
      } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
      } finally {
        connection.release();
      }
      return;
    }

    sendJson(res, 404, { ok: false, message: '接口不存在' });
  } catch (error) {
    sendError(res, 400, error);
  }
}

function serveStatic(req, res, url) {
  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.resolve(WEB_DIR, `.${requestedPath}`);

  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('页面资源不存在');
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url);
    return;
  }
  serveStatic(req, res, url);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Campus Activity DB app is running at http://localhost:${PORT}`);
});
