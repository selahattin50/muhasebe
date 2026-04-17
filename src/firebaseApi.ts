import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  increment,
  getDoc,
  runTransaction,
  setDoc
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as authSignOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import { db, auth } from './firebase';

// Koleksiyon isimleri
const COLLECTIONS = {
  USERS: 'users',
  CARIS: 'caris',
  STOCKS: 'stocks',
  INVOICES: 'invoices',
  KASA: 'kasa',
  TRANSACTIONS: 'transactions',
  SETTINGS: 'settings'
};

const isBorc = (type: string) => {
  const s = String(type || '').toLowerCase().trim();
  return s === 'borc' || s === 'borç' || s.startsWith('bor');
};
const isAlacak = (type: string) => String(type || '').toLowerCase().trim() === 'alacak';

const isNativeApp = () => {
  const cap = (window as any).Capacitor;
  return window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
    !!cap?.isNativePlatform?.();
};

const buildDefaultUserDoc = (uid: string, email: string) => ({
  username: email.split('@')[0],
  email,
  uid,
  createdAt: Timestamp.now()
});


// Kullanıcı İşlemleri
export const firebaseLogin = async (emailOrUsername: string, password: string, rememberMe: boolean = true) => {
  try {
    if (!auth || !db) {
      throw new Error('Firebase servisleri başlatılamadı (config hatası olabilir)');
    }

    const email = String(emailOrUsername || '').trim().toLowerCase();

    if (!email.includes('@')) {
      return { success: false, message: 'Lütfen kayıtlı e-posta adresinizi girin.' };
    }

    console.log('Firebase Auth denemesi:', email);

    // Mobil WebView'de persistence hatasi girisi bloklamasin.
    try {
      const persistenceType = isNativeApp()
        ? inMemoryPersistence
        : (rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await setPersistence(auth, persistenceType);
    } catch (persistenceError) {
      console.warn('Persistence fallback devreye girdi:', persistenceError);
      try {
        await setPersistence(auth, inMemoryPersistence);
      } catch (fallbackError) {
        console.warn('In-memory persistence da kurulamadı, giriş denenecek:', fallbackError);
      }
    }

    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase Auth başarılı');
    } catch (authError: any) {
      console.error('Auth Hatası:', authError.code);
      let msg = 'Giriş başarısız: ';
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-email') msg += 'Kullanıcı bulunamadı';
      else if (authError.code === 'auth/wrong-password') msg += 'Şifre hatalı';
      else if (authError.code === 'auth/invalid-credential') msg += 'E-posta veya şifre hatalı';
      else msg += authError.message;
      return { success: false, message: msg };
    }

    // Kullanıcı bilgilerini Firestore'dan al - uid ile direkt oku (güvenlik kurallarına uygun)
    const uid = userCredential.user.uid;
    const userDocRef = doc(db, COLLECTIONS.USERS, uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.isBanned) {
        await authSignOut(auth);
        return { success: false, message: 'Bu hesap banlanmış. Yönetici ile görüşün.' };
      }
      console.log('Giriş tamamlandı');
      return {
        success: true,
        user: {
          id: uid,
          username: userData.username || email.split('@')[0],
          email: userData.email || email,
        }
      };
    }

    // uid ile bulunamadıysa uid field ile dene (eski kayıtlar için)
    try {
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('uid', '==', uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        if (userData.isBanned) {
          await authSignOut(auth);
          return { success: false, message: 'Bu hesap banlanmış. Yönetici ile görüşün.' };
        }
        return {
          success: true,
          user: {
            id: snapshot.docs[0].id,
            username: userData.username || email.split('@')[0],
            email: userData.email || email,
          }
        };
      }
    } catch (_) { /* izin yoksa geç */ }

    console.warn('Firestore belgesi eksik, otomatik oluşturuluyor...');
    const newUsername = email.split('@')[0];
    const newUserDoc = {
      username: newUsername,
      email: email,
      uid,
      createdAt: Timestamp.now(),
    };
    await setDoc(doc(db, COLLECTIONS.USERS, uid), newUserDoc);

    return {
      success: true,
      user: {
        id: uid,
        username: newUsername,
        email: email,
      }
    };
  } catch (error: any) {
    console.error('Genel Login Hatası:', error);
    return { success: false, message: error.message || 'Beklenmedik bir hata oluştu' };
  }
};

