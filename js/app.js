// ===== ГОЛОВНИЙ ФАЙЛ ІНІЦІАЛІЗАЦІЇ =====

document.addEventListener('DOMContentLoaded', async function() {
  // Сховати помилки
  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('googleLoginError').classList.add('hidden');

  try {
    // 1. Спочатку — перевіряємо, чи ми повернулися з Google redirect
    const redirectUser = await checkGoogleRedirect();
    if (redirectUser) {
      applyAuthUI(redirectUser);
      navigateTo('home');
      return;
    }

    // 2. Перевіряємо Firebase Auth поточного користувача
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      const hasGoogle = firebaseUser.providerData &&
        firebaseUser.providerData.some(p => p.providerId === 'google.com');

      if (hasGoogle) {
        const user = await handleGoogleAuthState(firebaseUser);
        if (user) {
          applyAuthUI(user);
          navigateTo('home');
          return;
        }
      }
    }

    // 3. Перевіряємо localStorage сесію
    const sessionUser = getCurrentUser();
    if (sessionUser) {
      applyAuthUI(sessionUser);
      navigateTo('home');
      return;
    }
  } catch (err) {
    console.error('Init error:', err);
  }

  // 4. Нічого — показуємо вхід
  showPage('authPage');
  document.getElementById('header').classList.add('hidden');

  // Скидаємо стан форми
  document.getElementById('aptNumber').value = '';
  document.getElementById('aptCode').value = '';

  // --- Події ---

  // Вхід по квартирі
  document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const aptNumber = document.getElementById('aptNumber').value.trim();
    const aptCode = document.getElementById('aptCode').value.trim();
    const errorEl = document.getElementById('loginError');

    errorEl.classList.add('hidden');

    if (!aptNumber || !aptCode) {
      errorEl.textContent = 'Введіть номер квартири та код';
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      showLoading();
      const user = await login(aptNumber, aptCode);
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
        errorEl.textContent = 'Помилка: ' + err.message + '. Код: ' + (err.code || 'none');
        errorEl.classList.remove('hidden');
        console.error('Google login full error:', err);
      }
    }
  });

  // Діагностика
  window.diag = async function() {
    const fbUser = auth.currentUser;
    const info = {
      firebaseUser: fbUser ? { email: fbUser.email, uid: fbUser.uid, providers: fbUser.providerData.map(p => p.providerId) } : null,
      localStorage: getCurrentUser(),
      pendingRedirect: localStorage.getItem('expect_google_redirect'),
    };

    // Перевірка, чи Google Auth увімкнено
    try {
      // Спроба створити тестового юзера — якщо помилка "admin_emails no index" — все ок
      const testDoc = await db.collection('admin_emails').limit(1).get();
      info.firestoreAccess = true;
    } catch (e) {
      info.firestoreAccess = false;
      info.firestoreError = e.message;
    }

    alert(
      '=== Діагностика ===\n' +
      'Firebase Auth: ' + (info.firebaseUser ? info.firebaseUser.email + ' (провайдери: ' + info.firebaseUser.providers.join(', ') + ')' : 'немає') + '\n' +
      'Сесія localStorage: ' + (info.localStorage ? info.localStorage.name + ' (' + info.localStorage.authType + ')' : 'немає') + '\n' +
      'Доступ до Firestore: ' + (info.firestoreAccess ? '✅' : '❌ ' + (info.firestoreError || '')) + '\n' +
      'Очікується redirect: ' + (info.pendingRedirect || 'ні') + '\n\n' +
      'Відкрий консоль (F12 → Console) для деталей.'
    );
    console.log('=== Діагностика ===', info);
  };

  // Вихід
  document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    if (confirm('Вийти з додатку?')) {
      logout();
    }
  });

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch(() => console.log('SW registration failed'));
  }

  console.log('Мій Дім v' + APP_VERSION + ' запущено!');
  console.log('Для діагностики Google: натисни F12, потім клікни "Увійти через Google" і дивись помилки в консолі');
});