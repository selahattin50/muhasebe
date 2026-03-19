# Windows EXE Oluşturma Rehberi

## Yöntem 1: Electron Builder (Önerilen)

### Adım 1: Gerekli Paketleri Kurun

```bash
npm install --save-dev electron electron-builder concurrently wait-on cross-env
```

### Adım 2: package.json'a Eklemeler Yapın

`package.json` dosyasına şunları ekleyin:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron": "wait-on http://localhost:5173 && electron .",
    "electron:dev": "concurrently \"npm run dev\" \"npm run electron\"",
    "electron:build": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.onmuhasebe.app",
    "productName": "Ön Muhasebe",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "win": {
      "target": ["nsis"],
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

### Adım 3: Electron Ana Dosyasını Oluşturun

`electron/main.js` dosyası oluşturun:

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../public/icon.ico')
  });

  // Geliştirme modunda
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // Üretim modunda
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### Adım 4: EXE Oluşturun

```bash
npm run electron:build
```

EXE dosyası `dist-electron` klasöründe oluşacak.

---

## Yöntem 2: Tauri (Daha Hafif)

Tauri, Electron'a göre daha hafif ve hızlıdır.

### Adım 1: Tauri CLI Kurun

```bash
npm install --save-dev @tauri-apps/cli
```

### Adım 2: Tauri Başlatın

```bash
npx tauri init
```

Sorulara şu şekilde cevap verin:
- App name: Ön Muhasebe
- Window title: Ön Muhasebe
- Web assets location: ../dist
- Dev server URL: http://localhost:5173
- Dev server command: npm run dev
- Build command: npm run build

### Adım 3: package.json'a Script Ekleyin

```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

### Adım 4: EXE Oluşturun

```bash
npm run tauri:build
```

EXE dosyası `src-tauri/target/release` klasöründe oluşacak.

---

## Yöntem 3: Basit Web Sunucusu (En Kolay)

Sadece tarayıcıda çalıştırmak için:

### Adım 1: Build Edin

```bash
npm run build
```

### Adım 2: Basit Sunucu Çalıştırın

```bash
npx serve dist
```

Tarayıcıda `http://localhost:3000` açın.

---

## Karşılaştırma

| Özellik | Electron | Tauri | Web Sunucusu |
|---------|----------|-------|--------------|
| Dosya Boyutu | ~150 MB | ~10 MB | ~5 MB |
| Kurulum | Kolay | Orta | Çok Kolay |
| Performans | İyi | Mükemmel | İyi |
| Offline | ✅ | ✅ | ❌ |
| Masaüstü Entegrasyonu | ✅ | ✅ | ❌ |

## Önerim

- **Masaüstü uygulaması istiyorsanız:** Electron (Yöntem 1)
- **Hafif uygulama istiyorsanız:** Tauri (Yöntem 2)
- **Sadece test için:** Web Sunucusu (Yöntem 3)

## Hangi Yöntemi İstersiniz?

Bana "1", "2" veya "3" yazın, size o yöntemi kurulum yapayım!