export const firebaseRegister = async (email: string, password: string, fullName: string = '', phone: string = '', role: string = 'Muhasebeci') => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // E-posta adresinden kullanıcı adını oluştur (rn: mehmet@gmail.com -> mehmet)
    const username = email.split('@')[0];

    // Auth'da oluşturuldu, şimdi users koleksiyonuna ekle
    await addDoc(collection(db, COLLECTIONS.USERS), {
      username,
      fullName,
      phone,
      email,
      uid: userId,
      createdAt: Timestamp.now()
    });

    return { success: true, user: { id: userId, username, fullName, email } };
  } catch (error: any) {
    console.error('Kayıt Hatası:', error);
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, message: 'Bu e-posta adresi zaten alınmış.' };
    }
    if (error.code === 'auth/invalid-email') {
      return { success: false, message: 'Geçersiz e-posta adresi.' };
    }
    if (error.code === 'auth/weak-password') {
      return { success: false, message: 'Şifre çok zayıf (En az 6 karakter olmalı).' };
    }
    return { success: false, message: error.message || 'Kayıt olurken bir hata oluştu.' };
  }
};

export const firebaseResetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.' };
  } catch (error: any) {
    console.error('Şifre Sıfırlama Hatası:', error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
      return { success: false, message: 'Bu e-posta adresine ait bir hesap bulunamadı.' };
    }
    return { success: false, message: 'Şifre sıfırlama e-postası gönderilemedi.' };
  }
};

export const firebaseSignOut = async () => {
  await authSignOut(auth);
};

// Geerli kullanıcı ID'sini getir
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Oturum açık değil!');
  }
  return user.uid;
};

// Cari İşlemleri
export const getCaris = async () => {
  const uid = getCurrentUserId();
  const q = query(collection(db, COLLECTIONS.CARIS), where('userId', '==', uid));
  const snapshot = await getDocs(q);
  const caris = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      // Balance'1 garanti et - undefined/null ise 0 yap
      balance: data.balance !== undefined && data.balance !== null ? Number(data.balance) : 0
    };
  });
  console.log('Caris fetched from Firebase:', caris.length, 'items');
  return caris;
};

export const addCari = async (data: any) => {
  const uid = getCurrentUserId();
  const docRef = await addDoc(collection(db, COLLECTIONS.CARIS), {
    ...data,
    userId: uid,
    balance: 0,
    createdAt: Timestamp.now()
  });
  return { id: docRef.id };
};

export const updateCari = async (id: string, data: any) => {
  await updateDoc(doc(db, COLLECTIONS.CARIS, id), {
    ...data,
    updatedAt: Timestamp.now()
  });
  return { success: true };
};

export const deleteCari = async (id: string) => {
  await deleteDoc(doc(db, COLLECTIONS.CARIS, id));
  return { success: true };
};

// Stok İşlemleri
export const getStocks = async () => {
  const uid = getCurrentUserId();
  const q = query(collection(db, COLLECTIONS.STOCKS), where('userId', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addStock = async (data: any) => {
  const uid = getCurrentUserId();
  const docRef = await addDoc(collection(db, COLLECTIONS.STOCKS), {
    ...data,
    userId: uid,
    quantity: data.quantity || 0,
    createdAt: Timestamp.now()
  });
  return { id: docRef.id };
};

export const updateStock = async (id: string, data: any) => {
  await updateDoc(doc(db, COLLECTIONS.STOCKS, id), {
    ...data,
    updatedAt: Timestamp.now()
  });
  return { success: true };
};

export const deleteStock = async (id: string) => {
  await deleteDoc(doc(db, COLLECTIONS.STOCKS, id));
  return { success: true };
};

// Kasa İşlemleri
export const getKasa = async () => {
  const uid = getCurrentUserId();
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.KASA), where('userId', '==', uid))
  );
  const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Client-side sort
  transactions.sort((a: any, b: any) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateB.localeCompare(dateA);
  });

  const balance = transactions.reduce((acc: number, t: any) => {
    return acc + (t.type === 'Giriş' ? t.amount : -t.amount);
  }, 0);

  return { transactions, balance };
};

