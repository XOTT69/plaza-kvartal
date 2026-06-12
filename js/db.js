// ===== РОБОТА З FIRESTORE =====
// Всі фільтровані запити — без orderBy (уникаємо composite index)
// Сортування відбувається на клієнті

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
// Без composite index — фільтруємо на клієнті
let lastAnnouncementDoc = null;
let allAnnouncementsCache = [];

async function getAnnouncements(loadMore = false) {
  const user = getCurrentUser();
  if (!user) return { items: [], hasMore: false };

  if (!loadMore) {
    lastAnnouncementDoc = null;
    allAnnouncementsCache = [];
  }

  // Отримуємо всі або по будинку — без orderBy щоб не потребував index
  let snapshot;
  if (user && user.isSuperAdmin) {
    snapshot = await db.collection('announcements').get();
  } else {
    snapshot = await db.collection('announcements')
      .where('buildingId', '==', user.buildingId)
      .get();
  }

  let all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  // Сортуємо на клієнті
  all.sort((a, b) => {
    const aT = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
    const bT = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
    return bT - aT;
  });

  // Пагінація на клієнті
  const start = loadMore ? allAnnouncementsCache.length : 0;
  const page = all.slice(start, start + PAGE_SIZE);
  allAnnouncementsCache = loadMore ? [...allAnnouncementsCache, ...page] : page;

  return {
    items: page,
    hasMore: all.length > allAnnouncementsCache.length
  };
}

function addAnnouncement(title, content) {
  const user = getCurrentUser();
  if (!user) throw new Error('Необхідна авторизація');
  return db.collection('announcements').add({
    title,
    content,
    author: user.name,
    authorApt: user.apt,
    buildingId: user.buildingId || 'all',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function deleteAnnouncement(id) {
  return db.collection('announcements').doc(id).delete();
}

// ---------- КОНТАКТИ ----------
function getContacts() {
  const user = getCurrentUser();
  let query = db.collection('contacts');
  if (user && !user.isSuperAdmin && user.buildingId) {
    query = query.where('buildingId', '==', user.buildingId);
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
  let query = db.collection('polls');
  if (user && !user.isSuperAdmin && user.buildingId) {
    query = query.where('buildingId', '==', user.buildingId);
  }
  return query.get().then(snapshot => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return data.sort((a, b) => {
      const aT = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
      const bT = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
      return bT - aT;
    });
  });
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
  let query = db.collection('neighborPosts');
  if (user && !user.isSuperAdmin && user.buildingId) {
    query = query.where('buildingId', '==', user.buildingId);
  }
  return query.get().then(snapshot => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return data.sort((a, b) => {
      const aT = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
      const bT = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
      return bT - aT;
    });
  });
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
let allIssuesCache = [];

async function getIssues(loadMore = false) {
  if (!loadMore) allIssuesCache = [];

  const user = getCurrentUser();
  if (!user) return { items: [], hasMore: false };
  let snapshot;

  if (user.isSuperAdmin) {
    snapshot = await db.collection('issues').get();
  } else {
    snapshot = await db.collection('issues')
      .where('buildingId', '==', user.buildingId)
      .get();
  }

  let all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  // Звичайний мешканець бачить тільки свої
  if (!user.isAdmin && !user.isSuperAdmin) {
    all = all.filter(i => i.authorApt === user.apt);
  }

  // Сортуємо на клієнті
  all.sort((a, b) => {
    const aT = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
    const bT = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
    return bT - aT;
  });

  const start = loadMore ? allIssuesCache.length : 0;
  const page = all.slice(start, start + PAGE_SIZE);
  allIssuesCache = loadMore ? [...allIssuesCache, ...page] : page;

  return {
    items: page,
    hasMore: all.length > allIssuesCache.length
  };
}

function addIssue(title, description) {
  const user = getCurrentUser();
  if (!user) throw new Error('Необхідна авторизація');
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
  // Зберігаємо ВСІ коментарі (масив), а не лише останній
  const issueRef = db.collection('issues').doc(issueId);
  return db.runTransaction(async transaction => {
    const doc = await transaction.get(issueRef);
    if (!doc.exists) throw new Error('Проблему не знайдено');
    const data = doc.data();
    const comments = data.comments || [];
    comments.push({
      text,
      author: user.name,
      authorApt: user.apt,
      createdAt: new Date().toISOString()
    });
    transaction.update(issueRef, {
      comments,
      lastComment: {
        text,
        author: user.name,
        createdAt: new Date().toISOString()
      }
    });
  });
}

// ---------- ПОДІЇ ----------
function getEvents() {
  const user = getCurrentUser();
  let query = db.collection('events');
  if (user && !user.isSuperAdmin && user.buildingId) {
    query = query.where('buildingId', '==', user.buildingId);
  }
  return query.get().then(snapshot => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return data.sort((a, b) => {
      const aT = a.eventDate ? (a.eventDate.toMillis ? a.eventDate.toMillis() : new Date(a.eventDate).getTime()) : 0;
      const bT = b.eventDate ? (b.eventDate.toMillis ? b.eventDate.toMillis() : new Date(b.eventDate).getTime()) : 0;
      return aT - bT;
    });
  });
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
