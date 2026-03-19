// Güvenli bakiye formatlama fonksiyonu
export const formatBalance = (balance: any): number => {
  if (balance === undefined || balance === null || balance === '') {
    return 0;
  }
  
  const parsed = parseFloat(String(balance));
  
  if (isNaN(parsed)) {
    console.warn('Invalid balance value:', balance);
    return 0;
  }
  
  return parsed;
};

// Bakiye gösterimi için string formatı (1.234,56)
export const displayBalance = (balance: any): string => {
  const value = formatBalance(balance);
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Para birimi formatlama (Negatif değerleri -₺1.000,00 şeklinde gösterir)
export const formatCurrency = (amount: number): string => {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${isNegative ? '-' : ''}₺${formatted}`;
};

// Sayı girişlerini parse etme (Virgülü noktaya çevirir)
export const parseNumber = (value: any): number => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  
  // "1.234,56" -> "1234.56"
  const cleanValue = String(value)
    .replace(/\./g, '') // Binlik ayracı (nokta) sil
    .replace(',', '.'); // Ondalık ayracı (virgül) noktaya çevir
    
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
};

// Sayı girişi için formatlama (1234.56 -> "1234,56" - Binlik ayracı yok giriş alanları için genelde daha kolaydır)
export const formatForInput = (value: number): string => {
  return value.toLocaleString('tr-TR', { useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Para birimi rengi (Pozitif yeşil, negatif kırmızı)
export const formatCurrencyColor = (amount: number): string => {
  if (amount > 0) return 'text-emerald-600';
  if (amount < 0) return 'text-red-600';
  return 'text-slate-600';
};