export const addKasaTransaction = async (data: any) => {
  const uid = getCurrentUserId();
  const docRef = await addDoc(collection(db, COLLECTIONS.KASA), {
    ...data,
    userId: uid,
    createdAt: Timestamp.now()
  });
  return { id: docRef.id };
};

// Fatura İşlemleri
export const getInvoices = async () => {
  const uid = getCurrentUserId();
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.INVOICES), where('userId', '==', uid))
  );
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Client-side sort
  items.sort((a: any, b: any) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateB.localeCompare(dateA);
  });

  return items;
};

export const addInvoice = async (data: any) => {
  return await runTransaction(db, async (transaction) => {
    // 1. önce gerekli tüm okuma (READ) işlemlerini yapmalıy1z
    const stockData = [];
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        const stockRef = doc(db, COLLECTIONS.STOCKS, String(item.stok_id));
        const stockSnap = await transaction.get(stockRef);
        stockData.push({ ref: stockRef, snap: stockSnap, item });
      }
    }

    // 2. Tm okumalar bittikten sonra yazma (WRITE) işlemlerine geçebiliriz
    const uid = getCurrentUserId();
    const invoiceRef = doc(collection(db, COLLECTIONS.INVOICES));
    transaction.set(invoiceRef, {
      ...data,
      userId: uid,
      createdAt: Timestamp.now()
    });

    // Stok güncelleme işlemleri
    for (const update of stockData) {
      if (update.snap.exists()) {
        const stockDoc = update.snap.data();
        const conversionFactor = stockDoc.conversion_factor || 1;
        const realQty = update.item.unit_type === 'alt' ? update.item.qty * conversionFactor : update.item.qty;
        const stockChange = data.type === 'Alış' ? realQty : -realQty;

        transaction.update(update.ref, {
          quantity: increment(stockChange),
          updatedAt: Timestamp.now()
        });
      }
    }

    // Cari bakiye güncelleme
    if (data.cari_id) {
      const cariRef = doc(db, COLLECTIONS.CARIS, String(data.cari_id));
      const balanceChange = data.type === 'Satış' ? data.total_amount : -data.total_amount;

      transaction.update(cariRef, {
        balance: increment(balanceChange),
        updatedAt: Timestamp.now()
      });
    }

    return { id: invoiceRef.id };
  });
};

export const deleteInvoice = async (id: string) => {
  return await runTransaction(db, async (transaction) => {
    const invoiceRef = doc(db, COLLECTIONS.INVOICES, id);
    const invoiceSnap = await transaction.get(invoiceRef);

    if (!invoiceSnap.exists()) {
      throw new Error('Fatura bulunamadı');
    }

    const data = invoiceSnap.data();
    const stockUpdates: { ref: any, change: number }[] = [];

    // 1. READS: Collect all needed snapshots
    // Stokları oku
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        const stockRef = doc(db, COLLECTIONS.STOCKS, String(item.stok_id));
        const stockSnap = await transaction.get(stockRef);
        if (stockSnap.exists()) {
          const stockDoc = stockSnap.data();
          const factor = stockDoc.conversion_factor || 1;
          const realQty = item.unit_type === 'alt' ? item.qty * factor : item.qty;
          const stockChange = data.type === 'Alış' ? -realQty : realQty;
          stockUpdates.push({ ref: stockRef, change: stockChange });
        }
      }
    }

    // Cariyi oku
    let cariRef = null;
    let balanceChange = 0;
    if (data.cari_id) {
      cariRef = doc(db, COLLECTIONS.CARIS, String(data.cari_id));
      await transaction.get(cariRef); // Just to satisfy read-before-write if we need to check existeönce, though not strictly necessary if we just increment
      balanceChange = data.type === 'Satış' ? -data.total_amount : data.total_amount;
    }

    // 2. WRITES: Perform all modifications
    for (const update of stockUpdates) {
      transaction.update(update.ref, {
        quantity: increment(update.change),
        updatedAt: Timestamp.now()
      });
    }

    if (cariRef) {
      transaction.update(cariRef, {
        balance: increment(balanceChange),
        updatedAt: Timestamp.now()
      });
    }

    transaction.delete(invoiceRef);
    return { success: true };
  });
};

