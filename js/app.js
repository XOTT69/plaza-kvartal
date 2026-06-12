// ===== ГОЛОВНИЙ ФАЙЛ ІНІЦІАЛІЗАЦІЇ =====

document.addEventListener('DOMContentLoaded', async function() {
  // Сховати помилки
  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('googleLoginError').classList.add('hidden');

  // 1. Спочатку — перевіряємо, чи повернулися з Google redirect
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

  // 3. Показуємо вхід
  showPage('authPage');
  document.getElementById('header').classList.add('hidden');
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
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
    }
  });

  // Вихід
  document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    if (confirm('Вийти з додатку?')) {
      logout();
    }
  });

  // Діагностика (для кнопки на сторінці входу)
  window.diag = async function() {
    const fbUser = auth.currentUser;
    const info = {
      firebaseUser: fbUser ? { email: fbUser.email, uid: fbUser.uid, providers: fbUser.providerData.map(p => p.providerId) } : null,
      localStorage: getCurrentUser(),
    };

    try {
      const testDoc = await db.collection('admin_emails').limit(1).get();
      info.firestoreAccess = true;
    } catch (e) {
      info.firestoreAccess = false;
      info.firestoreError = e.message;
    }

    alert(
      '=== Діагностика ===\n' +
      'Firebase Auth: ' + (info.firebaseUser ? info.firebaseUser.email + ' (' + info.firebaseUser.providers.join(', ') + ')' : 'немає') + '\n' +
      'Сесія: ' + (info.localStorage ? info.localStorage.name + ' (' + info.localStorage.authType + ', адмін: ' + info.localStorage.isAdmin + ')' : 'немає') + '\n' +
      'Firestore: ' + (info.firestoreAccess ? '✅' : '❌ ' + (info.firestoreError || '')) + '\n\n' +
      'Відкрий консоль (F12) для деталей.'
    );
    console.log('=== Діагностика ===', info);
  };

  console.log('Мій Дім v' + APP_VERSION + ' запущено!');
});
