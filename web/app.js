const state = {
  activities: [],
  students: [],
  registrations: []
};

const els = {
  dbStatus: document.querySelector('#dbStatus'),
  activityRows: document.querySelector('#activityRows'),
  studentSelect: document.querySelector('#studentSelect'),
  registerActivitySelect: document.querySelector('#registerActivitySelect'),
  finishActivitySelect: document.querySelector('#finishActivitySelect'),
  deleteActivitySelect: document.querySelector('#deleteActivitySelect'),
  studentCards: document.querySelector('#studentCards'),
  registrationList: document.querySelector('#registrationList'),
  resultBox: document.querySelector('#resultBox'),
  extraPointsInput: document.querySelector('#extraPointsInput'),
  metricActivities: document.querySelector('#metricActivities'),
  metricOpen: document.querySelector('#metricOpen'),
  metricRegistrations: document.querySelector('#metricRegistrations'),
  metricPoints: document.querySelector('#metricPoints'),
  newStudentNo: document.querySelector('#newStudentNo'),
  newStudentName: document.querySelector('#newStudentName'),
  newStudentMajor: document.querySelector('#newStudentMajor'),
  newStudentClass: document.querySelector('#newStudentClass'),
  newStudentPoints: document.querySelector('#newStudentPoints')
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function statusBadge(status) {
  return `<span class="badge ${status}">${status}</span>`;
}

function option(label, value) {
  return `<option value="${value}">${label}</option>`;
}

function showResult(payload) {
  els.resultBox.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
}

function syncState(data) {
  state.activities = data.activities;
  state.students = data.students;
  state.registrations = data.registrations;
  render();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || '操作失败');
  }
  return payload;
}

async function refresh() {
  const payload = await api('/api/dashboard');
  syncState(payload.data);
}

function render() {
  const totalPoints = state.students.reduce((sum, student) => sum + Number(student.points || 0), 0);
  const openActivities = state.activities.filter(activity => activity.status === 'open').length;

  els.metricActivities.textContent = state.activities.length;
  els.metricOpen.textContent = openActivities;
  els.metricRegistrations.textContent = state.registrations.length;
  els.metricPoints.textContent = totalPoints;

  els.activityRows.innerHTML = state.activities.map(activity => `
    <tr>
      <td>${activity.activity_id}</td>
      <td><strong>${activity.title}</strong><br><span class="muted">${formatDate(activity.start_time)}</span></td>
      <td>${activity.category_name}</td>
      <td>${activity.club_name}</td>
      <td>${activity.venue_location}</td>
      <td>${activity.capacity}</td>
      <td>${activity.registered_count}</td>
      <td>${activity.remaining_slots}</td>
      <td>${activity.points}</td>
      <td>${statusBadge(activity.status)}</td>
    </tr>
  `).join('');

  els.studentSelect.innerHTML = state.students.map(student =>
    option(`${student.name}（${student.student_no}）`, student.user_id)
  ).join('');

  const activityOptions = state.activities.map(activity =>
    option(`#${activity.activity_id} ${activity.title}`, activity.activity_id)
  ).join('');
  els.registerActivitySelect.innerHTML = activityOptions;
  els.finishActivitySelect.innerHTML = activityOptions;
  els.deleteActivitySelect.innerHTML = activityOptions;

  els.studentCards.innerHTML = state.students.map(student => `
    <div class="student-card">
      <div>
        <strong>${student.name}</strong>
        <div class="muted">${student.student_no} / ${student.major} / ${student.class_name}</div>
      </div>
      <div class="points">${student.points} 分</div>
    </div>
  `).join('');

  els.registrationList.innerHTML = state.registrations.map(registration => `
    <div class="registration-item">
      <div>
        <strong>${registration.student_name}</strong>
        <div class="muted">#${registration.registration_id} ${registration.activity_title}</div>
        <div class="muted">状态：${registration.status} / 报名：${formatDate(registration.registered_at)}</div>
      </div>
      ${
        registration.status === 'registered'
          ? `<button data-check-in="${registration.registration_id}">签到</button>`
          : `<span class="badge ${registration.status}">${registration.status}</span>`
      }
    </div>
  `).join('');
}

