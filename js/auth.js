// ===== АВТОРИЗАЦІЯ =====

const AUTH_KEY = 'my_dim_auth';

function getCurrentUser() {
  const data = localStorage.getItem(AUTH_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function saveUserSession(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function clearUserSession() {
  localStorage.removeItem(AUTH_KEY);
}

function isAdmin() {
  const user = getCurrentUser();
  return user && user.isAdmin === true;
}

// Вхід: перевіряємо номер квартири та код
async function login(aptNumber, code) {
  const aptStr = String(aptNumber);
  const doc = await db.collection('apartments').doc(aptStr).get();

  if (!doc.exists) {
    throw new Error('Невірний номер квартири або код');
  }

  const data = doc.data();

  if (data.code !== code) {
    throw new Error('Невірний номер квартири або код');
  }

  const user = {
    apt: aptStr,
    isAdmin: data.isAdmin === true,
    name: data.name || `Квартира ${aptStr}`
  };

  saveUserSession(user);
  return user;
}

// Вихід
function logout() {
  clearUserSession();
  window.location.reload();
}

// Первинна перевірка при завантаженні
function checkAuth() {
  const user = getCurrentUser();
  if (!user) {
    showPage('authPage');
    document.getElementById('header').classList.add('hidden');
    return null;
  }

  document.getElementById('header').classList.remove('hidden');
  document.getElementById('welcomeText').textContent = `Ласкаво просимо, ${user.name}!`;

  // Показуємо адмін пункти меню
  if (user.isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  } else {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
  }

  // Інформація в меню
  document.getElementById('userInfo').textContent = `${user.name}${user.isAdmin ? ' (Адмін)' : ''}`;

  return user;
}