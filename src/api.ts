// API wrapper - Firebase kullanımı
import * as FirebaseAPI from './firebaseApi';

// Firebase kullanımı aktif
const USE_FIREBASE = true;

// LocalStorage Helper Functions
const getFromLocalStorage = (key: string, defaultValue: any = []) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`LocalStorage save error for ${key}:`, error);
  }
};

const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

const normalizeStockCode = (value: any) => String(value || '').trim().toUpperCase();

const normalizeStockPayload = (data: any) => ({
  ...data,
  code: normalizeStockCode(data?.code),
  name: typeof data?.name === 'string' ? data.name.trim() : data?.name,
  base_unit: typeof data?.base_unit === 'string' ? data.base_unit.trim() : data?.base_unit,
  alt_unit: typeof data?.alt_unit === 'string' ? (data.alt_unit.trim() || null) : data?.alt_unit,
});

const findDuplicateStockByCode = (stocks: any[], code: string, excludeId?: string) =>
  stocks.find((stock: any) =>
    normalizeStockCode(stock?.code) === code &&
    String(stock?.id ?? '') !== String(excludeId ?? '')
  );

// Capacitor platformunu kontrol et
// Login
export const login = async (email: string, password: string, rememberMe: boolean = true) => {
  if (USE_FIREBASE) {
    try {
      const result = await FirebaseAPI.firebaseLogin(email, password, rememberMe);
      return result;
    } catch (error) {
      console.error('Firebase login error:', error);
      throw error;
    }
  }
  // LocalStorage fallback
  const users = getFromLocalStorage('users', []);


  const input = email.trim().toLowerCase();
  const user = users.find((u: any) => {
    const emailMatch = String(u.email || '').toLowerCase() === input;
    return emailMatch && u.password === password;
  });
  if (user?.isBanned) {
    return { success: false, message: 'Bu hesap banlanmış. Yönetici ile görüşün.' };
  }
  if (user) {
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username || user.email.split('@')[0],
        email: user.email,
        role: user.role
      }
    };
  }

  return { success: false, message: 'E-posta veya şifre hatalı' };
};

// Register
export const register = async (email: string, password: string, fullName: string = '', phone: string = '') => {
  if (USE_FIREBASE) {
    try {
      const result = await FirebaseAPI.firebaseRegister(email, password, fullName, phone);
      return result;
    } catch (error) {
      console.error('Firebase register error:', error);
      throw error;
    }
  }

  // LocalStorage fallback (if not Firebase)
  const users = getFromLocalStorage('users', []);
  if (users.find((u: any) => u.email === email)) {
    return { success: false, message: 'Bu e-posta zaten kullanımda' };
  }

  const role = email.trim().toLowerCase() === 'selahattin50@gmail.com' ? 'Yönetici' : 'Muhasebeci';
  const newUser = { id: generateId(), email, password, fullName, phone, role, isBanned: false };
  users.push(newUser);
  saveToLocalStorage('users', users);

  return { success: true, user: { id: newUser.id, username: email.split('@')[0], email, fullName, role: newUser.role } };
}

// Reset Password
export const resetPassword = async (email: string) => {
  if (USE_FIREBASE) {
    return await FirebaseAPI.firebaseResetPassword(email);
  }
  return { success: false, message: 'Şifre sıfırlama sadece ağ bağlantısı olduğunda kullanılabilir.' };
};

