// ===== РОБОТА З FIRESTORE =====

// ---------- ОГОЛОШЕННЯ ----------
function getAnnouncements() {
  return db.collection('announcements')
    .get()
    .then(snapshot => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return data.sort((a, b) => {
        const aTime = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
        const bTime = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
        return bTime - aTime;
      });
    });
}

function addAnnouncement(title, content) {
  const user = getCurrentUser();
  return db.collection('announcements').add({
    title,
    content,
    author: user.name,
    authorApt: user.apt,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function deleteAnnouncement(id) {
  return db.collection('announcements').doc(id).delete();
}

// ---------- КОНТАКТИ ----------
function getContacts() {
  return db.collection('contacts')
    .get()
    .then(snapshot => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return data.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
}

function addContact(name, phone, category, icon) {
  return db.collection('contacts').add({
    name,
    phone,
    category: category || '',
    icon: icon || '📞',
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
  return db.collection('polls')
    .get()
    .then(snapshot => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return data.sort((a, b) => {
        const aTime = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
        const bTime = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
        return bTime - aTime;
      });
    });
}

function addPoll(question, options) {
  const opts = options.map(text => ({
    text,
    votes: []
  }));
  return db.collection('polls').add({
    question,
    options: opts,
    active: true,
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

    // Перевіряємо чи вже голосував
    for (let i = 0; i < options.length; i++) {
      if (options[i].votes && options[i].votes.includes(user.apt)) {
        throw new Error('Ви вже проголосували');
      }
    }

    if (!options[optionIndex].votes) {
      options[optionIndex].votes = [];
    }
    options[optionIndex].votes.push(user.apt);

    transaction.update(pollRef, { options });
  });
}

function closePoll(pollId) {
  return db.collection('polls').doc(pollId).update({ active: false });
}

// ---------- СУСІДСЬКІ ОГОЛОШЕННЯ ----------
function getNeighborPosts() {
  return db.collection('neighborPosts')
    .get()
    .then(snapshot => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return data.sort((a, b) => {
        const aTime = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
        const bTime = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
        return bTime - aTime;
      });
    });
}

function addNeighborPost(category, title, content, contact) {
  const user = getCurrentUser();
  return db.collection('neighborPosts').add({
    category,
    title,
    content,
    contact: contact || '',
    author: user.name,
    authorApt: user.apt,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function deleteNeighborPost(id) {
  return db.collection('neighborPosts').doc(id).delete();
}

// ---------- ПРОБЛЕМИ ----------
function getIssues() {
  const user = getCurrentUser();
  let query = db.collection('issues');

  if (!user.isAdmin) {
    query = query.where('authorApt', '==', user.apt);
  }

  return query.get().then(snapshot => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return data.sort((a, b) => {
      const aTime = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
      const bTime = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
      return bTime - aTime;
    });
  });
}

function addIssue(title, description) {
  const user = getCurrentUser();
  return db.collection('issues').add({
    title,
    description,
    status: 'new',
    author: user.name,
    authorApt: user.apt,
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
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }
  return db.collection('issues').doc(issueId).update(updateData);
}

// ---------- ПОДІЇ ----------
function getEvents() {
  return db.collection('events')
    .get()
    .then(snapshot => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return data.sort((a, b) => {
        const aTime = a.eventDate ? (a.eventDate.toMillis ? a.eventDate.toMillis() : new Date(a.eventDate).getTime()) : 0;
        const bTime = b.eventDate ? (b.eventDate.toMillis ? b.eventDate.toMillis() : new Date(b.eventDate).getTime()) : 0;
        return aTime - bTime;
      });
    });
}

function addEvent(title, description, eventDate) {
  return db.collection('events').add({
    title,
    description,
    eventDate: new Date(eventDate),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function deleteEvent(id) {
  return db.collection('events').doc(id).delete();
}

// ---------- КВАРТИРИ (АДМІН) ----------
function getAllApartments() {
  return db.collection('apartments')
    .get()
    .then(snapshot => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return data.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    });
}

function setApartment(aptNumber, code, isAdmin, name) {
  return db.collection('apartments').doc(String(aptNumber)).set({
    code,
    isAdmin: isAdmin || false,
    name: name || `Квартира ${aptNumber}`
  });
}