async function createStudent() {
  const payload = await api('/api/admin/students', {
    method: 'POST',
    body: JSON.stringify({
      studentNo: els.newStudentNo.value,
      name: els.newStudentName.value,
      major: els.newStudentMajor.value,
      className: els.newStudentClass.value,
      points: Number(els.newStudentPoints.value || 0)
    })
  });
  syncState(payload.data);
  showResult(payload);
}

async function submitRegistration(studentId, activityId) {
  const payload = await api('/api/registrations', {
    method: 'POST',
    body: JSON.stringify({ studentId, activityId })
  });
  syncState(payload.data);
  showResult(payload);
}

async function finishActivity(activityId, extraPoints = 0) {
  const payload = await api('/api/admin/finish-activity', {
    method: 'POST',
    body: JSON.stringify({ activityId, extraPoints })
  });
  syncState(payload.data);
  showResult(payload);
}

async function deleteActivity(activityId) {
  const payload = await api(`/api/admin/activities/${activityId}`, { method: 'DELETE' });
  syncState(payload.data);
  showResult(payload);
}

document.querySelector('#refreshButton').addEventListener('click', async () => {
  try {
    await refresh();
    showResult('数据已刷新，视图 v_activity_summary 已重新查询。');
  } catch (error) {
    showResult(error.message);
  }
});

document.querySelector('#addStudentButton').addEventListener('click', async () => {
  try {
    await createStudent();
  } catch (error) {
    showResult(error.message);
  }
});

document.querySelector('#registerButton').addEventListener('click', async () => {
  try {
    await submitRegistration(Number(els.studentSelect.value), Number(els.registerActivitySelect.value));
  } catch (error) {
    showResult(error.message);
  }
});

document.querySelector('#finishButton').addEventListener('click', async () => {
  try {
    await finishActivity(Number(els.finishActivitySelect.value), Number(els.extraPointsInput.value || 0));
  } catch (error) {
    showResult(error.message);
  }
});

document.querySelector('#deleteButton').addEventListener('click', async () => {
  try {
    await deleteActivity(Number(els.deleteActivitySelect.value));
  } catch (error) {
    showResult(error.message);
  }
});

document.addEventListener('click', async event => {
  const action = event.target.dataset.demo;
  if (!action) return;

  try {
    if (action === 'triggerSuccess') {
      await submitRegistration(5, 1);
    }
    if (action === 'triggerFull') {
      await submitRegistration(5, 3);
    }
    if (action === 'triggerDuplicate') {
      await submitRegistration(2, 1);
    }
    if (action === 'procedureSuccess') {
      await finishActivity(4, 0);
    }
    if (action === 'procedureFail') {
      await finishActivity(4, 0);
    }
  } catch (error) {
    showResult(error.message);
  }
});

els.registrationList.addEventListener('click', async event => {
  const registrationId = event.target.dataset.checkIn;
  if (!registrationId) return;

  try {
    const payload = await api('/api/admin/check-in', {
      method: 'POST',
      body: JSON.stringify({ registrationId: Number(registrationId) })
    });
    syncState(payload.data);
    showResult(payload);
  } catch (error) {
    showResult(error.message);
  }
});

async function boot() {
  try {
    const health = await api('/api/health');
    els.dbStatus.textContent = `已连接 ${health.database_name}`;
    await refresh();
    showResult('系统已启动。建议答辩时按“视图查询 -> 触发器添加 -> 存储过程更新 -> 事务删除”的顺序演示。');
  } catch (error) {
    els.dbStatus.textContent = '数据库连接失败';
    showResult(`启动失败：${error.message}\n请确认 MySQL 已启动，SQL 已导入，server/.env 中密码正确。`);
  }
}

boot();