export const updateInvoice = async (id: string, newData: any) => {
  return await runTransaction(db, async (transaction) => {
    const invoiceRef = doc(db, COLLECTIONS.INVOICES, id);
    const invoiceSnap = await transaction.get(invoiceRef);

    if (!invoiceSnap.exists()) {
      throw new Error('Güncellenecek fatura bulunamadı');
    }

    const oldData = invoiceSnap.data();

    // Stok referanslarını topla (hem eski hem yeni)
    const stockRefs: { [id: string]: any } = {};
    if (oldData.items) {
      oldData.items.forEach((item: any) => {
        stockRefs[String(item.stok_id)] = doc(db, COLLECTIONS.STOCKS, String(item.stok_id));
      });
    }
    if (newData.items) {
      newData.items.forEach((item: any) => {
        stockRefs[String(item.stok_id)] = doc(db, COLLECTIONS.STOCKS, String(item.stok_id));
      });
    }

    // 1. READS: Tm stokları ve cariyi oku
    const stockSnaps: { [id: string]: any } = {};
    for (const [sId, ref] of Object.entries(stockRefs)) {
      stockSnaps[sId] = await transaction.get(ref);
    }

    let cariRef = null;
    if (oldData.cari_id) cariRef = doc(db, COLLECTIONS.CARIS, String(oldData.cari_id));
    if (newData.cari_id) cariRef = doc(db, COLLECTIONS.CARIS, String(newData.cari_id));
    if (cariRef) await transaction.get(cariRef);

    // 2. WRITES: Etkileri hesapla ve uygula
    // Eski stok etkilerini geri al
    if (oldData.items) {
      for (const item of oldData.items) {
        const snap = stockSnaps[String(item.stok_id)];
        if (snap && snap.exists()) {
          const factor = snap.data().conversion_factor || 1;
          const realQty = item.unit_type === 'alt' ? item.qty * factor : item.qty;
          const change = oldData.type === 'Alış' ? -realQty : realQty;
          transaction.update(snap.ref, { quantity: increment(change) });
        }
      }
    }

    // Yeni stok etkilerini uygula
    if (newData.items) {
      for (const item of newData.items) {
        const snap = stockSnaps[String(item.stok_id)];
        if (snap && snap.exists()) {
          const factor = snap.data().conversion_factor || 1;
          const realQty = item.unit_type === 'alt' ? item.qty * factor : item.qty;
          const change = newData.type === 'Alış' ? realQty : -realQty;
          transaction.update(snap.ref, { quantity: increment(change) });
        }
      }
    }

    // Cari bakiye göncelle
    if (oldData.cari_id) {
      const oldCariRef = doc(db, COLLECTIONS.CARIS, String(oldData.cari_id));
      const oldBalanceBack = oldData.type === 'Satış' ? -oldData.total_amount : oldData.total_amount;
      transaction.update(oldCariRef, { balance: increment(oldBalanceBack) });
    }
    if (newData.cari_id) {
      const newCariRef = doc(db, COLLECTIONS.CARIS, String(newData.cari_id));
      const newBalanceApply = newData.type === 'Satış' ? newData.total_amount : -newData.total_amount;
      transaction.update(newCariRef, { balance: increment(newBalanceApply) });
    }

    // Faturayı göncelle
    transaction.update(invoiceRef, {
      ...newData,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  });
};

// Transaction İşlemleri
export const getTransactions = async () => {
  try {
    const uid = getCurrentUserId();
    console.log('Fetching transactions from Firebase...');
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.TRANSACTIONS), where('userId', '==', uid)));
    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Transactions fetched:', transactions.length);

    // Tarih sıralamasını client-side yap
    transactions.sort((a: any, b: any) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });

    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

