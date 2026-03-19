# 🎉 APK Hazırlama Tamamlandı!

## ✅ Tamamlanan Adımlar:

1. ✅ Capacitor paketleri yüklendi
2. ✅ Proje build edildi (dist klasörü oluşturuldu)
3. ✅ Capacitor başlatıldı
4. ✅ Android platformu eklendi
5. ✅ Dosyalar senkronize edildi

## 📱 APK Oluşturma - Son Adımlar

### Seçenek 1: Android Studio ile (Önerilen)

1. **Android Studio'yu açın:**
   ```bash
   npx cap open android
   ```

2. **Gradle sync tamamlanmasını bekleyin** (ilk açılışta 5-10 dakika sürebilir)

3. **APK oluşturun:**
   - Menüden: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
   - Veya: **Build** > **Generate Signed Bundle / APK** (imzalı APK için)

4. **APK'yı bulun:**
   - Build tamamlandığında sağ altta bildirim çıkacak
   - **locate** linkine tıklayın
   - Veya manuel olarak: `android/app/build/outputs/apk/debug/app-debug.apk`

### Seçenek 2: Komut Satırı ile (Gradle)

```bash
cd android
./gradlew assembleDebug
```

APK konumu: `android/app/build/outputs/apk/debug/app-debug.apk`

## 🔧 Android Studio Yoksa

### Android Studio İndirme:
https://developer.android.com/studio

### Kurulum sonrası:
1. Android SDK'yı yükleyin
2. Java JDK 17+ yüklü olduğundan emin olun

## 📲 APK'yı Telefona Yükleme

### USB ile:
1. Telefonda **Geliştirici Seçenekleri**'ni açın
2. **USB Hata Ayıklama**'yı etkinleştirin
3. APK dosyasını telefona kopyalayın
4. Dosya yöneticisinden APK'yı açıp yükleyin

### Kablosuz:
1. APK'yı Google Drive, Dropbox vb. yükleyin
2. Telefondan indirin
3. **Bilinmeyen kaynaklardan yükleme** izni verin
4. APK'yı yükleyin

## 🌐 Sunucu Bağlantısı

### Test için (Yerel Ağ):

1. **Bilgisayarınızın IP adresini öğrenin:**
   ```bash
   ipconfig
   ```
   (Örnek: 192.168.1.100)

2. **Sunucuyu başlatın:**
   ```bash
   npm run dev
   ```

3. **Uygulamada kullanın:**
   - Uygulama açıldığında `http://192.168.1.100:3000` adresine bağlanacak
   - Aynı WiFi ağında olmanız gerekiyor

### Production için:

Sunucuyu bir cloud platformuna deploy edin:
- **Heroku**: https://heroku.com
- **Railway**: https://railway.app
- **Render**: https://render.com

Sonra `capacitor.config.json` dosyasını güncelleyin:
```json
{
  "server": {
    "url": "https://your-server.com"
  }
}
```

Ve yeniden build edin:
```bash
npm run mobile:build
npx cap open android
```

## 🐛 Sorun Giderme

### Gradle sync hatası:
- İnternet bağlantınızı kontrol edin
- Android Studio'yu yeniden başlatın
- `android` klasörünü silip `npx cap add android` komutunu tekrar çalıştırın

### APK yüklenmiyor:
- "Bilinmeyen kaynaklardan yükleme" iznini verin
- Android sürümünüzün minimum API 22 (Android 5.1) olduğundan emin olun

### Beyaz ekran:
- Chrome'da `chrome://inspect` adresine gidin
- Cihazınızı seçin ve console loglarını kontrol edin
- Sunucu adresinin doğru olduğundan emin olun

## 📝 Güncelleme Yaparken

Kod değişikliği yaptıktan sonra:

```bash
npm run mobile:build
```

Sonra Android Studio'da yeniden **Build APK** yapın.

## 🎯 Hızlı Komutlar

```bash
# Android Studio'yu aç
npx cap open android

# Build ve sync
npm run mobile:build

# Cihazda çalıştır (live reload)
npm run mobile:dev
```

## ✨ Başarılar!

APK'nız hazır! Herhangi bir sorun yaşarsanız yukarıdaki sorun giderme bölümüne bakın.
