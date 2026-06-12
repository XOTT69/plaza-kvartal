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

  // ✅ Logout завжди реєструємо першим
  document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    if (confirm('Вийти з додатку?')) logout();
  });

  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('googleLoginError').classList.add('hidden');

  // 1. Перевіряємо Google redirect
  try {
    const redirectUser = await checkGoogleRedirect();
    if (redirectUser) {
      applyAuthUI(redirectUser);
      navigateTo('home');
      return;
    }
  } catch (err) {
    document.getElementById('googleLoginError').textContent = err.message;
    document.getElementById('googleLoginError').classList.remove('hidden');
  }

  // 2. Перевіряємо збережену сесію
  const sessionUser = getCurrentUser();
  if (sessionUser) {
    applyAuthUI(sessionUser);
    navigateTo('home');
    return;
  }

  // 3. Показуємо сторінку входу
  showPage('authPage');
  document.getElementById('header').classList.add('hidden');

  // Завантажуємо список будинків
  await loadBuildingSelector();

  // Перевіряємо URL параметр ?b=buildingId
  const urlBuildingId = getBuildingIdFromUrl();
  if (urlBuildingId) {
    const select = document.getElementById('buildingSelect');
    if (select) {
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
        navigateTo('home');
      }
    } catch (err) {
      hideLoading();
      if (err.message === 'redirect') {
        showToast('Перенаправлення на Google...');
      } else {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
    }
  });

  // Діагностика
  window.diag = async function() {
    const fbUser = auth.currentUser;
    const sessionUser = getCurrentUser();
    const info = {
      firebaseUser: fbUser ? { email: fbUser.email, uid: fbUser.uid } : null,
      sessionUser: sessionUser ? { name: sessionUser.name, buildingId: sessionUser.buildingId, apt: sessionUser.apt } : null,
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
    alert(
      '=== Діагностика v' + APP_VERSION + ' ===\n' +
      'Firebase Auth: ' + (info.firebaseUser ? info.firebaseUser.email : 'немає') + '\n' +
      'Сесія: ' + (info.sessionUser ? `${info.sessionUser.name} (будинок: ${info.sessionUser.buildingId}, кв: ${info.sessionUser.apt})` : 'немає') + '\n' +
      'Firestore: ' + (info.firestoreAccess ? '✅' : '❌ ' + (info.firestoreError || '')) + '\n' +
      'Service Workers: ' + (info.serviceWorkers !== undefined ? info.serviceWorkers : '?')
    );
    console.log('Діагностика:', info);
  };

  console.log('Мій Дім v' + APP_VERSION + ' запущено!');
});

// Завантаження селектора будинків
async function loadBuildingSelector() {
  const select = document.getElementById('buildingSelect');
  const aptFields = document.getElementById('aptFields');
  if (!select) return;

  try {
    const buildings = await getBuildings();

    if (buildings.length === 0) {
      select.innerHTML = '<option value="">Немає будинків — увійдіть через Google щоб створити</option>';
      select.disabled = true;
      if (aptFields) aptFields.classList.add('hidden');
    } else {
      select.disabled = false;
      select.innerHTML = '<option value="">— Оберіть будинок —</option>' +
        buildings.map(b => `
          <option value="${b.id}">
            ${b.name}${b.address ? ' · ' + b.address : ''}
          </option>
        `).join('');

      // Якщо будинок один — вибираємо автоматично
      if (buildings.length === 1) {
        select.value = buildings[0].id;
        onBuildingSelected(buildings[0].id);
      }
    }
  } catch (e) {
    select.innerHTML = '<option value="">Помилка завантаження будинків</option>';
    console.error('loadBuildingSelector error:', e);
  }
}

// Показати/сховати поля квартири залежно від вибору будинку
function onBuildingSelected(buildingId) {
  const aptFields = document.getElementById('aptFields');
  if (aptFields) {
    aptFields.classList.toggle('hidden', !buildingId);
  }
}
