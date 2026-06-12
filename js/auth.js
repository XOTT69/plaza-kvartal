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

  const aptDoc = await db.collection('apartments').doc(aptStr).get();
  if (!aptDoc.exists) {
    throw new Error('Невірний номер квартири або код');
  }

  const aptData = aptDoc.data();
  if (aptData.code !== code) {
    throw new Error('Невірний номер квартири або код');
  }

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

// Вхід через GOOGLE — використовуємо popup (працює в більшості браузерів)
async function startGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  
  try {
    const result = await auth.signInWithPopup(provider);
    const user = await processGoogleResult(result.user);
    return user;
  } catch (err) {
    if (err.code === 'auth/popup-blocked') {
      // Якщо popup заблоковано — пробуємо redirect
      auth.signInWithRedirect(provider);
      throw new Error('Спливаюче вікно заблоковане. Перенаправляємо на Google...');
    }
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('Вхід скасовано');
    }
    throw err;
  }
}

// Обробка результату після Google входу (і popup, і redirect)
async function processGoogleResult(firebaseUser) {
  if (!firebaseUser) return null;
  
  // Перевіряємо, чи це Google авторизація
  const isGoogleProvider = firebaseUser.providerData &&
    firebaseUser.providerData.some(p => p.providerId === 'google.com');

  if (!isGoogleProvider) return null;

  const email = firebaseUser.email;
  const displayName = firebaseUser.displayName || email;

  if (!email) return null;

  // Перевіряємо, чи є цей email в колекції admin_emails
  const adminDoc = await db.collection('admin_emails').doc(email).get();
  
  let isAdminUser = false;
  let aptNumber = null;

  if (adminDoc.exists && adminDoc.data().isAdmin === true) {
    isAdminUser = true;
    aptNumber = adminDoc.data().apt || 'admin';
  } else {
    const allAdmins = await db.collection('admin_emails').get();
    
    if (allAdmins.empty) {
      // Перший Google вхід — стає адміном
      isAdminUser = true;
      aptNumber = 'admin';
      
      await db.collection('admin_emails').doc(email).set({
        email: email,
        name: displayName,
        isAdmin: true,
        apt: 'admin',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

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
      await auth.signOut();
      throw new Error('Цей Google акаунт не має доступу. Зверніться до адміністратора.');
    }
  }

  const user = {
    apt: aptNumber,
    isAdmin: isAdminUser,
    name: displayName,
    email: email,
    uid: firebaseUser.uid,
    authType: 'google',
    photoURL: firebaseUser.photoURL || null
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

// Оновлюємо UI на основі сесії
function applyAuthUI(user) {
  if (!user) {
    document.getElementById('header').classList.add('hidden');
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    document.getElementById('userInfo').textContent = '';
    return;
  }

  document.getElementById('header').classList.remove('hidden');
  document.getElementById('welcomeText').textContent = `Ласкаво просимо, ${user.name}!`;

  if (user.isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  } else {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
  }

  document.getElementById('userInfo').textContent = `${user.name}${user.isAdmin ? ' (Адмін)' : user.apt ? ` · Кв.${user.apt}` : ''}`;
}

// Додати Google адміна
async function addGoogleAdmin(email, name) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.isAdmin) {
    throw new Error('Тільки адмін може додавати адмінів');
  }

  const existing = await db.collection('admin_emails').doc(email).get();
  if (existing.exists) {
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

async function removeGoogleAdmin(email) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.isAdmin) {
    throw new Error('Тільки адмін може керувати адмінами');
  }
  await db.collection('admin_emails').doc(email).delete();
}

async function getGoogleAdmins() {
  const snapshot = await db.collection('admin_emails').get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function setupApartmentAccount(aptNumber, code, isAdmin, name) {
  const aptStr = String(aptNumber);
  const email = `apt-${aptStr}@plaza-68f96.firebaseapp.com`;

  await db.collection('apartments').doc(aptStr).set({
    code: code,
    isAdmin: isAdmin || false,
    name: name || `Квартира ${aptStr}`,
    email: email
  });

  try {
    await auth.createUserWithEmailAndPassword(email, code);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
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