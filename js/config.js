const firebaseConfig = {
  apiKey: "AIzaSyAxcEytIFZJAXQ7WeRBiHBQSMxAfq6Ikjo",
  authDomain: "plaza-68f96.firebaseapp.com",
  projectId: "plaza-68f96",
  storageBucket: "plaza-68f96.firebasestorage.app",
  messagingSenderId: "343943080940",
  appId: "1:343943080940:web:276693a10d949403312ec9",
  measurementId: "G-D92KSPN4W7"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

const APP_VERSION = '2.0.0';

// Зчитати buildingId з URL: ?b=plaza1
function getBuildingIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('b') || null;
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - d;
  const day = 86400000;
  if (diff < day) return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  if (diff < 2 * day) return 'Вчора';
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
}

function formatDateFull(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}
