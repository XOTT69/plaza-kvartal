// ===== ГОЛОВНИЙ ФАЙЛ ІНІЦІАЛІЗАЦІЇ =====

document.addEventListener('DOMContentLoaded', async function() {
  // Сховати помилки
  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('googleLoginError').classList.add('hidden');

  // 1. Перевіряємо, чи є збережена сесія з попереднього разу
  const sessionUser = getCurrentUser();
  if (sessionUser) {
    applyAuthUI(sessionUser);
    navigateTo('home');
    return;
  }

  // 2. Також перевіряємо Firebase Auth (може бути активна сесія)
  if (auth.currentUser) {
    try {
      const user = await processGoogleResult(auth.currentUser);
      if (user) {
        applyAuthUI(user);
        navigateTo('home');
        return;
      }
    } catch (err) {
      console.error('Session restore error:', err);
    }
  }

  // 3. Нічого немає — показуємо сторінку входу
  showPage('authPage');
  document.getElementById('header').classList.add('hidden');

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

  // Google вхід (popup, з fallback на redirect)
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
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
      console.error('Google login error:', err);
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
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch(() => console.log('SW registration failed'));
  }

  console.log('Мій Дім v' + APP_VERSION + ' запущено!');
});