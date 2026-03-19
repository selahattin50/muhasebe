
const items = [
    { name: "Ürün 1", qty: 100, price: 145.50, discount: 30, tax: 1 },
    { name: "Ürün 2", qty: 50, price: 121.50, discount: 3, tax: 1 },
    { name: "Ürün 3", qty: 35, price: 123.00, discount: 1.5, tax: 1 },
    { name: "Ürün 4", qty: 17, price: 82.00, discount: 2.415, tax: 1 }
];

function calculateLine(item) {
    // Brüt Tutar
    const gross = Math.round(item.qty * item.price * 100) / 100;
    // İskonto Tutarı
    const disc = Math.round(gross * (item.discount / 100) * 100) / 100;
    // Ara Toplam (Net)
    const net = Math.round((gross - disc) * 100) / 100;
    // KDV Tutarı
    const tax = Math.round(net * (item.tax / 100) * 100) / 100;
    // Satır Toplamı (KDV Dahil)
    const total = net + tax;

    return { gross, disc, net, tax, total };
}

let totalGross = 0;
let totalDisc = 0;
let totalNet = 0;
let totalTax = 0;

console.log("KALEM DETAYLARI:");
items.forEach(item => {
    const res = calculateLine(item);
    console.log(`${item.name}: Brüt ${res.gross.toFixed(2)}, İsk ${res.disc.toFixed(2)}, Net ${res.net.toFixed(2)}, KDV ${res.tax.toFixed(2)} -> Toplam ${res.total.toFixed(2)}`);
    totalGross += res.gross;
    totalDisc += res.disc;
    totalNet += res.net;
    totalTax += res.tax;
});

const grandTotal = totalNet + totalTax;

console.log("\nGENEL TOPLAMLAR:");
console.log(`Brüt Toplam:   ${totalGross.toFixed(2)}`);
console.log(`İskonto Topl.:  ${totalDisc.toFixed(2)}`);
console.log(`Ara Toplam:    ${totalNet.toFixed(2)}`);
console.log(`Ödenecek KDV:  ${totalTax.toFixed(2)}`);
console.log(`GENEL TOPLAM:  ${grandTotal.toFixed(2)}`);
