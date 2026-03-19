# 🚀 Hızlı Başlangıç - Firebase ile APK

## ⚡ 5 Dakikada Çalışır Hale Getirin!

### 1️⃣ Firebase Projesi Oluşturun (2 dakika)

1. https://console.firebase.google.com → **Proje ekle**
2. Proje adı: `on-muhasebe`
3. **Web uygulaması ekle** (</> ikonu)
4. Config bilgilerini kopyalayın

### 2️⃣ Firebase Servislerini Aktifleştirin (1 dakika)

**Authentication:**
- Sol menü → Authentication → Get started
- Email/Password → Etkinleştir

**Firestore:**
- Sol menü → Firestore Database → Create database
- Test mode → Enable

### 3️⃣ Config Bilgilerini Yapıştırın (30 saniye)

`src/firebase.ts` dosyasını açın ve Firebase config'inizi yapıştırın:

```typescript
const firebaseConfig = {
  apiKey: "BURAYA_KENDI_API_KEY",
  authDomain: "BURAYA_KENDI_AUTH_DOMAIN",
  projectId: "BURAYA_KENDI_PROJECT_ID",
  storageBucket: "BURAYA_KENDI_STORAGE_BUCKET",
  messagingSenderId: "BURAYA_KENDI_SENDER_ID",
  appId: "BURAYA_KENDI_APP_ID"
};
```

### 4️⃣ Kullanıcı Oluşturun (1 dakika)

Firebase Console → Authentication → Users → Add user:

```
Email: yonetici@onmuhasebe.app
Password: admin123
```

Firestore → Start collection → `users` → Add document:

```json
{
  "username": "yönetici",
  "role": "Yönetici",
  "email": "yonetici@onmuhasebe.app"
}
```

### 5️⃣ APK Oluşturun (30 saniye)

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## ✅ Hazır!

APK'yı telefona yükleyin ve giriş yapın:
- Kullanıcı: `yönetici`
- Şifre: `admin123`

## 📱 Artık İnternet Bağlantısı Yeterli!

- ✅ Sunucu kurulumu yok
- ✅ IP adresi ayarı yok
- ✅ Yerel ağ gerekmiyor
- ✅ Her yerden erişim
- ✅ Otomatik senkronizasyon

## 🔧 Sorun mu var?

Detaylı rehber: `FIREBASE_KURULUM.md`

## 💡 İpuçları

1. **Test Mode:** Geliştirme için yeterli
2. **Ücretsiz:** Küçük işletmeler için bedava
3. **Güvenli:** Google altyapısı
4. **Hızlı:** Gerçek zamanlı senkronizasyon

Başarılar! 🎉
