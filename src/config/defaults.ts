// Defaults configuration for platforms (income sources) and expense categories
// These are applied only when user clicks "Add default options"

export interface DefaultPlatform {
  name: string;
  color: string;
}

export interface DefaultExpenseCategory {
  name: string;
  color: string;
}

// Default income platforms/sources
export const defaultPlatforms: DefaultPlatform[] = [
  { name: "99", color: "#FFC700" },
  { name: "Uber", color: "#000000" },
  { name: "InDrive", color: "#2ECC71" },
  { name: "Particular", color: "#3498DB" },
  { name: "Lojinha", color: "#9B59B6" },
];

// Default expense categories
export const defaultExpenseCategories: DefaultExpenseCategory[] = [
  { name: "Combustível", color: "#E74C3C" },
  { name: "Elétrico", color: "#27AE60" },
  { name: "Manutenção", color: "#3498DB" },
  { name: "Lavagem", color: "#00BCD4" },
  { name: "Pedágio", color: "#9C27B0" },
  { name: "Estacionamento", color: "#E91E63" },
  { name: "Alimentação", color: "#4CAF50" },
];

// Normalize string for case-insensitive comparison
export function normalizeForComparison(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Generate a unique key/slug from name
export function generateSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
