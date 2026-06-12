// ⚠️ ТВІЙ КОНФІГ FIREBASE
// Заміни ці дані на свої з Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "my-dim-xxxxx.firebaseapp.com",
  projectId: "my-dim-xxxxx",
  storageBucket: "my-dim-xxxxx.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxx"
};

// Ініціалізація Firebase
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

// Налаштування
const APP_VERSION = '1.0.0';
const MAX_APT = 24;

// Хелпер для дати
function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - d;
  const day = 86400000;

  if (diff < day) {
    return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 2 * day) return 'Вчора';
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
}

function formatDateFull(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}