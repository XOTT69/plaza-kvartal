// ===== АДМІНКА =====

let adminCurrentSection = null;
let adminSelectedBuilding = null;

function renderAdmin() {
  const content = document.getElementById('adminSectionContent');
  if (!adminCurrentSection) {
    content.innerHTML = '<p style="color: var(--gray-400); text-align: center; padding: 20px;">Оберіть розділ вище</p>';
    return;
  }
  switch (adminCurrentSection) {
    case 'buildings':     renderAdminBuildings(); break;
    case 'apartments':    renderAdminApartments(); break;
    case 'announcements': renderAdminAnnouncements(); break;
    case 'contacts':      renderAdminContacts(); break;
    case 'google-admins': renderAdminGoogleAdmins(); break;
  }
}

document.querySelectorAll('.admin-card').forEach(card => {
  card.addEventListener('click', function() {
    adminCurrentSection = this.dataset.section;
    renderAdmin();
  });
});

// ===== БУДИНКИ =====
async function renderAdminBuildings() {
  const content = document.getElementById('adminSectionContent');
  content.innerHTML = '<div class="loading-spinner" style="position: relative;"><div class="spinner"></div></div>';

  try {
    const buildings = await getBuildings();
    const baseUrl = window.location.origin + window.location.pathname;

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 16px;">Будинки (${buildings.length})</h3>
        <button class="btn btn-sm btn-primary" onclick="showAddBuilding()">+ Додати</button>
      </div>
      <div class="content-list">
        ${buildings.length === 0
          ? '<div class="empty-state"><div class="empty-icon">🏢</div><p>Будинків поки немає.<br>Додайте перший будинок.</p></div>'
          : buildings.map(b => `
            <div class="content-card" style="padding: 14px 16px;">
              <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <strong style="font-size: 15px;">🏢 ${escapeHtml(b.name)}</strong>
                    <span style="font-size: 11px; background: var(--gray-100); padding: 2px 8px; border-radius: 20px; color: var(--gray-500);">код: ${escapeHtml(b.id)}</span>
                  </div>
                  ${b.address ? `<div style="font-size: 13px; color: var(--gray-500); margin-top: 4px;">📍 ${escapeHtml(b.address)}</div>` : ''}
                  <div style="font-size: 13px; color: var(--gray-500); margin-top: 2px;">🏠 Макс. квартир: ${b.maxApt || 24}</div>
                  <div style="margin-top: 8px; display: flex; align-items: center; gap: 6px;">
                    <input
                      type="text"
                      value="${baseUrl}?b=${b.id}"
                      readonly
                      id="link-${b.id}"
                      style="flex: 1; font-size: 11px; padding: 4px 8px; border: 1px solid var(--gray-200); border-radius: 6px; background: var(--gray-50); min-width: 0;"
                    >
                    <button
                      onclick="copyBuildingLink('${b.id}')"
                      class="btn btn-sm btn-secondary"
                      style="white-space: nowrap; font-size: 12px;">
                      📋 Копіювати
                    </button>
                  </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  <button class="btn btn-sm btn-secondary" onclick="showEditBuilding('${escapeAttr(b.id)}', '${escapeAttr(b.name)}', '${escapeAttr(b.address || '')}', ${b.maxApt || 24})">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="confirmDeleteBuilding('${escapeAttr(b.id)}')">🗑️</button>
                </div>
              </div>
            </div>
          `).join('')
        }
      </div>
    `;
  } catch (e) {
    content.innerHTML = '<p style="color: var(--danger);">Помилка завантаження</p>';
    console.error(e);
  }
}

function copyBuildingLink(buildingId) {
  const input = document.getElementById(`link-${buildingId}`);
  if (!input) return;
  navigator.clipboard.writeText(input.value)
    .then(() => showToast('Посилання скопійовано!', 'success'))
    .catch(() => {
      input.select();
      document.execCommand('copy');
      showToast('Посилання скопійовано!', 'success');
    });
}

function showAddBuilding() {
  openModal('Додати будинок', `
    <div class="form-group">
      <label>Код будинку <span style="color: var(--gray-400); font-size: 12px;">(латиниця+цифри, для URL)</span></label>
      <input type="text" id="bldCode" class="form-input" placeholder="plaza1, budynok2, sadova5">
      <small style="color: var(--gray-400); font-size: 12px;">Використовується в посиланні: ?b=plaza1</small>
    </div>
    <div class="form-group">
      <label>Назва будинку</label>
      <input type="text" id="bldName" class="form-input" placeholder="Будинок 1, ЖК Плаза">
    </div>
    <div class="form-group">
      <label>Адреса</label>
      <input type="text" id="bldAddress" class="form-input" placeholder="вул. Паркова, 12">
    </div>
    <div class="form-group">
      <label>Кількість квартир</label>
      <input type="number" id="bldMaxApt" class="form-input" placeholder="24" min="1" max="999" value="24">
    </div>
    <button onclick="submitBuilding()" class="btn btn-primary btn-full">Створити</button>
  `);
}

function showEditBuilding(id, name, address, maxApt) {
  openModal('Редагувати будинок', `
    <div class="form-group">
      <label>Код будинку</label>
      <input type="text" id="bldCode" class="form-input" value="${escapeHtml(id)}" readonly style="background: var(--gray-100); color: var(--gray-500);">
      <small style="color: var(--gray-400); font-size: 12px;">Код не можна змінити (використовується в посиланнях)</small>
    </div>
    <div class="form-group">
      <label>Назва будинку</label>
      <input type="text" id="bldName" class="form-input" value="${escapeHtml(name)}">
    </div>
    <div class="form-group">
      <label>Адреса</label>
      <input type="text" id="bldAddress" class="form-input" value="${escapeHtml(address)}">
    </div>
    <div class="form-group">
      <label>Кількість квартир</label>
      <input type="number" id="bldMaxApt" class="form-input" value="${maxApt}" min="1" max="999">
    </div>
    <input type="hidden" id="bldEditId" value="${escapeHtml(id)}">
    <button onclick="submitBuildingEdit()" class="btn btn-primary btn-full">Зберегти</button>
  `);
}

async function submitBuilding() {
  const code = document.getElementById('bldCode').value.trim();
  const name = document.getElementById('bldName').value.trim();
  const address = document.getElementById('bldAddress').value.trim();
  const maxApt = document.getElementById('bldMaxApt').value;

  if (!code || !name) {
    showToast('Заповніть код та назву', 'error');
    return;
  }

  try {
    await addBuilding(code, name, address, maxApt);
    closeModal();
    showToast('Будинок створено', 'success');
    renderAdminBuildings();
  } catch (e) {
    showToast('Помилка: ' + e.message, 'error');
  }
}

async function submitBuildingEdit() {
  const id = document.getElementById('bldEditId').value;
  const name = document.getElementById('bldName').value.trim();
  const address = document.getElementById('bldAddress').value.trim();
  const maxApt = parseInt(document.getElementById('bldMaxApt').value) || 24;

  if (!name) { showToast('Введіть назву', 'error'); return; }

  try {
    await updateBuilding(id, { name, address, maxApt });
    closeModal();
    showToast('Збережено', 'success');
    renderAdminBuildings();
  } catch (e) {
    showToast('Помилка: ' + e.message, 'error');
  }
}

function confirmDeleteBuilding(id) {
  if (confirm(`Видалити будинок "${id}"?\nВсі квартири цього будинку також потрібно видалити вручну.`)) {
    deleteBuilding(id)
      .then(() => {
        showToast('Будинок видалено', 'success');
        renderAdminBuildings();
      })
      .catch(e => showToast('Помилка: ' + e.message, 'error'));
  }
}

// ===== КВАРТИРИ =====
async function renderAdminApartments() {
  const content = document.getElementById('adminSectionContent');
  content.innerHTML = '<div class="loading-spinner" style="position: relative;"><div class="spinner"></div></div>';

  try {
    const buildings = await getBuildings();
    const user = getCurrentUser();

    if (!user.isSuperAdmin && user.buildingId) {
      adminSelectedBuilding = user.buildingId;
    }

    const buildingSelectHtml = user.isSuperAdmin && buildings.length > 0 ? `
      <div style="margin-bottom: 12px;">
        <select id="aptBuildingFilter" class="form-input" onchange="onAptBuildingFilter(this.value)" style="font-size: 14px;">
          <option value="">— Всі будинки —</option>
          ${buildings.map(b => `<option value="${b.id}" ${adminSelectedBuilding === b.id ? 'selected' : ''}>${escapeHtml(b.name)}</option>`).join('')}
        </select>
      </div>
    ` : '';

    const apts = await getAllApartments(adminSelectedBuilding || (user.isSuperAdmin ? null : user.buildingId));

    content.innerHTML = `
      ${buildingSelectHtml}
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 16px;">Квартири (${apts.length})</h3>
        <button class="btn btn-sm btn-primary" onclick="showAddApartment()">+ Додати</button>
      </div>
      <div class="content-list">
        ${apts.length === 0
          ? '<div class="empty-state"><div class="empty-icon">🏠</div><p>Квартир поки немає</p></div>'
          : apts.map(a => `
            <div class="content-card" style="padding: 12px 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong>Кв. ${escapeHtml(a.aptNumber || a.id)}</strong>
                  ${a.isAdmin ? '<span class="badge badge-new" style="margin-left: 6px;">Адмін</span>' : ''}
                  ${a.residents && a.residents.length > 0
                    ? `<span style="font-size: 11px; background: var(--gray-100); padding: 2px 8px; border-radius: 20px; color: var(--gray-500); margin-left: 6px;">👥 ${a.residents.length}</span>`
                    : ''}
                  <div style="font-size: 13px; color: var(--gray-500); margin-top: 2px;">
                    ${escapeHtml(a.name || '')}
                    ${a.buildingId ? `<span style="color: var(--gray-400);"> · ${escapeHtml(a.buildingId)}</span>` : ''}
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-sm btn-secondary" onclick="showEditApartment('${escapeAttr(a.id)}', '${escapeAttr(a.code || '')}', ${a.isAdmin || false}, '${escapeAttr(a.name || '')}', '${escapeAttr(a.buildingId || '')}', '${escapeAttr(a.aptNumber || '')}')">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="confirmDeleteApartment('${escapeAttr(a.id)}')">🗑️</button>
                </div>
              </div>
            </div>
          `).join('')
        }
      </div>
    `;
  } catch (e) {
    content.innerHTML = '<p style="color: var(--danger);">Помилка завантаження</p>';
    console.error(e);
  }
}

function onAptBuildingFilter(buildingId) {
  adminSelectedBuilding = buildingId || null;
  renderAdminApartments();
}

function showAddApartment() {
  const user = getCurrentUser();
  const buildingId = adminSelectedBuilding || (user.isSuperAdmin ? '' : user.buildingId);
  showApartmentForm('Додати квартиру', '', '', false, '', buildingId, '');
}

function showEditApartment(docId, code, isAdminFlag, name, buildingId, aptNumber) {
  showApartmentForm('Редагувати квартиру', docId, code, isAdminFlag, name, buildingId, aptNumber);
}

async function showApartmentForm(title, docId, code, isAdminFlag, name, buildingId, aptNumber) {
  let buildingsOptions = '';
  try {
    const buildings = await getBuildings();
    buildingsOptions = buildings.map(b =>
      `<option value="${b.id}" ${buildingId === b.id ? 'selected' : ''}>${escapeHtml(b.name)}</option>`
    ).join('');
  } catch (e) {
    buildingsOptions = `<option value="${escapeHtml(buildingId)}">${escapeHtml(buildingId)}</option>`;
  }

  const isEdit = !!docId;
  let residentsHtml = '';

  if (isEdit) {
    try {
      const aptDoc = await db.collection('apartments').doc(docId).get();
      if (aptDoc.exists) {
        const aptData = aptDoc.data();
        const residents = aptData.residents || [];
        residentsHtml = `
          <div style="margin-top: 12px; border-top: 1px solid var(--gray-200); padding-top: 12px;">
            <label style="display: block; font-size: 14px; font-weight: 500; color: var(--gray-700); margin-bottom: 8px;">
              👥 Мешканці (кожен може увійти зі своїм кодом)
            </label>
            <div id="residentsList">
              ${residents.map(r => `
                <div class="resident-row" style="display: flex; gap: 6px; margin-bottom: 6px; align-items: center;">
                  <input type="text" class="resident-name form-input" value="${escapeHtml(r.name || '')}" placeholder="Ім'я" style="flex: 1; font-size: 13px; padding: 6px 8px;">
                  <input type="text" class="resident-code form-input" value="${escapeHtml(r.code || '')}" placeholder="Код" style="width: 80px; font-size: 13px; padding: 6px 8px;">
                  <button onclick="removeResidentRow(this)" class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 12px;">✕</button>
                </div>
              `).join('')}
            </div>
            <button onclick="addResidentRow()" class="btn btn-sm btn-secondary" style="margin-top: 4px; font-size: 13px;">+ Додати мешканця</button>
          </div>
        `;
      }
    } catch (e) {
      console.error('showApartmentForm residents load error:', e);
    }
  } else {
    residentsHtml = `
      <div style="margin-top: 12px; border-top: 1px solid var(--gray-200); padding-top: 12px;">
        <label style="display: block; font-size: 14px; font-weight: 500; color: var(--gray-700); margin-bottom: 8px;">
          👥 Мешканці (необов'язково — кожен може увійти зі своїм кодом)
        </label>
        <div id="residentsList"></div>
        <button onclick="addResidentRow()" class="btn btn-sm btn-secondary" style="margin-top: 4px; font-size: 13px;">+ Додати мешканця</button>
      </div>
    `;
  }

  openModal(title, `
    <div class="form-group">
      <label>Будинок</label>
      <select id="aptFieldBuilding" class="form-input" ${isEdit ? 'disabled style="background:var(--gray-100)"' : ''}>
        <option value="">— Оберіть будинок —</option>
        ${buildingsOptions}
      </select>
    </div>
    <div class="form-group">
      <label>Номер квартири</label>
      <input
        type="text"
        id="aptFieldNum"
        class="form-input"
        value="${escapeHtml(aptNumber || '')}"
        placeholder="Наприклад: 15"
        inputmode="numeric"
        ${isEdit ? 'readonly style="background:var(--gray-100);color:var(--gray-500);"' : ''}
      >
    </div>
    <div class="form-group">
      <label>Загальний код квартири</label>
      <input type="text" id="aptFieldCode" class="form-input" value="${escapeHtml(code)}" placeholder="Загальний код для входу" autocomplete="off">
    </div>
    <div class="form-group">
      <label>Назва / Ім'я (необов'язково)</label>
      <input type="text" id="aptFieldName" class="form-input" value="${escapeHtml(name || '')}" placeholder="Квартира 15 або Іванов І.І.">
    </div>
    <div class="form-group" style="display: flex; align-items: center; gap: 10px;">
      <input type="checkbox" id="aptFieldAdmin" ${isAdminFlag ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
      <label for="aptFieldAdmin" style="margin: 0; cursor: pointer;">Адміністратор будинку</label>
    </div>
    ${residentsHtml}
    ${isEdit ? `<input type="hidden" id="aptFieldDocId" value="${escapeHtml(docId)}">` : ''}
    <button
      onclick="${isEdit ? 'submitApartmentEdit()' : 'submitApartment()'}"
      class="btn btn-primary btn-full"
      style="margin-top: 8px;"
    >Зберегти</button>
  `);
}

// ===== МЕШКАНЦІ =====
function addResidentRow() {
  const list = document.getElementById('residentsList');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'resident-row';
  row.style.cssText = 'display: flex; gap: 6px; margin-bottom: 6px; align-items: center;';
  row.innerHTML = `
    <input type="text" class="resident-name form-input" value="" placeholder="Ім'я" style="flex: 1; font-size: 13px; padding: 6px 8px;">
    <input type="text" class="resident-code form-input" value="" placeholder="Код" style="width: 80px; font-size: 13px; padding: 6px 8px;">
    <button onclick="removeResidentRow(this)" class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 12px;">✕</button>
  `;
  list.appendChild(row);
  row.querySelector('.resident-name').focus();
}

function removeResidentRow(btn) {
  const row = btn.closest('.resident-row');
  if (row) row.remove();
}

function collectResidents() {
  const rows = document.querySelectorAll('#residentsList .resident-row');
  const residents = [];
  rows.forEach(row => {
    const name = row.querySelector('.resident-name')?.value?.trim() || '';
    const code = row.querySelector('.resident-code')?.value?.trim() || '';
    if (code) residents.push({ name: name || 'Мешканець', code });
  });
  return residents;
}

// ===== SUBMIT КВАРТИР =====
async function submitApartment() {
  const buildingId = document.getElementById('aptFieldBuilding').value;
  const num = document.getElementById('aptFieldNum').value.trim();
  const code = document.getElementById('aptFieldCode').value.trim();
  const isAdminFlag = document.getElementById('aptFieldAdmin').checked;
  const name = document.getElementById('aptFieldName').value.trim();
  const residents = collectResidents();

  if (!buildingId) { showToast('Оберіть будинок', 'error'); return; }
  if (!num || !code) { showToast('Заповніть номер та код', 'error'); return; }

  const btn = document.querySelector('#modalBody .btn-primary');
  disableBtn(btn, 'Зберігаємо...');

  try {
    await setupApartmentAccount(buildingId, num, code, isAdminFlag, name, residents);
    closeModal();
    showToast('Квартиру збережено', 'success');
    renderAdminApartments();
  } catch (e) {
    enableBtn(btn);
    showToast('Помилка: ' + e.message, 'error');
  }
}

// ✅ FIX #3 + FIX #5: оновлення коду і residents
async function submitApartmentEdit() {
  const docId = document.getElementById('aptFieldDocId').value;
  const newCode = document.getElementById('aptFieldCode').value.trim();
  const isAdminFlag = document.getElementById('aptFieldAdmin').checked;
  const name = document.getElementById('aptFieldName').value.trim();
  // ✅ FIX #5: завжди передаємо масив (навіть пустий — щоб очистити)
  const residents = collectResidents();

  if (!newCode) { showToast('Введіть код', 'error'); return; }

  const btn = document.querySelector('#modalBody .btn-primary');
  disableBtn(btn, 'Зберігаємо...');

  try {
    // Читаємо поточні дані
    const currentDoc = await db.collection('apartments').doc(docId).get();
    if (!currentDoc.exists) throw new Error('Квартиру не знайдено');

    const oldData = currentDoc.data();
    const oldCode = oldData.code;
    const aptEmail = oldData.email;
    const codeChanged = oldCode && newCode !== oldCode;

    // Оновлюємо Firestore
    await db.collection('apartments').doc(docId).update({
      code: newCode,
      isAdmin: isAdminFlag,
      name: name || oldData.name,
      // ✅ FIX #5: явно зберігаємо масив (включно з пустим)
      residents
    });

    // ✅ FIX #3: Якщо код змінився — оновлюємо пароль у Firebase Auth
    // через secondary auth щоб не зламати сесію адміна
    if (codeChanged && aptEmail) {
      const secondaryAuth = getSecondaryAuth();
      try {
        const cred = await secondaryAuth.signInWithEmailAndPassword(aptEmail, oldCode);
        await cred.user.updatePassword(newCode);
        console.log('✅ Firebase Auth password updated for', aptEmail);
      } catch (authErr) {
        console.warn('⚠️ Could not update Firebase Auth password:', authErr.code, authErr.message);
        // Не кидаємо помилку — Firestore оновлено, але показуємо попередження
        showToast('Код у базі оновлено. Увага: Firebase Auth не оновлено — мешканець не зможе зайти зі старим кодом!', 'error');
        enableBtn(btn);
        return;
      } finally {
        try { await secondaryAuth.signOut(); } catch {}
      }
    }

    closeModal();
    showToast('Збережено', 'success');
    renderAdminApartments();
  } catch (e) {
    enableBtn(btn);
    showToast('Помилка: ' + e.message, 'error');
  }
}

function confirmDeleteApartment(docId) {
  if (confirm('Видалити квартиру? Мешканець більше не зможе увійти.')) {
    deleteApartment(docId)
      .then(() => {
        showToast('Квартиру видалено', 'success');
        renderAdminApartments();
      })
      .catch(e => showToast('Помилка: ' + e.message, 'error'));
  }
}

// ===== ОГОЛОШЕННЯ (АДМІН) =====
async function renderAdminAnnouncements() {
  const content = document.getElementById('adminSectionContent');
  content.innerHTML = '<div class="loading-spinner" style="position: relative;"><div class="spinner"></div></div>';

  try {
    const { items: anns } = await getAnnouncements(false);
    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 16px;">Оголошення (${anns.length})</h3>
        <button class="btn btn-sm btn-primary" onclick="openAddAnnouncementModal()">+ Додати</button>
      </div>
      <div class="content-list">
        ${anns.length === 0
          ? '<div class="empty-state"><div class="empty-icon">📭</div><p>Оголошень поки немає</p></div>'
          : anns.map(a => `
            <div class="content-card" style="padding: 12px 16px;">
              <div style="display: flex; justify-content: space-between; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <strong style="font-size: 14px;">${escapeHtml(a.title)}</strong>
                  <div style="font-size: 12px; color: var(--gray-400); margin-top: 2px;">
                    ${formatDate(a.createdAt)}
                    ${a.buildingId ? ' · ' + escapeHtml(a.buildingId) : ''}
                    · ${escapeHtml(a.author || '')}
                  </div>
                </div>
                <button class="btn btn-sm btn-danger" onclick="confirmDeleteAnnouncement('${escapeAttr(a.id)}')">🗑️</button>
              </div>
            </div>
          `).join('')
        }
      </div>
    `;
  } catch (e) {
    content.innerHTML = '<p style="color: var(--danger);">Помилка завантаження</p>';
    console.error(e);
  }
}

// Окрема функція щоб не тригерити hidden кнопку
function openAddAnnouncementModal() {
  openModal('Нове оголошення', `
    <div class="form-group">
      <label>Заголовок</label>
      <input type="text" id="annTitle" class="form-input" placeholder="Заголовок оголошення">
    </div>
    <div class="form-group">
      <label>Текст</label>
      <textarea id="annContent" class="form-input" placeholder="Текст оголошення..." rows="4"></textarea>
    </div>
    <button onclick="submitAnnouncementFromAdmin()" class="btn btn-primary btn-full">Опублікувати</button>
  `);
}

async function submitAnnouncementFromAdmin() {
  const title = document.getElementById('annTitle').value.trim();
  const content = document.getElementById('annContent').value.trim();
  if (!title || !content) { showToast('Заповніть всі поля', 'error'); return; }
  try {
    await addAnnouncement(title, content);
    closeModal();
    showToast('Оголошення опубліковано', 'success');
    renderAdminAnnouncements();
  } catch (e) {
    showToast('Помилка: ' + e.message, 'error');
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
        ${contacts.length === 0
          ? '<div class="empty-state"><div class="empty-icon">📞</div><p>Контактів поки немає</p></div>'
          : contacts.map(c => `
            <div class="content-card" style="padding: 12px 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong>${c.icon || '📞'} ${escapeHtml(c.name)}</strong>
                  <div style="font-size: 13px; color: var(--gray-500);">
                    ${escapeHtml(c.phone)}
                    ${c.category ? ' · ' + escapeHtml(c.category) : ''}
                  </div>
                </div>
                <button class="btn btn-sm btn-danger" onclick="confirmDeleteContact('${escapeAttr(c.id)}')">🗑️</button>
              </div>
            </div>
          `).join('')
        }
      </div>
    `;
  } catch (e) {
    content.innerHTML = '<p style="color: var(--danger);">Помилка завантаження</p>';
    console.error(e);
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
  if (!name || !phone) { showToast('Заповніть назву та телефон', 'error'); return; }
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
    deleteContact(id)
      .then(() => {
        showToast('Видалено', 'success');
        renderAdminContacts();
      })
      .catch(e => showToast('Помилка: ' + e.message, 'error'));
  }
}

// ===== GOOGLE АДМІНИ =====
async function renderAdminGoogleAdmins() {
  const content = document.getElementById('adminSectionContent');
  content.innerHTML = '<div class="loading-spinner" style="position: relative;"><div class="spinner"></div></div>';

  try {
    const admins = await getGoogleAdmins();
    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 16px;">Google адміни (${admins.length})</h3>
        <button class="btn btn-sm btn-primary" onclick="showAddGoogleAdmin()">+ Додати</button>
      </div>
      <div style="margin-bottom: 12px; padding: 12px; background: var(--primary-light); border-radius: var(--radius); font-size: 13px; color: var(--primary);">
        💡 Google адміни мають доступ до всіх будинків та всіх функцій адмінки.
      </div>
      <div class="content-list">
        ${admins.length === 0
          ? `<div class="empty-state">
               <div class="empty-icon">🔐</div>
               <p>Немає Google адмінів.<br>Перший, хто увійде через Google, стане супер-адміном автоматично.</p>
             </div>`
          : admins.map(a => `
              <div class="content-card" style="padding: 12px 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>${escapeHtml(a.name || a.email)}</strong>
                    <div style="font-size: 13px; color: var(--gray-500);">${escapeHtml(a.email || a.id)}</div>
                    <div style="font-size: 12px; color: var(--gray-400);">${a.createdAt ? formatDate(a.createdAt) : ''}</div>
                  </div>
                  <button class="btn btn-sm btn-danger" onclick="confirmRemoveGoogleAdmin('${escapeAttr(a.email || a.id)}')">🗑️</button>
                </div>
              </div>
            `).join('')
        }
      </div>
    `;
  } catch (e) {
    content.innerHTML = '<p style="color: var(--danger);">Помилка завантаження</p>';
    console.error(e);
  }
}

function showAddGoogleAdmin() {
  openModal('Додати Google адміна', `
    <div class="form-group">
      <label>Email Google акаунту</label>
      <input type="email" id="googleAdminEmail" class="form-input" placeholder="admin@gmail.com">
    </div>
    <div class="form-group">
      <label>Ім'я (необов'язково)</label>
      <input type="text" id="googleAdminName" class="form-input" placeholder="Ім'я адміністратора">
    </div>
    <button onclick="submitGoogleAdmin()" class="btn btn-primary btn-full">Додати</button>
    <p style="margin-top: 12px; font-size: 13px; color: var(--gray-500);">
      💡 Ця людина зможе входити через Google та матиме права супер-адміна (всі будинки).
    </p>
  `);
}

async function submitGoogleAdmin() {
  const email = document.getElementById('googleAdminEmail').value.trim().toLowerCase();
  const name = document.getElementById('googleAdminName').value.trim();
  if (!email) { showToast('Введіть email', 'error'); return; }
  if (!email.includes('@')) { showToast('Введіть коректний email', 'error'); return; }

  try {
    await addGoogleAdmin(email, name || email);
    closeModal();
    showToast('Адміна додано', 'success');
    renderAdminGoogleAdmins();
  } catch (e) {
    showToast('Помилка: ' + e.message, 'error');
  }
}

function confirmRemoveGoogleAdmin(email) {
  if (confirm(`Видалити адміна ${email}?\nВін більше не зможе входити через Google.`)) {
    removeGoogleAdmin(email)
      .then(() => {
        showToast('Адміна видалено', 'success');
        renderAdminGoogleAdmins();
      })
      .catch(e => showToast('Помилка: ' + e.message, 'error'));
  }
}
