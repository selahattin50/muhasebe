# Firebase Kurulum Adımları

## ⚠️ ÖNEMLİ
Şu anda APK'da demo Firebase yapılandırması var ve ÇALIŞMAYACAK!
Aşağıdaki adımları takip ederek kendi Firebase projenizi oluşturun.

## 1. Firebase Projesi Oluşturun (5 dakika)

### a) Firebase Console'a Gidin
https://console.firebase.google.com/

### b) Yeni Proje Oluşturun
1. "Add project" butonuna tıklayın
2. Proje adı: `onmuhasebe` (veya istediğiniz isim)
3. Google Analytics: İsteğe bağlı (kapatabilirsiniz)
4. "Create project" → Bekleyin → "Continue"

## 2. Firestore Database Oluşturun (2 dakika)

### a) Firestore'u Etkinleştirin
1. Sol menüden "Firestore Database" seçin
2. "Create database" butonuna tıklayın
3. **"Start in test mode"** seçin (önemli!)
4. Location: `europe-west3` (veya size yakın)
5. "Enable" butonuna tıklayın

### b) Güvenlik Kurallarını Ayarlayın
"Rules" sekmesinde şu kuralları yapıştırın:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // Test için - üretimde değiştirin!
    }
  }
}
```

"Publish" butonuna tıklayın.

## 3. Authentication Ayarlayın (2 dakika)

### a) Authentication'ı Etkinleştirin
1. Sol menüden "Authentication" seçin
2. "Get started" butonuna tıklayın
3. "Sign-in method" sekmesine tıklayın
4. "Email/Password" seçeneğini etkinleştirin
5. "Save" butonuna tıklayın

### b) İlk Kullanıcıyı Oluşturun
1. "Users" sekmesine gidin
2. "Add user" butonuna tıklayın
3. Email: `admin@onmuhasebe.app`
4. Password: `admin123`
5. "Add user" butonuna tıklayın

### c) Firestore'da Kullanıcı Bilgilerini Ekleyin
1. "Firestore Database" > "Data" sekmesine gidin
2. "Start collection" butonuna tıklayın
3. Collection ID: `users`
4. "Next" butonuna tıklayın
5. Document ID: (Auto-ID bırakın)
6. Şu alanları ekleyin:
   - Field: `username`, Type: string, Value: `admin`
   - Field: `role`, Type: string, Value: `admin`
   - Field: `email`, Type: string, Value: `admin@onmuhasebe.app`
7. "Save" butonuna tıklayın

## 4. Web Uygulaması Ekleyin (3 dakika)

### a) Web App Oluşturun
1. Sol üstteki "Project Overview" yanındaki ⚙️ ikonuna tıklayın
2. "Project settings" seçin
3. Aşağı kaydırın, "Your apps" bölümünde "</>" (Web) ikonuna tıklayın
4. App nickname: `OnMuhasebe`
5. "Register app" butonuna tıklayın

### b) Firebase Config'i Kopyalayın
Şu şekilde bir kod göreceksiniz:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "onmuhasebe-xxxxx.firebaseapp.com",
  projectId: "onmuhasebe-xxxxx",
  storageBucket: "onmuhasebe-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

Bu bilgileri kopyalayın!

## 5. Kodu Güncelleyin (2 dakika)

### a) firebase.ts Dosyasını Açın
`src/firebase.ts` dosyasını açın

### b) Firebase Config'i Yapıştırın
Demo config'i silin ve kendi bilgilerinizi yapıştırın:

```typescript
const firebaseConfig = {
  apiKey: "KENDI_API_KEY_INIZ",
  authDomain: "onmuhasebe-xxxxx.firebaseapp.com",
  projectId: "onmuhasebe-xxxxx",
  storageBucket: "onmuhasebe-xxxxx.appspot.com",
  messagingSenderId: "KENDI_SENDER_ID_INIZ",
  appId: "KENDI_APP_ID_INIZ"
};
```

Dosyayı kaydedin (Ctrl+S)

## 6. APK'yı Yeniden Oluşturun (3 dakika)

Terminal'de şu komutları çalıştırın:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
cd ..
```

APK dosyası: `android/app/build/outputs/apk/debug/app-debug.apk`

## 7. Test Edin

1. APK'yı telefona kurun
2. admin / admin123 ile giriş yapın
3. Bir stok ekleyin
4. Firebase Console > Firestore Database'de `stocks` koleksiyonunu kontrol edin
5. Eklediğiniz stok görünüyorsa ✅ BAŞARILI!

## Sorun Giderme

### "Firebase: Error (auth/api-key-not-valid)"
- `src/firebase.ts` dosyasındaki apiKey'i kontrol edin
- Firebase Console'dan doğru kopyaladığınızdan emin olun

### "Firebase: Error (auth/network-request-failed)"
- İnternet bağlantınızı kontrol edin
- Firebase projesi aktif mi kontrol edin

### Veriler Firebase'e Kaydedilmiyor
- Firestore Database oluşturuldu mu?
- Test mode'da mı?
- Güvenlik kuralları doğru mu?
- Browser console'da hata var mı?

### Giriş Yapamıyorum
- Authentication'da kullanıcı oluşturuldu mu?
- Firestore'da users koleksiyonu var mı?
- Email ve şifre doğru mu?

## Üretim İçin Güvenlik

Test modundan çıkıp güvenli kurallar ekleyin:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Yardım

Sorun yaşarsanız:
1. Firebase Console'da "Firestore Database" > "Data" sekmesini kontrol edin
2. Browser console'da (F12) hataları kontrol edin
3. `console.log` çıktılarını kontrol edin