export const addTransaction = async (data: any) => {
  console.log('FirebaseAPI.addTransaction called with:', data);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const uid = getCurrentUserId();
      const transRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));

      transaction.set(transRef, {
        ...data,
        userId: uid,
        createdAt: Timestamp.now()
      });

      // Cari bakiye guöncelleme
      if (data.cari_id) {
        const cariRef = doc(db, COLLECTIONS.CARIS, String(data.cari_id));
        // TAHSİLAT (Alacak) bakiyeyi azaltır (-), ÖDEME (Borç) bakiyeyi artırır (+)
        const balanceChange = isAlacak(data.type) ? -data.amount : data.amount;

        transaction.update(cariRef, {
          balance: increment(balanceChange),
          updatedAt: Timestamp.now()
        });
      }

      // Kasa kaydi
      const kasaRef = doc(collection(db, COLLECTIONS.KASA));
      const kasaType = isAlacak(data.type) ? 'Giriş' : 'Çıkış';

      transaction.set(kasaRef, {
        type: kasaType,
        amount: data.amount,
        date: data.date,
        description: `Cari İşlem: ${data.description || 'Açıklama yok'}`,
        userId: uid,
        createdAt: Timestamp.now()
      });

      return { id: transRef.id };
    });

    return result;
  } catch (error) {
    console.error('Firebase transaction failed:', error);
    throw error;
  }
};

export const deleteTransaction = async (id: string) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const transRef = doc(db, COLLECTIONS.TRANSACTIONS, id);
      const transSnap = await transaction.get(transRef);

      if (!transSnap.exists()) {
        throw new Error('Hareket bulunamadı');
      }

      const data = transSnap.data();

      // 1. Cari bakiye etkisini geri al
      if (data.cari_id) {
        const cariRef = doc(db, COLLECTIONS.CARIS, String(data.cari_id));
        // Alacak girilmişti (-), silerken artırıyoruz (+).
        // Borç girilmişti (+), silerken azaltıyoruz (-).
        const balanceCorrection = isAlacak(data.type) ? data.amount : -data.amount;
        transaction.update(cariRef, {
          balance: increment(balanceCorrection),
          updatedAt: Timestamp.now()
        });
      }

      // 2. Kasa kaydini bul ve sil
      const kasaQuery = query(
        collection(db, COLLECTIONS.KASA),
        where('date', '==', data.date),
        where('amount', '==', data.amount)
      );
      const kasaSnapshot = await getDocs(kasaQuery);
      const targetKasaDoc = kasaSnapshot.docs.find(d => {
        const desc = d.data().description || '';
        return desc.includes(data.description) || desc.includes('Cari İşlem');
      });

      if (targetKasaDoc) {
        transaction.delete(targetKasaDoc.ref);
      }

      // 3. Hareketi sil
      transaction.delete(transRef);
      return { success: true };
    });
  } catch (error) {
    console.error('deleteTransaction failed:', error);
    throw error;
  }
};

