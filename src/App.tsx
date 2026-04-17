/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import arialFontInline from './assets/fonts/arial.ttf?inline';
import arialBoldFontInline from './assets/fonts/arialbd.ttf?inline';
import arialItalicFontInline from './assets/fonts/ariali.ttf?inline';
import * as API from './api';
import { formatBalance, displayBalance, displayPrice, formatCurrency, formatCurrencyColor, parseNumber, formatForInput } from './utils';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Package,
  FileText,
  Plus,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Menu,
  X,
  History,
  BarChart3,
  Download,
  Check,
  Loader2,
  ArrowLeft,
  Trash2,
  Edit,
  ArrowUpDown,
  Share2,
  RefreshCw,
  UserPlus,
  FilePlus,
  Users2,
  Wallet2,
  Package2,
  Eye,
  EyeOff
} from 'lucide-react';
// motion/react removed - causes Android WebView crash
const AnimatePresence = ({ children }: { children: React.ReactNode; mode?: string }) => <>{children}</>;
const motion = {
  div: (props: any) => { const { initial, animate, exit, transition, whileHover, whileTap, ...rest } = props; return <div {...rest} />; },
  button: (props: any) => { const { initial, animate, exit, transition, whileHover, whileTap, ...rest } = props; return <button {...rest} />; },
};

// --- Types ---

type View = 'dashboard' | 'cari' | 'kasa' | 'stok' | 'fatura' | 'users';
type CariSubView = 'menu' | 'list' | 'add' | 'edit' | 'movement_entry' | 'movements' | 'collection' | 'payments';
type StokSubView = 'list' | 'add' | 'edit' | 'settings' | 'inventory' | 'selection';
type FaturaSubView = 'list' | 'add' | 'create_selection';

interface User {
  id: string | number;
  username: string;
  email: string;
}

interface Cari {
  id: string | number;
  name: string;
  code: string;
  type: string;
  balance: number;
  authorized_person?: string;
  tax_office?: string;
  tax_number?: string;
  phone?: string;
  fax?: string;
  createdAt?: any;
}

interface Stok {
  id: string | number;
  name: string;
  code: string;
  base_unit: string;
  alt_unit: string | null;
  conversion_factor: number;
  quantity: number;
  purchase_price_without_tax?: number;
  purchase_price: number;
  sale_price: number;
  purchase_discount: number;
  sale_discount: number;
  tax_rate: number;
}

interface KasaTransaction {
  id: string | number;
  type: 'Giriş' | 'Çıkış';
  amount: number;
  date: string;
  description: string;
}

interface Invoice {
  id: string | number;
  cari_id: string | number;
  cari_name: string;
  type: 'Alış' | 'Satış';
  invoice_no: string;
  date: string;
  time?: string;
  total_amount: number;
  items?: Array<{
    stok_id: string | number;
    qty: number;
    unit_type: 'base' | 'alt';
    price: number;
    discount: number;
    tax: number;
  }>;
}

const normalizeUser = (user: User | null) => { if (!user) return null; return { ...user }; };

// --- Helper Functions ---

