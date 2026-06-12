// ===== UI: РЕНДЕР ВСІХ СТОРІНОК =====

// ---------- ХЕЛПЕРИ UI ----------
function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function openModal(title, bodyHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modalOverlay').classList.add('hidden');
}

function openMenu() {
  document.getElementById('sideMenu').classList.remove('hidden');
  document.getElementById('menuOverlay').classList.remove('hidden');
}

function closeMenu() {
  document.getElementById('sideMenu').classList.add('hidden');
  document.getElementById('menuOverlay').classList.add('hidden');
}

// Події меню
document.getElementById('menuBtn').addEventListener('click', openMenu);
document.getElementById('closeMenuBtn').addEventListener('click', closeMenu);
document.getElementById('menuOverlay').addEventListener('click', closeMenu);
document.getElementById('modalOverlay').addEventListener('click', closeModal);
document.querySelector('.modal-close').addEventListener('click', closeModal);

// ---------- ГОЛОВНА ----------
async function renderHome() {
  // Останні оголошення
  try {
    const anns = await getAnnouncements();
    const list = document.getElementById('homeAnnouncementsList');
    if (anns.length === 0) {
      list.innerHTML = '<p class="empty-state" style="padding: 16px 0;"><span class="empty-icon">📭</span><br>Поки немає оголошень</p>';
    } else {
      list.innerHTML = anns.slice(0, 3).map(a => `
        <div class="content-card" style="margin-bottom: 8px; cursor: pointer;" onclick="navigateTo('announcements')">
          <h3>${escapeHtml(a.title)}</h3>
          <p>${escapeHtml(a.content).substring(0, 80)}${a.content.length > 80 ? '...' : ''}</p>
          <div class="meta">${formatDate(a.createdAt)} · ${escapeHtml(a.author)}</div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Home announcements error:', e);
  }

  // Мої проблеми
  try {
    const issues = await getIssues();
    const list = document.getElementById('homeIssuesList');
    if (issues.length === 0) {
      list.innerHTML = '<p class="empty-state" style="padding: 16px 0;"><span class="empty-icon">✅</span><br>Немає проблем</p>';
    } else {
      list.innerHTML = issues.slice(0, 3).map(i => `
        <div class="content-card" style="margin-bottom: 8px;">
          <h3>${escapeHtml(i.title)}</h3>
          <span class="issue-status ${i.status}">${issueStatusText(i.status)}</span>
          <div class="meta">${formatDate(i.createdAt)}</div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Home issues error:', e);
  }
}

// ---------- ОГОЛОШЕННЯ ----------
async function renderAnnouncements() {
  const list = document.getElementById('announcementsList');
  list.innerHTML = '<div class="loading-spinner" style="position: relative;"><div class="spinner"></div></div>';

  try {
    const anns = await getAnnouncements();
    if (anns.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>Поки немає оголошень</p></div>';
    } else {
      list.innerHTML = anns.map(a => `
        <div class="content-card">
          <h3>${escapeHtml(a.title)}</h3>
          <p>${escapeHtml(a.content)}</p>
          <div class="meta">
            <span>${formatDate(a.createdAt)}</span>
            <span>${escapeHtml(a.author)}</span>
            ${isAdmin() ? `<span style="color: var(--danger); cursor: pointer;" onclick="confirmDeleteAnnouncement('${a.id}')">🗑️</span>` : ''}
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>Помилка завантаження</p></div>';
  }
}

function confirmDeleteAnnouncement(id) {
  if (confirm('Видалити оголошення?')) {
    deleteAnnouncement(id).then(() => {
      showToast('Видалено', 'success');
      renderAnnouncements();
    });
  }
}

// Кнопка додати оголошення
document.getElementById('addAnnouncementBtn')?.addEventListener('click', function() {
  openModal('Нове оголошення', `
    <div class="form-group">
      <label>Заголовок</label>
      <input type="text" id="annTitle" class="form-input" placeholder="Заголовок оголошення">
    </div>
    <div class="form-group">
      <label>Текст</label>
      <textarea id="annContent" class="form-input" placeholder="Текст оголошення..." rows="4"></textarea>
    </div>
    <button onclick="submitAnnouncement()" class="btn btn-primary btn-full">Опублікувати</button>
  `);
});

async function submitAnnouncement() {
  const title = document.getElementById('annTitle').value.trim();
  const content = document.getElementById('annContent').value.trim();
  if (!title || !content) {
    showToast('Заповніть всі поля', 'error');
    return;
  }
  try {
    await addAnnouncement(title, content);
    closeModal();
    showToast('Оголошення опубліковано', 'success');
    renderAnnouncements();
  } catch (e) {
    showToast('Помилка: ' + e.message, 'error');
  }
}

// ---------- КОНТАКТИ ----------
async function renderContacts() {
  const list = document.getElementById('contactsList');
  list.innerHTML = '<div class="loading-spinner" style="position: relative;"><div class="spinner"></div></div>';

  try {
    const contacts = await getContacts();
    if (contacts.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">📞</div><p>Контакти ще не додані</p></div>';
    } else {
      list.innerHTML = contacts.map(c => `
        <div class="contact-card">
          <div class="contact-icon">${c.icon || '📞'}</div>
          <div class="contact-info">
            <h3>${escapeHtml(c.name)}</h3>
            <p>${escapeHtml(c.category)}</p>
          </div>
          <a href="tel:${c.phone}" class="contact-phone">${c.phone}</a>
        </div>
      `).join('');
    }
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>Помилка завантаження</p></div>';
  }
}

// ---------- ГОЛОСУВАННЯ ----------
async function renderPolls() {
  const list = document.getElementById('pollsList');
  list.innerHTML = '<div class="loading-spinner" style="position: relative;"><div class="spinner"></div></div>';

  try {
    const polls = await getPolls();
    if (polls.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">🗳</div><p>Голосувань поки немає</p></div>';
    } else {
      const user = getCurrentUser();
      list.innerHTML = polls.map(p => {
        const totalVotes = p.options.reduce((sum, o) => sum + (o.votes ? o.votes.length : 0), 0);
        const hasVoted = p.options.some(o => o.votes && o.votes.includes(user.apt));

        return `
          <div class="content-card ${!p.active ? 'poll-closed' : ''}">
            <h3>${escapeHtml(p.question)}</h3>
            ${!p.active ? '<span class="badge badge-warning">Голосування завершено</span>' : ''}
            <div class="poll-options">
              ${p.options.map((opt, idx) => {
                const voteCount = opt.votes ? opt.votes.length : 0;
                const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                const voted = opt.votes && opt.votes.includes(user.apt);
                return `
                  <div class="poll-option">
                    <button ${!p.active || hasVoted ? 'disabled' : ''} onclick="votePollAction('${p.id}', ${idx})" class="${voted ? 'voted' : ''}">
                      <span>${escapeHtml(opt.text)}</span>
                      <span class="poll-percent">${percent}%</span>
                    </button>
                    <div class="poll-bar"><div class="poll-bar-fill" style="width: ${percent}%"></div></div>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="poll-total">Всього голосів: ${totalVotes}</div>
            <div class="meta">Створено: ${formatDate(p.createdAt)}</div>
          </div>
        `;
      }).join('');
    }
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>Помилка завантаження</p></div>';
  }
}

async function votePollAction(pollId, optionIndex) {
  try {
    const user = getCurrentUser();
    await votePoll(pollId, optionIndex, user);
    showToast('Голос враховано!', 'success');
    renderPolls();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

document.getElementById('addPollBtn')?.addEventListener('click', function() {
  openModal('Створити голосування', `
    <div class="form-group">
      <label>Питання</label>
      <input type="text" id="pollQuestion" class="form-input" placeholder="Ваше питання">
    </div>
    <div class="form-group">
      <label>Варіант 1</label>
      <input type="text" id="pollOpt1" class="form-input" placeholder="Варіант відповіді">
    </div>
    <div class="form-group">
      <label>Варіант 2</label>
      <input type="text" id="pollOpt2" class="form-input" placeholder="Варіант відповіді">
    </div>
    <div class="form-group">
      <label>Варіант 3 (необов'язково)</label>
      <input type="text" id="pollOpt3" class="form-input" placeholder="Варіант відповіді">
    </div>
    <div class="form-group">
      <label>Варіант 4 (необов'язково)</label>
      <input type="text" id="pollOpt4" class="form-input" placeholder="Варіант відповіді">
    </div>
    <button onclick="submitPoll()" class="btn btn-primary btn-full">Створити</button>
  `);
});

async function submitPoll() {
  const question = document.getElementById('pollQuestion').value.trim();
  const opts = [
    document.getElementById('pollOpt1').value.trim(),
    document.getElementById('pollOpt2').value.trim(),
    document.getElementById('pollOpt3').value.trim(),
    document.getElementById('pollOpt4').value.trim()
  ].filter(o => o);

  if (!question || opts.length < 2) {
    showToast('Введіть питання та мінімум 2 варіанти', 'error');
    return;
  }

  try {
    await addPoll(question, opts);
    closeModal();
    showToast('Голосування створено', 'success');
    renderPolls();
  } catch (e) {
    showToast('Помилка: ' + e.message, 'error');
  }
}

// ---------- СУСІДСЬКІ ОГОЛОШЕННЯ ----------
async function renderNeighborPosts() {
  const list = document.getElementById('neighborPostsList');
  list.innerHTML = '<div class="loading-spinner" style="position: relative;"><div class="spinner"></div></div>';

  try {
    const posts = await getNeighborPosts();
    if (posts.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">📌</div><p>Оголошень від сусідів поки немає</p></div>';
    } else {
      list.innerHTML = posts.map(p => `
        <div class="content-card">
          <span class="post-category ${p.category}">${categoryLabel(p.category)}</span>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.content)}</p>
          ${p.contact ? `<p style="margin-top: 8px; font-size: 13px;"><strong>Контакт:</strong> ${escapeHtml(p.contact)}</p>` : ''}
          <div class="meta">
            <span>${formatDate(p.createdAt)}</span>
            <span>${escapeHtml(p.author)}</span>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>Помилка завантаження</p></div>';
  }
}

function categoryLabel(cat) {
  const labels = { give: '🎁 Віддам', find: '🔎 Знайшов', lost: '😢 Загубив', other: '📌 Інше' };
  return labels[cat] || cat;
}

document.getElementById('addNeighborPostBtn')?.addEventListener('click', function() {
  openModal('Додати оголошення', `
    <div class="form-group">
      <label>Категорія</label>
      <select id="npCategory" class="form-input">
        <option value="give">🎁 Віддам</option>
        <option value="find">🔎 Знайшов</option>
        <option value="lost">😢 Загубив</option>
        <option value="other">📌 Інше</option>
      </select>
    </div>
    <div class="form-group">
      <label>Заголовок</label>
      <input type="text" id="npTitle" class="form-input" placeholder="Заголовок">
    </div>
    <div class="form-group">
      <label>Опис</label>
      <textarea id="npContent" class="form-input" placeholder="Детальний опис..." rows="3"></textarea>
    </div>
    <div class="form-group">
      <label>Контакт (телефон або квартира)</label>
      <input type="text" id="npContact" class="form-input" placeholder="Для зв'язку">
    </div>
    <button onclick="submitNeighborPost()" class="btn btn-primary btn-full">Опублікувати</button>
  `);
});

async function submitNeighborPost() {
  const cat = document.getElementById('npCategory').value;
  const title = document.getElementById('npTitle').value.trim();
  const content = document.getElementById('npContent').value.trim();

  if (!title || !content) {
    showToast('Заповніть заголовок та опис', 'error');
    return;
  }

  try {
    const contact = document.getElementById('npContact').value.trim();
    await addNeighborPost(cat, title, content, contact);
    closeModal();
    showToast('Оголошення додано', 'success');
    renderNeighborPosts();
  } catch (e) {
    showToast('Помилка: ' + e.message, 'error');
  }
}

// ---------- ПРОБЛЕМИ ----------
async function renderIssues() {
  const list = document.getElementById('issuesList');
  list.innerHTML = '<div class="loading-spinner" style="position: relative;"><div class="spinner"></div></div>';

  try {
    const issues = await getIssues();
    if (issues.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><p>Проблем не зареєстровано</p></div>';
    } else {
      const user = getCurrentUser();
      list.innerHTML = issues.map(i => `
        <div class="content-card">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <h3>${escapeHtml(i.title)}</h3>
            <span class="issue-status ${i.status}">${issueStatusText(i.status)}</span>
          </div>
          <p>${escapeHtml(i.description)}</p>
          ${i.lastComment ? `
            <div style="margin-top: 10px; padding: 10px; background: var(--gray-50); border-radius: 6px; font-size: 13px; border-left: 3px solid var(--primary);">
              <strong>${escapeHtml(i.lastComment.author)}</strong>: ${escapeHtml(i.lastComment.text)}
            </div>
          ` : ''}
          <div class="meta">
            <span>${formatDate(i.createdAt)}</span>
            <span>${escapeHtml(i.author)}</span>
            ${user.isAdmin ? `
              <select onchange="updateIssueStatusAction('${i.id}', this.value)" style="margin-left: auto; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--gray-300); font-size: 12px;">
                <option value="new" ${i.status === 'new' ? 'selected' : ''}>Нове</option>
                <option value="in-progress" ${i.status === 'in-progress' ? 'selected' : ''}>В роботі</option>
                <option value="pending" ${i.status === 'pending' ? 'selected' : ''}>Очікує</option>
                <option value="resolved" ${i.status === 'resolved' ? 'selected' : ''}>Вирішено</option>
              </select>
            ` : ''}
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>Помилка завантаження</p></div>';
  }
}

function issueStatusText(status) {
  const map = {
    'new': '🟢 Нове',
    'in-progress': '🟡 В роботі',
    'pending': '🔴 Очікує',
    'resolved': '✅ Вирішено'
  };
  return map[status] || status;
}

async function updateIssueStatusAction(issueId, status) {
  const comment = status === 'resolved' ? 'Проблему вирішено' : 'Статус оновлено адміном';
  try {
    await updateIssueStatus(issueId, status, comment);
    showToast('Статус оновлено', 'success');
    renderIssues();
  } catch (e) {
    showToast('Помилка: ' + e.message, 'error');
  }
}

document.getElementById('addIssueBtn')?.addEventListener('click', function() {
  openModal('Повідомити про проблему', `
    <div class="form-group">
      <label>Назва проблеми</label>
      <input type="text" id="issueTitle" class="form-input" placeholder="Коротко про проблему">
    </div>
    <div class="form-group">
      <label>Опис</label>
      <textarea id="issueDesc" class="form-input" placeholder="Детальний опис..." rows="4"></textarea>
    </div>
    <button onclick="submitIssue()" class="btn btn-primary btn-full">Надіслати</button>
  `);
});

async function submitIssue() {
  const title = document.getElementById('issueTitle').value.trim();
  const desc = document.getElementById('issueDesc').value.trim();

  if (!title || !desc) {
    showToast('Заповніть всі поля', 'error');
    return;
  }

  try {
    await addIssue(title, desc);
    closeModal();
    showToast('Проблему зареєстровано', 'success');
    renderIssues();
  } catch (e) {
    showToast('Помилка: ' + e.message, 'error');
  }
}

// ---------- ПОДІЇ ----------
async function renderEvents() {
  const list = document.getElementById('eventsList');
  list.innerHTML = '<div class="loading-spinner" style="position: relative;"><div class="spinner"></div></div>';

  try {
    const events = await getEvents();
    if (events.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><p>Подій поки немає</p></div>';
    } else {
      const now = new Date();
      list.innerHTML = events.map(e => {
        const d = e.eventDate.toDate ? e.eventDate.toDate() : new Date(e.eventDate);
        const isPast = d < now;
        return `
          <div class="event-card" style="${isPast ? 'opacity: 0.5;' : ''}">
            <div class="event-date">
              <span class="day">${d.getDate()}</span>
              <span class="month">${d.toLocaleDateString('uk-UA', { month: 'short' })}</span>
            </div>
            <div style="flex: 1;">
              <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 4px;">${escapeHtml(e.title)}</h3>
              ${e.description ? `<p style="font-size: 13px; color: var(--gray-500);">${escapeHtml(e.description)}</p>` : ''}
              ${isPast ? '<span style="font-size: 11px; color: var(--gray-400);">Минула подія</span>' : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>Помилка завантаження</p></div>';
  }
}

document.getElementById('addEventBtn')?.addEventListener('click', function() {
  openModal('Додати подію', `
    <div class="form-group">
      <label>Назва події</label>
      <input type="text" id="eventTitle" class="form-input" placeholder="Збори мешканців">
    </div>
    <div class="form-group">
      <label>Опис</label>
      <textarea id="eventDesc" class="form-input" placeholder="Деталі..." rows="3"></textarea>
    </div>
    <div class="form-group">
      <label>Дата</label>
      <input type="date" id="eventDate" class="form-input">
    </div>
    <button onclick="submitEvent()" class="btn btn-primary btn-full">Додати</button>
  `);
});

async function submitEvent() {
  const title = document.getElementById('eventTitle').value.trim();
  const date = document.getElementById('eventDate').value;

  if (!title || !date) {
    showToast('Заповніть назву та дату', 'error');
    return;
  }

  try {
    const desc = document.getElementById('eventDesc').value.trim();
    await addEvent(title, desc, date);
    closeModal();
    showToast('Подію додано', 'success');
    renderEvents();
  } catch (e) {
    showToast('Помилка: ' + e.message, 'error');
  }
}

// ---------- ХЕЛПЕР ----------
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}