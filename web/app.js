const state = {
  activities: [],
  students: [],
  registrations: [],
  categories: [],
  clubs: [],
  venues: []
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
  newStudentPoints: document.querySelector('#newStudentPoints'),
  newActivityTitle: document.querySelector('#newActivityTitle'),
  newActivityDescription: document.querySelector('#newActivityDescription'),
  newActivityCategory: document.querySelector('#newActivityCategory'),
  newActivityClub: document.querySelector('#newActivityClub'),
  newActivityVenue: document.querySelector('#newActivityVenue'),
  newActivityStart: document.querySelector('#newActivityStart'),
  newActivityEnd: document.querySelector('#newActivityEnd'),
  newActivityDeadline: document.querySelector('#newActivityDeadline'),
  newActivityCapacity: document.querySelector('#newActivityCapacity'),
  newActivityPoints: document.querySelector('#newActivityPoints')
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
  if (typeof payload === 'string') {
    els.resultBox.textContent = payload;
    return;
  }

  const lines = [];
  if (payload.message) lines.push(payload.message);
  if (payload.userId) lines.push(`学生编号：${payload.userId}`);
  if (payload.activityId) lines.push(`活动编号：${payload.activityId}`);
  if (payload.registrationId) lines.push(`报名编号：${payload.registrationId}`);
  if (payload.deleted) {
    if (payload.deleted.users !== undefined) {
      lines.push(`清理明细：学生 ${payload.deleted.users} 条，报名 ${payload.deleted.student_registrations} 条`);
    } else {
      lines.push(
        `清理明细：活动 ${payload.deleted.activities} 条，报名 ${payload.deleted.registrations} 条，通知 ${payload.deleted.activity_notices} 条`
      );
    }
  }

  els.resultBox.textContent = lines.length ? lines.join('\n') : JSON.stringify(payload, null, 2);
}

function syncState(data) {
  state.activities = data.activities || [];
  state.students = data.students || [];
  state.registrations = data.registrations || [];
  state.categories = data.categories || [];
  state.clubs = data.clubs || [];
  state.venues = data.venues || [];
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

  els.newActivityCategory.innerHTML = state.categories.map(category =>
    option(category.category_name, category.category_id)
  ).join('');
  els.newActivityClub.innerHTML = state.clubs.map(club =>
    option(club.club_name, club.club_id)
  ).join('');
  els.newActivityVenue.innerHTML = state.venues.map(venue =>
    option(venue.venue_name, venue.venue_id)
  ).join('');

  els.studentCards.innerHTML = state.students.map(student => `
    <div class="student-card">
      <div class="student-main">
        <strong>${student.name}</strong>
        <div class="muted">${student.student_no} / ${student.major} / ${student.class_name}</div>
      </div>
      <div class="student-actions">
        <div class="points">${student.points} 分</div>
        <button class="small-danger-button" data-delete-student="${student.user_id}">删除</button>
      </div>
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
          ? `
              <div class="record-actions">
                <button data-check-in="${registration.registration_id}">签到</button>
                <button class="small-danger-button" data-cancel-registration="${registration.registration_id}">取消</button>
              </div>
            `
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

async function createActivity() {
  const payload = await api('/api/admin/activities', {
    method: 'POST',
    body: JSON.stringify({
      title: els.newActivityTitle.value,
      description: els.newActivityDescription.value,
      categoryId: Number(els.newActivityCategory.value),
      clubId: Number(els.newActivityClub.value),
      venueId: Number(els.newActivityVenue.value),
      startTime: els.newActivityStart.value,
      endTime: els.newActivityEnd.value,
      registrationDeadline: els.newActivityDeadline.value,
      capacity: Number(els.newActivityCapacity.value || 0),
      points: Number(els.newActivityPoints.value || 0)
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

async function deleteStudent(studentId) {
  const payload = await api(`/api/admin/students/${studentId}`, { method: 'DELETE' });
  syncState(payload.data);
  showResult(payload);
}

async function cancelRegistration(registrationId) {
  const payload = await api(`/api/admin/registrations/${registrationId}`, { method: 'DELETE' });
  syncState(payload.data);
  showResult(payload);
}

document.querySelector('#refreshButton').addEventListener('click', async () => {
  try {
    await refresh();
    showResult('数据已刷新。');
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

document.querySelector('#addActivityButton').addEventListener('click', async () => {
  try {
    await createActivity();
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

els.studentCards.addEventListener('click', async event => {
  const studentId = event.target.dataset.deleteStudent;
  if (!studentId) return;

  if (!confirm('确定删除这名学生成员及其报名记录吗？')) {
    return;
  }

  try {
    await deleteStudent(Number(studentId));
  } catch (error) {
    showResult(error.message);
  }
});

els.registrationList.addEventListener('click', async event => {
  const checkInId = event.target.dataset.checkIn;
  const cancelId = event.target.dataset.cancelRegistration;

  try {
    if (checkInId) {
      const payload = await api('/api/admin/check-in', {
        method: 'POST',
        body: JSON.stringify({ registrationId: Number(checkInId) })
      });
      syncState(payload.data);
      showResult(payload);
    }

    if (cancelId) {
      if (!confirm('确定取消这条报名记录吗？')) {
        return;
      }

      await cancelRegistration(Number(cancelId));
    }
  } catch (error) {
    showResult(error.message);
  }
});

async function boot() {
  try {
    const health = await api('/api/health');
    els.dbStatus.textContent = `已连接 ${health.database_name}`;
    await refresh();
    showResult('系统已启动，可以进行学生维护、报名办理、签到管理、积分结算和活动数据维护。');
  } catch (error) {
    els.dbStatus.textContent = '数据库连接失败';
    showResult(`启动失败：${error.message}\n请确认 MySQL 已启动，SQL 已导入，server/.env 中密码正确。`);
  }
}

boot();
