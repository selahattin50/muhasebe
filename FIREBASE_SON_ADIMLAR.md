# Firebase Son Adımlar - Hemen Yapılacaklar

## Şu Anda Neredesiniz?
Firebase Console'da Authentication ekranındasınız.

## Yapılacak 3 Basit Adım (5 dakika)

### ADIM 1: Email/Password Aktif Edin
1. "Email/Password" satırını bulun
2. Sağ taraftaki **Enable** (Etkinleştir) düğmesine tıklayın
3. Açılan pencerede **Enable** düğmesine tekrar tıklayın
4. **Save** (Kaydet) butonuna tıklayın

### ADIM 2: Admin Kullanıcısı Oluşturun
1. Üstteki **Users** sekmesine tıklayın
2. **Add user** butonuna tıklayın
3. Şu bilgileri girin:
   - Email: `admin@onmuhasebe.app`
   - Password: `admin123`
4. **Add user** butonuna tıklayın

### ADIM 3: Firestore'da Kullanıcı Bilgisi Ekleyin
1. Sol menüden **Firestore Database** seçin
2. **Start collection** butonuna tıklayın
3. Collection ID: `users` yazın → **Next**
4. Document ID: Boş bırakın (otomatik)
5. Şu 3 alanı ekleyin:

   **Alan 1:**
   - Field: `username`
   - Type: string
   - Value: `admin`

   **Alan 2:**
   - Field: `role`
   - Type: string
   - Value: `admin`

   **Alan 3:**
   - Field: `email`
   - Type: string
   - Value: `admin@onmuhasebe.app`

6. **Save** butonuna tıklayın

## Bitti! Şimdi APK Oluşturun

Terminal'de şu komutları çalıştırın:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

APK hazır: `android/app/build/outputs/apk/debug/app-debug.apk`

## Test Edin
1. APK'yı telefona kurun
2. admin / admin123 ile giriş yapın
3. Bir stok ekleyin
4. Firebase Console > Firestore Database'de `stocks` koleksiyonunu kontrol edin
5. Stok görünüyorsa ✅ BAŞARILI!

---

**Sorun mu var?** Bana "b" yazın, devam edelim.