export const updateTransaction = async (id: string, newData: any) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const transRef = doc(db, COLLECTIONS.TRANSACTIONS, id);
      const transSnap = await transaction.get(transRef);

      if (!transSnap.exists()) {
        throw new Error('Güncellenecek hareket bulunamadı');
      }

      const oldData = transSnap.data();

      // 1. Eski cari bakiye etkisini geri al
      if (oldData.cari_id) {
        const oldCariRef = doc(db, COLLECTIONS.CARIS, String(oldData.cari_id));
        // Alacak girilmişti (-), geri alırken + yapıyoruz. Borç + girilmişti, - yapıyoruz.
        const oldCorrection = isAlacak(oldData.type) ? oldData.amount : -oldData.amount;
        transaction.update(oldCariRef, { balance: increment(oldCorrection) });
      }

      // 2. Yeni cari bakiye etkisini uygula
      if (newData.cari_id) {
        const newCariRef = doc(db, COLLECTIONS.CARIS, String(newData.cari_id));
        const newApply = isAlacak(newData.type) ? -newData.amount : newData.amount;
        transaction.update(newCariRef, { balance: increment(newApply) });
      }

      // 3. Kasa kaydını göncelle
      const kasaQuery = query(
        collection(db, COLLECTIONS.KASA),
        where('date', '==', oldData.date),
        where('amount', '==', oldData.amount)
      );
      const kasaSnapshot = await getDocs(kasaQuery);
      const targetKasaDoc = kasaSnapshot.docs.find(d => d.data().description.includes(oldData.description) || d.data().description.includes('Cari İşlem'));

      if (targetKasaDoc) {
        const kasaType = isAlacak(newData.type) ? 'Giriş' : 'Çıkış';
        transaction.update(targetKasaDoc.ref, {
          type: kasaType,
          amount: newData.amount,
          date: newData.date,
          description: `Cari İşlem: ${newData.description || 'Açıklama yok'}`,
          updatedAt: Timestamp.now()
        });
      }

      // 4. Hareketi göncelle
      transaction.update(transRef, {
        ...newData,
        updatedAt: Timestamp.now()
      });

      return { success: true };
    });
  } catch (error) {
    console.error('updateTransaction failed:', error);
    throw error;
  }
};

export const recalculateCariBalance = async (cariId: string) => {
  try {
    const uid = getCurrentUserId();
    const cariRef = doc(db, COLLECTIONS.CARIS, cariId);

    // 1. READ invoices and transactions for this user (robust against ID type mismatch)
    const [invoicesSnap, transactionsSnap] = await Promise.all([
      getDocs(query(collection(db, COLLECTIONS.INVOICES), where('userId', '==', uid))),
      getDocs(query(collection(db, COLLECTIONS.TRANSACTIONS), where('userId', '==', uid)))
    ]);

    const invoices = invoicesSnap.docs
      .map(d => ({ id: d.id, ...d.data() as any }))
      .filter(inv => String(inv.cari_id) === String(cariId));
      
    const transactions = transactionsSnap.docs
      .map(d => ({ id: d.id, ...d.data() as any }))
      .filter(t => String(t.cari_id) === String(cariId));

    // 2. CALC total balance (Philosophy: SATIŞ +, ALIŞ -, ÖDEME/Borç +, TAHSİLAT/Alacak -)
    let total = 0;
    
    invoices.forEach(inv => {
      const amount = Number(inv.total_amount || 0);
      if (inv.type === 'Satış') total += amount;
      else if (inv.type === 'Alış') total -= amount;
    });

    transactions.forEach(t => {
      if (t.isInvoice) return; // Fatura hareketlerini faturalar kısmında saydık zaten
      const amount = Number(t.amount || 0);
      if (t.type === 'Alacak') total -= amount; // Tahsilat
      else if (t.type === 'Borç') total += amount; // Ödeme
    });

    // 3. UPDATE cari doc
    await updateDoc(cariRef, {
      balance: total,
      updatedAt: Timestamp.now()
    });

    return total;
  } catch (error) {
    console.error('Recalculate failed:', error);
    throw error;
  }
};

