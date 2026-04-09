/**
 * Turn raw barcode / QR decode text into a normalized ISBN-10 or ISBN-13 string
 * for Open Library lookup. Books almost always scan as EAN-13 (978/979…).
 */
export function normalizeIsbnFromScan(decodedText: string): string | null {
  const trimmed = decodedText.trim();

  const compact = trimmed.replace(/[\s-]/g, "").toUpperCase();
  if (/^[0-9]{13}$/.test(compact) && (compact.startsWith("978") || compact.startsWith("979"))) {
    return compact;
  }

  const isbn10 = compact.replace(/[^0-9X]/g, "");
  if (/^[0-9]{9}[0-9X]$/.test(isbn10)) {
    return isbn10;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length === 13 && (digitsOnly.startsWith("978") || digitsOnly.startsWith("979"))) {
    return digitsOnly;
  }

  return null;
}
