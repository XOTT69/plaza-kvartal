// ✅ FIX #3: При зміні коду — оновлюємо також Firebase Auth пароль
async function submitApartmentEdit() {
  const docId = document.getElementById('aptFieldDocId').value;
  const newCode = document.getElementById('aptFieldCode').value.trim();
  const isAdminFlag = document.getElementById('aptFieldAdmin').checked;
  const name = document.getElementById('aptFieldName').value.trim();
  // ✅ FIX #5: завжди передаємо масив (навіть пустий)
  const residents = collectResidents();

  if (!newCode) { showToast('Введіть код', 'error'); return; }

  try {
    // Читаємо поточні дані щоб дізнатись старий код
    const currentDoc = await db.collection('apartments').doc(docId).get();
    const oldCode = currentDoc.exists ? currentDoc.data()?.code : null;
    const aptEmail = currentDoc.exists ? currentDoc.data()?.email : null;

    // Оновлюємо Firestore
    await db.collection('apartments').doc(docId).update({
      code: newCode,
      isAdmin: isAdminFlag,
      name,
      // ✅ FIX #5: завжди оновлюємо residents (включно з пустим масивом)
      residents
    });

    // ✅ FIX #3: Якщо код змінився — оновлюємо пароль у Firebase Auth
    if (oldCode && newCode !== oldCode && aptEmail) {
      const secondaryAuth = getSecondaryAuth();
      try {
        const cred = await secondaryAuth.signInWithEmailAndPassword(aptEmail, oldCode);
        await cred.user.updatePassword(newCode);
        console.log('Firebase Auth password updated for', aptEmail);
      } catch (authErr) {
        // Не критично — юзер може ще зайти зі старим кодом або адмін перестворить квартиру
        console.warn('Could not update Firebase Auth password:', authErr.code);
        showToast('Код у Firestore оновлено. Пароль Firebase не оновлено — мешканець може не зайти!', 'error');
      } finally {
        try { await secondaryAuth.signOut(); } catch {}
      }
    }

    closeModal();
    showToast('Збережено', 'success');
    renderAdminApartments();
  } catch (e) {
    showToast('Помилка: ' + e.message, 'error');
  }
}