// Settings İşlemleri (Tm ayarlar artık tek bir dokümanda: settings/uid)
export const getSettings = async () => {
  const uid = getCurrentUserId();
  const docRef = doc(db, COLLECTIONS.SETTINGS, uid);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    return snap.data();
  }
  return {};
};

export const updateSettings = async (settings: any) => {
  const uid = getCurrentUserId();
  const docRef = doc(db, COLLECTIONS.SETTINGS, uid);

  await setDoc(docRef, {
    ...settings,
    userId: uid,
    updatedAt: Timestamp.now()
  }, { merge: true });

  return { success: true };
};

// Kullanıcıları getir (Gvenlik filtreli)
export const getUsers = async () => {
  const uid = getCurrentUserId();
  const usersRef = collection(db, COLLECTIONS.USERS);

  const qMe = query(usersRef, where('uid', '==', uid));
  const meSnap = await getDocs(qMe);

  if (meSnap.empty) return [];
  const me = meSnap.docs[0].data();

  const isSuperAdmin = me.email === 'selahattin50@gmail.com';

  if (isSuperAdmin) {
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      username: doc.data().username,
      email: doc.data().email,
      role: doc.data().role,
      isBanned: !!doc.data().isBanned
    }));
  }

  return [{
    id: meSnap.docs[0].id,
    username: me.username,
    email: me.email,
    role: me.role,
    isBanned: !!me.isBanned
  }];
};
// Kullanıcıları tüm detaylarıyla getir (Migration için)
export const getFullUsers = async () => {
  const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const migrateUserData = async (fromEmail: string, toEmail: string) => {
  try {
    console.log(`Migration started: ${fromEmail} -> ${toEmail}`);

    // 1. Find target user
    const usersRef = collection(db, COLLECTIONS.USERS);
    const usersSnapshot = await getDocs(usersRef);
    const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    const toUser = allUsers.find(u => u.email === toEmail);
    if (!toUser) throw new Error(`Target user not found: ${toEmail}`);
    const newUid = toUser.uid || toUser.id;

    // 2. Identify source
    const isOrphanedMigration = fromEmail.toLowerCase() === 'bilinmiyor';
    let oldUid = '';

    if (!isOrphanedMigration) {
      const fromUser = allUsers.find(u => u.email === fromEmail || u.username === fromEmail);
      if (!fromUser) throw new Error(`Source user not found: ${fromEmail}`);
      oldUid = fromUser.uid || fromUser.id;
    }

    const collectionsToMigrate = [
      COLLECTIONS.CARIS,
      COLLECTIONS.STOCKS,
      COLLECTIONS.INVOICES,
      COLLECTIONS.KASA,
      COLLECTIONS.TRANSACTIONS
    ];

    let totalMigrated = 0;

    for (const collName of collectionsToMigrate) {
      const collRef = collection(db, collName);
      let q;

      if (isOrphanedMigration) {
        // Find orphaned documents (userId is missing, null, or empty string)
        const snap = await getDocs(collRef);
        const orphanedDocs = snap.docs.filter(d => !d.data().userId || d.data().userId === "");

        for (const orphanDoc of orphanedDocs) {
          await updateDoc(doc(db, collName, orphanDoc.id), {
            userId: newUid,
            migratedFrom: "Orphaned",
            migratedAt: Timestamp.now()
          });
          totalMigrated++;
        }
      } else {
        q = query(collRef, where('userId', '==', oldUid));
        const snapshot = await getDocs(q);
        for (const snapshotDoc of snapshot.docs) {
          await updateDoc(doc(db, collName, snapshotDoc.id), {
            userId: newUid,
            migratedFrom: oldUid,
            migratedAt: Timestamp.now()
          });
          totalMigrated++;
        }
      }
    }

    return { success: true, totalMigrated };
  } catch (error: any) {
    console.error("Migration failed:", error);
    return { success: false, message: error.message };
  }
};

// Sistem genelindeki tüm verileri kontrol et (Hangi kullanıc1da ne kadar veri var?)
export const scanAllFirestoreData = async () => {
  const collectionsList = [COLLECTIONS.CARIS, COLLECTIONS.STOCKS, COLLECTIONS.INVOICES, COLLECTIONS.KASA, COLLECTIONS.TRANSACTIONS];
  const results: any = {};

  for (const collName of collectionsList) {
    const snap = await getDocs(collection(db, collName));
    results[collName] = {
      total: snap.size,
      users: {} as any
    };

    snap.docs.forEach(d => {
      const uId = d.data().userId || 'Bilinmiyor';
      results[collName].users[uId] = (results[collName].users[uId] || 0) + 1;
    });
  }

  return results;
};

// Kullanıcı hesabını (Firestore kaydın1) sil
export const deleteUserAccount = async (userId: string) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
    return { success: true };
  } catch (error: any) {
    console.error("User deletion failed:", error);
    return { success: false, message: error.message };
  }
};

