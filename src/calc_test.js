
const items = [
    { qty: 100, price: 145.50, discount: 30, tax: 1, unit_type: 'base' },
    { qty: 50, price: 121.50, discount: 3, tax: 1, unit_type: 'base' },
    { qty: 35, price: 123.00, discount: 1.5, tax: 1, unit_type: 'base' },
    { qty: 17, price: 82.00, discount: 2.41505, tax: 1, unit_type: 'base' } // Derived discount to match Desktop
];

function getLineDetails(item) {
    const factor = 1;
    const taxRate = item.tax || 0;
    const rawPrice = item.price;
    const realQty = item.unit_type === 'alt' ? item.qty * factor : item.qty;

    const basePrice = item.unit_type === 'alt' ? rawPrice / factor : rawPrice;
    const grossAmount = Math.round(realQty * basePrice * 100) / 100;
    const discountAmount = Math.round(grossAmount * (item.discount / 100) * 100) / 100;
    const subtotal = Math.round((grossAmount - discountAmount) * 100) / 100;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;

    return {
        grossAmount: (subtotal + discountAmount),
        discountAmount,
        subtotal,
        taxAmount,
        lineTotal: (subtotal + taxAmount)
    };
}

let sumGross = 0;
let sumDiscount = 0;
let sumSubtotal = 0;
let sumTax = 0;

items.forEach((item, i) => {
    const d = getLineDetails(item);
    console.log(`Item ${i+1}: Gross ${d.grossAmount.toFixed(2)}, Disc ${d.discountAmount.toFixed(2)}, Sub ${d.subtotal.toFixed(2)}, Tax ${d.taxAmount.toFixed(2)}`);
    sumGross += d.grossAmount;
    sumDiscount += d.discountAmount;
    sumSubtotal += d.subtotal;
    sumTax += d.taxAmount;
});

const total = sumSubtotal + sumTax;

console.log('--- TOTALS ---');
console.log(`Gross Total: ${sumGross.toFixed(2)}`);
console.log(`Discount Total: ${sumDiscount.toFixed(2)}`);
console.log(`Subtotal (Ara Toplam): ${sumSubtotal.toFixed(2)}`);
console.log(`Tax (KDV): ${sumTax.toFixed(2)}`);
console.log(`Grand Total: ${total.toFixed(2)}`);
