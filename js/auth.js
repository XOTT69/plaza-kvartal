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

// Вхід через КВАРТИРУ + КОД
async function login(aptNumber, code) {
  const aptStr = String(aptNumber);
  const email = `apt-${aptStr}@plaza-68f96.firebaseapp.com`;

  // 1. Спочатку перевіряємо код в Firestore
  const aptDoc = await db.collection('apartments').doc(aptStr).get();
  if (!aptDoc.exists) {
    throw new Error('Невірний номер квартири або код');
  }

  const aptData = aptDoc.data();
  if (aptData.code !== code) {
    throw new Error('Невірний номер квартири або код');
  }

  // 2. Спроба входу через Firebase Auth
  let userCredential;
  try {
    userCredential = await auth.signInWithEmailAndPassword(email, code);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
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
    uid: userCredential.user.uid,
    authType: 'password'
  };

  saveUserSession(user);
  return user;
}

// Вхід через GOOGLE
async function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  
  let userCredential;
  try {
    userCredential = await auth.signInWithPopup(provider);
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('Вхід скасовано');
    }
    throw new Error('Помилка входу через Google: ' + err.message);
  }

  const googleUser = userCredential.user;
  const email = googleUser.email;
  const displayName = googleUser.displayName || email;

  // Перевіряємо, чи є цей email в колекції admin_emails
  const adminDoc = await db.collection('admin_emails').doc(email).get();
  
  let isAdminUser = false;
  let aptNumber = null;

  if (adminDoc.exists && adminDoc.data().isAdmin === true) {
    // Цей email є в списку адмінів
    isAdminUser = true;
    aptNumber = adminDoc.data().apt || 'admin';
  } else {
    // Перевіряємо, чи це перший адмін (чи є взагалі хтось в admin_emails)
    const allAdmins = await db.collection('admin_emails').get();
    
    if (allAdmins.empty) {
      // Перший Google вхід — стає адміном автоматично
      isAdminUser = true;
      aptNumber = 'admin';
      
      // Записуємо в Firestore
      await db.collection('admin_emails').doc(email).set({
        email: email,
        name: displayName,
        isAdmin: true,
        apt: 'admin',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Також створюємо апартамент для адміна (щоб логіка працювала)
      const adminAptRef = db.collection('apartments').doc('admin');
      const adminAptDoc = await adminAptRef.get();
      if (!adminAptDoc.exists) {
        await adminAptRef.set({
          code: 'google',
          isAdmin: true,
          name: displayName,
          email: email
        });
      }
    } else {
      // Не перший — відхиляємо, якщо немає в списку
      await auth.signOut();
      throw new Error('Цей Google акаунт не має доступу. Зверніться до адміністратора.');
    }
  }

  // Формуємо сесію
  const user = {
    apt: aptNumber,
    isAdmin: isAdminUser,
    name: displayName,
    email: email,
    uid: googleUser.uid,
    authType: 'google',
    photoURL: googleUser.photoURL || null
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
  const userInfo = document.getElementById('userInfo');
  userInfo.textContent = `${user.name}${user.isAdmin ? ' (Адмін)' : user.apt ? ` · Кв.${user.apt}` : ''}`;

  return user;
}

// Додати/оновити Google користувача як адміна (тільки адмін)
async function addGoogleAdmin(email, name) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.isAdmin) {
    throw new Error('Тільки адмін може додавати адмінів');
  }

  // Перевіряємо, чи вже є
  const existing = await db.collection('admin_emails').doc(email).get();
  if (existing.exists) {
    // Оновлюємо
    await db.collection('admin_emails').doc(email).update({
      isAdmin: true,
      name: name || email
    });
  } else {
    await db.collection('admin_emails').doc(email).set({
      email: email,
      name: name || email,
      isAdmin: true,
      apt: 'admin',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

// Видалити Google адміна
async function removeGoogleAdmin(email) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.isAdmin) {
    throw new Error('Тільки адмін може керувати адмінами');
  }
  await db.collection('admin_emails').doc(email).delete();
}

// Отримати список Google адмінів
async function getGoogleAdmins() {
  const snapshot = await db.collection('admin_emails').get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Створити/оновити квартиру (для парольного входу)
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