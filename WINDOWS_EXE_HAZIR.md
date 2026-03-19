# 🎉 Windows EXE Hazır!

## ✅ Oluşturulan Dosyalar

### 1. Kurulum Dosyası (Önerilen)
**Dosya:** `dist-electron/Ön Muhasebe Setup 0.0.0.exe`
- Boyut: ~150 MB
- Bilgisayara kurar
- Başlat menüsüne ekler
- Masaüstü kısayolu oluşturur
- Otomatik güncelleme desteği

### 2. Taşınabilir Sürüm
**Dosya:** `dist-electron/Ön Muhasebe 0.0.0.exe`
- Boyut: ~150 MB
- Kurulum gerektirmez
- USB'den çalıştırılabilir
- Direkt çift tıkla çalıştır

---

## 🚀 Nasıl Kullanılır?

### Kurulum Dosyası (Setup.exe)

1. `dist-electron/Ön Muhasebe Setup 0.0.0.exe` dosyasını çift tıklayın
2. Kurulum sihirbazını takip edin
3. Kurulum klasörünü seçin (varsayılan: `C:\Program Files\Ön Muhasebe`)
4. "Install" butonuna tıklayın
5. Kurulum tamamlandığında "Finish" tıklayın
6. Başlat menüsünden veya masaüstü kısayolundan açın

### Taşınabilir Sürüm (Portable.exe)

1. `dist-electron/Ön Muhasebe 0.0.0.exe` dosyasını istediğiniz yere kopyalayın
2. Çift tıklayarak çalıştırın
3. Kurulum gerektirmez!

---

## 📱 Özellikler

- ✅ Tam masaüstü uygulaması
- ✅ Offline çalışır (LocalStorage)
- ✅ Firebase entegrasyonu
- ✅ Otomatik güncellemeler (Setup sürümünde)
- ✅ Windows 10/11 uyumlu
- ✅ Türkçe arayüz

---

## 🔄 Yeni Sürüm Oluşturma

Kod değişikliği yaptıktan sonra:

```bash
npm run electron:build
```

Yeni EXE dosyaları `dist-electron` klasöründe oluşacak.

---

## 🎯 Geliştirme Modu

Geliştirme yaparken:

```bash
npm run electron:dev
```

Bu komut:
1. Vite dev server'ı başlatır (http://localhost:5173)
2. Electron penceresini açar
3. Hot reload aktif olur (kod değişince otomatik yenilenir)

---

## 📦 Dağıtım

### Kullanıcılara Göndermek İçin

1. `dist-electron` klasöründeki dosyaları paylaşın
2. Kullanıcılar Setup.exe'yi indirip kurabilir
3. Veya Portable.exe'yi direkt çalıştırabilir

### Dosya Boyutunu Küçültmek İçin

EXE dosyaları büyükse (150+ MB), sıkıştırabilirsiniz:
- WinRAR veya 7-Zip ile sıkıştırın
- ~50 MB'a düşer

---

## ⚙️ Ayarlar

### Uygulama Adını Değiştirmek

`package.json` dosyasında:

```json
"build": {
  "productName": "Yeni İsim"
}
```

### Versiyon Numarasını Değiştirmek

`package.json` dosyasında:

```json
"version": "1.0.0"
```

### İkon Eklemek

1. `public/icon.ico` dosyası oluşturun (256x256 px)
2. `package.json` dosyasında:

```json
"win": {
  "icon": "public/icon.ico"
}
```

---

## 🐛 Sorun Giderme

### "Windows korumalı bilgisayarınızı korudu" Uyarısı

Normal! Uygulama imzalanmadığı için Windows uyarı verir.

**Çözüm:**
1. "Daha fazla bilgi" tıklayın
2. "Yine de çalıştır" tıklayın

### Uygulama Açılmıyor

1. Antivirüs yazılımını kontrol edin
2. Windows Defender'ı geçici olarak kapatın
3. Yönetici olarak çalıştırın (sağ tık > "Yönetici olarak çalıştır")

### Veriler Kayboldu

Veriler LocalStorage'da saklanır:
- Konum: `%APPDATA%\Ön Muhasebe\Local Storage`
- Yedek almak için bu klasörü kopyalayın

---

## 🎉 Tebrikler!

Uygulamanız artık hem Android hem de Windows'ta çalışıyor! 🚀

**Özet:**
- ✅ Android APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- ✅ Windows Setup: `dist-electron/Ön Muhasebe Setup 0.0.0.exe`
- ✅ Windows Portable: `dist-electron/Ön Muhasebe 0.0.0.exe`
