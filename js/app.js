// ===== ГОЛОВНИЙ ФАЙЛ ІНІЦІАЛІЗАЦІЇ =====

document.addEventListener('DOMContentLoaded', async function() {
  // 1. Спочатку обробляємо Google redirect (якщо повернулися з Google)
  const googleErrorEl = document.getElementById('googleLoginError');
  
  try {
    const googleUser = await handleGoogleRedirectResult();
    if (googleUser) {
      // Успішний вхід через Google
      document.getElementById('header').classList.remove('hidden');
      document.getElementById('welcomeText').textContent = `Ласкаво просимо, ${googleUser.name}!`;
      if (googleUser.isAdmin) {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
      }
      document.getElementById('userInfo').textContent = `${googleUser.name}${googleUser.isAdmin ? ' (Адмін)' : ''}`;
      navigateTo('home');
      return;
    }
  } catch (err) {
    googleErrorEl.textContent = err.message;
    googleErrorEl.classList.remove('hidden');
  }

  // 2. Перевіряємо, чи є збережена сесія
  const user = checkAuth();
  if (user) {
    navigateTo('home');
    return;
  }

  // 3. Обробка форми входу по квартирі
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

      document.getElementById('header').classList.remove('hidden');
      document.getElementById('welcomeText').textContent = `Ласкаво просимо, ${user.name}!`;

      if (user.isAdmin) {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
      }

      document.getElementById('userInfo').textContent = `${user.name}${user.isAdmin ? ' (Адмін)' : ''}`;
      document.getElementById('aptNumber').value = '';
      document.getElementById('aptCode').value = '';

      navigateTo('home');
    } catch (err) {
      hideLoading();
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });

  // 4. Google вхід (через redirect — працює на мобільних та PWA)
  document.getElementById('googleLoginBtn').addEventListener('click', function() {
    startGoogleLogin();
  });

  // 5. Service Worker для PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch(() => console.log('SW registration failed'));
  }

  console.log('Мій Дім v' + APP_VERSION + ' запущено!');
});