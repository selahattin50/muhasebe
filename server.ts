import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("accounting.db");

// Initialize Database
try {
  // Ensure table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    )
  `);

  // Check columns
  const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
  const hasRole = tableInfo.some(col => col.name === 'role');
  if (!hasRole) {
    console.log("Adding role column to users table...");
    db.exec("ALTER TABLE users ADD COLUMN role TEXT");
  }

  // Force reset default users to ensure they work
  console.log("Resetting default users...");
  db.prepare("DELETE FROM users WHERE username IN ('admin', 'muhasebe', 'kasa', 'yönetici')").run();
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('admin', 'admin123', 'Yönetici');
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('yönetici', 'admin123', 'Yönetici');
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('muhasebe', 'muhasebe123', 'Muhasebeci');
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('kasa', 'kasa123', 'Kasiyer');

  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  console.log(`Database initialized. Total users: ${userCount.count}`);
  
  const allUsers = db.prepare("SELECT username, role FROM users").all();
  console.log("Current users in DB:", allUsers);

} catch (e) {
  console.error("Database initialization error (Users):", e);
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS caris (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      code TEXT UNIQUE,
      type TEXT, -- Alıcı, Satıcı, Her İkisi
      balance REAL DEFAULT 0,
      authorized_person TEXT,
      tax_office TEXT,
      tax_number TEXT,
      phone TEXT,
      fax TEXT
    );
  
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cari_id INTEGER,
      type TEXT, -- Tahsilat, Ödeme
      amount REAL,
      date TEXT,
      description TEXT,
      FOREIGN KEY(cari_id) REFERENCES caris(id)
    );
  
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      code TEXT UNIQUE,
      base_unit TEXT, -- e.g., Adet
      alt_unit TEXT,  -- e.g., Koli
      conversion_factor REAL DEFAULT 1, -- 1 Alt Unit = X Base Units
      quantity REAL DEFAULT 0, -- Always stored in base_unit
      purchase_price REAL, -- Price per base_unit
      sale_price REAL,     -- Price per base_unit
      purchase_discount REAL DEFAULT 0,
      sale_discount REAL DEFAULT 0,
      tax_rate REAL DEFAULT 20
    );
  
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cari_id INTEGER,
      type TEXT, -- Alış, Satış
      invoice_no TEXT UNIQUE,
      date TEXT,
      total_amount REAL,
      FOREIGN KEY(cari_id) REFERENCES caris(id)
    );
  
    CREATE TABLE IF NOT EXISTS kasa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT, -- Giriş, Çıkış
      amount REAL,
      date TEXT,
      description TEXT
    );
  
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  
    INSERT OR IGNORE INTO settings (key, value) VALUES ('default_purchase_discount', '0');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('default_sale_discount', '0');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('default_tax_rate', '20');
  `);
} catch (e) {
  console.error("Database initialization error (Tables):", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth API
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, username, role FROM users").all();
    res.json(users);
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log(`Giriş isteği geldi: ${username}`);
      
      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Kullanıcı adı ve şifre gereklidir" });
      }

      const user = db.prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND password = ?").get(username, password);
      
      if (user) {
        console.log(`Giriş başarılı: ${username} (${user.role})`);
        res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
      } else {
        console.log(`Giriş başarısız: ${username} - Hatalı şifre veya kullanıcı adı`);
        res.status(401).json({ success: false, message: "Geçersiz kullanıcı adı veya şifre" });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: "Sunucu hatası: " + error.message });
    }
  });

  // Cari API
  app.get("/api/caris", (req, res) => {
    const caris = db.prepare("SELECT * FROM caris").all();
    res.json(caris);
  });

  app.get("/api/transactions", (req, res) => {
    const transactions = db.prepare(`
      SELECT t.*, c.name as cari_name 
      FROM transactions t 
      LEFT JOIN caris c ON t.cari_id = c.id 
      ORDER BY t.date DESC
    `).all();
    res.json(transactions);
  });

  app.post("/api/caris", (req, res) => {
    const { name, code, type, authorized_person, tax_office, tax_number, phone, fax } = req.body;
    try {
      const result = db.prepare("INSERT INTO caris (name, code, type, authorized_person, tax_office, tax_number, phone, fax) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(name, code, type, authorized_person, tax_office, tax_number, phone, fax);
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Cari kodu zaten mevcut" });
    }
  });

  app.put("/api/caris/:id", (req, res) => {
    const { id } = req.params;
    const { name, code, type, authorized_person, tax_office, tax_number, phone, fax } = req.body;
    try {
      db.prepare(`
        UPDATE caris SET 
          name = ?, code = ?, type = ?, authorized_person = ?, 
          tax_office = ?, tax_number = ?, phone = ?, fax = ?
        WHERE id = ?
      `).run(name, code, type, authorized_person, tax_office, tax_number, phone, fax, id);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Güncelleme hatası" });
    }
  });

  app.post("/api/transactions", (req, res) => {
    const { cari_id, type, amount, date, description } = req.body;
    const transaction = db.transaction(() => {
      db.prepare("INSERT INTO transactions (cari_id, type, amount, date, description) VALUES (?, ?, ?, ?, ?)").run(cari_id, type, amount, date, description);
      const balanceChange = type === 'Tahsilat' ? -amount : amount; // Tahsilat cariyi borçlandırır/alacaklandırır mantığına göre değişebilir, burada basit tutuyoruz
      db.prepare("UPDATE caris SET balance = balance + ? WHERE id = ?").run(balanceChange, cari_id);
      
      // Kasa kaydı
      const kasaType = type === 'Tahsilat' ? 'Giriş' : 'Çıkış';
      db.prepare("INSERT INTO kasa (type, amount, date, description) VALUES (?, ?, ?, ?)").run(kasaType, amount, date, `Cari İşlem: ${description}`);
    });
    transaction();
    res.json({ success: true });
  });

  // Stok API
  app.get("/api/stocks", (req, res) => {
    const stocks = db.prepare("SELECT * FROM stocks").all();
    res.json(stocks);
  });

  app.post("/api/stocks", (req, res) => {
    const { 
      name, code, base_unit, alt_unit, conversion_factor, 
      purchase_price, sale_price, purchase_discount, sale_discount, tax_rate 
    } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO stocks (
          name, code, base_unit, alt_unit, conversion_factor, 
          purchase_price, sale_price, purchase_discount, sale_discount, tax_rate
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, code, base_unit, alt_unit || null, conversion_factor || 1, 
        purchase_price, sale_price, purchase_discount || 0, sale_discount || 0, tax_rate || 20
      );
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Stok kodu zaten mevcut" });
    }
  });

  app.put("/api/stocks/:id", (req, res) => {
    const { id } = req.params;
    const { 
      name, code, base_unit, alt_unit, conversion_factor, 
      purchase_price, sale_price, purchase_discount, sale_discount, tax_rate 
    } = req.body;
    try {
      db.prepare(`
        UPDATE stocks SET 
          name = ?, code = ?, base_unit = ?, alt_unit = ?, conversion_factor = ?, 
          purchase_price = ?, sale_price = ?, purchase_discount = ?, sale_discount = ?, tax_rate = ?
        WHERE id = ?
      `).run(
        name, code, base_unit, alt_unit || null, conversion_factor || 1, 
        purchase_price, sale_price, purchase_discount || 0, sale_discount || 0, tax_rate || 20,
        id
      );
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Güncelleme hatası" });
    }
  });

  // Kasa API
  app.get("/api/kasa", (req, res) => {
    const transactions = db.prepare("SELECT * FROM kasa ORDER BY date DESC").all();
    const balance = db.prepare("SELECT SUM(CASE WHEN type = 'Giriş' THEN amount ELSE -amount END) as total FROM kasa").get().total || 0;
    res.json({ transactions, balance });
  });

  app.post("/api/kasa", (req, res) => {
    const { type, amount, date, description } = req.body;
    db.prepare("INSERT INTO kasa (type, amount, date, description) VALUES (?, ?, ?, ?)").run(type, amount, date, description);
    res.json({ success: true });
  });

  // Fatura API
  app.get("/api/invoices", (req, res) => {
    const invoices = db.prepare(`
      SELECT i.*, c.name as cari_name 
      FROM invoices i 
      JOIN caris c ON i.cari_id = c.id 
      ORDER BY i.date DESC
    `).all();
    res.json(invoices);
  });

  app.post("/api/invoices", (req, res) => {
    const { cari_id, type, invoice_no, date, total_amount, items } = req.body;
    try {
      const transaction = db.transaction(() => {
        // Save Invoice
        db.prepare("INSERT INTO invoices (cari_id, type, invoice_no, date, total_amount) VALUES (?, ?, ?, ?, ?)").run(cari_id, type, invoice_no, date, total_amount);
        
        // Update Stocks and create Kasa entries
        if (items && Array.isArray(items)) {
          for (const item of items) {
            const stok = db.prepare("SELECT * FROM stocks WHERE id = ?").get(item.stok_id) as any;
            if (stok) {
              const realQty = item.unit_type === 'alt' ? item.qty * stok.conversion_factor : item.qty;
              const stockChange = type === 'Alış' ? realQty : -realQty;
              db.prepare("UPDATE stocks SET quantity = quantity + ? WHERE id = ?").run(stockChange, item.stok_id);
            }
          }
        }

        // Update Cari Balance
        const balanceChange = type === 'Satış' ? total_amount : -total_amount;
        db.prepare("UPDATE caris SET balance = balance + ? WHERE id = ?").run(balanceChange, cari_id);
      });
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      console.error("Invoice Error:", e);
      res.status(400).json({ error: "Fatura kaydedilemedi: " + e.message });
    }
  });

  // Settings API
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", (req, res) => {
    const settings = req.body;
    const update = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, String(value));
      }
    });
    update();
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
