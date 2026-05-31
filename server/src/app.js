const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { pool } = require('./db');

const PORT = Number(process.env.PORT || 3000);
const WEB_DIR = path.resolve(__dirname, '..', '..', 'web');

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

async function getDashboardData() {
  const [activities] = await pool.query('SELECT * FROM v_activity_summary ORDER BY activity_id');
  const [students] = await pool.query(
    "SELECT user_id, student_no, name, major, class_name, points FROM users WHERE role = 'student' ORDER BY user_id"
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

  return { activities, students, registrations };
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
      const [rows] = await pool.query('SELECT * FROM v_activity_summary ORDER BY activity_id');
      sendJson(res, 200, { ok: true, data: rows });
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
        message: '报名成功：该添加操作已通过 MySQL 触发器校验',
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
        message: '签到成功：该记录可参与存储过程结算',
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
        message: '结算成功：存储过程已批量更新学生积分、报名状态和活动状态',
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
          throw new Error('删除失败：活动不存在，事务已回滚');
        }

        await connection.query('COMMIT');
        sendJson(res, 200, {
          ok: true,
          message: '事务删除成功：通知、报名记录和活动主体已一起删除',
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
  console.log(`Campus Activity DB demo is running at http://localhost:${PORT}`);
});
