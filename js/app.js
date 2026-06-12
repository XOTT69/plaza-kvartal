// ===== ДЕАКТИВАЦІЯ СТАРОГО SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (let registration of registrations) { registration.unregister(); }
  });
}

// ===== DARK MODE TOGGLE =====
function initDarkMode() {
  const saved = localStorage.getItem('my_dim_theme');
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (saved === 'light') {
    document.documentElement.classList.remove('dark');
  }
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('my_dim_theme', isDark ? 'dark' : 'light');
  const btn = document.querySelector('.theme-toggle');
  if (btn) btn.textContent = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19';
}

initDarkMode();

// ===== ДІАГНОСТИКА (глобальна) =====
window.diag = async function() {
  const fbUser = auth.currentUser;
  const sessionUser = getCurrentUser();
  const info = {
    version: APP_VERSION,
    firebaseUser: fbUser ? { email: fbUser.email, uid: fbUser.uid } : null,
    sessionUser: sessionUser ? {
      name: sessionUser.name,
      buildingId: sessionUser.buildingId,
      apt: sessionUser.apt,
      isAdmin: sessionUser.isAdmin,
      isSuperAdmin: sessionUser.isSuperAdmin,
      authType: sessionUser.authType
    } : null,
    urlParam: getBuildingIdFromUrl(),
    isMobile: isMobile()
  };
  try {
    await db.collection('buildings').limit(1).get();
    info.firestoreAccess = true;
  } catch (e) {
    info.firestoreAccess = false;
    info.firestoreError = e.message;
  }
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    info.serviceWorkers = regs.length;
  }
  const msg = [
    `=== Діагностика v${info.version} ===`,
    `Firebase Auth: ${info.firebaseUser ? info.firebaseUser.email : 'немає'}`,
    `Сесія: ${info.sessionUser
      ? `${info.sessionUser.name} | будинок: ${info.sessionUser.buildingId} | кв: ${info.sessionUser.apt} | адмін: ${info.sessionUser.isAdmin} | супер: ${info.sessionUser.isSuperAdmin} | тип: ${info.sessionUser.authType}`
      : 'немає'}`,
    `Firestore: ${info.firestoreAccess ? '\u2705' : '\u274C ' + (info.firestoreError || '')}`,
    `Мобільний: ${info.isMobile ? 'так' : 'ні'}`,
    `URL ?b=: ${info.urlParam || 'немає'}`,
    `Service Workers: ${info.serviceWorkers ?? '?'}`
  ].join('\n');
  alert(msg);
  console.log('Діагностика:', info);
};

// ===== ПОШУК =====
let searchTimeout = null;

function initSearch() {
  // Додаємо пошуковий блок на сторінку оголошень
  const annHeader = document.querySelector('#announcements .page-header');
  if (annHeader && !document.querySelector('#announcements .search-bar')) {
    const searchHtml = `
      <div class="search-bar" style="grid-column: 1 / -1;">
        <span class="search-icon">\uD83D\uDD0D</span>
        <input type="text" id="annSearchInput" placeholder="Пошук по оголошеннях..." oninput="filterAnnouncements(this.value)">
      </div>
    `;
    annHeader.insertAdjacentHTML('afterend', searchHtml);
  }

  // Пошук по контактах
  const contactsHeader = document.querySelector('#contacts .page-header');
  if (contactsHeader && !document.querySelector('#contacts .search-bar')) {
    const searchHtml = `
      <div class="search-bar" style="grid-column: 1 / -1;">
        <span class="search-icon">\uD83D\uDD0D</span>
        <input type="text" id="contactsSearchInput" placeholder="Пошук по контактах..." oninput="filterContacts(this.value)">
      </div>
    `;
    contactsHeader.insertAdjacentHTML('afterend', searchHtml);
  }
}

function filterAnnouncements(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const cards = document.querySelectorAll('#announcementsList .content-card');
    const q = query.toLowerCase().trim();
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = (!q || text.includes(q)) ? '' : 'none';
    });
  }, 200);
}

function filterContacts(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const cards = document.querySelectorAll('#contactsList .contact-card');
    const q = query.toLowerCase().trim();
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = (!q || text.includes(q)) ? '' : 'none';
    });
  }, 200);
}

