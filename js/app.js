// ===== ДЕАКТИВАЦІЯ SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (let registration of registrations) { registration.unregister(); }
  });
  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (let name of names) { caches.delete(name); }
    });
  }
}

// ===== ІНІЦІАЛІЗАЦІЯ =====
document.addEventListener('DOMContentLoaded', async function() {

  // ✅ Logout завжди першим
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
      // Супер-адмін після логіну → одразу в адмінку → будинки
      navigateTo('admin');
      setTimeout(() => {
        adminCurrentSection = 'buildings';
        renderAdmin();
      }, 100);
      return;
    }
  } catch (err) {
    console.error('Redirect check error:', err);
    // Не показуємо помилку — просто продовжуємо
  }

  // 2. Перевіряємо збережену сесію
  const sessionUser = getCurrentUser();
  if (sessionUser) {
    hideLoading();
    applyAuthUI(sessionUser);
    navigateTo('home');
    return;
  }

  hideLoading();

  // 3. Показуємо сторінку входу
  showPage('authPage');
  document.getElementById('header').classList.add('hidden');

  // Завантажуємо список будинків
  await loadBuildingSelector();

  // Перевіряємо URL параметр ?b=buildingId
  const urlBuildingId = getBuildingIdFromUrl();
  if (urlBuildingId) {
    const select = document.getElementById('buildingSelect');
    if (select && select.value !== urlBuildingId) {
      select.value = urlBuildingId;
      onBuildingSelected(urlBuildingId);
    }
  }

  // Зміна будинку в селекторі
  document.getElementById('buildingSelect')?.addEventListener('change', function() {
    onBuildingSelected(this.value);
  });

  // Форма входу
  document.getElementById('loginForm').addEventListener('submit', async function(e) {
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
    } catch (err) {
      hideLoading();
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });

  // Google вхід
  document.getElementById('googleLoginBtn').addEventListener('click', async function() {
    const errorEl = document.getElementById('googleLoginError');
    errorEl.classList.add('hidden');
    try {
      showLoading();
      const user = await startGoogleLogin();
      hideLoading();
      if (user) {
        applyAuthUI(user);
        // Одразу в адмінку → будинки
        navigateTo('admin');
        setTimeout(() => {
          adminCurrentSection = 'buildings';
          renderAdmin();
        }, 100);
      }
      // Якщо null — значить redirect запущено, сторінка перезавантажиться
    } catch (err) {
      hideLoading();
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });

  // Діагностика
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
        isSuperAdmin: sessionUser.isSuperAdmin
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
      `Сесія: ${info.sessionUser ? `${info.sessionUser.name} | будинок: ${info.sessionUser.buildingId} | кв: ${info.sessionUser.apt} | адмін: ${info.sessionUser.isAdmin} | супер: ${info.sessionUser.isSuperAdmin}` : 'немає'}`,
      `Firestore: ${info.firestoreAccess ? '✅' : '❌ ' + (info.firestoreError || '')}`,
      `Мобільний: ${info.isMobile ? 'так' : 'ні'}`,
      `URL ?b=: ${info.urlParam || 'немає'}`,
      `Service Workers: ${info.serviceWorkers ?? '?'}`
    ].join('\n');
    alert(msg);
    console.log('Діагностика:', info);
  };

  console.log('Мій Дім v' + APP_VERSION + ' запущено!');
});

// Завантаження селектора будинків
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

      // Показуємо підказку
      const hint = document.getElementById('noBuildingsHint');
      if (hint) hint.classList.remove('hidden');
    } else {
      select.disabled = false;
      if (loginBtn) loginBtn.classList.remove('hidden');
      const hint = document.getElementById('noBuildingsHint');
      if (hint) hint.classList.add('hidden');

      select.innerHTML = '<option value="">— Оберіть будинок —</option>' +
        buildings.map(b =>
          `<option value="${b.id}">${b.name}${b.address ? ' · ' + b.address : ''}</option>`
        ).join('');

      // Якщо один будинок — обираємо автоматично
      if (buildings.length === 1) {
        select.value = buildings[0].id;
        onBuildingSelected(buildings[0].id);
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
