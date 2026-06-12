// ===== АВТОРИЗАЦІЯ =====

const AUTH_KEY = 'my_dim_auth';

function getCurrentUser() {
  const data = localStorage.getItem(AUTH_KEY);
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
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

function isSuperAdmin() {
  const user = getCurrentUser();
  return user && user.isSuperAdmin === true;
}

// Вхід через КВАРТИРУ + КОД
async function login(buildingId, aptNumber, code) {
  const aptStr = String(aptNumber);
  const docId = `${buildingId}__${aptStr}`;
  const email = `apt-${buildingId}-${aptStr}@plaza-68f96.firebaseapp.com`;

  // Перевіряємо квартиру
  const aptDoc = await db.collection('apartments').doc(docId).get();
  if (!aptDoc.exists) {
    throw new Error('Невірний номер квартири або код');
  }

  const aptData = aptDoc.data();
  if (aptData.code !== code) {
    throw new Error('Невірний номер квартири або код');
  }

  // Отримуємо дані будинку
  const buildingDoc = await db.collection('buildings').doc(buildingId).get();
  const buildingData = buildingDoc.exists ? buildingDoc.data() : { name: 'Будинок', address: '' };

  // Firebase Auth
  let userCredential;
  try {
    userCredential = await auth.signInWithEmailAndPassword(email, code);
  } catch (err) {
    const isNotFound = (
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/invalid-login-credentials'
    );
    if (isNotFound) {
      try {
        userCredential = await auth.createUserWithEmailAndPassword(email, code);
      } catch (createErr) {
        if (createErr.code === 'auth/email-already-in-use') {
          throw new Error('Невірний код доступу');
        }
        throw new Error('Невірний номер квартири або код');
      }
    } else {
      throw new Error('Невірний номер квартири або код');
    }
  }

  const user = {
    apt: aptStr,
    buildingId: buildingId,
    buildingName: buildingData.name || 'Будинок',
    buildingAddress: buildingData.address || '',
    isAdmin: aptData.isAdmin === true,
    isSuperAdmin: false,
    name: aptData.name || `Квартира ${aptStr}`,
    uid: userCredential.user.uid,
    authType: 'password'
  };

  saveUserSession(user);
  return user;
}

// Вхід через GOOGLE (тільки для супер-адмінів)
async function startGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await auth.signInWithPopup(provider);
    const googleUser = result.user;
    const email = googleUser.email;
    const displayName = googleUser.displayName || email;

    if (!email) throw new Error('Не вдалося отримати email');

    const adminDoc = await db.collection('admin_emails').doc(email).get();
    let isAdminUser = false;

    if (adminDoc.exists && adminDoc.data().isAdmin === true) {
      isAdminUser = true;
    } else {
      const allAdmins = await db.collection('admin_emails').get();
      if (allAdmins.empty) {
        isAdminUser = true;
        await db.collection('admin_emails').doc(email).set({
          email, name: displayName, isAdmin: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await auth.signOut();
        throw new Error('Цей Google акаунт не має доступу. Зверніться до адміністратора.');
      }
    }

    const user = {
      apt: 'admin',
      buildingId: null,
      buildingName: 'Всі будинки',
      isAdmin: isAdminUser,
      isSuperAdmin: true,
      name: displayName,
      email,
      uid: googleUser.uid,
      authType: 'google',
      photoURL: googleUser.photoURL || null
    };

    saveUserSession(user);
    return user;
  } catch (err) {
    if (err.code === 'auth/popup-blocked') {
      localStorage.setItem('expect_google_redirect', 'true');
      auth.signInWithRedirect(provider);
      throw new Error('redirect');
    }
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('Вхід скасовано');
    }
    throw err;
  }
}

// Обробка Google redirect
async function checkGoogleRedirect() {
  const expected = localStorage.getItem('expect_google_redirect');
  if (!expected) return null;
  localStorage.removeItem('expect_google_redirect');

  try {
    const result = await auth.getRedirectResult();
    if (!result || !result.user) return null;

    const googleUser = result.user;
    const email = googleUser.email;
    const displayName = googleUser.displayName || email;
    if (!email) return null;

    const adminDoc = await db.collection('admin_emails').doc(email).get();
    let isAdminUser = false;

    if (adminDoc.exists && adminDoc.data().isAdmin === true) {
      isAdminUser = true;
    } else {
      const allAdmins = await db.collection('admin_emails').get();
      if (allAdmins.empty) {
        isAdminUser = true;
        await db.collection('admin_emails').doc(email).set({
          email, name: displayName, isAdmin: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await auth.signOut();
        throw new Error('Цей Google акаунт не має доступу.');
      }
    }

    const user = {
      apt: 'admin', buildingId: null, buildingName: 'Всі будинки',
      isAdmin: isAdminUser, isSuperAdmin: true,
      name: displayName, email, uid: googleUser.uid,
      authType: 'google', photoURL: googleUser.photoURL || null
    };
    saveUserSession(user);
    return user;
  } catch (err) {
    console.error('Google redirect error:', err);
    throw err;
  }
}

// Вихід
async function logout() {
  try { await auth.signOut(); } catch (e) {}
  clearUserSession();
  window.location.reload();
}

// Оновити UI після логіну
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

  const aptInfo = user.apt && user.apt !== 'admin' ? ` · Кв.${user.apt}` : '';
  const adminInfo = user.isSuperAdmin ? ' (Супер-адмін)' : user.isAdmin ? ' (Адмін)' : '';
  const buildingInfo = user.buildingName ? ` · ${user.buildingName}` : '';
  document.getElementById('userInfo').textContent = `${user.name}${adminInfo}${aptInfo}${buildingInfo}`;
}

// ---------- АДМІН ФУНКЦІЇ ----------
async function getGoogleAdmins() {
  const snapshot = await db.collection('admin_emails').get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addGoogleAdmin(email, name) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.isAdmin) throw new Error('Тільки адмін може додавати адмінів');
  const existing = await db.collection('admin_emails').doc(email).get();
  if (existing.exists) {
    await db.collection('admin_emails').doc(email).update({ isAdmin: true, name: name || email });
  } else {
    await db.collection('admin_emails').doc(email).set({
      email, name: name || email, isAdmin: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

async function removeGoogleAdmin(email) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.isAdmin) throw new Error('Тільки адмін може керувати адмінами');
  await db.collection('admin_emails').doc(email).delete();
}

async function setupApartmentAccount(buildingId, aptNumber, code, isAdminFlag, name) {
  const aptStr = String(aptNumber);
  const docId = `${buildingId}__${aptStr}`;
  const email = `apt-${buildingId}-${aptStr}@plaza-68f96.firebaseapp.com`;

  await db.collection('apartments').doc(docId).set({
    buildingId,
    aptNumber: aptStr,
    code,
    isAdmin: isAdminFlag || false,
    name: name || `Квартира ${aptStr}`,
    email
  });

  try {
    await auth.createUserWithEmailAndPassword(email, code);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      try {
        const cred = await auth.signInWithEmailAndPassword(email, code);
        await cred.user.updatePassword(code);
        await auth.signOut();
      } catch {
        // код вже оновлено у Firestore
      }
    } else {
      throw err;
    }
  }
}

function deleteApartment(docId) {
  return db.collection('apartments').doc(String(docId)).delete();
}