// Date formatting helper - converts Date to DD-MM-YYYY format
const formatDateToDDMMYYYY = (date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

// Convert DD-MM-YYYY to YYYY-MM-DD for input fields
const formatDateForInput = (ddmmyyyy: string): string => {
  if (!ddmmyyyy || ddmmyyyy.length < 10) return new Date().toISOString().split('T')[0];
  const [day, month, year] = ddmmyyyy.split('-');
  return `${year}-${month}-${day}`;
};

// Display date in DD-MM-YYYY format
const displayDate = (dateStr: string): string => {
  if (!dateStr) return '';

  const dateOnly = dateStr.split('T')[0].trim();
  const parts = dateOnly.split('-');

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${day}-${month}-${year}`;
    }

    if (parts[2].length === 4) {
      const [day, month, year] = parts;
      return `${day}-${month}-${year}`;
    }
  }

  return dateOnly;
};

const TURKISH_TEXT_RULES: Array<[RegExp, string]> = [
  [/\u00ef\u00bf\u00bd\u00ef\u00bf\u00bd\{/g, '\u20ba'],
  [/\u00ef\u00bf\u00bd\{/g, '\u20ba'],
  [/\u00ef\u00bf\u00bd(?=\d)/g, '\u20ba'],
  [/\uFFFD(?=\d)/g, '\u20ba'],
  [/\?(?=\d)/g, '\u20ba'],
  [/Yetkisiz Eri(?:\u015f|\?|\uFFFD)im/g, 'Yetkisiz Erişim'],
  [/Bu b(?:\u00f6|\?|\uFFFD)l(?:\u00fc|\?|\uFFFD)me eri(?:\u015f|\?|\uFFFD)im yetkiniz bulunmamaktad(?:\u0131|\?|\uFFFD)r\./g, 'Bu bölüme erişim yetkiniz bulunmamaktadır.'],
  [/Anasayfaya D(?:\u00f6|\?|\uFFFD)n/g, 'Anasayfaya Dön'],
  [/Ho(?:\u015f|\?|\uFFFD) Geldiniz/g, 'Hoş Geldiniz'],
  [/(?:\u00d6|\?|\uFFFD)n Muhasebe/g, 'Ön Muhasebe'],
  [/Y(?:\u00f6|\?|\uFFFD|\u00ef\u00bf\u00bd)netici/g, 'Yönetici'],
  [/Kullan(?:\u0131|1|\?|\uFFFD)c(?:\u0131|1|\?|\uFFFD)lar/g, 'Kullanıcılar'],
  [/Kullan(?:\u0131|1|\?|\uFFFD)c(?:\u0131|1|\?|\uFFFD)/g, 'Kullanıcı'],
  [/Stok Y(?:\u00f6|\?|\uFFFD|\u00ef\u00bf\u00bd)netimi/g, 'Stok Yönetimi'],
  [/Fatura Y(?:\u00f6|\?|\uFFFD|\u00ef\u00bf\u00bd)netimi/g, 'Fatura Yönetimi'],
  [/Kasa Y(?:\u00f6|\?|\uFFFD|\u00ef\u00bf\u00bd)netimi/g, 'Kasa Yönetimi'],
  [/Cari Y(?:\u00f6|\?|\uFFFD|\u00ef\u00bf\u00bd)netimi/g, 'Cari Yönetimi'],
  [/M(?:\u00fc|\?|\uFFFD|\u00ef\u00bf\u00bd)(?:\u015f|\?|\uFFFD)?teri/g, 'Müşteri'],
  [/tedarik(?:\u00e7|\?|\uFFFD)i/g, 'tedarikçi'],
  [/(?:\u00dc|\uFFFD)r(?:\u00fc|\?|\uFFFD)nler/g, 'Ürünler'],
  [/(?:\u00dc|\uFFFD)r(?:\u00fc|\?|\uFFFD)n/g, 'Ürün'],
  [/G(?:\u00fc|\?|\uFFFD|\u00ef\u00bf\u00bd)venli/g, 'Güvenli'],
  [/G(?:\u00fc|\?|\uFFFD|\u00ef\u00bf\u00bd)ncelle/g, 'Güncelle'],
  [/D(?:\u00fc|\?|\uFFFD|\u00ef\u00bf\u00bd)zenle/g, 'Düzenle'],
  [/Payla(?:\u015f|\?|\uFFFD|\u00ef\u00bf\u00bd)/g, 'Paylaş'],
  [/Giri(?:\u015f|(?:\u00ef\u00bf\u00bdx)|\?|\uFFFD)/g, 'Giriş'],
  [/(?:\u00c7|\uFFFD)!?(?:\u0131|1)(?:k|K)(?:\u0131|1)(?:\u015f|(?:\u00ef\u00bf\u00bdx)|_|x|\?)/g, 'Çıkış'],
  [/Al(?:\u0131|1)(?:\u015f|(?:\u00ef\u00bf\u00bdx)|_|x|\?)/g, 'Alış'],
  [/Sat(?:\u0131|1)(?:\u015f|(?:\u00ef\u00bf\u00bdx)|_|x|\?)/g, 'Satış'],
  [/Al(?:\u0131|1)c(?:\u0131|1)/g, 'Alıcı'],
  [/Sat(?:\u0131|1)c(?:\u0131|1)/g, 'Satıcı'],
  [/Bor(?:\u00e7|\?|\uFFFD|\u00ef\u00bf\u00bd)/g, 'Borç'],
  [/Cari Hareket Giri(?:\u015f|(?:\u00ef\u00bf\u00bdx)|\?i|\uFFFD)/g, 'Cari Hareket Girişi'],
  [/Müşteri ve tedarikçi y(?:\u00f6|\?|\uFFFD)netimi/g, 'Müşteri ve tedarikçi yönetimi'],
  [/Nakit ak(?:\u0131|1)(?:\u015f|(?:\u00ef\u00bf\u00bdx)|\?)?(?:\u0131|1) ve bakiye takibi/g, 'Nakit akışı ve bakiye takibi'],
  [/Sat(?:\u0131|1)n al(?:\u0131|1)nan ürünlerin giri(?:\u015f|(?:\u00ef\u00bf\u00bdx)|\?i)/g, 'Satın alınan ürünlerin girişi'],
  [/Sat(?:\u0131|1)lan ürünlerin çıkışı/g, 'Satılan ürünlerin çıkışı'],
  [/Ge(?:\u00e7|\?|\uFFFD)mi(?:\u015f|(?:\u00ef\u00bf\u00bdx)|\?) işlem d(?:\u00f6|\?|\uFFFD)k(?:\u00fc|\?|\uFFFD)mleri/g, 'Geçmiş işlem dökümleri'],
  [/Faturas(?:\u0131|1|\?)/g, 'Faturası'],
  [/Toplam(?:\u0131|1|\?)/g, 'Toplamı'],
  [/Hesab(?:\u0131|1|\?)n(?:\u0131|1|\?)z/g, 'Hesabınız'],
  [/Hat(?:\u0131|1)rla/g, 'Hatırla'],
  [/Kay(?:\u0131|1|\?)t/g, 'Kayıt'],
  [/Kat(?:\u0131|1|\?)l(?:\u0131|1|\?)n/g, 'Katılın'],
  [/Sat(?:\u0131|1|\?)n/g, 'Satın'],
  [/Ad(?:\u0131|1|\?)/g, 'Adı'],
  [/Kapal(?:\u0131|1|\?)/g, 'Kapalı'],
  [/L(?:\u00fc|\?|\uFFFD)tfen/g, 'Lütfen'],
  [/e(?:\u015f|\?|\uFFFD)le(?:\u015f|\?|\uFFFD)miyor/g, 'eşleşmiyor'],
  [/eri(?:\u015f|\?|\uFFFD)im/g, 'erişim'],
  [/eri(?:\u015f|\?|\uFFFD)in/g, 'erişin'],
  [/Ba(?:\u011f|\?|\uFFFD)lant(?:\u0131|1)/g, 'Bağlantı'],
  [/ba(?:\u011f|\?|\uFFFD)lant(?:\u0131|1)/g, 'bağlantı'],
  [/Ba(?:\u011f|\?|\uFFFD)lan(?:\u0131|1)yor/g, 'Bağlanıyor'],
  [/İşlem|i(?:\u015f|\?|\uFFFD)lem|0(?:\u015f|\?|\uFFFD)lem|İşlem/g, 'İşlem'],
  [/İsk/g, 'İsk'],
  [/İsim/g, 'İsim'],
  [/\Şifre/g, 'Şifre'],
  [/\Şifremi/g, 'Şifremi'],
  [/Fatura Detay(?:\u0131|1)/g, 'Fatura Detayı'],
  [/G0R0\^ YAP/g, 'GİRİŞ YAP'],
  [/SİL/g, 'SİL'],
  [/A(?:\u00e7|\?|\uFFFD)(?:\u0131|1)klama/g, 'Açıklama'],
  [/Se(?:\u00e7|\?|\uFFFD)in/g, 'Seçin'],
  [/ba(?:\u015f|\?|\uFFFD)ar(?:\u0131|1)l(?:\u0131|1)/g, 'başarılı'],
  [/Ba(?:\u015f|\?|\uFFFD)ar(?:\u0131|1)l(?:\u0131|1)/g, 'Başarılı'],
  [/Ge(?:\u00e7|\?|\uFFFD)erli/g, 'Geçerli'],
  [/Hen(?:\u00fc|\?|\uFFFD)z/g, 'Henüz'],
  [/T(?:\u00fc|\?|\uFFFD)m/g, 'Tüm'],
];

const normalizeTurkishText = (value: string | null | undefined) => {
  if (!value) return '';

  let result = String(value);
  for (const [pattern, replacement] of TURKISH_TEXT_RULES) {
    result = result.replace(pattern, replacement);
  }

  return result
    .replace(/([A-Za-zÇĞİÖŞÜçğıöşü])1([A-Za-zÇĞİÖŞÜçğıöşü])/g, '$1ı$2')
    .replace(/\b0(?=[A-Za-zÇĞİÖŞÜçğıöşü])/g, 'İ')
    .replace(/m1 /g, 'mı ')
    .replace(/m1\?/g, 'mı?')
    .replace(/y\?klendi/g, 'yüklendi')
    .replace(/kay\?t/g, 'kayıt')
    .replace(/bulunmamaktadır/g, 'bulunmamaktadır')
    .replace(/bulunamadı/g, 'bulunamadı')
    .replace(/sıfırlama/g, 'sıfırlama')
    .replace(/g\?nderildi/g, 'gönderildi')
    .replace(/g\?nderilemedi/g, 'gönderilemedi')
    .replace(/a\?1k/g, 'açık')
    .replace(/de\?il/g, 'değil');
};

const normalizeDomText = () => {
  if (typeof document === 'undefined') return;

  document.title = normalizeTurkishText(document.title);

  const selector = 'input[placeholder], textarea[placeholder], button[title], [title]';
  document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    const placeholder = node.getAttribute('placeholder');
    if (placeholder) node.setAttribute('placeholder', normalizeTurkishText(placeholder));

    const title = node.getAttribute('title');
    if (title) node.setAttribute('title', normalizeTurkishText(title));
  });

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const value = current.nodeValue;
    if (value && value.trim()) {
      const fixed = normalizeTurkishText(value);
      if (fixed !== value) current.nodeValue = fixed;
    }
    current = walker.nextNode();
  }
};

const fixTR = (str: string | null | undefined) => normalizeTurkishText(str);

const normalizeInvoiceType = (value: string | null | undefined, invoiceNo?: string | null | undefined): Invoice['type'] => {
  const fixed = fixTR(value).trim().toLocaleLowerCase('tr-TR');
  if (fixed.includes('alış') || fixed.includes('alis') || fixed.includes('alıs')) return 'Alış';
  if (fixed.includes('satış') || fixed.includes('satis') || fixed.includes('satıs')) return 'Satış';
  const normalizedInvoiceNo = String(invoiceNo || '').trim().toUpperCase();
  if (normalizedInvoiceNo.startsWith('A')) return 'Alış';
  if (normalizedInvoiceNo.startsWith('S')) return 'Satış';
  return 'Satış';
};

const normalizeCariTransactionType = (value: string | null | undefined): 'Borç' | 'Alacak' | '' => {
  if (!value) return '';
  const s = String(value).toLowerCase().trim();
  if (s === 'borc' || s === 'borç' || s.startsWith('bor')) return 'Borç';
  if (s === 'alacak') return 'Alacak';
  return '';
};

const normalizeCariRole = (value: string | null | undefined) => {
  const fixed = fixTR(value).trim().toLocaleLowerCase('tr-TR');
  if (fixed.includes('satıcı') || fixed.includes('satici')) return 'Satıcı';
  if (fixed.includes('alıcı') || fixed.includes('alici')) return 'Alıcı';
  if (fixed.includes('her ikisi')) return 'Her İkisi';
  return fixTR(value);
};

const getCariLedgerType = (cariType: string | null | undefined, transactionType: string | null | undefined) => {
  const normalizedType = normalizeCariTransactionType(transactionType);
  const normalizedCariType = normalizeCariRole(cariType);

  if (normalizedCariType === 'Satıcı') {
    if (normalizedType === 'Borç') return 'Alacak';
    if (normalizedType === 'Alacak') return 'Borç';
  }

  return normalizedType;
};

const getCariInvoiceLedgerType = (cariType: string | null | undefined, invoiceType: string | null | undefined): 'Borç' | 'Alacak' | '' => {
  const normalizedCariType = normalizeCariRole(cariType);
  const normalizedInvoiceType = normalizeInvoiceType(invoiceType);

  if (normalizedCariType === 'Satıcı') {
    if (normalizedInvoiceType === 'Alış') return 'Alacak';
    if (normalizedInvoiceType === 'Satış') return 'Borç';
  }

  if (normalizedInvoiceType === 'Alış') return 'Borç';
  if (normalizedInvoiceType === 'Satış') return 'Alacak';
  return '';
};

const normalizeCompare = (value: string | number | null | undefined) =>
  fixTR(String(value || ''))
    .trim()
    .toLowerCase();

const sortCarisByCode = (items: Cari[]) =>
  [...items].sort((a, b) => {
    const codeCompare = String(a.code || '').localeCompare(String(b.code || ''), 'tr', {
      numeric: true,
      sensitivity: 'base',
    });

    if (codeCompare !== 0) return codeCompare;
    return String(a.name || '').localeCompare(String(b.name || ''), 'tr', { sensitivity: 'base' });
  });

const getInlineFontBase64 = (dataUrl: string) => {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : dataUrl;
};

const registerPdfFonts = (doc: jsPDF) => {
  const pdf = doc as jsPDF & { __trFontsRegistered?: boolean };
  if (pdf.__trFontsRegistered) return;

  doc.addFileToVFS('ArialTR-Regular.ttf', getInlineFontBase64(arialFontInline));
  doc.addFont('ArialTR-Regular.ttf', 'ArialTR', 'normal');
  doc.addFileToVFS('ArialTR-Bold.ttf', getInlineFontBase64(arialBoldFontInline));
  doc.addFont('ArialTR-Bold.ttf', 'ArialTR', 'bold');
  doc.addFileToVFS('ArialTR-Italic.ttf', getInlineFontBase64(arialItalicFontInline));
  doc.addFont('ArialTR-Italic.ttf', 'ArialTR', 'italic');

  pdf.__trFontsRegistered = true;
};

const getInvoiceTypeLabel = (value: string | null | undefined) => {
  const normalized = fixTR(value || '').toLocaleLowerCase('tr-TR');
  if (normalized.includes('sat')) return 'Satış';
  if (normalized.includes('alı') || normalized.includes('ali') || normalized.includes('alış') || normalized.includes('alis')) return 'Alış';
  return fixTR(value || 'Fatura');
};

const enrichInvoicePdfData = (invoiceData: any, caris: Cari[] = []) => {
  const matchedCari = caris.find((c) =>
    String(c.id) === String(invoiceData?.cari_id) ||
    String(c.name || '').trim().toLocaleLowerCase('tr-TR') === String(invoiceData?.cari_name || '').trim().toLocaleLowerCase('tr-TR')
  );

  return {
    ...invoiceData,
    authorized_person: invoiceData?.authorized_person || matchedCari?.authorized_person || '-',
    tax_number: invoiceData?.tax_number || matchedCari?.tax_number || '-',
    phone: invoiceData?.phone || matchedCari?.phone || '-',
  };
};

const writeCacheFileAndGetShareUri = async (path: string, data: string) => {
  const writeResult = await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Cache,
  });

  try {
    const uriResult = await Filesystem.getUri({
      path,
      directory: Directory.Cache,
    });

    return uriResult.uri || writeResult.uri;
  } catch {
    return writeResult.uri;
  }
};

/* --- PDF Helper Functions --- */
const createA5InvoicePDF = (invoiceData: any, stocks: any[], caris: Cari[] = []) => {
  const pdfInvoice = enrichInvoicePdfData(invoiceData, caris);
  // A6 Portrait dimensions (105mm x 148mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a6'
  });
  registerPdfFonts(doc);

  const primaryColor = [79, 70, 229]; // Indigo-600
  const slate400 = [148, 163, 184];
  const slate800 = [30, 41, 59];

  // A6 Portrait is 105mm wide, 148mm high

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 105, 12, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('ArialTR', 'bold');
  doc.text(`${getInvoiceTypeLabel(pdfInvoice.type).toUpperCase()} FATURASI`, 7, 8);

  // Cari Section
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(6);
  doc.text('Cari Bilgileri', 7, 17);

  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  doc.setFontSize(8);
  doc.text(fixTR(pdfInvoice.cari_name), 7, 22);

  const leftDetailLabels = ['Yetkili:', 'Vergi No:', 'Iletisim:'];
  doc.setFontSize(5.9);
  const maxLeftLabelWidth = Math.max(...leftDetailLabels.map((label) => doc.getTextWidth(label)));
  const leftDetailX = 7;
  const leftDetailLabelX = leftDetailX;
  const leftDetailValueX = leftDetailX + maxLeftLabelWidth + 1.2;
  doc.setFontSize(5.9);
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.text('Yetkili:', leftDetailLabelX, 26);
  doc.text('Vergi No:', leftDetailLabelX, 29.3);
  doc.text('Iletisim:', leftDetailLabelX, 32.6);

  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  doc.setFontSize(6.3);
  doc.text(fixTR(pdfInvoice.authorized_person || '-'), leftDetailValueX, 26);
  doc.text(fixTR(pdfInvoice.tax_number || '-'), leftDetailValueX, 29.3);
  doc.text(fixTR(pdfInvoice.phone || '-'), leftDetailValueX, 32.6);

  const topRightLabelX = 83;
  doc.setFontSize(5.9);
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.text('Tarih:', topRightLabelX, 18.5, { align: 'right' });
  doc.text('Saat:', topRightLabelX, 22.5, { align: 'right' });
  doc.text('Fatura No:', topRightLabelX, 26.5, { align: 'right' });

  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  doc.setFontSize(6.4);
  const topRightValueX = 99;
  doc.text(fixTR(pdfInvoice.date), topRightValueX, 18.5, { align: 'right' });
  doc.text(fixTR(pdfInvoice.time || ''), topRightValueX, 22.5, { align: 'right' });
  doc.text(fixTR(pdfInvoice.invoice_no), topRightValueX, 26.5, { align: 'right' });

  // Table
  const tableData = pdfInvoice.items.map((item: any, index: number) => {
    const stok = stocks.find(s => String(s.id) === String(item.stok_id));
    // G?rsel Muhasebe Program? Hesaplamas?:
    // Fiyat her zaman temel birim (ADET) ba?na girilir.
    // temelMiktar = qty  ?arpan; indFiyat? = fiyat  (1-isk%)
    // KDVsiz = temelMiktar  indFiyat?; KDVli = KDVsiz  (1+kdv%)
    const taxRate = item.tax || 0;
    const factor = stok?.conversion_factor || 1;
    const realQty = item.unit_type === 'alt' ? item.qty * factor : item.qty;

    const indFiyati = item.price * (1 - (item.discount || 0) / 100);
    const grossAmount = Math.round(realQty * item.price * 100) / 100;
    const subtotal = Math.round(realQty * indFiyati * 100) / 100;
    const discountAmount = Math.round((grossAmount - subtotal) * 100) / 100;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const lineTotal = Math.round((subtotal + taxAmount) * 100) / 100;

    return [
      index + 1,
      fixTR(stok?.name || 'Bilinmeyen ?r?n'),
      item.qty.toFixed(0), // Miktar?
      fixTR(item.unit_type === 'base' ? stok?.base_unit : (stok?.alt_unit || stok?.base_unit)), // Birimi
      realQty.toFixed(0), // Temel Mik.
      fixTR(stok?.base_unit || ''), // Temel (birim)
      displayPrice(item.price),
      item.discount > 0 ? `%${item.discount}` : '0',
      `%${item.tax}`,
      displayBalance(lineTotal)
    ];
  });

  // Table - Balanced columns for A6 with 5mm margins (95mm total width)
  autoTable(doc, {
    startY: 41,
    head: [['#', 'Stok Adi', 'Mik', 'Brm', 'T.Mik', 'T.Brm', 'Fyt', 'Isk', 'KDV', 'Top']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor as any,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 5.5
    },
    styles: {
      fontSize: 5.5,
      font: 'ArialTR',
      cellPadding: 0.5,
      overflow: 'linebreak',
      minCellHeight: 4
    },
    columnStyles: {
      0: { cellWidth: 4, halign: 'center' },
      1: { cellWidth: 30, halign: 'left' },
      2: { cellWidth: 7, halign: 'right' },
      3: { cellWidth: 8, halign: 'center' },
      4: { cellWidth: 7, halign: 'right' },
      5: { cellWidth: 8, halign: 'center' },
      6: { cellWidth: 8, halign: 'right' },
      7: { cellWidth: 6, halign: 'center' },
      8: { cellWidth: 6, halign: 'center' },
      9: { cellWidth: 11, halign: 'right' }
    },
    margin: { left: 5, right: 5 },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 1) {
        const textValue = Array.isArray(hookData.cell.text)
          ? hookData.cell.text.join(' ')
          : String(hookData.cell.text || '');
        if (textValue.length > 26) {
          hookData.cell.styles.fontSize = 4.2;
        } else if (textValue.length > 20) {
          hookData.cell.styles.fontSize = 4.8;
        }
      }
    }
  });

  const lastTableEnd = (doc as any).lastAutoTable.finalY;
  const finalY = lastTableEnd + 5;


  // Bottom Totals - Calculate using line item results for perfect sync
  let grossTotal = 0;
  let discountTotal = 0;
  let subTotal = 0;
  let kdvTotal = 0;

  pdfInvoice.items.forEach((item: any) => {
    const stok = stocks.find(s => String(s.id) === String(item.stok_id));
    const factor = stok?.conversion_factor || 1;
    const taxRate = item.tax || 0;
    const realQty = item.unit_type === 'alt' ? item.qty * factor : item.qty;

    const indFiyati = item.price * (1 - (item.discount || 0) / 100);
    const gross = Math.round(realQty * item.price * 100) / 100;
    const sub = Math.round(realQty * indFiyati * 100) / 100;
    const disc = Math.round((gross - sub) * 100) / 100;
    const tax = Math.round(sub * (taxRate / 100) * 100) / 100;

    grossTotal += gross;
    discountTotal += disc;
    subTotal += sub;
    kdvTotal += tax;
  });

  // Calculate the widest line to determine box width (A6 larger fonts)
  doc.setFontSize(10.5);
  doc.setFont('ArialTR', 'normal');
  const toplamLabel = 'Toplam:';
  const toplamLabelWidth = doc.getTextWidth(toplamLabel);
  doc.setFont('ArialTR', 'bold');
  const toplamValue = displayBalance(grossTotal);
  const toplamValueWidth = doc.getTextWidth(toplamValue);
  const toplamTotalWidth = toplamLabelWidth + 1 + toplamValueWidth;

  doc.setFont('ArialTR', 'normal');
  const iskLabel = 'Isk.Toplami:';
  const iskLabelWidth = doc.getTextWidth(iskLabel);
  doc.setFont('ArialTR', 'bold');
  const iskValue = displayBalance(discountTotal);
  const iskValueWidth = doc.getTextWidth(iskValue);
  const iskTotalWidth = iskLabelWidth + 1 + iskValueWidth;

  doc.setFont('ArialTR', 'normal');
  const araLabel = 'Ara Toplam:';
  const araLabelWidth = doc.getTextWidth(araLabel);
  doc.setFont('ArialTR', 'bold');
  const araValue = displayBalance(subTotal);
  const araValueWidth = doc.getTextWidth(araValue);
  const araTotalWidth = araLabelWidth + 1 + araValueWidth;

  doc.setFont('ArialTR', 'normal');
  const kdvLabel = 'Odenecek KDV:';
  const kdvLabelWidth = doc.getTextWidth(kdvLabel);
  doc.setFont('ArialTR', 'bold');
  const kdvValue = displayBalance(kdvTotal);
  const kdvValueWidth = doc.getTextWidth(kdvValue);
  const kdvTotalWidth = kdvLabelWidth + 1 + kdvValueWidth;

  // Find the widest line and add padding
  const maxContentWidth = Math.max(toplamTotalWidth, iskTotalWidth, araTotalWidth, kdvTotalWidth);

  // Grand Total Highlight - Calculate width first for A6 (105mm width)
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('ArialTR', 'bold');
  const genelLabel = 'Genel Toplam:';
  const genelLabelWidth = doc.getTextWidth(genelLabel);
  doc.setFontSize(12);
  const genelValue = displayBalance(subTotal + kdvTotal);
  const genelValueWidth = doc.getTextWidth(genelValue);
  
  // Calculate narrow box width based on content
  const genelBoxWidth = genelLabelWidth + 1 + genelValueWidth + 6; // 6mm for padding (3mm each side)
  const genelBoxX = 105 - 5 - genelBoxWidth; // Right aligned with 5mm margin for A6
  
  // Use genelBoxWidth for totals box to match alignment
  const totalsBoxWidth = genelBoxWidth;
  const totalsBoxX = genelBoxX;
  
  // Redraw totals box with matching width
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsBoxX, finalY, totalsBoxWidth, 18, 2, 2, 'F');

  doc.setFontSize(10.5);
  
  let yPos2 = finalY + 5;
  const lineHeight2 = 4;
  
  // Toplam - Label left, value right
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.setFont('ArialTR', 'normal');
  doc.text(toplamLabel, totalsBoxX + 2, yPos2);
  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  doc.setFont('ArialTR', 'bold');
  doc.text(toplamValue, totalsBoxX + totalsBoxWidth - 2, yPos2, { align: 'right' });
  
  // ?sk.Toplamı - Label left, value right
  yPos2 += lineHeight2;
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.setFont('ArialTR', 'normal');
  doc.text(iskLabel, totalsBoxX + 2, yPos2);
  doc.setTextColor(220, 38, 38);
  doc.setFont('ArialTR', 'bold');
  doc.text(iskValue, totalsBoxX + totalsBoxWidth - 2, yPos2, { align: 'right' });
  
  // Ara Toplam - Label left, value right
  yPos2 += lineHeight2;
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.setFont('ArialTR', 'normal');
  doc.text(araLabel, totalsBoxX + 2, yPos2);
  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  doc.setFont('ArialTR', 'bold');
  doc.text(araValue, totalsBoxX + totalsBoxWidth - 2, yPos2, { align: 'right' });
  
  // ?denecek KDV - Label left, value right
  yPos2 += lineHeight2;
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.setFont('ArialTR', 'normal');
  doc.text(kdvLabel, totalsBoxX + 2, yPos2);
  doc.setTextColor(16, 185, 129);
  doc.setFont('ArialTR', 'bold');
  doc.text(kdvValue, totalsBoxX + totalsBoxWidth - 2, yPos2, { align: 'right' });
  
  // Draw Grand Total box
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(genelBoxX, finalY + 20, genelBoxWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(genelLabel, genelBoxX + genelBoxWidth - 2 - genelValueWidth - 1 - genelLabelWidth, finalY + 27);
  doc.setFontSize(12);
  doc.text(genelValue, genelBoxX + genelBoxWidth - 2, finalY + 27, { align: 'right' });

  // Footer text adjusted for portrait height (210mm max)
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(6);
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.setFont('ArialTR', 'italic');
  doc.text('Bu belge On Muhasebe sistemi tarafindan olusturulmustur.', 74, pageHeight - 8, { align: 'center' });

  return doc;
};

const generateA5InvoicePDF = async (invoiceData: any, stocks: any[], caris: Cari[] = []) => {
  const doc = createA5InvoicePDF(invoiceData, stocks, caris);
  const fileName = `Fatura_${fixTR(invoiceData.invoice_no)}.pdf`;

  try {
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    const shareUri = await writeCacheFileAndGetShareUri(fileName, pdfBase64);

    // Share it (this acts as "Download" on mobile by giving options to save)
    await Share.share({
      title: 'Fatura İndir',
      text: `${fixTR(invoiceData.cari_name)} adına düzenlenen fatura.`,
      url: shareUri,
      dialogTitle: 'Faturayı Kaydet veya Aç'
    });
  } catch (error) {
    console.error('PDF Generation/Share error:', error);
    // Fallback for desktop/web
    doc.save(fileName);
  }
};

/* WhatsApp Share Link Generator */
const shareInvoiceOnWhatsApp = async (invoiceData: any, stocks: any[], caris: Cari[] = []) => {
  const doc = createA5InvoicePDF(invoiceData, stocks, caris);
  const fileName = `Fatura_${fixTR(invoiceData.invoice_no)}.pdf`;

  try {
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    const shareUri = await writeCacheFileAndGetShareUri(fileName, pdfBase64);

    // Use Capacitor Share plugin for true file sharing
    await Share.share({
      title: `Fatura: ${fixTR(invoiceData.invoice_no)}`,
      text: `${fixTR(invoiceData.cari_name)} adına düzenlenen fatura detayı ekte yer almaktadır.`,
      url: shareUri,
      dialogTitle: 'Faturayı Paylaş'
    });
  } catch (err) {
    console.warn('Native sharing failed, falling back to WhatsApp text share:', err);

    // Fallback: Detailed Text Share (Hareketlerin tamam?)
    const itemsText = invoiceData.items.map((item: any) => {
      const stok = stocks.find(s => String(s.id) === String(item.stok_id));
      const factor = stok?.conversion_factor || 1;
      const realQty = item.unit_type === 'alt' ? item.qty * factor : item.qty;
      const indFiyati = item.price * (1 - (item.discount || 0) / 100);
      const grossAmount = Math.round(realQty * item.price * 100) / 100;
      const sub = Math.round(realQty * indFiyati * 100) / 100;
      const discountAmount = Math.round((grossAmount - sub) * 100) / 100;
      const taxAmount = Math.round(sub * ((item.tax || 0) / 100) * 100) / 100;
      const lineTotal = sub + taxAmount;
      const unitLabel = item.unit_type === 'base' ? stok?.base_unit : stok?.alt_unit;

      return `- ${fixTR(stok?.name || 'Ürün')}\n  ${item.qty} ${fixTR(unitLabel)} x ₺${item.price.toLocaleString('tr-TR')} = ₺${lineTotal.toLocaleString('tr-TR')}`;
    }).join('\n');

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
      }).format(amount);
    };

    const text = `*${fixTR(invoiceData.type)} FATURASI*\n` +
      `--------------------------\n` +
      `*Fatura No:* ${fixTR(invoiceData.invoice_no)}\n` +
      `*Cari:* ${fixTR(invoiceData.cari_name)}\n` +
      `*Tarih:* ${displayDate(fixTR(invoiceData.date))}\n` +
      `*Toplam Tutar:* ${formatCurrency(invoiceData.total_amount)}\n\n` +
      `*HAREKETLER:* \n` +
      itemsText +
      `\n\n_Bu fatura Ön Muhasebe sistemi ile paylaşılmıştır._`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }
};


const capitalizeFirst = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// --- Components ---

const Login = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  useEffect(() => {
    // Beni hat1rla kontrolï¿½
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }

    // 0lk yï¿½klemede eski verileri temizle (sadece bir kez)
    const isFirstLoad = !localStorage.getItem('app_initialized');
    if (isFirstLoad) {
      console.log('First load detected, clearing old data...');
      localStorage.clear();
      localStorage.setItem('app_initialized', 'true');
      if (savedEmail) localStorage.setItem('rememberedEmail', savedEmail);
    }

    const isNativeApp =
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'ionic:' ||
      !!(window as any).Capacitor?.isNativePlatform?.();

    if (isNativeApp) {
      setServerStatus('online');
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) setServerStatus('online');
        else setServerStatus('offline');
      } catch (e) {
        setServerStatus('offline');
      }
    };
    checkStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        if (password !== passwordConfirm) {
          setError('Şifreler eşleşmiyor!');
          setLoading(false);
          return;
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
          setError('Şifre en az bir büyük ve bir küçük harf içermelidir.');
          setLoading(false);
          return;
        }

        console.log('Kayıt denemesi:', { email });
        const result = await API.register(email, password, fullName, phone);
        if (result.success) {
          console.log('Kayıt başarılı:', result.user);
          alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
          setIsRegistering(false);
        } else {
          setError((result as any).message || 'Kayıt sırasında hata oluştu');
        }
      } else {
        console.log('Giriş denemesi:', { email });
        const result = await API.login(email, password, rememberMe);

        if (result.success) {
          console.log('Giriş başarılı:', result.user);
          // Beni hat1rla mant1ï¿½x1
          if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
          } else {
            localStorage.removeItem('rememberedEmail');
          }
          onLogin(result.user);
        } else {
          setError((result as any).message || 'E-posta veya şifre hatalı');
        }
      }
    } catch (err: any) {
      console.error('Giriş hatası detayı:', err);
      // Firebase hata mesaj1n1 veya kodunu gï¿½ster
      const errorMessage = err.message || (err.code ? `Hata Kodu: ${err.code}` : 'Bağlantı hatası oluştu');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Şifre sıfırlamak için lütfen e-posta adresinizi girin.');
      return;
    }
    setLoading(true);
    setError('');
    setResetMessage('');
    try {
      const result = await API.resetPassword(email);
      if (result.success) {
        setResetMessage(result.message);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError('Şifre sıfırlama işlemi başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] flex items-center justify-center relative font-sans bg-[#131b31] p-3 sm:p-6 overflow-hidden">
      {/* Stable Premium Background Globs */}
      <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-indigo-400/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="max-w-md w-full relative z-10"
      >
        <div className={`bg-blue-50/50/95 backdrop-blur-3xl rounded-[2rem] sm:rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.3)] ${isRegistering ? 'p-4 sm:p-10' : 'p-5 sm:p-10'} border border-white/40 ring-1 ring-white/20 relative overflow-hidden transition-all duration-300`}>
          <div className={`text-center ${isRegistering ? 'mb-4 sm:mb-10' : 'mb-6 sm:mb-10'} relative`}>
            <motion.div
              initial={{ scale: 0.5, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", damping: 10 }}
              className={`bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 ${isRegistering ? 'w-12 h-12 sm:w-20 sm:h-20 mb-2 sm:mb-8' : 'w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-8'} rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/40 relative group`}
            >
              <div className="absolute inset-0 bg-blue-50/50/20 rounded-3xl animate-pulse group-hover:hidden" />
              <LayoutDashboard className={`${isRegistering ? 'text-white w-7 h-7 sm:w-10 sm:h-10' : 'text-white w-10 h-10'} drop-shadow-lg`} />
            </motion.div>

            <h1 className={`${isRegistering ? 'text-2xl sm:text-3xl' : 'text-3xl'} font-black text-slate-800 tracking-tight mb-1 sm:mb-2`}>
              Ön Muhasebe
            </h1>

            <div className={`inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full ${isRegistering ? 'mb-2 sm:mb-6' : 'mb-3 sm:mb-6'}`}>
              <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' :
                serverStatus === 'offline' ? 'bg-red-500 animate-pulse' : 'bg-slate-300 animate-pulse'
                }`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900/40">
                {serverStatus === 'online' ? 'Sistem Aktif' :
                  serverStatus === 'offline' ? 'Sistem Kapalı' : 'Bağlanıyor...'}
              </span>
            </div>

            {!isRegistering && <p className="text-indigo-900/60 font-bold text-sm leading-relaxed">{'Kontrol paneline güvenle erişin'}</p>}
          </div>

          <form onSubmit={handleSubmit} className={`${isRegistering ? 'space-y-2.5 sm:space-y-5' : 'space-y-4 sm:space-y-5'} relative`}>
            <div className={`${isRegistering ? 'space-y-1' : 'space-y-1.5'}`}>
              <label className="block text-[9px] sm:text-[10px] font-black text-indigo-900/30 uppercase tracking-[0.2em] ml-2">E-posta</label>
              <input
                type="text"
                className="w-full bg-blue-50/50 border-2 border-slate-100 rounded-[1rem] sm:rounded-[1.5rem] px-4 sm:px-6 py-2.5 sm:py-4 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-sm"
                placeholder=""
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); setResetMessage(''); }}
                required
              />
            </div>

            {isRegistering && (
              <>
                <div className="space-y-1">
                  <label className="block text-[9px] sm:text-[10px] font-black text-indigo-900/30 uppercase tracking-[0.2em] ml-2">Ad Soyad</label>
                  <input
                    type="text"
                    className="w-full bg-blue-50/50 border-2 border-slate-100 rounded-[1rem] sm:rounded-[1.5rem] px-4 sm:px-6 py-2.5 sm:py-4 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-sm"
                    placeholder="Adınız ve Soyadınız"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setError(''); }}
                    required={isRegistering}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] sm:text-[10px] font-black text-indigo-900/30 uppercase tracking-[0.2em] ml-2">Telefon</label>
                  <input
                    type="tel"
                    className="w-full bg-blue-50/50 border-2 border-slate-100 rounded-[1rem] sm:rounded-[1.5rem] px-4 sm:px-6 py-2.5 sm:py-4 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-sm"
                    placeholder="05xxxxxxxxx"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(''); }}
                    required={isRegistering}
                  />
                </div>
              </>
            )}

            <div className={`${isRegistering ? 'space-y-1' : 'space-y-1.5'}`}>
              <div className="flex justify-between items-center ml-2">
                <label className="block text-[9px] sm:text-[10px] font-black text-indigo-900/30 uppercase tracking-[0.2em]">Şifre</label>
                {!isRegistering && (
                  <button type="button" onClick={handleResetPassword} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors uppercase tracking-tight">Şifremi Unuttum?</button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-blue-50/50 border-2 border-slate-100 rounded-[1rem] sm:rounded-[1.5rem] px-4 sm:px-6 py-2.5 sm:py-4 pr-12 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-sm"
                  placeholder=""
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div className="space-y-1">
                <label className="block text-[9px] sm:text-[10px] font-black text-indigo-900/30 uppercase tracking-[0.2em] ml-2">Şifre Tekrar</label>
                <div className="relative">
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    className="w-full bg-blue-50/50 border-2 border-slate-100 rounded-[1rem] sm:rounded-[1.5rem] px-4 sm:px-6 py-2.5 sm:py-4 pr-12 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-sm"
                    placeholder=""
                    value={passwordConfirm}
                    onChange={(e) => { setPasswordConfirm(e.target.value); setError(''); }}
                    required={isRegistering}
                  />
                  <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors">
                    {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {!isRegistering && (
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="rememberMe" className="text-xs font-bold text-slate-400 uppercase tracking-wide select-none cursor-pointer">Beni Hatırla</label>
              </div>
            )}

            {resetMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-emerald-700 text-xs font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center gap-2"
              >
                <Check size={14} className="text-emerald-500" />
                {resetMessage}
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-700 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`relative overflow-hidden w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black ${isRegistering ? 'py-3.5 sm:py-5' : 'py-4 sm:py-5'} rounded-[1rem] sm:rounded-[1.5rem] shadow-xl shadow-indigo-500/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group uppercase tracking-widest text-sm`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">Yükleniyor...</span>
                </>
              ) : (
                <>
                  <span className="text-sm">{isRegistering ? 'KAYIT OL' : 'GİRİŞ YAP'}</span>
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                className="text-slate-400 hover:text-indigo-600 transition-colors text-[11px] font-bold uppercase tracking-wider"
              >
                {isRegistering ? 'Zaten hesabınız var mı? Giriş Yapın' : 'Yeni Kayıt Oluştur'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-white/30 mt-6 sm:mt-10 text-center font-black tracking-[0.3em] uppercase">
          Ömür Teknoloji " v2.0
        </p>
      </motion.div>
    </div>
  );
};

// Utility: Güvenli bakiye hesaplama
const safeBalance = (balance: any): number => {
  if (balance === undefined || balance === null || balance === '') return 0;
  const parsed = parseFloat(String(balance));
  return isNaN(parsed) ? 0 : parsed;
};

const normalizeInvoiceItems = (items: any): Invoice['items'] => {
  let parsedItems = items;

  if (typeof items === 'string') {
    try {
      parsedItems = JSON.parse(items);
    } catch {
      parsedItems = [];
    }
  }

  if (!Array.isArray(parsedItems)) return [];

  return parsedItems.map((item: any) => ({
    stok_id: item?.stok_id ?? '',
    qty: Number(item?.qty) || 0,
    unit_type: item?.unit_type === 'alt' ? 'alt' : 'base',
    price: Number(item?.price) || 0,
    discount: Number(item?.discount) || 0,
    tax: Number(item?.tax) || 0,
  }));
};

const normalizeInvoice = (invoice: any): Invoice => ({
  id: invoice?.id ?? '',
  cari_id: invoice?.cari_id ?? '',
  cari_name: String(invoice?.cari_name || ''),
  type: normalizeInvoiceType(invoice?.type, invoice?.invoice_no),
  invoice_no: String(invoice?.invoice_no || '---'),
  date: String(invoice?.date || ''),
  time: invoice?.time ? String(invoice.time) : '',
  total_amount: Number(invoice?.total_amount) || 0,
  items: normalizeInvoiceItems(invoice?.items),
});

const computeCariBalances = (caris: Cari[], invoices: Invoice[], transactions: any[]): Cari[] =>
  caris.map((cari) => {
    const invoiceBalance = invoices.reduce((sum, inv) => {
      if (String(inv.cari_id) !== String(cari.id)) return sum;
      const amount = Number(inv.total_amount) || 0;
      const invoiceLedgerType = getCariInvoiceLedgerType(cari.type, inv.type);
      if (invoiceLedgerType === 'Alacak') return sum + amount;
      if (invoiceLedgerType === 'Borç') return sum - amount;
      return sum;
    }, 0);

    const transactionBalance = transactions.reduce((sum, tx) => {
      if (String(tx?.cari_id ?? '') !== String(cari.id)) return sum;
      const amount = Number(tx?.amount) || 0;
      const txType = normalizeCariTransactionType(tx?.type);
      if (txType === 'Borç') return sum - amount;
      if (txType === 'Alacak') return sum + amount;
      return sum;
    }, 0);

    return {
      ...cari,
      balance: invoiceBalance + transactionBalance,
    };
  });

const computeStockQuantities = (stocks: Stok[], invoices: Invoice[]): Stok[] =>
  stocks.map((stock) => {
    const quantity = invoices.reduce((sum, invoice) => {
      const normalizedInvoiceType = normalizeInvoiceType(invoice.type, invoice.invoice_no);

      const invoiceQty = (invoice.items || []).reduce((itemSum, item) => {
        if (String(item?.stok_id ?? '') !== String(stock.id)) return itemSum;
        const rawQty = Number(item?.qty) || 0;
        const factor = Number(stock.conversion_factor) || 1;
        const realQty = item?.unit_type === 'alt' ? rawQty * factor : rawQty;
        return itemSum + realQty;
      }, 0);

      if (normalizedInvoiceType === 'Alış') return sum + invoiceQty;
      if (normalizedInvoiceType === 'Satış') return sum - invoiceQty;
      return sum;
    }, 0);

    return {
      ...stock,
      quantity,
    };
  });



const generateMovementPDF = async (tx: any, cariName: string, settings: any) => {
  const isBorc = tx.type === 'Borç';
  const belgeAdi = isBorc ? 'ÖDEME BELGESİ' : 'TAHSİLAT BELGESİ';
  const firmaAdi = settings?.company_name || 'Ön Muhasebe';
  const firmaAdres = settings?.address || '';
  const firmaTel = settings?.phone || '';

  const doc = new jsPDF({ format: 'a6', orientation: 'portrait', unit: 'mm' });
  registerPdfFonts(doc);
  doc.setFont('ArialTR', 'normal');

  const W = 105, pad = 6;

  // Başlık kutusu
  doc.setFillColor(isBorc ? 220 : 34, isBorc ? 38 : 197, isBorc ? 127 : 94);
  doc.roundedRect(pad, 4, W - pad * 2, 14, 2, 2, 'F');
  doc.setFont('ArialTR', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(belgeAdi, W / 2, 13, { align: 'center' });

  // Firma bilgisi
  doc.setTextColor(30, 30, 30);
  doc.setFont('ArialTR', 'bold');
  doc.setFontSize(10);
  doc.text(firmaAdi, W / 2, 23, { align: 'center' });
  if (firmaAdres) { doc.setFont('ArialTR', 'normal'); doc.setFontSize(8); doc.text(firmaAdres, W / 2, 28, { align: 'center' }); }
  if (firmaTel) { doc.setFontSize(8); doc.text(`Tel: ${firmaTel}`, W / 2, 32, { align: 'center' }); }

  // Çizgi
  let y = firmaAdres || firmaTel ? 36 : 28;
  doc.setDrawColor(200, 200, 200);
  doc.line(pad, y, W - pad, y);
  y += 5;

  // Bilgi satırları
  const rows = [
    ['Makbuz No', tx.makbuz_no || '-'],
    ['Tarih', tx.date || '-'],
    ['Saat', tx.time || '-'],
    ['Cari', cariName],
    ['Tür', tx.islem_turu || 'Nakit'],
    ['Açıklama', tx.description || '-'],
  ];

  doc.setFontSize(9);
  for (const [label, val] of rows) {
    doc.setFont('ArialTR', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(label + ':', pad, y);
    doc.setFont('ArialTR', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(String(val), pad + 28, y);
    y += 6;
  }

  // Tutar kutusu
  y += 2;
  doc.setFillColor(isBorc ? 254 : 240, isBorc ? 226 : 253, isBorc ? 226 : 244);
  doc.roundedRect(pad, y, W - pad * 2, 14, 2, 2, 'F');
  doc.setFont('ArialTR', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(isBorc ? 185 : 22, isBorc ? 28 : 163, isBorc ? 28 : 74);
  doc.text(isBorc ? 'ÖDEME TUTARI' : 'TAHSİLAT TUTARI', W / 2, y + 5, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`₺${Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, W / 2, y + 12, { align: 'center' });

  // İmza çizgisi
  y += 22;
  doc.setDrawColor(180, 180, 180);
  doc.line(pad, y, W / 2 - 4, y);
  doc.line(W / 2 + 4, y, W - pad, y);
  doc.setFont('ArialTR', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Teslim Eden', pad + 8, y + 4);
  doc.text('Teslim Alan', W / 2 + 12, y + 4);

  const pdfBase64 = doc.output('datauristring').split(',')[1];
  const fileName = `${isBorc ? 'odeme' : 'tahsilat'}_${tx.makbuz_no || Date.now()}.pdf`;

  try {
    const { uri } = await Filesystem.writeFile({ path: fileName, data: pdfBase64, directory: Directory.Cache });
    await Share.share({ title: belgeAdi, url: uri, dialogTitle: `${belgeAdi} Paylaş` });
  } catch {
    doc.save(fileName);
  }
};

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button 
    onClick={onClick} 
    className="p-2 -ml-2 mr-1 text-slate-600 hover:text-indigo-600 active:scale-95 transition-all outline-none"
  >
    <ArrowLeft size={24} />
  </button>
);

const InventoryView = ({ stocks }: { stocks: Stok[] }) => {
  const [mode, setMode] = React.useState<'adet' | 'koli'>('adet');
  // Sıfır hariç hepsini göster (negatif dahil)
  const filtered = [...stocks]
    .filter(s => safeBalance(s.quantity) !== 0)
    .sort((a, b) => a.code.localeCompare(b.code))
    .filter((s, i, arr) => arr.findIndex(x => x.code === s.code && x.name === s.name) === i);

  const getDisplay = (s: Stok) => {
    if (mode === 'adet') {
      return { qty: safeBalance(s.quantity), unit: s.base_unit };
    }
    if (s.alt_unit && s.conversion_factor > 0) {
      const koli = safeBalance(s.quantity) / s.conversion_factor;
      return { qty: Math.floor(koli * 1000) / 1000, unit: s.alt_unit };
    }
    return { qty: safeBalance(s.quantity), unit: s.base_unit };
  };

  return (
    <div>
      <div className="flex gap-2 p-2 pb-0">
        <button
          onClick={() => setMode('adet')}
          className={`flex-1 py-2 rounded-xl font-black text-sm uppercase tracking-wide transition-all ${mode === 'adet' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'}`}
        >
          Adet Bazında
        </button>
        <button
          onClick={() => setMode('koli')}
          className={`flex-1 py-2 rounded-xl font-black text-sm uppercase tracking-wide transition-all ${mode === 'koli' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'}`}
        >
          Koli Bazında
        </button>
      </div>
      <div className="divide-y divide-slate-100 mt-2">
        {filtered.map((s, index) => {
          const { qty, unit } = getDisplay(s);
          const isNegative = qty < 0;
          return (
            <div key={s.id} className={`flex items-center px-2 py-1.5 ${isNegative ? 'bg-red-50' : index % 2 === 0 ? 'bg-blue-50/50' : 'bg-white'}`}>
              <div className="flex-1 min-w-0 font-black text-[15px] text-slate-900 leading-none uppercase tracking-tight whitespace-nowrap overflow-hidden text-ellipsis pr-2">
                <span className="text-indigo-600/50 mr-3 font-bold">{s.code}</span>
                {s.name}
              </div>
              <div className={`shrink-0 font-black text-[15px] whitespace-nowrap ${isNegative ? 'text-red-600' : 'text-slate-800'}`}>
                {qty.toLocaleString('tr-TR')} <span className="text-[11px] font-bold text-slate-400">{unit}</span>
                {isNegative && <span className="ml-1 text-[10px] font-black text-red-500">⚠</span>}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400 font-bold">Stokta ürün yok</div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [subView, setSubView] = useState<string>('list');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Data States
  const [caris, setCaris] = useState<Cari[]>([]);
  const [stocks, setStocks] = useState<Stok[]>([]);
  const [kasaData, setKasaData] = useState<{ transactions: KasaTransaction[], balance: number }>({ transactions: [], balance: 0 });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: number, username: string, role: string }[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [transactions, setTransactions] = useState<any[]>([]);

  // Invoice Form State (Moved from render function to fix Hooks violation)
  const [selectedStok, setSelectedStok] = useState<Stok | null>(null);
  const [editingStok, setEditingStok] = useState<Stok | null>(null);
  const [editingCari, setEditingCari] = useState<Cari | null>(null);
  const [invoiceType, setInvoiceType] = useState<'Alış' | 'Satış'>('Satış');
  const [invoiceItems, setInvoiceItems] = useState<{ stok_id: string | number, qty: number, unit_type: 'base' | 'alt', price: number, discount: number, tax: number }[]>([]);
  const [selectedCariId, setSelectedCariId] = useState<string | number | ''>('');
  const [isCariModalOpen, setIsCariModalOpen] = useState(false);
  const [isStokModalOpen, setIsStokModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);

  // Cari payment/movement states
  const [selectedCariForPayment, setSelectedCariForPayment] = useState<string | number | null>(null);
  const [selectedCariForMovement, setSelectedCariForMovement] = useState<string | number | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [movementSortOrder, setMovementSortOrder] = useState<'asc' | 'desc'>('desc');
  const [movementDate, setMovementDate] = useState<string>('');
  const [movementTime, setMovementTime] = useState<string>('');

  // Cari list sorting states
  const [cariSortBy, setCariSortBy] = useState<'name' | 'code' | 'balance' | 'date'>('date');
  const [cariSortOrder, setCariSortOrder] = useState<'asc' | 'desc'>('desc');

  // Migration States
  const [migrating, setMigrating] = useState(false);
  const [fromEmail, setFromEmail] = useState('Bilinmiyor');
  const [toEmail, setToEmail] = useState('selahattin50@gmail.com');
  const [scanningCloudData, setScanningCloudData] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [scanReport, setScanReport] = useState('');
  const [uploadingLocalData, setUploadingLocalData] = useState(false);

  const isSuperAdmin = user?.email?.toLowerCase() === 'selahattin50@gmail.com';

  useEffect(() => {
    // Source strings are kept directly in Turkish now.
    // Avoid mutating rendered DOM text nodes because that was re-corrupting
    // labels such as dashboard cards and the login button on Android.
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Anasayfa', icon: LayoutDashboard, roles: ['Yönetici', 'Muhasebeci', 'Kasiyer'] },
    { id: 'cari', label: 'Cari Hesaplar', icon: Users, roles: ['Yönetici', 'Muhasebeci'] },
    { id: 'fatura', label: 'Faturalar', icon: FileText, roles: ['Yönetici', 'Muhasebeci', 'Kasiyer'] },
    { id: 'stok', label: 'Stok Yönetimi', icon: Package, roles: ['Yönetici', 'Muhasebeci'] },
    { id: 'kasa', label: 'Ana Kasa', icon: Wallet, roles: ['Yönetici', 'Kasiyer'] },
    { id: 'users', label: 'Ayarlar', icon: Settings, roles: ['Yönetici'] },
  ];

  const hasPermission = (_viewId: string) => {
    if (!user) return false;
    return true; // Tüm kullanıcılar tüm alanlara erişebilir
  };

  
  const handleGlobalBack = async () => {
    if (!user) return;

    if (view === 'dashboard') {
      CapApp.exitApp();
    } else {
      // Define root sub-views for each module
      const isModuleRoot =
        (view === 'cari' && subView === 'menu') ||
        (view === 'stok' && subView === 'selection') ||
        (view === 'fatura' && subView === 'create_selection') ||
        (view === 'kasa' && subView === 'list') ||
        (view === 'users' && subView === 'list');

      if (isModuleRoot) {
        setView('dashboard');
      } else {
        // We are in a deeper level (List, Add, Edit, etc.), go to module root
        if (view === 'stok') setSubView('selection');
        else if (view === 'cari') setSubView('menu');
        else if (view === 'fatura') setSubView('create_selection');
        else setView('dashboard');
      }
    }
  };

  useEffect(() => {
    const listener = CapApp.addListener('backButton', handleGlobalBack);
    return () => {
      listener.then(l => l.remove());
    };
  }, [user, view, subView]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, view]);

  // Reset cari selection states when subView changes
  useEffect(() => {
    if (subView !== 'payments') {
      setSelectedCariForPayment(null);
    }
    if (subView !== 'movements' && subView !== 'movement_entry') {
      setSelectedCariForMovement(null);
    }
  }, [subView]);

  const fetchData = async () => {
    try {
      // Firebase veya Local Server'dan veri ?ek
      const [caris, stocks, kasa, invoices, users, settings, transactions] = await Promise.all([
        API.fetchCaris().catch(() => []),
        API.fetchStocks().catch(() => []),
        API.fetchKasa().catch(() => ({ transactions: [], balance: 0 })),
        API.fetchInvoices().catch(() => []),
        API.fetchUsers().catch(() => []),
        API.fetchSettings().catch(() => ({})),
        API.fetchTransactions().catch(() => [])
      ]);

      const normalizedInvoices = invoices.map(normalizeInvoice);
      const computedStocks = computeStockQuantities(stocks, normalizedInvoices);
      const computedCaris = computeCariBalances(caris, normalizedInvoices, transactions);
      const sortedCaris = sortCarisByCode(computedCaris);
      setCaris(sortedCaris);
      setStocks(computedStocks);
      setKasaData(kasa);
      setInvoices(normalizedInvoices);
      setAllUsers(users);
      setSettings(settings);
      setTransactions(transactions);

      // LocalStorage'a yedek olarak kaydet
      localStorage.setItem('caris', JSON.stringify(sortedCaris));
      localStorage.setItem('stocks', JSON.stringify(computedStocks));
      localStorage.setItem('kasa', JSON.stringify(kasa));
      localStorage.setItem('invoices', JSON.stringify(normalizedInvoices));
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('settings', JSON.stringify(settings));
      localStorage.setItem('transactions', JSON.stringify(transactions));
    } catch (error) {
      console.error('Veri y?kleme hatas?:', error);
      // Hata durumunda LocalStorage'dan y?kle
      const fallbackCaris = JSON.parse(localStorage.getItem('caris') || '[]');
      const fallbackStocks = JSON.parse(localStorage.getItem('stocks') || '[]');
      const fallbackKasa = JSON.parse(localStorage.getItem('kasa') || '{"transactions":[],"balance":0}');
      const fallbackInvoices = JSON.parse(localStorage.getItem('invoices') || '[]').map(normalizeInvoice);
      const fallbackTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');

      setCaris(sortCarisByCode(computeCariBalances(fallbackCaris, fallbackInvoices, fallbackTransactions)));
      setStocks(computeStockQuantities(fallbackStocks, fallbackInvoices));
      setKasaData(fallbackKasa);
      setInvoices(fallbackInvoices);
      setAllUsers(JSON.parse(localStorage.getItem('users') || '[]'));
      setSettings(JSON.parse(localStorage.getItem('settings') || '{}'));
      setTransactions(fallbackTransactions);
    }
  };

  if (!user) {
    return <Login onLogin={(nextUser) => setUser(normalizeUser(nextUser))} />;
  }

  const renderDashboard = () => {
    const dashboardCards = [
      { id: 'cari', label: 'Cari Hesaplar', desc: 'Müşteri ve tedarikçi yönetimi', icon: Users, color: 'bg-indigo-500', light: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', action: () => { setView('cari'); setSubView('menu'); } },
      { id: 'fatura', label: 'Fatura Yönetimi', desc: 'Alış ve satış faturaları', icon: FileText, color: 'bg-purple-500', light: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', action: () => { setView('fatura'); setSubView('create_selection'); } },
      { id: 'stok', label: 'Stok Yönetimi', desc: 'Ürün ve envanter takibi', icon: Package, color: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700', action: () => { setView('stok'); setSubView('selection'); } },
      { id: 'kasa', label: 'Kasa Yönetimi', desc: 'Nakit akışı ve bakiye takibi', icon: Wallet, color: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', action: () => { setView('kasa'); setSubView('list'); } },
    ].filter(item => hasPermission(item.id));

    const dashboardQuickActions = [
      {
        id: 'quick-menu',
        label: 'Hızlı Menü',
        desc: 'Bölümlere hızlı geç',
        icon: Menu,
        accent: 'from-indigo-500 to-blue-500',
        action: () => setIsSidebarOpen(true),
        visible: true,
      },
      {
        id: 'quick-settings',
        label: 'Ayarlar',
        desc: 'Üyeleri görüntüle',
        icon: Settings,
        accent: 'from-slate-800 to-slate-600',
        action: () => setView('users'),
        visible: hasPermission('users'),
      },
    ].filter(item => item.visible);

    return (
      <div className="flex flex-col h-full bg-blue-50/50 overflow-hidden">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4 relative">
          <div className="pt-2"></div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pt-1 space-y-2.5">
          {dashboardCards.map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ x: 8 }}
              whileTap={{ scale: 0.99 }}
              onClick={item.action}
              className={`p-3.5 rounded-[1.8rem] shadow-sm border ${item.light} ${item.border} cursor-pointer group hover:shadow-lg transition-all`}
            >
              <div className="flex items-center gap-4">
                <div className={`${item.color} p-3 rounded-xl text-white shadow-md`}>
                  <item.icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-black ${item.text} tracking-tight group-hover:scale-105 transition-transform origin-left uppercase`}>{item.label}</h3>
                  <p className={`${item.text} opacity-70 text-[10px] font-bold uppercase tracking-wider mt-0.5`}>{item.desc}</p>
                </div>
                <ChevronRight className={`${item.text} opacity-30 group-hover:translate-x-1 group-hover:opacity-100 transition-all`} size={20} />
              </div>
            </motion.div>
          ))}
        </div>

        {dashboardQuickActions.length > 0 && (
          <div className="w-full max-w-2xl">
            <div className={`grid gap-2.5 ${dashboardQuickActions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {dashboardQuickActions.map((item) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-3 text-left shadow-sm hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${item.accent} text-white flex items-center justify-center shadow-lg shrink-0`}>
                      <item.icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight leading-tight">{item.label}</div>
                      <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-1 leading-tight">{item.desc}</div>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" size={18} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setUser(null)}
          className="flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-medium"
        >
          <ArrowRight size={16} /> Güvenli Çıkış Yap
        </button>
        </div>
      </div>
    );
  };

  const renderCari = () => {
    const resolveCariFromEntry = (entry: any, allowDescriptionFallback: boolean = true) => {
      const rawValues = [
        entry?.cari_id,
        entry?.cariId,
        entry?.cari_code,
        entry?.code,
        entry?.cari_name,
        entry?.name,
      ]
        .map(normalizeCompare)
        .filter(Boolean);

      const description = normalizeCompare(entry?.description);

      return caris.find((c: any) => {
        const id = normalizeCompare(c.id);
        const code = normalizeCompare(c.code);
        const name = normalizeCompare(c.name);

        if (rawValues.includes(id) || rawValues.includes(code) || rawValues.includes(name)) {
          return true;
        }

        return allowDescriptionFallback && !!description && !!name && description.includes(name);
      }) || null;
    };

    const matchesSelectedCari = (entry: any) => {
      if (!selectedCariForMovement) return true;
      const resolvedCari = resolveCariFromEntry(entry, false);
      if (resolvedCari) {
        return String(resolvedCari.id) === String(selectedCariForMovement);
      }

      return [
        entry?.cari_id,
        entry?.cariId,
        entry?.cari_code,
        entry?.code,
        entry?.cari_name,
        entry?.name,
      ]
        .map(normalizeCompare)
        .filter(Boolean)
        .includes(normalizeCompare(selectedCariForMovement));
    };

    const menuItems = [
      { id: 'add', label: 'Cari Ekle', icon: Plus },
      { id: 'list', label: 'Cari Hesap Listesi', icon: Users },
      { id: 'movement_entry', label: 'Cari Hareket Girişi', icon: Edit },
      { id: 'movements', label: 'Cari Hareket Raporu', icon: History },
    ];


    if (subView === 'add' || (subView === 'edit' && editingCari)) {
      const isEdit = subView === 'edit';
      return (
        <div className="max-w-2xl mx-auto h-full flex flex-col overflow-hidden">
          <div className="flex items-center justify-center gap-3 shrink-0 pt-2 pb-2 px-4 relative">
            <div className="absolute left-4">
              <BackButton onClick={() => { setSubView('menu'); setEditingCari(null); }} />
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1 bg-indigo-500 rounded-lg text-white shadow-sm">
                <UserPlus size={18} />
              </div>
              <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-tight">{isEdit ? 'Hesap Güncelle' : 'Yeni Cari Ekle'}</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-1 pb-20 sm:pb-4 custom-scrollbar">
            <form className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-2" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const payload = Object.fromEntries(formData);

              if (isEdit && editingCari) {
                await API.updateCariById(editingCari.id, payload);
              } else {
                await API.createCari(payload);
              }

              setSubView('menu');
              setEditingCari(null);
              fetchData();
            }}>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5 ml-1 tracking-wider">Cari Kodu</label>
                <input name="code" type="text" className="input-field text-sm py-1.5" defaultValue={editingCari?.code} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5 ml-1 tracking-wider">Ticari Unvanı</label>
                <input name="name" type="text" className="input-field text-sm py-1.5" defaultValue={editingCari?.name} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5 ml-1 tracking-wider">Yetkilisi</label>
                <input name="authorized_person" type="text" className="input-field text-sm py-1.5" defaultValue={editingCari?.authorized_person} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5 ml-1 tracking-wider">Vergi Dairesi</label>
                  <input name="tax_office" type="text" className="input-field text-sm py-1.5" defaultValue={editingCari?.tax_office} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5 ml-1 tracking-wider">Vergi No</label>
                  <input name="tax_number" type="text" className="input-field text-sm py-1.5" defaultValue={editingCari?.tax_number} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5 ml-1 tracking-wider">Telefon</label>
                  <input name="phone" type="text" className="input-field text-sm py-1.5" defaultValue={editingCari?.phone} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5 ml-1 tracking-wider">Faks</label>
                  <input name="fax" type="text" className="input-field text-sm py-1.5" defaultValue={editingCari?.fax} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5 ml-1 tracking-wider">Cari Tipi</label>
                <select name="type" className="input-field !text-[13px] !py-0 leading-tight bg-white h-[35px] appearance-none px-3" defaultValue={fixTR(editingCari?.type) || 'Alıcı'}>
                  <option>Alıcı</option>
                  <option>Satıcı</option>
                  <option>Her İkisi</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 mt-1 shadow-md">
                {isEdit ? (
                  <>
                    <Settings size={18} />
                    Güncelle
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Kaydet
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      );
    }

    if (subView === 'movement_entry') {
      const selectedCariData = selectedCariForMovement ? caris.find(c => String(c.id) === String(selectedCariForMovement)) : null;
      const safeTrans = Array.isArray(transactions) ? transactions : [];
      const nextMakbuzNo = String(
        safeTrans.reduce((maxNo: number, transaction: any) => {
          const makbuzNo = String(transaction?.makbuz_no || '').trim();
          if (!/^\d{1,6}$/.test(makbuzNo)) return maxNo;
          return Math.max(maxNo, parseInt(makbuzNo, 10));
        }, 0) + 1
      ).padStart(6, '0');

      const cariBakiye = formatBalance(selectedCariData?.balance);
      const bakiyeAbs = Math.abs(cariBakiye);
      const bakiyeDurum = cariBakiye > 0 ? 'Alacak' : cariBakiye < 0 ? 'Borç' : 'Denk';

      // Tarih parçaları — editingTransaction'dan veya bugünden al
      const today = new Date();
      const parseDate = (rawDate: any): string => {
        if (!rawDate) return today.toISOString().split('T')[0];
        const s = String(rawDate);
        if (s.includes('T')) return s.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
          const [d, m, y] = s.split('-');
          return `${y}-${m}-${d}`;
        }
        return today.toISOString().split('T')[0];
      };
      const computedDate = parseDate(editingTransaction?.date);
      const computedTime = editingTransaction?.time || movementTime || new Date().toTimeString().slice(0, 5);

      return (
        <div className="max-w-2xl mx-auto h-full flex flex-col overflow-hidden">
          <div className="flex items-center justify-center gap-3 shrink-0 pt-2 pb-2 px-4 relative">
            <div className="absolute left-4">
              <BackButton onClick={() => setSubView('menu')} />
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1 bg-indigo-500 rounded-lg text-white shadow-sm">
                <Edit size={18} />
              </div>
              <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-tight">{editingTransaction ? 'Hareketi Düzenle' : 'Hareket Girişi'}</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-1 pb-20 sm:pb-4 custom-scrollbar">
            <form key={editingTransaction?.id || 'new'} onSubmit={async (e) => {
              e.preventDefault();
              try {
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData);

                const borcVal = parseNumber(data.borc_amount as string);
                const alacakVal = parseNumber(data.alacak_amount as string);

                if (borcVal === 0 && alacakVal === 0) {
                  alert('Borç veya alacak tutarı giriniz');
                  return;
                }
                if (borcVal > 0 && alacakVal > 0) {
                  alert('Aynı anda hem borç hem alacak giremezsiniz');
                  return;
                }

                const transactionData = {
                  cari_id: data.cari_id,
                  type: borcVal > 0 ? 'Borc' : 'Alacak',
                  amount: Number(borcVal > 0 ? borcVal : alacakVal),
                  date: movementDate || computedDate ? formatDateToDDMMYYYY(new Date(movementDate || computedDate)) : formatDateToDDMMYYYY(),
                  time: String(data.time || new Date().toTimeString().slice(0, 5)),
                  description: String(data.description || ''),
                  evrak_no: '',
                  makbuz_no: String(data.makbuz_no || nextMakbuzNo),
                  islem_turu: String(data.islem_turu || 'Nakit')
                };

                if (editingTransaction) {
                  await API.updateTransaction(editingTransaction.id, transactionData);
                  alert('Hareket güncellendi');
                } else {
                  await API.createTransaction(transactionData);
                  alert('Hareket kaydedildi');
                }

                await fetchData();
                setSubView('menu');
                setEditingTransaction(null);
              } catch (error) {
                console.error('Transaction error:', error);
                alert('Hata: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
              }
            }} className="space-y-2">

              {/* Cari Seçimi */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-700 px-3 py-0.5">
                  <span className="text-[9px] font-bold text-white tracking-wide uppercase">Cari Seçiniz</span>
                </div>
                <div className="p-2">
                  <select
                    key={`cari-select-${subView}`}
                    name="cari_id"
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all mb-1"
                    required
                    value={selectedCariForMovement ? String(selectedCariForMovement) : ""}
                    onChange={(e) => setSelectedCariForMovement(e.target.value || null)}
                  >
                    <option value="">Cari Seçiniz...</option>
                    {caris.map(c => (
                      <option key={c.id} value={c.id}>{c.code} {c.name}</option>
                    ))}
                  </select>

                  {selectedCariData && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs mt-1 border-t border-slate-50 pt-1.5">
                      <div className="flex gap-2"><span className="text-slate-400 min-w-[60px]">Kodu:</span><span className="font-bold">{selectedCariData.code}</span></div>
                      <div className="flex gap-2"><span className="text-slate-400 min-w-[60px]">Tipi:</span><span className="font-bold">{fixTR(selectedCariData.type)}</span></div>
                      <div className="col-span-2 flex gap-2"><span className="text-slate-400 min-w-[60px]">Unvan/Ad:</span><span className="font-bold text-indigo-700 truncate">{selectedCariData.name}</span></div>
                      <div className="col-span-2 mt-1 px-2 py-1.5 rounded-xl border flex items-center justify-between" style={{ borderColor: bakiyeDurum === 'Borç' ? '#fca5a5' : bakiyeDurum === 'Alacak' ? '#6ee7b7' : '#e2e8f0', backgroundColor: bakiyeDurum === 'Borç' ? '#fef2f2' : bakiyeDurum === 'Alacak' ? '#ecfdf5' : '#f8fafc' }}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Bakiye</span>
                          <button 
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              if (!selectedCariForMovement || isRecalculating) return;
                              setIsRecalculating(true);
                              try {
                                await API.recalculateCariBalance(String(selectedCariForMovement));
                                await fetchData();
                              } catch (err) {
                                alert('Hata: ' + err);
                              } finally {
                                setIsRecalculating(false);
                              }
                            }}
                            className={`p-1 rounded-lg transition-all ${isRecalculating ? 'animate-spin text-indigo-400' : 'text-indigo-600 hover:bg-white hover:shadow-sm'}`}
                          >
                            <RefreshCw size={12} />
                          </button>
                        </div>
                        <span className={`text-sm font-black ${bakiyeDurum === 'Borç' ? 'text-red-600' : bakiyeDurum === 'Alacak' ? 'text-emerald-600' : 'text-slate-500'}`}>
                          ₺{bakiyeAbs.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-[9px] uppercase">{bakiyeDurum}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* İşlem Detayları */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-700 px-3 py-0.5">
                  <span className="text-[9px] font-bold text-white tracking-wide uppercase">İşlem Detayları</span>
                </div>
                <div className="p-2 grid grid-cols-3 gap-2">
                  <div className="min-w-0">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5 ml-1 tracking-tight">Takvim</label>
                    <input
                      name="movement_date"
                      type="date"
                      className="input-field !text-[13px] !py-0 px-2 bg-white w-full h-[32px] leading-tight"
                      value={movementDate || computedDate}
                      onChange={(e) => setMovementDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5 ml-1 tracking-tight">Saat</label>
                    <input name="time" type="time" className="input-field !text-[13px] !py-0 w-full h-[32px] leading-tight" defaultValue={computedTime} required />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5 ml-1 tracking-tight">Tür</label>
                    <select name="islem_turu" className="input-field !text-[13px] !py-0 px-2 bg-white w-full h-[32px] leading-tight appearance-none" defaultValue={editingTransaction?.islem_turu || "Nakit"}>
                      <option>Nakit</option>
                      <option>Havale</option>
                      <option>Çek</option>
                      <option>Senet</option>
                      <option>Kredi Kartı</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tutar Girişi */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="block text-[9px] font-bold text-red-500 uppercase tracking-tight ml-1">ÖDEME / GİDER</label>
                    <div className="relative">
                      <input 
                        name="borc_amount" 
                        type="text" 
                        inputMode="decimal"
                        className="input-field text-sm py-1.5 font-bold text-red-600 bg-red-50/30 border-red-100" 
                        placeholder="0,00" 
                        defaultValue={(() => {
                          const t = editingTransaction;
                          if (!t) return "";
                          const raw = String(t.type || '').toLowerCase().trim();
                          const isBorc = raw === 'borç' || raw === 'borc' || raw.startsWith('bor');
                          return isBorc ? formatForInput(Math.abs(t.amount)) : "";
                        })()} 
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-300">TL</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-[9px] font-bold text-emerald-600 uppercase tracking-tight ml-1">TAHSİLAT / GELİR</label>
                    <div className="relative">
                      <input 
                        name="alacak_amount" 
                        type="text" 
                        inputMode="decimal"
                        className="input-field text-sm py-1.5 font-bold text-emerald-600 bg-emerald-50/30 border-emerald-100" 
                        placeholder="0,00" 
                        defaultValue={(() => {
                          const t = editingTransaction;
                          if (!t) return "";
                          const raw = String(t.type || '').toLowerCase().trim();
                          const isAlacak = raw === 'alacak';
                          return isAlacak ? formatForInput(Math.abs(t.amount)) : "";
                        })()} 
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-300">TL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Açıklama */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5 ml-1 tracking-tight">Açıklama</label>
                  <input name="description" type="text" className="input-field text-sm py-1.5" placeholder="İşlem açıklaması giriniz..." defaultValue={editingTransaction?.description || ""} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5 ml-1 tracking-tight">Makbuz No</label>
                  <input name="makbuz_no" type="text" className="input-field text-sm py-1.5" placeholder="Makbuz no..." defaultValue={editingTransaction?.makbuz_no || nextMakbuzNo} />
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button type="submit" className="btn-primary flex-1 py-3 text-sm font-bold rounded-2xl shadow-lg border-b-4 border-indigo-800">
                  <Check size={20} className="inline mr-2" />
                  {editingTransaction ? 'Güncelle' : 'Kaydet'}
                </button>

                {editingTransaction && (
                  <button
                    type="button"
                    onClick={async () => {
                      await generateMovementPDF(editingTransaction, selectedCariData?.name || 'Bilinmeyen', settings);
                    }}
                    className="aspect-square flex items-center justify-center bg-blue-500 text-white rounded-2xl shadow-lg border-b-4 border-blue-800 hover:bg-blue-600 transition-colors px-4"
                  >
                    <Share2 size={24} />
                  </button>
                )}

                {editingTransaction && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('İşlem silinecek. Emin misiniz?')) {
                        try {
                          await API.deleteTransaction(editingTransaction.id);
                          await fetchData();
                        } catch (err: any) {
                          alert('Silme hatası: ' + (err?.message || 'Bilinmeyen hata'));
                        } finally {
                          setEditingTransaction(null);
                          setSubView('movements');
                        }
                      }
                    }}
                    className="aspect-square flex items-center justify-center bg-red-500 text-white rounded-2xl shadow-lg border-b-4 border-red-800 hover:bg-red-600 transition-colors px-4"
                  >
                    <Trash2 size={24} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      );
    }

    if (subView === 'list') {
      return (
        <div className="flex flex-col h-full bg-blue-50/50 overflow-hidden">
          <div className="w-full max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4 relative">
            <div className="flex items-center justify-center gap-3 mb-2 relative">
              <div className="absolute left-4">
                <BackButton onClick={() => setSubView('menu')} />
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 rounded-lg text-white shadow-sm">
                  <Users size={18} />
                </div>
                <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Cari Hesap Listesi</h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pt-2 space-y-4">

          <div className="grid gap-2">
            {caris.map(cari => {
              const balance = formatBalance(cari.balance);
              const isPositive = balance > 0;
              const isNegative = balance < 0;
              const absBalance = Math.abs(balance);

              return (
                <motion.div
                  key={cari.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setSelectedCariForMovement(cari.id);
                    setSubView('movements');
                  }}
                  className="card p-2.5 cursor-pointer hover:shadow-md transition-all border-slate-100/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <div className="p-1.5 bg-indigo-500 rounded-lg text-white shrink-0">
                          <Users size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-[15px] text-slate-900 truncate leading-tight uppercase tracking-tight">
                            <span className="text-indigo-600/50 mr-1.5 font-bold">{cari.code}</span>
                            {cari.name}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-slate-500 font-medium px-1.5 py-0.5 bg-slate-100 rounded text-[9px] uppercase">{fixTR(cari.type)}</span>
                        <span className={`font-black uppercase ${isNegative ? 'text-red-600' : isPositive ? 'text-emerald-600' : 'text-slate-500'}`}>
                          ₺{absBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {isNegative ? 'Borç' : isPositive ? 'Alacak' : 'Denk'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-300 ml-2 shrink-0" size={18} />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {caris.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>{'Hen\u00fcz cari hesap bulunmuyor'}</p>
              <p className="text-sm">{'Yeni cari eklemek i\u00e7in "Cari Ekle" butonunu kullan\u0131n'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

    if (subView === 'movements') {
      return (
        <div className="max-w-4xl mx-auto h-full flex flex-col overflow-hidden px-0">
          <div className="flex items-center justify-center gap-3 shrink-0 pt-4 pb-4 px-4 border-b border-slate-100 bg-white/50 backdrop-blur-md relative">
            <div className="absolute left-4">
              <BackButton onClick={() => setSubView('menu')} />
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1 bg-indigo-500 rounded-lg text-white shadow-sm">
                <History size={18} />
              </div>
              <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-tight">Cari Hareket Raporu</h2>
            </div>
          </div>

          {/* Cari Filtresi */}
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <select
                key={`movement-filter-${subView}`}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-blue-50/50"
                value={selectedCariForMovement ? String(selectedCariForMovement) : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCariForMovement(val || null);
                }}
              >
                <option value="">{'T\u00fcm Cariler'}</option>
                {caris.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setMovementSortOrder(movementSortOrder === 'asc' ? 'desc' : 'asc')}
                className={`p-2 rounded-lg border border-slate-300 transition-colors ${movementSortOrder === 'desc' ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-blue-50/50 text-slate-600'}`}
                title={movementSortOrder === 'desc' ? 'Yeni En \u00dcstte' : 'Eski En \u00dcstte'}
              >
                <ArrowUpDown size={20} className={movementSortOrder === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
            </div>
          </div>
          <div className="border-b-2 border-slate-300 my-2 mx-1"></div>

          <div className="bg-blue-50/50 rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-y-auto custom-scrollbar mb-4">
            <div className="w-full overflow-x-hidden">
              <table className="w-full text-left text-xs border-collapse min-w-[320px]">
                <thead>
                  <tr className="bg-blue-50/30 border-b border-slate-200">
                    <th className="px-1 py-2 font-bold text-center text-slate-500 uppercase tracking-wider" style={{ fontSize: '9px' }}>Tarih</th>
                    <th className="px-1 py-2 font-bold text-center text-slate-500 uppercase tracking-wider" style={{ fontSize: '9px' }}>{'\u0130\u015flem'}</th>
                    <th className="px-1 py-2 font-bold text-right text-slate-500 uppercase tracking-wider" style={{ fontSize: '9px' }}>{'Bor\u00e7'}</th>
                    <th className="px-1 py-2 font-bold text-right text-slate-500 uppercase tracking-wider" style={{ fontSize: '9px' }}>Alacak</th>
                    <th className="px-1 py-2 font-bold text-right text-slate-500 uppercase tracking-wider" style={{ fontSize: '9px' }}>Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Faturalar? ve hareketleri birle?tir */}
                  {(() => {
                    // Se?ilen cariye g?re filtrele
                    const filteredInvoices = invoices.filter(inv => matchesSelectedCari(inv));

                    const filteredTransactions = transactions.filter(t => matchesSelectedCari(t));

                    // T?m hareketleri (fatura ve i?lemler) tek bir dizide birle?tir
                    const allItems: any[] = [];

                    // Faturalar? ekle
                    filteredInvoices.forEach(inv => {
                      const faturaTutari = inv.total_amount || 0;
                      const cari = resolveCariFromEntry(inv);
                      const invoiceLedgerType = getCariInvoiceLedgerType(cari?.type, inv.type);
                      allItems.push({
                        id: 'inv-' + inv.id,
                        date: inv.date,
                        time: inv.time || '15:00:00',
                        cari_id: inv.cari_id,
                        cari_name: fixTR(cari?.name || ''),
                        cari_code: cari?.code || '',
                        rowType: inv.type === 'Alış' ? 'Alış' : 'Satış',
                        islemTuru: inv.type,
                        borcTutar: invoiceLedgerType === 'Borç' ? faturaTutari : 0,
                        alacakTutar: invoiceLedgerType === 'Alacak' ? faturaTutari : 0,
                        isFatura: true
                      });

                      const lastItem = allItems[allItems.length - 1];
                      lastItem.borcTutar = invoiceLedgerType === 'Borç' ? faturaTutari : 0;
                      lastItem.alacakTutar = invoiceLedgerType === 'Alacak' ? faturaTutari : 0;
                    });

                    // İlemleri (Nakit, Havale vb.) ekle
                    filteredTransactions.forEach(t => {
                      const cari = resolveCariFromEntry(t);
                      const normalizedTType = normalizeCariTransactionType(t.type);
                      allItems.push({
                        id: 'trans-' + t.id,
                        date: t.date,
                        time: t.time || '14:00:00',
                        cari_id: t.cari_id,
                        cari_name: fixTR(cari?.name || ''),
                        cari_code: cari?.code || '',
                        type: t.islem_turu || 'Nakit',
                        islemTuru: normalizedTType,
                        borcTutar: normalizedTType === 'Borç' ? (t.amount || 0) : 0,
                        alacakTutar: normalizedTType === 'Alacak' ? (t.amount || 0) : 0,
                        isFatura: false
                      });

                      const lastItem = allItems[allItems.length - 1];
                      lastItem.rowType = fixTR(t.islem_turu || 'Nakit');
                      lastItem.type = normalizedTType;
                      lastItem.islem_turu = fixTR(t.islem_turu || 'Nakit');
                      lastItem.description = t.description || '';
                      lastItem.evrak_no = t.evrak_no || '';
                      lastItem.makbuz_no = t.makbuz_no || '';
                      lastItem.borcTutar = normalizedTType === 'Borç' ? (t.amount || 0) : 0;
                      lastItem.alacakTutar = normalizedTType === 'Alacak' ? (t.amount || 0) : 0;
                    });

                    // Tarih ve saate g?re s?rala
                    allItems.sort((a, b) => {
                      // DD-MM-YYYY format?n? YYYY-MM-DD'ye ?evir
                      const convertDate = (dateStr: string) => {
                        if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
                          // DD-MM-YYYY format?
                          const [day, month, year] = dateStr.split('-');
                          return `${year}-${month}-${day}`;
                        }
                        return dateStr; // Zaten YYYY-MM-DD format?nda
                      };
                      const dateA = new Date(convertDate(a.date) + ' ' + a.time);
                      const dateB = new Date(convertDate(b.date) + ' ' + b.time);
                      return dateA.getTime() - dateB.getTime();
                    });

                    // Y?r?yen bakiye hesapla
                    let currentBalance = 0;
                    const itemsWithBalance = allItems.map(item => {
                      // Borç bakiyeyi art?r?r, Alacak azalt?r (Cari perspektifinden)
                      currentBalance += (item.alacakTutar - item.borcTutar);
                      return { ...item, runningBalance: currentBalance };
                    });

                    // Toplamlar? hesapla
                    const toplamBorc = allItems.reduce((sum, item) => sum + item.borcTutar, 0);
                    const toplamAlacak = allItems.reduce((sum, item) => sum + item.alacakTutar, 0);
                    const bakiye = toplamAlacak - toplamBorc;
                    const bakiyeLabel = bakiye > 0 ? 'ALACAK' : bakiye < 0 ? 'BORC' : 'DENK';

                    // S?ralama ayar?na g?re listeyi d?zenle
                    const sortedItems = movementSortOrder === 'desc'
                      ? [...itemsWithBalance].reverse()
                      : itemsWithBalance;

                    return (
                      <>
                        {sortedItems.map((item, index) => {
                          return (
                            <tr
                              key={item.id}
                              className={`border-b border-slate-100 cursor-pointer hover:bg-blue-50/30 transition-colors active:scale-[0.99] origin-center ${index % 2 === 0 ? 'bg-blue-50/50' : 'bg-blue-50/30/30'}`}
                              onClick={() => {
                                if (item.id.includes('trans')) {
                                  const transId = item.id.replace('trans-', '');
                                  const origTrans = transactions.find((t: any) => String(t.id) === String(transId));
                                  const txData = origTrans || {
                                    ...item,
                                    id: transId,
                                    type: item.borcTutar > 0 ? 'Borc' : 'Alacak',
                                    amount: item.borcTutar || item.alacakTutar,
                                  };
                                  // Önce transaction'ı set et, sonra subView'i değiştir
                                  setSelectedCariForMovement(item.cari_id);
                                  setEditingTransaction({ ...txData, id: transId });
                                  setTimeout(() => setSubView('movement_entry'), 0);
                                } else {
                                  alert('Faturalar "Faturalar" men\u00fcs\u00fcnden d\u00fczenlenebilir.');
                                }
                              }}
                            >
                              <td className="px-1 py-2 text-center font-medium text-slate-600" style={{ fontSize: '10px' }}>
                                <div className="flex flex-col items-center gap-0.5">
                                  <span>{displayDate(item.date)}</span>
                                </div>
                              </td>
                              <td className="px-1 py-2 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${item.alacakTutar > 0 ? 'bg-emerald-100 text-emerald-700' : item.borcTutar > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {fixTR(item.rowType || item.type)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-1 py-2 text-right font-bold text-red-600" style={{ fontSize: '10px' }}>
                                {item.borcTutar > 0 ? item.borcTutar.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '-'}
                              </td>
                              <td className="px-1 py-2 text-right font-bold text-emerald-600" style={{ fontSize: '10px' }}>
                                {item.alacakTutar > 0 ? item.alacakTutar.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '-'}
                              </td>
                              <td className="px-1 py-2 text-right font-bold text-slate-900" style={{ fontSize: '10px' }}>
                                {item.runningBalance !== 0 ? Math.abs(item.runningBalance).toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '0.000'}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Alt Toplamlar */}
                        <tr className="bg-blue-50/30 border-t-2 border-slate-200">
                          <td colSpan={2} className="px-3 py-3 text-center font-black text-slate-400 uppercase tracking-widest" style={{ fontSize: '10px' }}>
                            TOPLAMLAR
                          </td>
                          <td className="px-3 py-3 text-right font-black text-red-600" style={{ fontSize: '11px' }}>
                            {toplamBorc.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                          </td>
                          <td className="px-3 py-3 text-right font-black text-emerald-600" style={{ fontSize: '11px' }}>
                            {toplamAlacak.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                          </td>
                          <td className="px-3 py-3 text-right font-black text-slate-900" style={{ fontSize: '11px' }}>
                            {Math.abs(bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                          </td>
                        </tr>
                        {/* Bakiye Sat\u0131r\u0131 */}
                        <tr className="bg-indigo-600 text-white">
                          <td colSpan={2} className="px-3 py-4 text-center font-black uppercase tracking-[0.2em]" style={{ fontSize: '10px' }}>
                            {'BAK\u0130YE'}
                          </td>
                          <td colSpan={3} className="px-3 py-4 text-center font-black" style={{ fontSize: '14px' }}>
                            {formatCurrency(bakiye)} <span className="text-[10px] uppercase font-bold opacity-70">{bakiye < 0 ? 'BORÇ' : bakiye > 0 ? 'ALACAK' : 'DENK'}</span>
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // Menu view
    const menuColors = [
      { bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100', border: 'border-emerald-200', icon: 'bg-emerald-500', text: 'text-emerald-700' },
      { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', border: 'border-blue-200', icon: 'bg-blue-500', text: 'text-blue-700' },
      { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', border: 'border-purple-200', icon: 'bg-purple-500', text: 'text-purple-700' },
      { bg: 'bg-amber-50', hover: 'hover:bg-amber-100', border: 'border-amber-200', icon: 'bg-amber-500', text: 'text-amber-700' },
      { bg: 'bg-rose-50', hover: 'hover:bg-rose-100', border: 'border-rose-200', icon: 'bg-rose-500', text: 'text-rose-700' },
      { bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', border: 'border-indigo-200', icon: 'bg-indigo-500', text: 'text-indigo-700' },
      { bg: 'bg-cyan-50', hover: 'hover:bg-cyan-100', border: 'border-cyan-200', icon: 'bg-cyan-500', text: 'text-cyan-700' },
    ];

    const sortedInvoices = [...invoices].sort((a: any, b: any) => {
      const toTime = (dateStr: string, timeStr?: string) => {
        if (!dateStr) return 0;

        let normalizedDate = dateStr;
        if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
          const [day, month, year] = dateStr.split('-');
          normalizedDate = `${year}-${month}-${day}`;
        }

        const fullDate = `${normalizedDate}T${timeStr || '00:00'}`;
        const parsed = new Date(fullDate).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      return toTime(b.date, b.time) - toTime(a.date, a.time);
    });

    return (
      <div className="flex flex-col h-full bg-blue-50/50 overflow-hidden">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4 relative">
          <div className="flex items-center justify-center gap-3 mb-2 relative">
            <div className="absolute left-4">
              <BackButton onClick={() => setView('dashboard')} />
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 rounded-lg text-white shadow-sm">
                <Users size={18} />
              </div>
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Cari Yönetimi</h2>
            </div>
          </div>
          <div className="grid gap-3">
            {menuItems.map((item, index) => {
              const colors = menuColors[index % menuColors.length];
              return (
                <button
                  key={item.id}
                  onClick={() => setSubView(item.id as CariSubView)}
                  className={`flex items-center gap-3 p-3 ${colors.bg} ${colors.hover} rounded-xl border-2 ${colors.border} transition-all group`}
                >
                  <div className={`p-2 ${colors.icon} rounded-lg shadow-sm text-white`}>
                    <item.icon size={20} />
                  </div>
                  <div className="text-left">
                    <div className={`text-base font-bold ${colors.text}`}>{item.label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  const renderKasa = () => {
    const sortedTransactions = [...kasaData.transactions].sort((a: any, b: any) => {
      const getTimestamp = (dateStr: string) => {
        if (!dateStr) return 0;
        const dateOnly = dateStr.split('T')[0].trim();
        const parts = dateOnly.split(/[-.]/);
        
        if (parts.length === 3) {
          if (parts[0].length === 4) { // YYYY-MM-DD
            return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`).getTime();
          } else if (parts[2].length === 4) { // DD-MM-YYYY
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
          }
        }
        return new Date(dateOnly).getTime() || 0;
      };
      return getTimestamp(b.date) - getTimestamp(a.date);
    });

    return (
      <div className="flex flex-col h-full bg-blue-50/50 overflow-hidden">
        <div className="flex items-center justify-center gap-3 shrink-0 pt-4 pb-4 px-4 relative">
          <div className="absolute left-4">
            <BackButton onClick={() => setView('dashboard')} />
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500 rounded-lg text-white shadow-sm">
              <Wallet2 size={18} />
            </div>
            <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-tight">Kasa Yönetimi</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 custom-scrollbar space-y-3 pb-20 sm:pb-4">
          <div className="card py-2 px-4 flex items-center gap-4">
            <span className="text-slate-500 text-sm">Toplam Bakiye:</span>
            <span className={`text-xl font-bold ${formatCurrencyColor(kasaData.balance)}`}>
              {formatCurrency(kasaData.balance)}
            </span>
          </div>
          <div className="card overflow-hidden p-0 border-slate-100 shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-blue-50/30 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Tarih</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Tip</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-blue-50/30 transition-colors border-b border-slate-50/50">
                    <td className="px-4 py-3 text-xs text-slate-500 font-medium">{displayDate(t.date)}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${t.type === 'Giriş' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-black text-right ${t.type === 'Giriş' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(t.type === 'Giriş' ? t.amount : -t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderStok = () => {
    const sortedStocks = [...stocks].sort((a, b) => a.code.localeCompare(b.code));
    const currentIndex = editingStok ? sortedStocks.findIndex(s => s.id === editingStok.id) : -1;

    const navigateStok = (direction: 'next' | 'prev') => {
      const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (newIndex >= 0 && newIndex < sortedStocks.length) {
        setEditingStok(sortedStocks[newIndex]);
      }
    };

    return (
      <div className="flex flex-col h-full bg-blue-50/50 overflow-hidden px-4 py-2">
        <div className="w-full max-w-md mx-auto px-4 py-4 flex flex-col gap-4 relative">
          <div className="flex items-center justify-center gap-3 mb-2 relative">
            <div className="absolute left-4">
              <BackButton onClick={() => setView('dashboard')} />
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 rounded-lg text-white shadow-sm">
                <Package size={18} />
              </div>
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Stok Yönetimi</h2>
            </div>
          </div>
          <div className="grid gap-3">
            <button
              onClick={() => { setSubView('add'); setEditingStok(null); }}
              className="flex items-center gap-3 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl border-2 border-emerald-200 hover:border-emerald-300 transition-all group"
            >
              <div className="p-2 bg-emerald-500 rounded-lg shadow-sm text-white">
                <Plus size={20} />
              </div>
              <div className="text-left">
                <div className="text-base font-bold text-emerald-700">Stok Ekle</div>
                <div className="text-xs text-emerald-600">Yeni ürün kartı oluştur</div>
              </div>
            </button>

            <button
              onClick={() => setSubView('list')}
              className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-all group"
            >
              <div className="p-2 bg-blue-500 rounded-lg shadow-sm text-white">
                <FileText size={20} />
              </div>
              <div className="text-left">
                <div className="text-base font-bold text-blue-700">Stok Listesi</div>
                <div className="text-xs text-blue-600">Tüm ürünleri görüntüle</div>
              </div>
            </button>

            <button
              onClick={() => setSubView('inventory')}
              className="flex items-center gap-3 p-3 bg-amber-50 hover:bg-amber-100 rounded-xl border-2 border-amber-200 hover:border-amber-300 transition-all group"
            >
              <div className="p-2 bg-amber-500 rounded-lg shadow-sm text-white">
                <BarChart3 size={20} />
              </div>
              <div className="text-left">
                <div className="text-base font-bold text-amber-700">Stok Envanteri</div>
                <div className="text-xs text-amber-600">Stok durum raporu</div>
              </div>
            </button>
          </div>
        </div>

        {/* Modal Overlay for Subviews */}
        <AnimatePresence>
          {subView !== 'selection' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-blue-50/50 rounded-none sm:rounded-3xl shadow-2xl w-full max-w-full sm:max-w-4xl h-full sm:h-auto max-h-full sm:max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="p-2 border-b border-slate-100 flex items-center justify-center bg-blue-50/50 relative">
                  <div className="absolute left-4">
                    <BackButton onClick={() => { setSubView('selection'); setEditingStok(null); }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-indigo-500 rounded-lg text-white shadow-sm">
                      {subView === 'add' && <Plus size={16} />}
                      {subView === 'edit' && <FileText size={16} />}
                      {subView === 'list' && <FileText size={16} />}
                      {subView === 'inventory' && <BarChart3 size={16} />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-tight leading-tight">
                        {subView === 'add' && 'Yeni Stok Kartı'}
                        {subView === 'edit' && 'Stok Kartı Güncelle'}
                        {subView === 'list' && 'Stok Listesi'}
                        {subView === 'inventory' && 'Stok Envanteri'}
                      </h2>
                      {subView === 'edit' && currentIndex !== -1 && (
                        <span className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase">
                          {currentIndex + 1} / {sortedStocks.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`flex-1 overflow-y-auto ${subView === 'list' ? 'p-0' : 'p-2'}`}>
                  {subView === 'add' || (subView === 'edit' && editingStok) ? (
                    <form
                      key={editingStok?.id || 'new'}
                      className="space-y-2 max-w-full"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const data = Object.fromEntries(formData);

                        const getFloat = (val: any) => {
                          const parsed = parseFloat(String(val).replace(',', '.'));
                          return isNaN(parsed) ? 0 : parsed;
                        };

                        const payload = {
                          ...data,
                          purchase_price_without_tax: getFloat(data.purchase_without_tax),
                          purchase_price: getFloat(data.purchase_price),
                          sale_price: data.sale_price ? getFloat(data.sale_price) : 0,
                          purchase_discount: getFloat(data.purchase_discount),
                          sale_discount: getFloat(data.sale_discount),
                          tax_rate: getFloat(data.tax_rate),
                          conversion_factor: getFloat(data.conversion_factor),
                          quantity: editingStok?.quantity || 0
                        };

                        try {
                          if (subView === 'edit' && editingStok) {
                            await API.updateStockById(editingStok.id, payload);
                            await fetchData();
                            alert('Güncellendi');
                          } else {
                            await API.createStock(payload);
                            await fetchData();
                            alert('Kaydedildi');
                            setSubView('list');
                            setEditingStok(null);
                          }
                        } catch (err) {
                          alert('Bir hata oluştu!');
                        }
                      }}>
                      {/* Kod ve Stok Adı */}
                      <div className="grid grid-cols-[60px_1fr] gap-1.5">
                        <div className="space-y-0.5">
                          <label className="block text-xs font-semibold text-slate-700">Kod</label>
                          <input
                            name="code"
                            type="text"
                            className="input-field text-left text-sm font-mono bg-blue-50/30 py-1.5 pl-1"
                            style={{ paddingLeft: '4px' }}
                            defaultValue={editingStok?.code}
                            maxLength={3}
                            required
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="block text-xs font-semibold text-slate-700">{'Stok Ad\u0131'}</label>
                          <input name="name" type="text" className="input-field text-sm py-1.5" defaultValue={editingStok?.name} required />
                        </div>
                      </div>

                      {/* Temel Birim, Alt Birim, Çarpan - Grid */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-semibold text-slate-700 uppercase">Birim</label>
                          <input name="base_unit" type="text" className="input-field text-xs py-1.5" placeholder="Adet" defaultValue={editingStok?.base_unit} required />
                        </div>
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-semibold text-slate-700 uppercase">Alt</label>
                          <input name="alt_unit" type="text" className="input-field text-xs py-1.5" placeholder="Koli" defaultValue={editingStok?.alt_unit || ''} />
                        </div>
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-semibold text-slate-700 uppercase">{'Çarp'}</label>
                          <input name="conversion_factor" type="number" step="0.01" className="input-field text-xs py-1.5" defaultValue={editingStok?.conversion_factor || "30"} />
                        </div>
                      </div>

                      {/* Alış KDV'siz, Alış KDV'li, Satış - Grid */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-semibold text-slate-700 uppercase">{"Alış-KDV"}</label>
                          <input
                            name="purchase_without_tax"
                            type="number"
                            step="0.001"
                            className="input-field text-[11px] py-1.5 font-semibold text-emerald-600"
                            defaultValue={editingStok ? (editingStok.purchase_price_without_tax || editingStok.purchase_price / (1 + (editingStok.tax_rate || 1) / 100)).toFixed(3) : ''}
                            required
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-semibold text-slate-700 uppercase">{"Alış+KDV"}</label>
                          <input
                            name="purchase_price"
                            type="number"
                            step="0.001"
                            className="input-field text-[11px] py-1.5"
                            defaultValue={editingStok?.purchase_price ? Number(editingStok.purchase_price).toFixed(3) : ''}
                            required
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-semibold text-slate-700 uppercase">{'Satış'}</label>
                          <input name="sale_price" type="number" step="0.001" className="input-field text-[11px] py-1.5 font-semibold text-indigo-600" defaultValue={editingStok?.sale_price ? String(Number(editingStok.sale_price)) : ''} />
                        </div>
                      </div>

                      {/* Alış İsk., Satış İsk., KDV - Grid */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-semibold text-slate-700 uppercase">Alış İsk.</label>
                          <input name="purchase_discount" type="number" step="0.1" className="input-field text-xs py-1.5" defaultValue={editingStok?.purchase_discount || "0"} />
                        </div>
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-semibold text-slate-700 uppercase">Satış İsk.</label>
                          <input name="sale_discount" type="number" step="0.1" className="input-field text-xs py-1.5" defaultValue={editingStok?.sale_discount || "0"} />
                        </div>
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-semibold text-slate-700 uppercase">KDV%</label>
                          <input name="tax_rate" type="number" step="1" className="input-field text-xs py-1.5" defaultValue={editingStok?.tax_rate || "1"} />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {subView === 'edit' && (
                          <>
                            <button
                              type="button"
                              onClick={() => navigateStok('prev')}
                              disabled={currentIndex <= 0}
                              className="btn-secondary px-3 py-2 flex items-center justify-center gap-2 disabled:opacity-30"
                            >
                              <ChevronLeft size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={async (e) => {
                                if (window.confirm(`${editingStok?.name} stok kartını silmek istediğinize emin misiniz?`)) {
                                  try {
                                    await API.deleteStockById(editingStok!.id);
                                    await fetchData();
                                    alert('Stok kartı silindi');
                                    setSubView('list');
                                    setEditingStok(null);
                                  } catch (error) {
                                    alert('Silme işlemi başarısız');
                                  }
                                }
                              }}
                              className="btn-secondary px-3 py-2 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        <button type="submit" className="btn-primary flex-1 py-2.5 text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 text-white font-bold uppercase tracking-widest">
                          <Settings size={16} />
                          {subView === 'edit' ? 'GÜNCELLE' : 'KAYDET'}
                        </button>
                        {subView === 'edit' && (
                          <button
                            type="button"
                            onClick={() => navigateStok('next')}
                            disabled={currentIndex >= sortedStocks.length - 1}
                            className="btn-secondary px-3 py-2 flex items-center justify-center gap-2 disabled:opacity-30"
                          >
                            <ChevronRight size={20} />
                          </button>
                        )}
                      </div>
                    </form>
                  ) : subView === 'inventory' ? (
                    <InventoryView stocks={stocks} />
                  ) : (
                    <div className="overflow-hidden">
                      <div className="flex px-2 py-1.5 bg-blue-50/30 border-b border-slate-200">
                        <div className="flex-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">Kod / İsim</div>
                        <div className="shrink-0 text-[11px] font-bold text-slate-700 uppercase tracking-wider text-right">Alış KDV'siz</div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {[...stocks].sort((a, b) => a.code.localeCompare(b.code)).filter((s, i, arr) => arr.findIndex(x => x.code === s.code && x.name === s.name) === i).map((s, index) => (
                          <div
                            key={s.id}
                            className={`flex items-center px-2 py-1.5 cursor-pointer ${index % 2 === 0 ? 'bg-blue-50/50' : 'bg-white'}`}
                            onClick={() => { setEditingStok(s); setSubView('edit'); }}
                          >
                            <div className="flex-1 min-w-0 font-black text-[15px] text-slate-900 leading-none uppercase tracking-tight whitespace-nowrap overflow-hidden text-ellipsis pr-2">
                              <span className="text-indigo-600/50 mr-3 font-bold">{s.code}</span>
                              {s.name}
                            </div>
                            <div className="shrink-0 font-black text-[15px] text-emerald-600 whitespace-nowrap">
                              ₺{(Number(s.purchase_price_without_tax) || Number(s.purchase_price) / (1 + (Number(s.tax_rate) || 1) / 100)).toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderFatura = () => {
    const toTime = (dateStr: string, timeStr?: string) => {
      if (!dateStr) return 0;

      let normalizedDate = dateStr;
      if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
        const [day, month, year] = dateStr.split('-');
        normalizedDate = `${year}-${month}-${day}`;
      }

      const fullDate = `${normalizedDate}T${timeStr || '00:00'}`;
      const parsed = new Date(fullDate).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const sortedInvoices = [...invoices].map(normalizeInvoice).sort((a: any, b: any) =>
      toTime(b.date, b.time) - toTime(a.date, a.time)
    );

    if (subView === 'create_selection') {
      return (
        <div className="flex flex-col h-full bg-blue-50/50 overflow-hidden px-4 py-2">
          <div className="w-full max-w-md mx-auto px-4 py-4 flex flex-col gap-4 relative">
            <div className="flex items-center justify-center gap-3 mb-2 relative">
              <div className="absolute left-4">
                <BackButton onClick={() => setView('dashboard')} />
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 rounded-lg text-white shadow-sm">
                  <FileText size={18} />
                </div>
                <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Fatura Yönetimi</h2>
              </div>
            </div>
            <div className="grid gap-3">
              <motion.button
                whileHover={{ x: 8 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setInvoiceType('Alış');
                  setSubView('add');
                  setInvoiceItems([]);
                  setSelectedCariId(null);
                  setIsEditingInvoice(false);
                  setSelectedInvoice(null);
                }}
                className="flex items-center gap-3 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl border-2 border-emerald-200 hover:border-emerald-300 transition-all group"
              >
                <div className="p-2 bg-emerald-500 rounded-lg shadow-sm text-white">
                  <ArrowDownLeft size={20} />
                </div>
                <div className="text-left">
                  <div className="text-base font-bold text-emerald-700">{'Alış Faturası'}</div>
                  <div className="text-xs text-emerald-600">{'Satın alınan ürünlerin girişi'}</div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ x: 8 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setInvoiceType('Satış');
                  setSubView('add');
                  setInvoiceItems([]);
                  setSelectedCariId(null);
                  setIsEditingInvoice(false);
                  setSelectedInvoice(null);
                }}
                className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-all group"
              >
                <div className="p-2 bg-blue-500 rounded-lg shadow-sm text-white">
                  <ArrowUpRight size={20} />
                </div>
                <div className="text-left">
                  <div className="text-base font-bold text-blue-700">{'Satış Faturası'}</div>
                  <div className="text-xs text-blue-600">{'Satılan ürünlerin çıkışı'}</div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ x: 8 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSubView('list')}
                className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-xl border-2 border-purple-200 hover:border-purple-300 transition-all group"
              >
                <div className="p-2 bg-purple-500 rounded-lg shadow-sm text-white">
                  <History size={20} />
                </div>
                <div className="text-left">
                  <div className="text-base font-bold text-purple-700">Eski Faturalar</div>
                  <div className="text-xs text-purple-600">Geçmiş işlem dökümleri</div>
                </div>
              </motion.button>
            </div>
          </div>
        </div>
      );
    }

    if (subView === 'add' || subView === 'edit') {
      const generateInvoiceNo = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const prefix = `${invoiceType === 'Alış' ? 'A' : 'S'}${year}${month}`;
        const existingInvoices = invoices.filter(inv =>
          inv.invoice_no && inv.invoice_no.startsWith(prefix) && inv.type === invoiceType
        );
        const maxNumber = existingInvoices.reduce((max, inv) => {
          const numPart = parseInt(inv.invoice_no.slice(prefix.length));
          return isNaN(numPart) ? max : Math.max(max, numPart);
        }, 0);
        return `${prefix}${String(maxNumber + 1).padStart(4, '0')}`;
      };

      // Hesap: qty  ?arpan  fiyat  (1-isk%)  (1+kdv%)
      const getLineDetails = (item: any) => {
        const stok = stocks.find(s => String(s.id) === String(item.stok_id));
        const factor = stok?.conversion_factor || 1;
        const taxRate = item.tax || 0;
        const realQty = item.unit_type === 'alt' ? item.qty * factor : item.qty;
        const indFiyati = item.price * (1 - (item.discount || 0) / 100);
        const grossAmount = Math.round(realQty * item.price * 100) / 100;
        const subtotal   = Math.round(realQty * indFiyati * 100) / 100;
        const discountAmount = Math.round((grossAmount - subtotal) * 100) / 100;
        const taxAmount  = Math.round(subtotal * (taxRate / 100) * 100) / 100;
        const lineTotal  = Math.round((subtotal + taxAmount) * 100) / 100;
        return { grossAmount, discountAmount, subtotal, taxAmount, taxRate, realQty, lineTotal, stok };
      };

      const calcGross = () => invoiceItems.reduce((a, i) => a + getLineDetails(i).grossAmount, 0);
      const calcDisc  = () => invoiceItems.reduce((a, i) => a + getLineDetails(i).discountAmount, 0);
      const calcSub   = () => invoiceItems.reduce((a, i) => a + getLineDetails(i).subtotal, 0);
      const calcTax   = () => invoiceItems.reduce((a, i) => a + getLineDetails(i).taxAmount, 0);
      const calcTotal = () => calcSub() + calcTax();
      const fmt = (n: number) => formatCurrency(n);
      const selectedCariData = caris.find(c => String(c.id) === String(selectedCariId));

      return (
        <div className="flex flex-col h-full bg-blue-50/50 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-1 custom-scrollbar pb-10 sm:pb-4">
          <form onSubmit={async (e) => {
            e.preventDefault();
            const submitBtn = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
            if (submitBtn) submitBtn.disabled = true;
            try {
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData);
              const total = calcTotal();
              if (!selectedCariId) { alert('Lütfen bir cari seçin!'); if (submitBtn) submitBtn.disabled = false; return; }
              if (invoiceItems.length === 0) { alert('En az bir ürün ekleyin!'); if (submitBtn) submitBtn.disabled = false; return; }
              const cariData = caris.find(c => String(c.id) === String(selectedCariId));
              const invoiceDate = data.invoice_date ? formatDateToDDMMYYYY(new Date(data.invoice_date as string)) : formatDateToDDMMYYYY();
              const invoiceTime = String(data.invoice_time || new Date().toTimeString().slice(0, 5));
              const invoicePayload = {
                ...data,
                cari_id: String(selectedCariId),
                cari_name: cariData?.name || '',
                total_amount: total,
                date: invoiceDate,
                time: invoiceTime,
                items: invoiceItems,
                type: invoiceType
              };
              if (isEditingInvoice && selectedInvoice) {
                await API.updateInvoice(selectedInvoice.id, invoicePayload);
                alert('Fatura güncellendi');
              } else {
                await API.createInvoice(invoicePayload);
                alert('Fatura kaydedildi');
              }
              setInvoiceItems([]); setIsEditingInvoice(false); setSelectedInvoice(null); setSelectedCariId(null); setSubView('list');
              fetchData();
            } catch (err: any) {
              alert('Hata: ' + (err.message || 'Bilinmeyen hata'));
              if (submitBtn) submitBtn.disabled = false;
            }
          }} className="space-y-2">

            <div className="flex items-center justify-center gap-3 mb-1.5 relative">
              <div className="absolute left-4">
                <BackButton onClick={() => { setSubView('create_selection'); setInvoiceItems([]); setSelectedCariId(null); setIsEditingInvoice(false); }} />
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1 bg-indigo-600 rounded-lg text-white shadow-sm">
                  <FilePlus size={16} />
                </div>
                <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-tight leading-tight">
                  {isEditingInvoice ? 'Fatura Güncelle' : `${invoiceType} Faturası`}
                </h2>
              </div>
            </div>

            {/* Cari */}
            <div className="bg-white rounded-[1.5rem] border border-slate-200 p-2 mb-1.5 shadow-sm shadow-slate-200/70">
              <div className="flex items-center justify-between mb-2">
                <span className="ml-1 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cari</span>
                <button type="button"
                  onClick={() => { setIsCariModalOpen(true); setModalSearch(''); }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-slate-800 transition-colors shadow-sm"
                ><Search size={12} /> Seç</button>
              </div>
              {selectedCariId ? (
                <div className="rounded-[1.4rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-800 text-lg leading-tight truncate">
                        {selectedCariData?.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedCariData?.code}
                        {selectedCariData?.phone ? `  ${selectedCariData.phone}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50/50 rounded-[1.4rem] border border-dashed border-slate-200 text-center">
                  <p className="text-sm text-slate-400 italic">Cari seçilmedi...</p>
                </div>
              )}
              <input type="hidden" name="cari_id" value={String(selectedCariId || '')} />
            </div>

            {/* Fatura Bilgileri */}
            <div className="bg-white rounded-[1.5rem] border border-slate-200 p-2 mb-1.5 shadow-sm shadow-slate-200/70">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Fatura Bilgileri</span>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 w-8">No</span>
                  <input name="invoice_no" type="text"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-black text-slate-800 focus:outline-none focus:border-indigo-400"
                    defaultValue={isEditingInvoice ? selectedInvoice?.invoice_no : generateInvoiceNo()}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 shrink-0">Tarih</span>
                    <input type="date" name="invoice_date"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-400"
                      defaultValue={isEditingInvoice && selectedInvoice?.date ? formatDateForInput(selectedInvoice.date) : new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 shrink-0">Saat</span>
                    <input type="time" name="invoice_time"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-400"
                      defaultValue={isEditingInvoice ? selectedInvoice?.time : new Date().toTimeString().slice(0, 5)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <input type="hidden" name="type" value={invoiceType} />

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm shadow-slate-200/70 mb-1">
              <div className="flex items-center justify-between px-2 py-2 bg-slate-50/80 border-b border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ürünler ({invoiceItems.length})</span>
                <button type="button"
                  onClick={() => { if (!selectedCariId) { alert('Önce cari seçin!'); return; } setIsStokModalOpen(true); setModalSearch(''); }}
                  className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.1em] hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                ><Plus size={12} /> Ekle</button>
              </div>

              {invoiceItems.length === 0 ? (
                <div className="py-4 text-center">
                  <Package size={24} className="mx-auto text-slate-200 mb-1" />
                  <p className="text-[11px] text-slate-400 font-medium">Ürün eklenmedi</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {invoiceItems.map((item, idx) => {
                    const details = getLineDetails(item);
                    const stok = details.stok;
                    return (
                      <div key={idx} className="p-2 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-slate-800 text-[13px] leading-tight truncate uppercase tracking-tight">{stok?.name || '---'}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{stok?.code}</p>
                          </div>
                          <button type="button"
                            onClick={() => setInvoiceItems(invoiceItems.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1.5 shrink-0"
                          ><X size={14} /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-1 mb-1.5">
                          <div className="space-y-0.5">
                            <label className="block text-[8px] font-bold text-slate-400 uppercase text-center tracking-tighter">MİKTAR</label>
                            <input type="number"
                              className="w-full bg-white border border-slate-200 rounded-lg px-1 py-1 text-center font-black text-slate-800 focus:border-indigo-400 focus:outline-none text-[11px] h-[28px]"
                              value={item.qty || ''}
                              step="0.01"
                              onChange={(e) => { const n = [...invoiceItems]; n[idx].qty = parseFloat(e.target.value) || 0; setInvoiceItems(n); }}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="block text-[8px] font-bold text-slate-400 uppercase text-center tracking-tighter">BİRİM</label>
                            <select
                              className="w-full bg-white border border-slate-200 rounded-lg px-1 py-1 font-bold text-slate-600 focus:border-indigo-400 focus:outline-none text-[11px] h-[28px] appearance-none"
                              value={item.unit_type}
                              onChange={(e) => { const n = [...invoiceItems]; n[idx].unit_type = e.target.value as 'base' | 'alt'; setInvoiceItems(n); }}
                            >
                              <option value="base">{stok?.base_unit}</option>
                              {stok?.alt_unit && <option value="alt">{stok.alt_unit}</option>}
                            </select>
                          </div>
                          <div className="space-y-0.5">
                            <label className="block text-[8px] font-bold text-slate-400 uppercase text-center tracking-tighter">FİYAT</label>
                            <input type="number"
                              className="w-full bg-white border border-slate-200 rounded-lg px-1 py-1 text-center font-black text-slate-800 focus:border-indigo-400 focus:outline-none text-[11px] h-[28px]"
                              value={item.price === 0 ? '' : item.price.toFixed(3)}
                              step="0.001"
                              onChange={(e) => { const n = [...invoiceItems]; n[idx].price = Math.round((parseFloat(e.target.value) || 0) * 1000) / 1000; setInvoiceItems(n); }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-indigo-50/50 rounded-lg px-2 py-1 border border-indigo-100/50 relative">
                          <div className="text-[9px] font-bold text-slate-500 uppercase flex gap-2 items-center">
                            
                            <div className="flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded border border-indigo-100 shadow-sm">
                              <span className="text-slate-400">İSK:</span>
                              <input 
                                type="number" 
                                className="w-8 bg-transparent border-none text-red-500 font-black focus:outline-none p-0 text-center text-[10px]"
                                value={item.discount === 0 ? '' : item.discount}
                                onChange={(e) => {
                                  const n = [...invoiceItems];
                                  n[idx].discount = parseFloat(e.target.value) || 0;
                                  setInvoiceItems(n);
                                }}
                                placeholder="0"
                              />
                              <span className="text-slate-300">%</span>
                            </div>

                            <div className="flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded border border-indigo-100 shadow-sm">
                              <span className="text-slate-400">KDV:</span>
                              <input 
                                type="number" 
                                className="w-8 bg-transparent border-none text-emerald-600 font-black focus:outline-none p-0 text-center text-[10px]"
                                value={item.tax === 0 ? '' : item.tax}
                                onChange={(e) => {
                                  const n = [...invoiceItems];
                                  n[idx].tax = parseFloat(e.target.value) || 0;
                                  setInvoiceItems(n);
                                }}
                                placeholder="0"
                              />
                              <span className="text-slate-300">%</span>
                            </div>
                          </div>
                          <div className="text-[13px] font-black text-indigo-700 tracking-tight">₺{fmt(details.lineTotal)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-2 mb-1 shadow-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase"><span className="opacity-60">Toplam:</span><span className="text-slate-800">₺{fmt(calcGross())}</span></div>
                <div className="flex justify-between text-[11px] font-bold text-red-500 uppercase"><span className="opacity-60">İskonto:</span><span>₺{fmt(calcDisc())}</span></div>
                <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase"><span className="opacity-60">Ara Top:</span><span className="text-slate-800">₺{fmt(calcSub())}</span></div>
                <div className="flex justify-between text-[11px] font-bold text-emerald-600 uppercase"><span className="opacity-60">KDV:</span><span>₺{fmt(calcTax())}</span></div>
              </div>
              <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-xl px-4 py-2 flex items-center justify-between border-b-2 border-indigo-700 shadow-lg">
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">GENEL TOPLAM</span>
                <span className="text-lg font-black text-white tracking-tight">₺{fmt(calcTotal())}</span>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
              <button type="submit"
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-[1.2rem] shadow-lg shadow-indigo-200 uppercase tracking-[0.16em] transition-all"
              >{'Faturayı Onayla'}</button>
              <button type="button"
                onClick={() => {
                  const invNoEl = document.querySelector('input[name="invoice_no"]') as HTMLInputElement;
                  const invDateEl = document.querySelector('input[name="invoice_date"]') as HTMLInputElement;
                  const invTimeEl = document.querySelector('input[name="invoice_time"]') as HTMLInputElement;
                  const cariData = caris.find(c => String(c.id) === String(selectedCariId));
                  shareInvoiceOnWhatsApp({
                    invoice_no: invNoEl?.value || 'TASLAK', cari_name: cariData?.name || '',
                    authorized_person: cariData?.authorized_person, tax_number: cariData?.tax_number, phone: cariData?.phone,
                    date: invDateEl?.value ? formatDateToDDMMYYYY(new Date(invDateEl.value)) : formatDateToDDMMYYYY(),
                    time: invTimeEl?.value || new Date().toTimeString().slice(0, 5),
                    type: invoiceType, total_amount: calcTotal(), items: invoiceItems
                  }, stocks, caris);
                }}
                className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[1.2rem] shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 font-black uppercase tracking-[0.12em]"
                title="WhatsApp Paylaş"
              ><Share2 size={18} /> WhatsApp</button>
            </div>
          </form>
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-4xl mx-auto h-full flex flex-col overflow-hidden px-0">
        <div className="flex items-center justify-center gap-3 shrink-0 pt-4 pb-4 px-4 border-b border-slate-100 bg-white/50 backdrop-blur-md relative">
          <div className="absolute left-4">
            <BackButton onClick={() => setSubView('create_selection')} />
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1 bg-indigo-500 rounded-lg text-white shadow-sm">
              <History size={18} />
            </div>
            <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-tight">Eski Faturalar</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-20 sm:pb-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {sortedInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-blue-50/40 transition-colors border-b border-slate-50"
                  onClick={() => {
                    setSelectedInvoice(normalizeInvoice(invoice));
                    setIsInvoiceDetailOpen(true);
                  }}
                >
                  <div className="grid grid-cols-[1fr_auto] items-start gap-x-3">
                    <div className="min-w-0">
                      <div className="font-black text-[15px] text-slate-900 leading-tight truncate uppercase tracking-tight">
                        {invoice.cari_name}
                      </div>
                      <div className="flex gap-2 items-center mt-0.5">
                        <span className={`text-[9px] font-black uppercase px-1 rounded border ${fixTR(invoice.type) === 'Satış' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                          {fixTR(invoice.type)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {displayDate(invoice.date)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[16px] font-black text-slate-900 leading-none">
                        {formatCurrency(Number(invoice.total_amount || 0))}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                        {invoice.invoice_no}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {sortedInvoices.length === 0 && (
              <div className="px-6 py-12 text-center text-slate-500">
                Henüz fatura bulunmamaktad1r.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => {
    const formatScanSummary = (results: Record<string, any>) => {
      const collectionLabels: Record<string, string> = {
        caris: 'CARİLER',
        stocks: 'STOKLAR',
        invoices: 'FATURALAR',
        kasa: 'KASA',
        transactions: 'HAREKETLER',
      };
      const lines: string[] = [];
      let grandTotal = 0;

      Object.entries(results || {}).forEach(([collectionKey, data]) => {
        const total = Number(data?.total || 0);
        const usersByCollection = Object.entries(data?.users || {}).sort((a, b) =>
          String(a[0]).localeCompare(String(b[0]), 'tr-TR')
        );

        grandTotal += total;
        lines.push(`${collectionLabels[collectionKey] || collectionKey.toUpperCase()}: ${total} kayıt bulundu.`);

        if (usersByCollection.length === 0) {
          lines.push('  - Kullanıcı eşleşmesi yok.');
        } else {
          usersByCollection.forEach(([userKey, count]) => {
            lines.push(`  - ${userKey}: ${count} kayıt`);
          });
        }
      });

      if (lines.length === 0) {
        return 'Henüz tarama verisi bulunmuyor.';
      }

      lines.push('');
      lines.push(`TOPLAM ${grandTotal} kayıt tarandı.`);
      return lines.join('\n');
    };

    const handleMigrate = async () => {
      if (!fromEmail.trim() || !toEmail.trim()) {
        alert('Kaynak ve hedef alanlarını doldurun.');
        return;
      }

      if (!window.confirm(`${fromEmail} kullanıcısının verilerini ${toEmail} hesabına aktarmak istediğinize emin misiniz?`)) {
        return;
      }

      setMigrating(true);
      try {
        const result = await API.migrateData(fromEmail.trim(), toEmail.trim());
        if (result.success) {
          alert(`Veri aktarımı tamamlandı. ${result.totalMigrated} kayıt aktarıldı.`);
          fetchData();
        } else {
          alert(`Hata: ${result.message}`);
        }
      } catch (err: any) {
        alert(`Beklenmedik hata: ${err.message}`);
      } finally {
        setMigrating(false);
      }
    };

    const handleScanCloudData = async () => {
      setScanningCloudData(true);
      setScanReport('Bulut verileri taranıyor...');

      try {
        const results = await API.scanAllData();
        setScanReport(formatScanSummary(results));
      } catch (err: any) {
        const message = `Tarama hatası: ${err.message}`;
        setScanReport(message);
        alert(message);
      } finally {
        setScanningCloudData(false);
      }
    };

    const handleUploadLocalData = async () => {
      if (!window.confirm('Telefondaki yerel veriler buluta yüklensin mi?')) return;

      setUploadingLocalData(true);
      try {
        let total = 0;
        const localKeys = ['caris', 'stocks', 'invoices', 'transactions', 'kasa'];

        for (const key of localKeys) {
          const localDataStr = localStorage.getItem(key);
          if (!localDataStr) continue;

          const localData = JSON.parse(localDataStr);
          if (Array.isArray(localData) && localData.length > 0) {
            const count = await API.uploadLocalData(key, localData);
            total += count;
          }
        }

        if (total > 0) {
          alert(`${total} kayıt buluta yüklendi.`);
          fetchData();
        } else {
          alert('Yüklenecek yerel veri bulunamadı.');
        }
      } catch (err: any) {
        alert(`Yükleme hatası: ${err.message}`);
      } finally {
        setUploadingLocalData(false);
      }
    };

    return (
      <div className="flex flex-col h-full bg-blue-50/50 overflow-hidden">
        <div className="flex items-center justify-center gap-3 shrink-0 pt-4 pb-4 px-4 relative">
          <div className="absolute left-4">
            <BackButton onClick={() => setView('dashboard')} />
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg text-white shadow-sm">
              <Settings size={18} />
            </div>
            <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-tight">Kullanıcı Ayarları</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 custom-scrollbar space-y-6 pt-2 pb-24">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-slate-500">Ayarlar, kullanıcı işlemleri ve veri araçları bu alanda toplandı.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sistem Durumu:</span>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg uppercase">Çevrimiçi</span>
            </div>
          </div>

        {isSuperAdmin && (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-6 shadow-sm">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2 mb-4">
                <ChevronRight size={20} /> Veri Aktarma (Migration)
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-indigo-900/50 uppercase tracking-wider mb-1.5 ml-1">
                    Kaynak (Email/Username/UID)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="Eski hesap e-postası veya UID"
                  />
                  <p className="text-[11px] text-indigo-500 mt-2 ml-1 font-medium italic">
                    Sahipsiz veriler için UID yerine "Bilinmiyor" yazabilirsiniz.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-900/50 uppercase tracking-wider mb-1.5 ml-1">
                    Hedef (Email/UID)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    placeholder="Yeni hesap e-postası veya UID"
                  />
                </div>
                <button
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {migrating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Veriler Aktarılıyor...
                    </>
                  ) : (
                    <>
                      <ChevronRight size={18} />
                      Verileri Aktar
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 shadow-sm">
              <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2 mb-2">
                <Search size={20} /> Veri Tarayıcı
              </h3>
              <p className="text-sm text-emerald-700 mb-4">Bulut veritabanındaki tüm verileri tarar ve kullanıcı bazlı özet çıkarır.</p>
              <button
                onClick={handleScanCloudData}
                disabled={scanningCloudData}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {scanningCloudData ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Taranıyor...
                  </>
                ) : (
                  'Bulut Verilerini Tara (Yenile)'
                )}
              </button>

              <div className="mt-4 rounded-2xl border border-emerald-100 bg-slate-950/5 px-4 py-4 text-xs sm:text-sm font-mono text-slate-700 whitespace-pre-line min-h-[110px]">
                {scanReport || 'Henüz tarama yapılmadı. Sonuçlar burada görünecek.'}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 shadow-sm">
              <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2 mb-2">
                <Download size={20} /> Telefon Verilerini Yükle
              </h3>
              <p className="text-sm text-amber-700 mb-4">Cihazdaki yerel kayıtları bulut hesabına toplu olarak gönderir.</p>
              <button
                onClick={handleUploadLocalData}
                disabled={uploadingLocalData}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploadingLocalData ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  'Telefon Verilerini Yükle'
                )}
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-6 shadow-sm">
              <h3 className="text-lg font-bold text-rose-900 flex items-center gap-2 mb-2">
                <History size={20} /> Bakiyeleri Yeniden Hesapla
              </h3>
              <p className="text-sm text-rose-700 mb-4">Tüm cari bakiyelerini hareketlerden ve faturalardan sıfırdan hesaplar. Hesaplama hatalarını düzeltmek için kullanılır.</p>
              <button
                onClick={async () => {
                  if (!window.confirm('Tüm cari bakiyeleri hareketlere ve faturalara göre yeniden hesaplansın mı? Bu işlem geri alınamaz.')) return;
                  setRecalculating(true);
                  try {
                    const res = await API.recalculateCaris();
                    if (res.success) {
                      alert('Tüm bakiyeler başarıyla güncellendi.');
                      fetchData();
                    } else {
                      alert(('message' in res ? res.message : '') || 'Bir hata oluştu.');
                    }
                  } catch (err: any) {
                    alert(`Hata: ${err.message}`);
                  } finally {
                    setRecalculating(false);
                  }
                }}
                disabled={recalculating}
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {recalculating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Hesaplanıyor...
                  </>
                ) : (
                  'Bakiyeleri Güncelle'
                )}
              </button>
            </div>
          </div>
        )}

        <div className="bg-blue-50/50 border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Sistem Bilgisi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-blue-50/30 rounded-xl overflow-hidden text-ellipsis">
              <span className="text-slate-400">OTURUM UID:</span> <span className="text-slate-900 font-bold">{user?.id}</span>
            </div>
            <div className="p-3 bg-blue-50/30 rounded-xl">
              <span className="text-slate-400">E-POSTA:</span> <span className="text-indigo-600 font-bold">{user?.email}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Kayıtlı Kullanıcılar</h3>
          <div className="grid grid-cols-1 gap-3">
            {allUsers.map((u: any) => {
              return (
                <div key={u.id} className="bg-blue-50/50 border border-slate-200 rounded-3xl p-4 shadow-sm flex items-center justify-between gap-3 group hover:border-indigo-200 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center font-black text-lg shadow-sm bg-indigo-600 text-white">
                      {fixTR(u.username)?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-900 truncate">{fixTR(u.username || 'İsimsiz')}</h4>
                        {u.isBanned && (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter bg-rose-50 text-rose-600">
                            Banlı
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium truncate">{fixTR(u.email)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {user?.id !== String(u.id) && user?.email === 'selahattin50@gmail.com' ? (
                      <>
                        <button
                          onClick={async () => {
                            const nextBanState = !u.isBanned;
                            const confirmText = nextBanState
                              ? `${fixTR(u.username)} banlansın mı?`
                              : `${fixTR(u.username)} için ban kaldırılsın mı?`;
                            if (!window.confirm(confirmText)) return;
                            const res = await API.toggleUserBan(u.id, nextBanState);
                            if (res.success) {
                              alert(nextBanState ? 'Kullanıcı banlandı.' : 'Kullanıcının banı kaldırıldı.');
                              fetchData();
                            } else {
                              alert(res.message || 'İşlem başarısız.');
                            }
                          }}
                          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm ${u.isBanned ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white'}`}
                          title={u.isBanned ? 'Ban Kaldır' : 'Banla'}
                        >
                          <X size={18} />
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`${fixTR(u.username)} silinsin mi?`)) return;
                            const res = await API.deleteUser(u.id);
                            if (res.success) {
                              alert('Silindi.');
                              fetchData();
                            } else {
                              alert(res.message || 'Silme işlemi başarısız.');
                            }
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          title="Sil"
                        >
                          <Trash2 size={20} />
                        </button>
                      </>
                    ) : (
                      <div className="px-3 py-1 bg-blue-50/30 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100">
                        {(user?.id === String(u.id) || user?.id === u.uid) ? 'SİZ' : 'ÜYE'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {allUsers.length === 0 && (
              <div className="text-center py-10 bg-blue-50/30 rounded-[2rem] border border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">Kullanıcı bulunamadı.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

  const shouldRenderSidebar = view !== 'dashboard' || isSidebarOpen;

  return (
    <div className="h-[100dvh] flex bg-blue-50/50 relative overflow-hidden">
      {/* Mobile Header hidden to provide full screen experience */}

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      {shouldRenderSidebar && (
        <aside className={`
          fixed inset-y-0 left-0 z-50 bg-blue-50/50 border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}>
          <div className="p-6 border-b border-slate-100 hidden lg:flex items-center justify-between">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg text-white">
                  <LayoutDashboard size={20} />
                </div>

              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-blue-50/30 rounded-lg"
            >
              {isSidebarCollapsed ? <ChevronRight size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 mt-16 lg:mt-0">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id as View);
                  setSubView(item.id === 'stok' ? 'selection' : item.id === 'cari' ? 'menu' : item.id === 'fatura' ? 'create_selection' : 'list');
                  setIsSidebarOpen(false);
                  setSelectedStok(null);
                  setInvoiceItems([]);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === item.id
                  ? 'bg-indigo-50 text-indigo-600 font-bold'
                  : 'text-slate-500 hover:bg-blue-50/30 hover:text-slate-900'
                  } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                title={item.label}
              >
                <item.icon size={20} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className={`flex items-center gap-3 px-4 py-3 mb-2 ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                {user.username[0].toUpperCase()}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 truncate">{user.username}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setUser(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
              title="Çıkış Yap"
            >
              <ArrowRight size={20} />
              {!isSidebarCollapsed && <span>Çıkış Yap</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 min-w-0 transition-all duration-300 p-0 ${view === 'fatura' ? 'pt-0 lg:pt-4' : 'pt-0 lg:pt-8'} h-[100dvh] overflow-hidden ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        {view === 'dashboard' && (
          <div className="px-4">
            {/* Brand Header */}
            <div className="flex flex-col items-center justify-center pt-4 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                  <LayoutDashboard size={22} />
                </div>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Ön Muhasebe
                </h1>
              </div>
            </div>

            <header className={`flex justify-center mb-4`}>
              <div className="bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl shadow-lg p-4 text-center">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                  Hoş Geldiniz
                </h2>
                <p className="text-sm text-white/80 mt-1 font-semibold">
                  {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </header>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={view + subView}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col"
          >
            {!hasPermission(view) ? (
              <div className="card text-center py-20">
                <Settings className="mx-auto text-slate-300 mb-4" size={48} />
                <h3 className="text-xl font-bold text-slate-900">Yetkisiz Erişim</h3>
                <p className="text-slate-500 mt-2">Bu bölüme erişim yetkiniz bulunmamaktadır.</p>
                <button onClick={() => setView('dashboard')} className="btn-primary mt-6 flex items-center gap-2">
                  <LayoutDashboard size={18} />
                  Anasayfaya Dön
                </button>
              </div>
            ) : (
              <>
                {view === 'dashboard' && renderDashboard()}
                {view === 'cari' && renderCari()}
                {view === 'kasa' && renderKasa()}
                {view === 'stok' && renderStok()}
                {view === 'fatura' && renderFatura()}
                {view === 'users' && renderUsers()}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Cari Selection Modal */}
      {isCariModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-blue-50/50 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Cari Seçin</h3>
              <button onClick={() => setIsCariModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Cari adı veya kodu ile ara..."
                  className="input-field pl-10"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {caris.filter(c =>
                c.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                c.code.toLowerCase().includes(modalSearch.toLowerCase())
              ).sort((a, b) => a.code.localeCompare(b.code, 'tr', { numeric: true })).map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCariId(c.id);
                    setIsCariModalOpen(false);
                  }}
                  className="w-full text-left p-4 hover:bg-indigo-50 rounded-2xl transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="font-bold text-slate-900 group-hover:text-indigo-600">{c.code} {c.name}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
      {/* Stok Selection Modal */}
      {isStokModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-blue-50/50 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[75vh]"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Stok Seçin</h3>
              <button onClick={() => { setIsStokModalOpen(false); setSelectedStok(null); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Ürün adı veya kodu ile ara..."
                  className="input-field pl-10 py-3"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            {!selectedStok ? (
              <div className="flex-1 overflow-y-auto p-2">
                {stocks.filter(s =>
                  s.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                  s.code.toLowerCase().includes(modalSearch.toLowerCase())
                ).sort((a, b) => a.code.localeCompare(b.code, 'tr', { numeric: true })).map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStok(s)}
                    className="w-full text-left p-4 hover:bg-indigo-50 rounded-2xl transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold text-[15px] text-slate-900 group-hover:text-indigo-600 leading-tight">{s.code} - {s.name}</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Alış: <span className="font-bold text-lg text-emerald-600">₺{(s.purchase_price_without_tax || s.purchase_price / (1 + (s.tax_rate || 1) / 100)).toFixed(3)}</span>
                        {s.sale_price ? <> | Satış: <span className="font-bold text-lg text-indigo-600">₺{s.sale_price.toFixed(3)}</span></> : ''}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="sticky top-0 bg-blue-50/50 z-10 p-4 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      const qtyInput = (document.getElementById('modal_qty') as HTMLInputElement).value;
                      const qty = parseFloat(qtyInput);
                      if (!qtyInput || isNaN(qty) || qty <= 0) {
                        alert('Lütfen geçerli bir miktar girin');
                        return;
                      }
                      const unitType = (document.getElementById('modal_unit_type') as HTMLSelectElement).value as 'base' | 'alt';
                      const taxRate = selectedStok.tax_rate || 0;
                      // Fiyat HER ZAMAN adet (temel birim) ba?na girilir ve ?yle kal?r.
                      // Hesaplama motoru: lineTotal = qty  ?arpan  fiyat  (1-isk%)  (1+kdv%)
                      // Kayan nokta hatas? ?nlemek i?in 3 ondal?a yuvarla.
                      let rawPrice: number;
                      if (invoiceType === 'Alış') {
                        rawPrice = selectedStok.purchase_price_without_tax || selectedStok.purchase_price / (1 + (selectedStok.tax_rate || 1) / 100);
                      } else {
                        rawPrice = selectedStok.sale_price || 0;
                      }
                      const priceToAdd = Math.round(rawPrice * 1000) / 1000;

                      setInvoiceItems([...invoiceItems, {
                        stok_id: selectedStok.id,
                        qty,
                        unit_type: unitType,
                        price: priceToAdd,
                        discount: invoiceType === 'Alış' ? (selectedStok.purchase_discount || 0) : (selectedStok.sale_discount || 0),
                        tax: taxRate
                      }]);
                      setSelectedStok(null);
                      setIsStokModalOpen(false);
                    }}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    Listeye Ekle
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="font-bold text-indigo-900">{selectedStok.code} - {selectedStok.name}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Miktar</label>
                      <input
                        id="modal_qty"
                        type="number"
                        className="input-field py-3"
                        placeholder=""
                        min="0.01"
                        step="0.01"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Birim</label>
                      <select id="modal_unit_type" className="input-field py-3" defaultValue={selectedStok.alt_unit ? "alt" : "base"}>
                        <option value="base">{capitalizeFirst(selectedStok.base_unit)}</option>
                        {selectedStok.alt_unit && <option value="alt">{capitalizeFirst(selectedStok.alt_unit)}</option>}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {isInvoiceDetailOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-blue-50/50 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] border border-slate-100"
          >
            {/* Modal Header */}
            <div className={`p-4 flex items-center justify-between border-b ${selectedInvoice.type === 'Satış' ? 'bg-indigo-50/50' : 'bg-blue-50/30'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${selectedInvoice.type === 'Satış' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white'}`}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Fatura Detayı</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedInvoice.invoice_no}</p>
                </div>
              </div>
              <button
                onClick={() => setIsInvoiceDetailOpen(false)}
                className="p-2 hover:bg-blue-50/50 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                title="Kapat"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Info Grid */}
              <div className="space-y-3">
                <div className="bg-blue-50/30 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cari Hesap</p>
                  <p className="font-bold text-slate-900 text-sm leading-tight">{selectedInvoice.cari_name}</p>
                </div>
                <div className="bg-blue-50/30 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">İşlem Tarihi</p>
                  <p className="font-bold text-slate-900 text-sm">{displayDate(selectedInvoice.date)} {selectedInvoice.time}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-blue-50/30/80 border-b border-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ürün</th>
                      <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Miktar</th>
                      <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Fiyat</th>
                      <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedInvoice.items?.map((item: any, idx: number) => {
                      const stok = stocks.find(s => s.id === item.stok_id);
                      const factor = stok?.conversion_factor || 1;
                      const taxRate = item.tax || 0;
                      const realQty = item.unit_type === 'alt' ? item.qty * factor : item.qty;
                      
                      const basePrice = item.unit_type === 'alt' ? item.price / factor : item.price;
                      const grossAmount = Math.round(realQty * basePrice * 100) / 100;
                      const discountAmount = Math.round(grossAmount * (item.discount / 100) * 100) / 100;
                      const subtotal = Math.round((grossAmount - discountAmount) * 100) / 100;
                      const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
                      const lineTotal = Math.round((subtotal + taxAmount) * 100) / 100;

                      return (
                        <tr key={idx} className="hover:bg-blue-50/30/50 transition-colors">
                          <td className="px-3 py-2.5">
                            <p className="font-bold text-slate-900 text-xs line-clamp-1">{stok?.name || 'Bilinmeyen ürün'}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{stok?.code || '---'}</p>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <p className="font-bold text-slate-900 text-xs">{item.qty} {item.unit_type === 'alt' ? stok?.alt_unit : stok?.base_unit}</p>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <p className="text-slate-500 text-xs">{formatCurrency(item.price)}</p>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <p className="font-bold text-indigo-600 text-xs">{formatCurrency(lineTotal)}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total Card */}
              <div className={`p-4 rounded-2xl flex items-center justify-between border-2 ${selectedInvoice.type === 'Satış' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-white'} shadow-xl`}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-60">Genel Toplam</p>
                  <p className="text-[9px] font-medium opacity-40 mt-0.5">Tüm vergiler ve iskontolar dahil</p>
                </div>
                <p className="text-xl font-black break-words text-right">{formatCurrency(selectedInvoice.total_amount)}</p>
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-4 bg-blue-50/30 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => shareInvoiceOnWhatsApp(selectedInvoice, stocks, caris)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex flex-col items-center justify-center gap-1"
                title="Paylaş"
              >
                <Share2 size={18} />
                <span className="text-[9px] uppercase">Paylaş</span>
              </button>

              <button
                onClick={() => {
                  setSelectedCariId(selectedInvoice.cari_id);
                  setInvoiceType(selectedInvoice.type);
                  setInvoiceItems((selectedInvoice.items || []).map((i: any) => ({
                    stok_id: i.stok_id,
                    qty: i.qty,
                    unit_type: i.unit_type || 'base',
                    price: i.price,
                    discount: i.discount || 0,
                    tax: i.tax || 0
                  })));
                  setIsEditingInvoice(true);
                  setSubView('add');
                  setIsInvoiceDetailOpen(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex flex-col items-center justify-center gap-1"
                title="Düzenle"
              >
                <Edit size={18} />
                <span className="text-[9px] uppercase">Düzenle</span>
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('Bu faturayı silmek istediğinize emin misiniz? Stok ve cari bakiyeler geri alınacaktır.')) {
                    try {
                      await API.deleteInvoice(selectedInvoice.id);
                      alert('Fatura başarıyla silindi');
                      setIsInvoiceDetailOpen(false);
                      setSelectedInvoice(null);
                      fetchData();
                    } catch (err) {
                      alert('Fatura silinirken hata oluştu');
                    }
                  }
                }}
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex flex-col items-center justify-center gap-1"
                title="SİL"
              >
                <Trash2 size={20} />
                <span className="text-[9px] uppercase">SİL</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

