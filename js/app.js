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

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }

  console.log('Мій Дім v' + APP_VERSION + ' запущено!');
});