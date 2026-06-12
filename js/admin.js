// ===== АДМІНКА =====

let adminCurrentSection = null;

function renderAdmin() {
  const content = document.getElementById('adminSectionContent');

  // Показуємо/ховаємо секції
  if (!adminCurrentSection) {
    content.innerHTML = '<p style="color: var(--gray-400); text-align: center; padding: 20px;">Оберіть розділ вище</p>';
    return;
  }

  switch (adminCurrentSection) {
    case 'apartments': renderAdminApartments(); break;
    case 'announcements': renderAdminAnnouncements(); break;
    case 'contacts': renderAdminContacts(); break;
  }
}

// Кліки по картках адмінки
document.querySelectorAll('.admin-card').forEach(card => {
  card.addEventListener('click', function() {
    adminCurrentSection = this.dataset.section;
    renderAdmin();
  });
});

// ===== КВАРТИРИ =====
async function renderAdminApartments() {
  const content = document.getElementById('adminSectionContent');
  content.innerHTML = '<div class="loading-spinner" style="position: relative;"><div class="spinner"></div></div>';

  try {
    const apts = await getAllApartments();
    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 16px;">Список квартир (${apts.length})</h3>
        <button class="btn btn-sm btn-primary" onclick="showAddApartment()">+ Додати</button>
      </div>
      <div class="content-list">
        ${apts.map(a => `
          <div class="content-card" style="padding: 12px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>Кв. ${escapeHtml(a.id)}</strong>
                ${a.isAdmin ? '<span class="badge badge-new" style="margin-left: 8px;">Адмін</span>' : ''}
                <div style="font-size: 13px; color: var(--gray-500); margin-top: 2px;">
                  ${escapeHtml(a.name || '')}
                </div>
              </div>
              <button class="btn btn-sm btn-secondary" onclick="showEditApartment('${a.id}', '${escapeHtml(a.code)}', ${a.isAdmin || false}, '${escapeHtml(a.name || '')}')">
                ✏️
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    content.innerHTML = '<p style="color: var(--danger);">Помилка завантаження</p>';
  }
}

function showAddApartment() {
  showApartmentForm('Додати квартиру', '', '', false, '');
}

function showEditApartment(id, code, isAdmin, name) {
  showApartmentForm('Редагувати квартиру ' + id, id, code, isAdmin, name);
}

function showApartmentForm(title, id, code, isAdmin, name) {
  openModal(title, `
    <div class="form-group">
      <label>Номер квартири</label>
      <input type="number" id="aptFieldNum" class="form-input" value="${id}" placeholder="1-24" min="1" max="24" ${id ? 'readonly' : ''}>
    </div>
    <div class="form-group">
      <label>Код доступу</label>
      <input type="text" id="aptFieldCode" class="form-input" value="${code}" placeholder="Код для входу">
    </div>
    <div class="form-group">
      <label>Назва (необов'язково)</label>
      <input type="text" id="aptFieldName" class="form-input" value="${name}" placeholder="Квартира / Ім'я">
    </div>
    <div class="form-group">
      <label>
        <input type="checkbox" id="aptFieldAdmin" ${isAdmin ? 'checked' : ''}> 
        Адміністратор
      </label>
    </div>
    <button onclick="submitApartment()" class="btn btn-primary btn-full">Зберегти</button>
  `);
}

async function submitApartment() {
  const num = document.getElementById('aptFieldNum').value.trim();
  const code = document.getElementById('aptFieldCode').value.trim();
  const isAdmin = document.getElementById('aptFieldAdmin').checked;
  const name = document.getElementById('aptFieldName').value.trim();

  if (!num || !code) {
    showToast('Заповніть номер квартири та код', 'error');
    return;
  }

  try {
    await setupApartmentAccount(num, code, isAdmin, name);
    closeModal();
    showToast('Квартиру збережено', 'success');
    renderAdminApartments();
  } catch (e) {
    showToast('Помилка: ' + e.message, 'error');
  }
}

// ===== ОГОЛОШЕННЯ (АДМІН) =====
async function renderAdminAnnouncements() {
  const content = document.getElementById('adminSectionContent');
  content.innerHTML = '<div class="loading-spinner" style="position: relative;"><div class="spinner"></div></div>';

  try {
    const anns = await getAnnouncements();
    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 16px;">Всі оголошення (${anns.length})</h3>
        <button class="btn btn-sm btn-primary" onclick="document.getElementById('addAnnouncementBtn').click()">+ Додати</button>
      </div>
      <div class="content-list">
        ${anns.map(a => `
          <div class="content-card" style="padding: 12px 16px;">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <strong>${escapeHtml(a.title)}</strong>
                <div style="font-size: 13px; color: var(--gray-500);">${formatDate(a.createdAt)}</div>
              </div>
              <button class="btn btn-sm btn-danger" onclick="confirmDeleteAnnouncement('${a.id}')">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    content.innerHTML = '<p style="color: var(--danger);">Помилка завантаження</p>';
  }
}

// ===== КОНТАКТИ (АДМІН) =====
async function renderAdminContacts() {
  const content = document.getElementById('adminSectionContent');
  content.innerHTML = '<div class="loading-spinner" style="position: relative;"><div class="spinner"></div></div>';

  try {
    const contacts = await getContacts();
    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 16px;">Контакти (${contacts.length})</h3>
        <button class="btn btn-sm btn-primary" onclick="showAddContact()">+ Додати</button>
      </div>
      <div class="content-list">
        ${contacts.map(c => `
          <div class="content-card" style="padding: 12px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${c.icon || '📞'} ${escapeHtml(c.name)}</strong>
                <div style="font-size: 13px; color: var(--gray-500);">${c.phone}${c.category ? ' · ' + escapeHtml(c.category) : ''}</div>
              </div>
              <button class="btn btn-sm btn-danger" onclick="confirmDeleteContact('${c.id}')">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    content.innerHTML = '<p style="color: var(--danger);">Помилка завантаження</p>';
  }
}

function showAddContact() {
  openModal('Додати контакт', `
    <div class="form-group">
      <label>Назва</label>
      <input type="text" id="contactName" class="form-input" placeholder="Сантехнік">
    </div>
    <div class="form-group">
      <label>Телефон</label>
      <input type="tel" id="contactPhone" class="form-input" placeholder="+380 XX XXX XX XX">
    </div>
    <div class="form-group">
      <label>Категорія</label>
      <input type="text" id="contactCategory" class="form-input" placeholder="Аварійна служба">
    </div>
    <div class="form-group">
      <label>Іконка (емодзі)</label>
      <input type="text" id="contactIcon" class="form-input" placeholder="🔧" value="📞">
    </div>
    <button onclick="submitContact()" class="btn btn-primary btn-full">Додати</button>
  `);
}

async function submitContact() {
  const name = document.getElementById('contactName').value.trim();
  const phone = document.getElementById('contactPhone').value.trim();
  if (!name || !phone) {
    showToast('Заповніть назву та телефон', 'error');
    return;
  }

  try {
    const cat = document.getElementById('contactCategory').value.trim();
    const icon = document.getElementById('contactIcon').value.trim() || '📞';
    await addContact(name, phone, cat, icon);
    closeModal();
    showToast('Контакт додано', 'success');
    renderAdminContacts();
  } catch (e) {
    showToast('Помилка: ' + e.message, 'error');
  }
}

function confirmDeleteContact(id) {
  if (confirm('Видалити контакт?')) {
    deleteContact(id).then(() => {
      showToast('Видалено', 'success');
      renderAdminContacts();
    });
  }
}