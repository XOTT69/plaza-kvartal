// ===== ГОЛОВНИЙ ФАЙЛ ІНІЦІАЛІЗАЦІЇ =====

document.addEventListener('DOMContentLoaded', function() {
  const user = checkAuth();

  if (user) {
    navigateTo('home');
  }

  // Обробка форми входу
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

  // Service Worker для PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch(() => console.log('SW registration failed'));
  }

  console.log('Мій Дім v' + APP_VERSION + ' запущено!');
});