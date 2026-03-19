# 📱 Mobil APK Kurulum - Hızlı Başlangıç

## 🚀 Hızlı Kurulum (3 Adım)

### 1️⃣ Capacitor Paketlerini Yükle

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 2️⃣ Android Platformunu Ekle

```bash
npm run build
npx cap add android
npx cap sync android
```

### 3️⃣ Android Studio'da Aç ve APK Oluştur

```bash
npx cap open android
```

Android Studio'da:
- **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
- APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## 📋 Gereksinimler

- ✅ Node.js (v18+)
- ✅ Android Studio
- ✅ Java JDK (v17+)

## 🔄 Güncelleme Yaparken

```bash
npm run mobile:build
```

## 🌐 Sunucu Bağlantısı

### Yerel Ağ (Test için)

1. Bilgisayarınızın IP adresini öğrenin:
   ```bash
   ipconfig  # Windows
   ifconfig  # Mac/Linux
   ```

2. Sunucuyu başlatın:
   ```bash
   npm run dev
   ```

3. Mobil cihazdan `http://192.168.x.x:3000` adresine bağlanın

### Production (Canlı Kullanım)

Sunucuyu bir cloud platformuna deploy edin ve `capacitor.config.json` dosyasını güncelleyin:

```json
{
  "server": {
    "url": "https://your-server.com"
  }
}
```

## 📱 Responsive Tasarım

Uygulama otomatik olarak telefon ekranına sığacak şekilde optimize edilmiştir:

- ✅ Otomatik yazı boyutu küçültme
- ✅ Dokunmatik optimizasyon
- ✅ Yatay kaydırma desteği
- ✅ Mobil menü sistemi

## 🐛 Sorun mu var?

Detaylı rehber için `BUILD_APK.md` dosyasına bakın.

## 💡 İpuçları

1. **İlk build uzun sürebilir** - Gradle bağımlılıkları indiriliyor
2. **USB debugging** ile gerçek cihazda test edebilirsiniz
3. **Chrome inspect** ile console loglarını görebilirsiniz: `chrome://inspect`

## 📞 Hızlı Komutlar

```bash
# Build ve sync
npm run mobile:build

# Android Studio'yu aç
npm run cap:open:android

# Cihazda çalıştır (live reload)
npm run mobile:dev
```
