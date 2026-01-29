/**
 * GLOBAL FINANCIAL FORMATTER
 * All monetary values in the application MUST use these functions
 * to ensure consistent precision and avoid floating point errors
 */

/**
 * Round a number to exactly 2 decimal places to prevent floating point errors
 * E.g., 124.28999999999999 → 124.29
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format a number as Brazilian Real currency (R$)
 * Always uses 2 decimal places and proper rounding
 * Handles floating point precision issues
 */
export function formatCurrencyBRL(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (isNaN(num)) return "R$ 0,00";

  // Round to prevent floating point errors
  const rounded = roundCurrency(num);

  return rounded.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a number as currency value without the R$ symbol
 * For use in inputs and compact displays
 */
export function formatCurrencyValue(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (isNaN(num)) return "0,00";

  const rounded = roundCurrency(num);

  return rounded.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a number with 2 decimal places (no currency symbol)
 */
export function formatDecimal(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (isNaN(num)) return "0,00";

  const rounded = roundCurrency(num);

  return rounded.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse a Brazilian currency string to number
 * Handles formats like "1.234,56" or "1234,56" or "1234.56"
 */
export function parseCurrencyBRL(value: string): number {
  if (!value) return 0;
  
  // Remove R$ and whitespace
  let cleaned = value.replace(/R\$\s*/g, "").trim();
  
  // Check if it uses Brazilian format (comma as decimal separator)
  // Pattern: dots for thousands, comma for decimals
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(cleaned)) {
    // Brazilian format: 1.234,56
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+,\d{2}$/.test(cleaned)) {
    // Simple Brazilian format: 1234,56
    cleaned = cleaned.replace(",", ".");
  }
  // Otherwise assume it's already in standard format (1234.56)
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : roundCurrency(num);
}

/**
 * Convert cents (integer) to decimal amount
 * E.g., 12429 → 124.29
 */
export function centsToDecimal(cents: number): number {
  return roundCurrency(cents / 100);
}

/**
 * Convert decimal amount to cents (integer)
 * E.g., 124.29 → 12429
 */
export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100);
}
