// ===== РОБОТА З FIRESTORE =====

const PAGE_SIZE = 20;

// ---------- БУДИНКИ ----------
function getBuildings() {
  return db.collection('buildings')
    .get()
    .then(snapshot => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return data.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'uk'));
    });
}

function addBuilding(code, name, address, maxApt) {
  const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanCode) throw new Error('Код будинку може містити лише латинські літери та цифри');
  return db.collection('buildings').doc(cleanCode).set({
    code: cleanCode,
    name: name || `Будинок ${cleanCode}`,
    address: address || '',
    maxApt: parseInt(maxApt) || 24,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function updateBuilding(id, data) {
  return db.collection('buildings').doc(id).update(data);
}

function deleteBuilding(id) {
  return db.collection('buildings').doc(id).delete();
}

// ---------- КВАРТИРИ ----------
function getAllApartments(buildingId) {
  let query = db.collection('apartments');
  if (buildingId) {
    query = query.where('buildingId', '==', buildingId);
  }
  return query.get().then(snapshot => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return data.sort((a, b) => parseInt(a.aptNumber || 0) - parseInt(b.aptNumber || 0));
  });
}

// ---------- ОГОЛОШЕННЯ ----------
// ✅ FIX #6/#7: кеш скидається при кожному виклику без loadMore
let _announcementsAll = []; // зберігаємо ВСІ для пагінації без повторного читання
let _announcementsFetched = false;

async function getAnnouncements(loadMore = false) {
  const user = getCurrentUser();
  if (!user) return { items: [], hasMore: false };

  // ✅ FIX: скидаємо при першому завантаженні
  if (!loadMore) {
    _announcementsAll = [];
    _announcementsFetched = false;
  }

  // Читаємо з Firestore тільки якщо ще не читали
  if (!_announcementsFetched) {
    let docs = [];

    if (user.isSuperAdmin) {
      const snap = await db.collection('announcements').get();
      docs = snap.docs;
    } else {
      // ✅ FIX #4: отримуємо оголошення свого будинку + загальні ('all')
      const [buildingSnap, globalSnap] = await Promise.all([
        db.collection('announcements').where('buildingId', '==', user.buildingId).get(),
        db.collection('announcements').where('buildingId', '==', 'all').get()
      ]);
      const seen = new Set();
      [...buildingSnap.docs, ...globalSnap.docs].forEach(d => {
        if (!seen.has(d.id)) { seen.add(d.id); docs.push(d); }
      });
    }

    _announcementsAll = docs.map(d => ({ id: d.id, ...d.data() }));
    _announcementsAll.sort((a, b) => {
      const aT = a.createdAt?.toMillis?.() ?? (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const bT = b.createdAt?.toMillis?.() ?? (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return bT - aT;
    });
    _announcementsFetched = true;
  }

  const alreadyShown = loadMore ? Math.ceil(_announcementsAll.length / PAGE_SIZE) * PAGE_SIZE - PAGE_SIZE : 0;
  // Простіше: просто рахуємо скільки вже показали через UI
  // Використовуємо announcementsCache з ui.js для підрахунку
  const start = loadMore ? (window._annShownCount || 0) : 0;
  const page = _announcementsAll.slice(start, start + PAGE_SIZE);
  window._annShownCount = start + page.length;

  return {
    items: page,
    hasMore: (start + page.length) < _announcementsAll.length
  };
}

function addAnnouncement(title, content) {
  const user = getCurrentUser();
  if (!user) throw new Error('Необхідна авторизація');
  // ✅ FIX #4: скидаємо кеш після додавання
  _announcementsFetched = false;
  window._annShownCount = 0;
  return db.collection('announcements').add({
    title,
    content,
    author: user.name,
    authorApt: user.apt,
    // Супер-адмін: 'all' = глобально для всіх будинків
    buildingId: user.buildingId || 'all',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function deleteAnnouncement(id) {
  _announcementsFetched = false;
  window._annShownCount = 0;
  return db.collection('announcements').doc(id).delete();
}

// ---------- КОНТАКТИ ----------
function getContacts() {
  const user = getCurrentUser();
  let query = db.collection('contacts');
  if (user && !user.isSuperAdmin && user.buildingId) {
    // ✅ FIX #4: теж показуємо глобальні контакти
    // Firestore не підтримує OR — робимо два запити
    return Promise.all([
      db.collection('contacts').where('buildingId', '==', user.buildingId).get(),
      db.collection('contacts').where('buildingId', '==', 'all').get()
    ]).then(([buildingSnap, globalSnap]) => {
      const seen = new Set();
      const data = [];
      [...buildingSnap.docs, ...globalSnap.docs].forEach(d => {
        if (!seen.has(d.id)) { seen.add(d.id); data.push({ id: d.id, ...d.data() }); }
      });
      return data.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  }
  return query.get().then(snapshot => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return data.sort((a, b) => (a.order || 0) - (b.order || 0));
  });
}

function addContact(name, phone, category, icon) {
  const user = getCurrentUser();
  if (!user) throw new Error('Необхідна авторизація');
  return db.collection('contacts').add({
    name, phone,
    category: category || '',
    icon: icon || '📞',
    buildingId: user.buildingId || 'all',
    order: Date.now()
  });
}

function deleteContact(id) {
  return db.collection('contacts').doc(id).delete();
}

function updateContact(id, data) {
  return db.collection('contacts').doc(id).update(data);
}

// ---------- ГОЛОСУВАННЯ ----------
function getPolls() {
  const user = getCurrentUser();
  let queries;
  if (user && !user.isSuperAdmin && user.buildingId) {
    queries = Promise.all([
      db.collection('polls').where('buildingId', '==', user.buildingId).get(),
      db.collection('polls').where('buildingId', '==', 'all').get()
    ]).then(([s1, s2]) => {
      const seen = new Set();
      const data = [];
      [...s1.docs, ...s2.docs].forEach(d => {
        if (!seen.has(d.id)) { seen.add(d.id); data.push({ id: d.id, ...d.data() }); }
      });
      return data;
    });
  } else {
    queries = db.collection('polls').get().then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
  }
  return queries.then(data => data.sort((a, b) => {
    const aT = a.createdAt?.toMillis?.() ?? 0;
    const bT = b.createdAt?.toMillis?.() ?? 0;
    return bT - aT;
  }));
}

function addPoll(question, options) {
  const user = getCurrentUser();
  if (!user) throw new Error('Необхідна авторизація');
  const opts = options.map(text => ({ text, votes: [] }));
  return db.collection('polls').add({
    question, options: opts, active: true,
    buildingId: user.buildingId || 'all',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function votePoll(pollId, optionIndex, user) {
  const pollRef = db.collection('polls').doc(pollId);
  return db.runTransaction(async transaction => {
    const doc = await transaction.get(pollRef);
    if (!doc.exists) throw new Error('Голосування не знайдено');
    const data = doc.data();
    const options = [...data.options];
    for (let i = 0; i < options.length; i++) {
      if (options[i].votes && options[i].votes.includes(user.apt)) {
        throw new Error('Ви вже проголосували');
      }
    }
    if (!options[optionIndex].votes) options[optionIndex].votes = [];
    options[optionIndex].votes.push(user.apt);
    transaction.update(pollRef, { options });
  });
}

function closePoll(pollId) {
  return db.collection('polls').doc(pollId).update({ active: false });
}

// ---------- СУСІДСЬКІ ОГОЛОШЕННЯ ----------
function getNeighborPosts() {
  const user = getCurrentUser();
  let queries;
  if (user && !user.isSuperAdmin && user.buildingId) {
    queries = Promise.all([
      db.collection('neighborPosts').where('buildingId', '==', user.buildingId).get(),
      db.collection('neighborPosts').where('buildingId', '==', 'all').get()
    ]).then(([s1, s2]) => {
      const seen = new Set();
      const data = [];
      [...s1.docs, ...s2.docs].forEach(d => {
        if (!seen.has(d.id)) { seen.add(d.id); data.push({ id: d.id, ...d.data() }); }
      });
      return data;
    });
  } else {
    queries = db.collection('neighborPosts').get().then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
  }
  return queries.then(data => data.sort((a, b) => {
    const aT = a.createdAt?.toMillis?.() ?? 0;
    const bT = b.createdAt?.toMillis?.() ?? 0;
    return bT - aT;
  }));
}

function addNeighborPost(category, title, content, contact) {
  const user = getCurrentUser();
  if (!user) throw new Error('Необхідна авторизація');
  return db.collection('neighborPosts').add({
    category, title, content,
    contact: contact || '',
    author: user.name,
    authorApt: user.apt,
    buildingId: user.buildingId || 'all',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function deleteNeighborPost(id) {
  return db.collection('neighborPosts').doc(id).delete();
}

// ---------- ПРОБЛЕМИ ----------
let _issuesAll = [];
let _issuesFetched = false;

async function getIssues(loadMore = false) {
  const user = getCurrentUser();
  if (!user) return { items: [], hasMore: false };

  if (!loadMore) {
    _issuesAll = [];
    _issuesFetched = false;
    window._issuesShownCount = 0;
  }

  if (!_issuesFetched) {
    let snapshot;
    if (user.isSuperAdmin) {
      snapshot = await db.collection('issues').get();
    } else {
      snapshot = await db.collection('issues')
        .where('buildingId', '==', user.buildingId)
        .get();
    }

    _issuesAll = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Звичайний мешканець — тільки свої
    if (!user.isAdmin && !user.isSuperAdmin) {
      _issuesAll = _issuesAll.filter(i => i.authorApt === user.apt);
    }

    _issuesAll.sort((a, b) => {
      const aT = a.createdAt?.toMillis?.() ?? 0;
      const bT = b.createdAt?.toMillis?.() ?? 0;
      return bT - aT;
    });
    _issuesFetched = true;
  }

  const start = loadMore ? (window._issuesShownCount || 0) : 0;
  const page = _issuesAll.slice(start, start + PAGE_SIZE);
  window._issuesShownCount = start + page.length;

  return {
    items: page,
    hasMore: (start + page.length) < _issuesAll.length
  };
}

function addIssue(title, description) {
  const user = getCurrentUser();
  if (!user) throw new Error('Необхідна авторизація');
  _issuesFetched = false;
  window._issuesShownCount = 0;
  return db.collection('issues').add({
    title, description,
    status: 'new',
    author: user.name,
    authorApt: user.apt,
    buildingId: user.buildingId || 'all',
    comments: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function updateIssueStatus(issueId, status, comment) {
  _issuesFetched = false;
  const updateData = { status };
  if (comment) {
    updateData.lastComment = {
      text: comment,
      author: getCurrentUser().name,
      createdAt: new Date().toISOString()
    };
  }
  return db.collection('issues').doc(issueId).update(updateData);
}

function addIssueComment(issueId, text) {
  const user = getCurrentUser();
  if (!user) throw new Error('Необхідна авторизація');
  _issuesFetched = false;
  const issueRef = db.collection('issues').doc(issueId);
  return db.runTransaction(async transaction => {
    const doc = await transaction.get(issueRef);
    if (!doc.exists) throw new Error('Проблему не знайдено');
    const data = doc.data();
    const comments = Array.isArray(data.comments) ? [...data.comments] : [];
    comments.push({
      text,
      author: user.name,
      authorApt: user.apt,
      createdAt: new Date().toISOString()
    });
    transaction.update(issueRef, {
      comments,
      lastComment: { text, author: user.name, createdAt: new Date().toISOString() }
    });
  });
}

// ---------- ПОДІЇ ----------
function getEvents() {
  const user = getCurrentUser();
  let queries;
  if (user && !user.isSuperAdmin && user.buildingId) {
    queries = Promise.all([
      db.collection('events').where('buildingId', '==', user.buildingId).get(),
      db.collection('events').where('buildingId', '==', 'all').get()
    ]).then(([s1, s2]) => {
      const seen = new Set();
      const data = [];
      [...s1.docs, ...s2.docs].forEach(d => {
        if (!seen.has(d.id)) { seen.add(d.id); data.push({ id: d.id, ...d.data() }); }
      });
      return data;
    });
  } else {
    queries = db.collection('events').get().then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
  }
  return queries.then(data => data.sort((a, b) => {
    const aT = a.eventDate?.toMillis?.() ?? (a.eventDate ? new Date(a.eventDate).getTime() : 0);
    const bT = b.eventDate?.toMillis?.() ?? (b.eventDate ? new Date(b.eventDate).getTime() : 0);
    return aT - bT;
  }));
}

function addEvent(title, description, eventDate) {
  const user = getCurrentUser();
  if (!user) throw new Error('Необхідна авторизація');
  return db.collection('events').add({
    title, description,
    eventDate: new Date(eventDate),
    buildingId: user.buildingId || 'all',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function deleteEvent(id) {
  return db.collection('events').doc(id).delete();
}
