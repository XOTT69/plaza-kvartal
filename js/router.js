// ===== РОУТИНГ (SPA) =====

let currentPage = 'authPage';

function showPage(pageId) {
  // Ховаємо всі сторінки
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  // Показуємо потрібну
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.remove('hidden');
    currentPage = pageId;
  }

  // Керуємо кнопкою "Назад"
  const backBtn = document.getElementById('backBtn');
  if (pageId === 'home' || pageId === 'authPage') {
    backBtn.classList.add('hidden');
  } else {
    backBtn.classList.remove('hidden');
  }

  // Закриваємо меню
  closeMenu();
}

function navigateTo(pageId) {
  showPage(pageId);

  // Оновлюємо заголовок
  const titles = {
    'home': 'Мій Дім',
    'announcements': '📢 Оголошення',
    'contacts': '🆘 Контакти',
    'polls': '🗳 Голосування',
    'neighbor-posts': '📌 Сусідські оголошення',
    'issues': '⚠️ Проблеми',
    'events': '📅 Події',
    'admin': '⚙️ Адмінка'
  };
  document.getElementById('headerTitle').textContent = titles[pageId] || 'Мій Дім';

  // Завантажуємо дані для сторінки
  switch (pageId) {
    case 'home': renderHome(); break;
    case 'announcements': renderAnnouncements(); break;
    case 'contacts': renderContacts(); break;
    case 'polls': renderPolls(); break;
    case 'neighbor-posts': renderNeighborPosts(); break;
    case 'issues': renderIssues(); break;
    case 'events': renderEvents(); break;
    case 'admin': renderAdmin(); break;
  }
}

// Події для навігації через data-page посилання
document.addEventListener('click', function(e) {
  const link = e.target.closest('[data-page]');
  if (link) {
    e.preventDefault();
    const page = link.dataset.page;
    navigateTo(page);
  }
});

// Кнопка "Назад"
document.getElementById('backBtn').addEventListener('click', function() {
  navigateTo('home');
});