// ===== ІНІЦІАЛІЗАЦІЯ =====
document.addEventListener('DOMContentLoaded', async function() {

  // Додаємо кнопку темної теми
  const themeBtn = document.createElement('button');
  themeBtn.className = 'theme-toggle';
  themeBtn.textContent = document.documentElement.classList.contains('dark') ? '\u2600\uFE0F' : '\uD83C\uDF19';
  themeBtn.setAttribute('aria-label', 'Перемкнути тему');
  themeBtn.addEventListener('click', toggleDarkMode);
  document.getElementById('app').appendChild(themeBtn);

  // Logout завжди першим
  document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    if (confirm('Вийти з додатку?')) logout();
  });

  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('googleLoginError').classList.add('hidden');

  showLoading();

  // 1. ЗАВЖДИ перевіряємо Google redirect (для мобільних)
  try {
    const redirectUser = await checkGoogleRedirect();
    if (redirectUser) {
      hideLoading();
      applyAuthUI(redirectUser);
      navigateTo('admin');
      setTimeout(() => {
        adminCurrentSection = 'buildings';
        renderAdmin();
      }, 100);
      return;
    }
  } catch (err) {
    console.error('Redirect check error:', err);
  }

  // 2. Перевіряємо збережену сесію
  const sessionUser = getCurrentUser();

  if (sessionUser) {
    const isValid = sessionUser.name &&
      sessionUser.authType &&
      (sessionUser.buildingId || sessionUser.isSuperAdmin === true);

    if (!isValid) {
      console.log('Стара сесія виявлена — очищаємо');
      clearUserSession();
      hideLoading();
      showPage('authPage');
      document.getElementById('header').classList.add('hidden');
      await loadBuildingSelector();
      initLoginEvents();
      return;
    }

    hideLoading();
    applyAuthUI(sessionUser);
    navigateTo('home');
    initSearch();
    return;
  }

  hideLoading();

  // 3. Показуємо сторінку входу
  showPage('authPage');
  document.getElementById('header').classList.add('hidden');

  await loadBuildingSelector();

  const urlBuildingId = getBuildingIdFromUrl();
  if (urlBuildingId) {
    const select = document.getElementById('buildingSelect');
    if (select) {
      select.value = urlBuildingId;
      onBuildingSelected(urlBuildingId);
    }
  }

  initLoginEvents();

  console.log('Мій Дім v' + APP_VERSION + ' запущено!');
});

// ===== ПОДІЇ ЛОГІНУ =====
function initLoginEvents() {
  const buildingSelect = document.getElementById('buildingSelect');
  if (buildingSelect && !buildingSelect.dataset.listenerAdded) {
    buildingSelect.dataset.listenerAdded = 'true';
    buildingSelect.addEventListener('change', function() {
      onBuildingSelected(this.value);
    });
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm && !loginForm.dataset.listenerAdded) {
    loginForm.dataset.listenerAdded = 'true';
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const buildingId = document.getElementById('buildingSelect')?.value;
      const aptNumber = document.getElementById('aptNumber').value.trim();
      const aptCode = document.getElementById('aptCode').value.trim();
      const errorEl = document.getElementById('loginError');

      errorEl.classList.add('hidden');

      if (!buildingId) {
        errorEl.textContent = 'Оберіть будинок';
        errorEl.classList.remove('hidden');
        return;
      }
      if (!aptNumber || !aptCode) {
        errorEl.textContent = 'Введіть номер квартири та код';
        errorEl.classList.remove('hidden');
        return;
      }

      try {
        showLoading();
        const user = await login(buildingId, aptNumber, aptCode);
        hideLoading();
        applyAuthUI(user);
        document.getElementById('aptNumber').value = '';
        document.getElementById('aptCode').value = '';
        navigateTo('home');
        initSearch();
      } catch (err) {
        hideLoading();
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
    });
  }

  const googleBtn = document.getElementById('googleLoginBtn');
  if (googleBtn && !googleBtn.dataset.listenerAdded) {
    googleBtn.dataset.listenerAdded = 'true';
    googleBtn.addEventListener('click', async function() {
      const errorEl = document.getElementById('googleLoginError');
      errorEl.classList.add('hidden');
      try {
        showLoading();
        const user = await startGoogleLogin();
        hideLoading();
        if (user) {
          applyAuthUI(user);
          navigateTo('admin');
          initSearch();
          setTimeout(() => {
            adminCurrentSection = 'buildings';
            renderAdmin();
          }, 100);
        }
      } catch (err) {
        hideLoading();
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
    });
  }
}

// ===== ЗАВАНТАЖЕННЯ СЕЛЕКТОРА БУДИНКІВ =====
async function loadBuildingSelector() {
  const select = document.getElementById('buildingSelect');
  const aptFields = document.getElementById('aptFields');
  const loginBtn = document.querySelector('#loginForm button[type="submit"]');
  if (!select) return;

  try {
    const buildings = await getBuildings();

    if (buildings.length === 0) {
      select.innerHTML = '<option value="">Будинків ще немає</option>';
      select.disabled = true;
      if (aptFields) aptFields.classList.add('hidden');
      if (loginBtn) loginBtn.classList.add('hidden');

      const hint = document.getElementById('noBuildingsHint');
      if (hint) hint.classList.remove('hidden');
    } else {
      select.disabled = false;
      if (loginBtn) loginBtn.classList.remove('hidden');

      const hint = document.getElementById('noBuildingsHint');
      if (hint) hint.classList.add('hidden');

      select.innerHTML = '<option value="">\u2014 Оберіть будинок \u2014</option>' +
        buildings.map(b =>
          `<option value="${b.id}">${escapeHtml(b.name)}${b.address ? ' \u00B7 ' + escapeHtml(b.address) : ''}</option>`
        ).join('');

      if (buildings.length === 1) {
        select.value = buildings[0].id;
        onBuildingSelected(buildings[0].id);
      }

      const urlBuildingId = getBuildingIdFromUrl();
      if (urlBuildingId) {
        select.value = urlBuildingId;
        onBuildingSelected(urlBuildingId);
      }
    }
  } catch (e) {
    select.innerHTML = '<option value="">Помилка завантаження</option>';
    console.error('loadBuildingSelector error:', e);
  }
}

function onBuildingSelected(buildingId) {
  const aptFields = document.getElementById('aptFields');
  if (aptFields) {
    aptFields.classList.toggle('hidden', !buildingId);
  }
}