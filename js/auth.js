// ===== АВТОРИЗАЦІЯ (Firebase Auth) =====

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

// Вхід через Firebase Auth (email + password)
async function login(aptNumber, code) {
  const aptStr = String(aptNumber);
  const email = `apt-${aptStr}@plaza-68f96.firebaseapp.com`;

  // 1. Спочатку перевіряємо код квартири в Firestore
  const aptDoc = await db.collection('apartments').doc(aptStr).get();
  if (!aptDoc.exists) {
    throw new Error('Невірний номер квартири або код');
  }

  const aptData = aptDoc.data();
  if (aptData.code !== code) {
    throw new Error('Невірний номер квартири або код');
  }

  // 2. Спроба входу через Firebase Auth (або створення акаунту)
  let userCredential;
  try {
    userCredential = await auth.signInWithEmailAndPassword(email, code);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      // Код вже перевірено — створюємо акаунт
      userCredential = await auth.createUserWithEmailAndPassword(email, code);
    } else {
      throw new Error('Невірний номер квартири або код');
    }
  }

  // 3. Формуємо сесію
  const user = {
    apt: aptStr,
    isAdmin: aptData.isAdmin === true,
    name: aptData.name || `Квартира ${aptStr}`,
    uid: userCredential.user.uid
  };

  saveUserSession(user);
  return user;
}

// Вихід
async function logout() {
  try {
    await auth.signOut();
  } catch (e) {}
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

// Створити/оновити акаунт квартири (тільки адмін)
async function setupApartmentAccount(aptNumber, code, isAdmin, name) {
  const aptStr = String(aptNumber);
  const email = `apt-${aptStr}@plaza-68f96.firebaseapp.com`;

  // Зберігаємо в Firestore
  await db.collection('apartments').doc(aptStr).set({
    code: code,
    isAdmin: isAdmin || false,
    name: name || `Квартира ${aptStr}`,
    email: email
  });

  // Створюємо або оновлюємо Firebase Auth акаунт
  try {
    await auth.createUserWithEmailAndPassword(email, code);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      // Оновлюємо пароль
      const user = await auth.signInWithEmailAndPassword(email, code).catch(() => null);
      if (user) {
        await user.user.updatePassword(code);
        await auth.signOut();
      }
    } else {
      throw err;
    }
  }
}