// Caris
export const fetchCaris = async () => {
  if (USE_FIREBASE) {
    try {
      const data = await FirebaseAPI.getCaris();
      saveToLocalStorage('caris', data); // Backup
      return data;
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }
  return getFromLocalStorage('caris', []);
};

export const createCari = async (data: any) => {
  if (USE_FIREBASE) {
    try {
      const result = await FirebaseAPI.addCari(data);
      const caris = getFromLocalStorage('caris', []);
      caris.push({ id: result.id, ...data, balance: 0 });
      saveToLocalStorage('caris', caris);
      return result;
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }

  const caris = getFromLocalStorage('caris', []);
  const newCari = {
    id: generateId(),
    ...data,
    balance: 0,
    createdAt: new Date().toISOString()
  };
  caris.push(newCari);
  saveToLocalStorage('caris', caris);
  return { id: newCari.id };
};

export const updateCariById = async (id: string, data: any) => {
  if (USE_FIREBASE) {
    try {
      await FirebaseAPI.updateCari(id, data);
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }

  const caris = getFromLocalStorage('caris', []);
  const index = caris.findIndex((c: any) => c.id === id);
  if (index !== -1) {
    caris[index] = { ...caris[index], ...data, updatedAt: new Date().toISOString() };
    saveToLocalStorage('caris', caris);
  }
  return { success: true };
};

export const deleteCariById = async (id: string) => {
  if (USE_FIREBASE) {
    try {
      await FirebaseAPI.deleteCari(id);
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }

  const caris = getFromLocalStorage('caris', []);
  const filtered = caris.filter((c: any) => c.id !== id);
  saveToLocalStorage('caris', filtered);
  return { success: true };
};

// Stocks
export const fetchStocks = async () => {
  if (USE_FIREBASE) {
    try {
      const data = await FirebaseAPI.getStocks();
      saveToLocalStorage('stocks', data);
      return data;
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }
  return getFromLocalStorage('stocks', []);
};

export const createStock = async (data: any) => {
  const normalizedData = normalizeStockPayload(data);
  const duplicate = findDuplicateStockByCode(getFromLocalStorage('stocks', []), normalizedData.code);

  if (duplicate) {
    throw new Error(`Bu stok kodu zaten kullanılıyor: ${duplicate.code} - ${duplicate.name}`);
  }

  if (USE_FIREBASE) {
    try {
      const result = await FirebaseAPI.addStock(normalizedData);
      const stocks = getFromLocalStorage('stocks', []);
      stocks.push({ id: result.id, ...normalizedData, quantity: normalizedData.quantity || 0 });
      saveToLocalStorage('stocks', stocks);
      return result;
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }

  const stocks = getFromLocalStorage('stocks', []);
  const newStock = {
    id: generateId(),
    ...normalizedData,
    quantity: normalizedData.quantity || 0,
    createdAt: new Date().toISOString()
  };
  stocks.push(newStock);
  saveToLocalStorage('stocks', stocks);
  return { id: newStock.id };
};

export const updateStockById = async (id: string, data: any) => {
  const normalizedData = normalizeStockPayload(data);
  const duplicate = findDuplicateStockByCode(getFromLocalStorage('stocks', []), normalizedData.code, id);

  if (duplicate) {
    throw new Error(`Bu stok kodu zaten kullanılıyor: ${duplicate.code} - ${duplicate.name}`);
  }

  if (USE_FIREBASE) {
    try {
      await FirebaseAPI.updateStock(id, normalizedData);
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }

  const stocks = getFromLocalStorage('stocks', []);
  const index = stocks.findIndex((s: any) => s.id === id);
  if (index !== -1) {
    stocks[index] = { ...stocks[index], ...normalizedData, updatedAt: new Date().toISOString() };
    saveToLocalStorage('stocks', stocks);
  }
  return { success: true };
};

export const deleteStockById = async (id: string) => {
  if (USE_FIREBASE) {
    try {
      await FirebaseAPI.deleteStock(id);
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }

  const stocks = getFromLocalStorage('stocks', []);
  const filtered = stocks.filter((s: any) => s.id !== id);
  saveToLocalStorage('stocks', filtered);
  return { success: true };
};

// Kasa
export const fetchKasa = async () => {
  if (USE_FIREBASE) {
    try {
      const data = await FirebaseAPI.getKasa();
      saveToLocalStorage('kasa', data);
      return data;
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }
  return getFromLocalStorage('kasa', { transactions: [], balance: 0 });
};

// Invoices
export const fetchInvoices = async () => {
  if (USE_FIREBASE) {
    try {
      const data = await FirebaseAPI.getInvoices();
      saveToLocalStorage('invoices', data);
      return data;
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }
  return getFromLocalStorage('invoices', []);
};

export const createInvoice = async (data: any) => {
  if (USE_FIREBASE) {
    try {
      const result = await FirebaseAPI.addInvoice(data);
      const invoices = getFromLocalStorage('invoices', []);
      invoices.push({ id: result.id, ...data });
      saveToLocalStorage('invoices', invoices);
      return result;
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }

  const invoices = getFromLocalStorage('invoices', []);
  const newInvoice = {
    id: generateId(),
    ...data,
    createdAt: new Date().toISOString()
  };
  invoices.push(newInvoice);
  saveToLocalStorage('invoices', invoices);
  return { id: newInvoice.id };
};

export const updateInvoice = async (id: string, data: any) => {
  if (USE_FIREBASE) {
    try {
      await FirebaseAPI.updateInvoice(String(id), data);
      const invoices = getFromLocalStorage('invoices', []);
      const index = invoices.findIndex((inv: any) => String(inv.id) === String(id));
      if (index !== -1) {
        invoices[index] = { ...invoices[index], ...data };
        saveToLocalStorage('invoices', invoices);
      }
      return { success: true };
    } catch (error) {
      console.error('Firebase update error:', error);
      throw error;
    }
  }
  const invoices = getFromLocalStorage('invoices', []);
  const index = invoices.findIndex((inv: any) => String(inv.id) === String(id));
  if (index !== -1) {
    invoices[index] = { ...invoices[index], ...data };
    saveToLocalStorage('invoices', invoices);
  }
  return { success: true };
};

export const deleteInvoice = async (id: string) => {
  if (USE_FIREBASE) {
    try {
      await FirebaseAPI.deleteInvoice(String(id));
      const invoices = getFromLocalStorage('invoices', []);
      const filtered = invoices.filter((inv: any) => String(inv.id) !== String(id));
      saveToLocalStorage('invoices', filtered);
      return { success: true };
    } catch (error) {
      console.error('Firebase delete error:', error);
      throw error;
    }
  }
  const invoices = getFromLocalStorage('invoices', []);
  const filtered = invoices.filter((inv: any) => String(inv.id) !== String(id));
  saveToLocalStorage('invoices', filtered);
  return { success: true };
};

// Transactions
export const fetchTransactions = async () => {
  if (USE_FIREBASE) {
    try {
      const data = await FirebaseAPI.getTransactions();
      saveToLocalStorage('transactions', data);
      return data;
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }
  return getFromLocalStorage('transactions', []);
};

export const createTransaction = async (data: any) => {
  console.log('API.createTransaction called with:', data);

  if (USE_FIREBASE) {
    try {
      console.log('Using Firebase for transaction');
      const result = await FirebaseAPI.addTransaction(data);
      console.log('Firebase result:', result);

      const transactions = getFromLocalStorage('transactions', []);
      transactions.push({ id: result.id, ...data });
      saveToLocalStorage('transactions', transactions);

      return result;
    } catch (error) {
      console.error('Firebase error in createTransaction:', error);
      alert('Firebase hatası: ' + (error instanceof Error ? error.message : JSON.stringify(error)));
      throw error;
    }
  }

  const transactions = getFromLocalStorage('transactions', []);
  const newTransaction = {
    id: generateId(),
    ...data,
    createdAt: new Date().toISOString()
  };
  transactions.push(newTransaction);
  saveToLocalStorage('transactions', transactions);
  return { id: newTransaction.id };
};

export const updateTransaction = async (id: string, data: any) => {
  if (USE_FIREBASE) {
    try {
      await FirebaseAPI.updateTransaction(id, data);
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }

  const transactions = getFromLocalStorage('transactions', []);
  const index = transactions.findIndex((t: any) => String(t.id) === String(id));
  if (index !== -1) {
    transactions[index] = { ...transactions[index], ...data, updatedAt: new Date().toISOString() };
    saveToLocalStorage('transactions', transactions);
  }
  return { success: true };
};

export const deleteTransaction = async (id: string) => {
  if (USE_FIREBASE) {
    try {
      await FirebaseAPI.deleteTransaction(id);
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }

  const transactions = getFromLocalStorage('transactions', []);
  const filtered = transactions.filter((t: any) => String(t.id) !== String(id));
  saveToLocalStorage('transactions', filtered);
  return { success: true };
};

// Settings
export const fetchSettings = async () => {
  if (USE_FIREBASE) {
    try {
      const data = await FirebaseAPI.getSettings();
      saveToLocalStorage('settings', data);
      return data;
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }
  return getFromLocalStorage('settings', {});
};

export const updateSettingsData = async (data: any) => {
  if (USE_FIREBASE) {
    try {
      await FirebaseAPI.updateSettings(data);
    } catch (error) {
      console.error('Firebase error:', error);
      throw error;
    }
  }
  saveToLocalStorage('settings', data);
  return { success: true };
};

// Users
export const fetchUsers = async () => {
  if (USE_FIREBASE) {
    try {
      const data = await FirebaseAPI.getUsers();
      saveToLocalStorage('users', data);
      return data;
    } catch (error) {
      console.error('Firebase error:', error);
      return getFromLocalStorage('users', []);
    }
  }
  return getFromLocalStorage('users', []);
};

export const migrateData = async (fromEmail: string, toEmail: string) => {
  return await FirebaseAPI.migrateUserData(fromEmail, toEmail);
};

export const scanAllData = async () => {
  return await FirebaseAPI.scanAllFirestoreData();
};

export const uploadLocalData = async (type: string, data: any[]) => {
  return await FirebaseAPI.batchUploadLocalData(type, data);
};

export const deleteUser = async (userId: string) => {
  return await FirebaseAPI.deleteUserAccount(userId);
};

export const toggleUserBan = async (userId: string, isBanned: boolean) => {
  if (USE_FIREBASE) {
    return await FirebaseAPI.toggleUserBanStatus(userId, isBanned);
  }

  const users = getFromLocalStorage('users', []);
  const nextUsers = users.map((user: any) =>
    String(user.id) === String(userId) ? { ...user, isBanned } : user
  );
  saveToLocalStorage('users', nextUsers);
  return { success: true };
};

export const updateUserRole = async (userId: string, role: string) => {
  if (USE_FIREBASE) {
    return await FirebaseAPI.updateUserRole(userId, role);
  }

  const users = getFromLocalStorage('users', []);
  const nextUsers = users.map((user: any) =>
    String(user.id) === String(userId) ? { ...user, role } : user
  );
  saveToLocalStorage('users', nextUsers);
  return { success: true, role };
};

export const recalculateCaris = async () => {
  if (USE_FIREBASE) {
    return await FirebaseAPI.recalculateAllCariBalances();
  }
  return { success: false, message: 'Bu özellik sadece bulut kullanımında aktiftir.' };
};

export const recalculateCariBalance = async (cariId: string) => {
  if (USE_FIREBASE) {
    return await FirebaseAPI.recalculateCariBalance(cariId);
  }
  return 0;
};
