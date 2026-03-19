# Android APK Oluşturma Rehberi

Bu uygulama için Android APK oluşturmak için aşağıdaki adımları izleyin:

## Gereksinimler

1. **Node.js** (v18 veya üzeri)
2. **Android Studio** (Android SDK ile birlikte)
3. **Java JDK** (v17 veya üzeri)

## Kurulum Adımları

### 1. Capacitor Kurulumu

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
```

### 2. Capacitor Başlatma

```bash
npx cap init
```

Sorulara şu şekilde cevap verin:
- App name: `Ön Muhasebe`
- App ID: `com.onmuhasebe.app`
- Web directory: `dist`

### 3. Projeyi Build Etme

```bash
npm run build
```

### 4. Android Platform Ekleme

```bash
npx cap add android
```

### 5. Web Dosyalarını Kopyalama

```bash
npx cap copy android
npx cap sync android
```

### 6. Android Studio'da Açma

```bash
npx cap open android
```

### 7. APK Oluşturma

Android Studio'da:

1. **Build** menüsünden **Build Bundle(s) / APK(s)** seçin
2. **Build APK(s)** seçeneğine tıklayın
3. Build tamamlandığında **locate** linkine tıklayın
4. APK dosyası `android/app/build/outputs/apk/debug/app-debug.apk` konumunda olacak

### Release APK (İmzalı) Oluşturma

1. **Build** > **Generate Signed Bundle / APK**
2. **APK** seçin
3. Keystore oluşturun veya mevcut olanı seçin
4. **release** build variant'ını seçin
5. APK `android/app/build/outputs/apk/release/` klasöründe olacak

## Sunucu Yapılandırması

APK'nın çalışması için backend sunucusunun erişilebilir olması gerekir:

### Seçenek 1: Yerel Ağ (Aynı WiFi)

`server.ts` dosyasında:
```typescript
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

Mobil cihazdan erişim için bilgisayarınızın IP adresini kullanın:
- Windows: `ipconfig` komutu ile IP'yi öğrenin
- Uygulama içinde `http://192.168.x.x:3000` şeklinde erişin

### Seçenek 2: Cloud Deployment

Sunucuyu bir cloud platformuna deploy edin:
- Heroku
- Railway
- Render
- DigitalOcean

Sonra `capacitor.config.json` içinde server URL'ini güncelleyin:

```json
{
  "server": {
    "url": "https://your-server.com",
    "cleartext": true
  }
}
```

## Hata Ayıklama

Chrome DevTools ile debug:
```bash
chrome://inspect
```

Logları görüntüleme:
```bash
npx cap run android -l
```

## Önemli Notlar

1. **İlk çalıştırmada** sunucu adresini ayarlamanız gerekebilir
2. **HTTPS** kullanıyorsanız, geçerli SSL sertifikası gereklidir
3. **Yerel ağda** test için `http://` kullanabilirsiniz
4. **Production** için mutlaka HTTPS kullanın

## Güncelleme

Kod değişikliklerinden sonra:

```bash
npm run build
npx cap copy android
npx cap sync android
```

Sonra Android Studio'da yeniden build edin.

## Performans İyileştirmeleri

1. **Minification**: Production build otomatik olarak minify eder
2. **Code Splitting**: Vite otomatik olarak yapar
3. **Image Optimization**: Görselleri optimize edin
4. **Lazy Loading**: Büyük bileşenleri lazy load edin

## Sorun Giderme

### APK yüklenmiyor
- Android sürümünü kontrol edin (minimum API 22)
- "Bilinmeyen kaynaklardan yükleme" izni verin

### Sunucuya bağlanamıyor
- Firewall ayarlarını kontrol edin
- Aynı ağda olduğunuzdan emin olun
- IP adresini doğru girdiğinizden emin olun

### Beyaz ekran
- Chrome inspect ile console loglarını kontrol edin
- `capacitor.config.json` ayarlarını kontrol edin
