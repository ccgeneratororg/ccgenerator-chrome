# Chrome Web Store listing — Türkçe

Türkçe listeleme, panonun **Store listing → Türkçe** sekmesine girilir. Başlık
ve özet `_locales/tr/messages.json` dosyasından gelir; panoda düzenlenemez.

---

## Başlık (`appName`, 38/45 karakter)

```
Kredi Kartı Üretici: Test Kart Numarası
```

## Özet (`appDesc`, 130/132 karakter)

```
Luhn geçerli test kredi kartı numarası üretin, BIN doğrulayın ve ödeme formunu doldurun. Geliştirici ve QA için sahte kart verisi.
```

---

## Ayrıntılı açıklama

```
Geliştiriciler ve test ekipleri için kart verisi — ödeme formunun bir tık
uzağında.

CC Generator, bir ödeme akışını geliştirirken ya da test ederken ihtiyaç
duyduğunuz sahte kart bilgilerini üretir: Luhn geçerli kart numarası, son
kullanma tarihi, CVV ve kart sahibi adı. Visa, Mastercard, American Express,
Discover, JCB, Diners Club, Maestro, UnionPay ve Troy desteklenir. Her şey
tarayıcınızda çalışır; hiçbir veri sunucuya gönderilmez, üyelik gerekmez.

Bu numaralar yalnızca yazılım testi içindir. Yalnızca biçim doğrulamasından
geçerler — gerçek kart değildirler, bakiyeleri yoktur ve hiçbir alışverişte
kullanılamazlar.

■ ÜRET
• Tek seferde 1–25 kart, dokuz kart ağından biri ya da karışık
• Her ağ için doğru ön ek ve uzunluk: Mastercard'ın 2-serisi (2221–2720) ve pek
  çok tabloda eksik olan 19 haneli Maestro ile UnionPay aralıkları dahil
• Numarayı, kartın tamamını, tüm kartları, JSON'u kopyalayın; CSV indirin
• Numaralar Math.random ile değil, crypto.getRandomValues ile üretilir

■ ÖDEME FORMUNU DOLDUR
• "Formu doldur" ile numara, son kullanma, CVC ve ad doğrudan açık sayfadaki
  ödeme formuna yazılır
• Ya da sayfaya sağ tıklayın → "Bu ödeme formunu test kartıyla doldur"
• Ya da klavyeden çıkmadan Alt+Shift+F
• Yaygın alan biçimlerini tanır: autocomplete="cc-*", ayrı ay/yıl seçimleri,
  tek MM/YY alanı, yalnızca placeholder içeren formlar ve Türkçe etiketler
  (kart numarası, kart sahibi, ay, yıl, güvenlik kodu)
• Barındırılan kart iframe'leri (Stripe Elements, Braintree Hosted Fields)
  tarayıcı tarafından yalıtıldığı için hiçbir eklenti tarafından doldurulamaz —
  orada numarayı kopyalayın.

■ KART NUMARASI DOĞRULA
• Luhn kontrol hanesi; hatalıysa doğrusunun ne olması gerektiği
• Ön ekten tespit edilen kart ağı ve o ağ için uzunluğun geçerliliği
• ISO/IEC 7812 sektör tanımlayıcısı ve hane anatomisi: MII, IIN'in kalanı,
  hesap tanımlayıcı, kontrol hanesi
• Herhangi bir sayfada numarayı seçip sağ tıklayarak yerinde denetleyin
• Yalnızca biçim denetimi. Bir kartın var olup olmadığını, aktifliğini ya da
  bakiyesini söylemez — sorgu yok, ağ isteği yok.

■ SAĞLAYICI TEST KARTLARI
Stripe, Braintree, Adyen, Square, PayPal, Authorize.Net ve iyzico'nun yayımladığı
sandbox numaraları — ret senaryoları (yetersiz bakiye, süresi dolmuş kart, hatalı
CVC) ve 3-D Secure kartları dahil. Satıra tıklayıp kopyalayın ya da "Doldur" ile
doğrudan forma yazın: sağlayıcının serbest bıraktığı son kullanma, CVC ve ad
alanları numaranın etrafında üretilir. Sağlayıcının sabitlediği değerlere
dokunulmaz — Adyen'in 03/2030 ve CVC 737'si, Square'in CVV 111'i — çünkü oraya
rastgele bir değer koymak sandbox'ın artık tanımadığı bir kart üretir. Tam
tablolar sitede.

■ GİZLİLİK
• Host izni yok. Eklenti bir sayfayı yalnızca siz düğmeye bastığınızda, sağ tık
  menüsünden seçtiğinizde veya kısayola bastığınızda okur
• Sürekli çalışan içerik betiği yok, gezinme geçmişinize erişim yok
• fetch yok, XHR yok, analitik yok, hesap yok, telemetri yok
• Ayarlar Chrome profilinizle eşitlenir; üretilen kartlar oturum belleğinde
  tutulur ve tarayıcı kapanınca silinir
• Pano okuma isteğe bağlı bir izindir; yalnızca "Panodan yapıştır" düğmesine
  basarsanız sorulur ve reddedilebilir

■ KİMLER İÇİN
Stripe, Adyen ya da iyzico entegrasyonu yazan geliştiriciler. Aynı ödeme
formunu yüzüncü kez dolduran test mühendisleri. Test kredi kartı numarasına,
sandbox için sahte karta, form doğrulamasını denemek için bir BIN'e ya da bir
formun reddettiği numara üzerinde hızlı bir Luhn kontrolüne ihtiyaç duyan
herkes.

■ SİTEDE
Daha kapsamlı araçlar ccgenerator.org'da, açılır pencereden bir tık uzakta:
BIN sorgulama, IBAN üretici, test ad ve adres üretici, kredi kartı görseli
üretici, sağlayıcı test kartlarının tam referansı ve Luhn algoritması, kart
numarası yapısı, BIN/IIN, PCI DSS test verisi ile ödeme sağlayıcı testi
üzerine rehberler.

■ NE İÇİN DEĞİL
Dolandırıcılık, kart sahtekârlığı ya da herhangi bir satın alma girişimi.
Üretilen numaralar matematiksel olarak düzgün, finansal olarak değersizdir.
Test verisini canlı bir ödeme sisteminde ya da size ait olmayan bir sistemde
kullanmak bu eklentinin amacı değildir.

Ücretsiz ve ne yaptığı konusunda açık — ccgenerator.org ekibinden.
```