export const toggleUserBanStatus = async (userId: string, isBanned: boolean) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      isBanned,
      bannedAt: isBanned ? Timestamp.now() : null
    });
    return { success: true };
  } catch (error: any) {
    console.error("User ban update failed:", error);
    return { success: false, message: error.message };
  }
};

// Yerel (Offline) verileri Firebase'e toplu yükle
export const batchUploadLocalData = async (type: string, data: any[]) => {
  const uid = getCurrentUserId();
  let count = 0;

  const collName =
    type === 'caris' ? COLLECTIONS.CARIS :
      type === 'stocks' ? COLLECTIONS.STOCKS :
        type === 'invoices' ? COLLECTIONS.INVOICES :
          type === 'transactions' ? COLLECTIONS.TRANSACTIONS :
            type === 'kasa' ? COLLECTIONS.KASA : null;

  if (!collName) return 0;

  for (const item of data) {
    // ID alanını çıkar (Firebase yeni ID verecek)
    const { id, ...cleanData } = item;
    await addDoc(collection(db, collName), {
      ...cleanData,
      userId: uid,
      migratedFromLocal: true,
      createdAt: Timestamp.now()
    });
    count++;
  }
  return count;
};

export const recalculateAllCariBalances = async () => {
  const uid = getCurrentUserId();
  const carisRef = collection(db, COLLECTIONS.CARIS);
  const transRef = collection(db, COLLECTIONS.TRANSACTIONS);
  const invsRef = collection(db, COLLECTIONS.INVOICES);

  const [carisSnap, transSnap, invsSnap] = await Promise.all([
    getDocs(query(carisRef, where('userId', '==', uid))),
    getDocs(query(transRef, where('userId', '==', uid))),
    getDocs(query(invsRef, where('userId', '==', uid)))
  ]);

  const transactions = transSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  const invoices = invsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

  for (const cariDoc of carisSnap.docs) {
    const cariId = cariDoc.id;
    let balance = 0;

    // Fatura etkileri
    const cariInvoices = invoices.filter(inv => String(inv.cari_id) === String(cariId));
    for (const inv of cariInvoices) {
      const amount = Number(inv.total_amount) || 0;
      balance += (inv.type === 'Satış' ? amount : -amount);
    }

    // Hareket etkileri (Düzeltilmiş mantık: Ödeme/Borç +, Tahsilat/Alacak -)
    const cariTrans = transactions.filter(t => String(t.cari_id) === String(cariId));
    for (const t of cariTrans) {
      const amount = Number(t.amount) || 0;
      balance += (t.type === 'Alacak' ? -amount : amount);
    }

    await updateDoc(doc(db, COLLECTIONS.CARIS, cariId), {
      balance,
      updatedAt: Timestamp.now()
    });
  }

  return { success: true };
};

export const updateUserRole = async (userId: string, role: string) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), { role });
    return { success: true, role };
  } catch (error) {
    console.error('updateUserRole error:', error);
    throw error;
  }
};
