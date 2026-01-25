/**
 * WhatsApp Message Parser
 * Parses user messages into structured transaction drafts
 */

// Timezone for Brazil
const TIMEZONE = 'America/Sao_Paulo';

// Platform mappings (case-insensitive)
const PLATFORM_ALIASES: Record<string, string> = {
  'uber': 'uber',
  '99': '99',
  'noventa e nove': '99',
  'indrive': 'indrive',
  'in drive': 'indrive',
  'particular': 'particular',
  'lojinha': 'lojinha',
  'loja': 'lojinha',
};

// Category mappings for expenses
const CATEGORY_ALIASES: Record<string, string> = {
  'alimentacao': 'alimentacao',
  'alimentação': 'alimentacao',
  'comida': 'alimentacao',
  'lanche': 'alimentacao',
  'refeicao': 'alimentacao',
  'refeição': 'alimentacao',
  'pedagio': 'pedagio',
  'pedágio': 'pedagio',
  'estacionamento': 'estacionamento',
  'estacionar': 'estacionamento',
  'lavagem': 'lavagem',
  'lavar': 'lavagem',
  'manutencao': 'manutencao',
  'manutenção': 'manutencao',
  'mecanico': 'manutencao',
  'mecânico': 'manutencao',
  'seguro': 'seguro',
  'combustivel': 'combustivel',
  'combustível': 'combustivel',
  'gasolina': 'combustivel',
  'etanol': 'combustivel',
  'alcool': 'combustivel',
  'álcool': 'combustivel',
  'diesel': 'combustivel',
  'eletrico': 'eletrico',
  'elétrico': 'eletrico',
  'recarga': 'eletrico',
  'kwh': 'eletrico',
  'outro': 'outro',
  'outros': 'outro',
};

// Fuel type mappings
const FUEL_TYPE_ALIASES: Record<string, string> = {
  'gasolina': 'gasolina',
  'gas': 'gasolina',
  'etanol': 'etanol',
  'alcool': 'etanol',
  'álcool': 'etanol',
  'diesel': 'diesel',
  'gnv': 'gnv',
  'gás': 'gnv',
};

export interface ParsedDraft {
  type: 'receita' | 'despesa' | 'combustivel' | 'eletrico';
  date: string; // YYYY-MM-DD
  payload: Record<string, unknown>;
  summary: string;
}

export interface ParseError {
  error: true;
  message: string;
  examples: string[];
}

export type ParseResult = ParsedDraft | ParseError;

/**
 * Get current date in São Paulo timezone
 */
function getTodayDate(): string {
  const now = new Date();
  // Format: YYYY-MM-DD in São Paulo timezone
  return now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

/**
 * Get yesterday's date in São Paulo timezone
 */
function getYesterdayDate(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

/**
 * Parse date from text (supports YYYY-MM-DD, DD/MM/YYYY, "hoje", "ontem")
 */
function parseDate(text: string): string | null {
  const normalized = text.toLowerCase().trim();
  
  if (normalized === 'hoje') {
    return getTodayDate();
  }
  
  if (normalized === 'ontem') {
    return getYesterdayDate();
  }
  
  // Try YYYY-MM-DD format
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return text;
  }
  
  // Try DD/MM/YYYY format
  const brMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try DD/MM format (assume current year)
  const shortMatch = text.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const [, day, month] = shortMatch;
    const year = new Date().getFullYear();
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

/**
 * Parse currency value (handles R$ prefix, comma/dot separators)
 */
function parseValue(text: string): number | null {
  // Remove R$, spaces, and normalize
  let normalized = text.replace(/r\$\s*/gi, '').trim();
  
  // Handle Brazilian format: 1.234,56 -> 1234.56
  if (normalized.includes(',')) {
    // If has both dot and comma, dot is thousand separator
    if (normalized.includes('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      // Only comma, it's decimal separator
      normalized = normalized.replace(',', '.');
    }
  }
  
  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}

/**
 * Parse integer from text
 */
function parseInt_(text: string): number | null {
  const value = parseInt(text.replace(/\D/g, ''), 10);
  return isNaN(value) ? null : value;
}

/**
 * Find platform in text
 */
function findPlatform(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [alias, platform] of Object.entries(PLATFORM_ALIASES)) {
    if (lower.includes(alias)) {
      return platform;
    }
  }
  return null;
}

/**
 * Find expense category in text
 */
function findCategory(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [alias, category] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(alias)) {
      return category;
    }
  }
  return null;
}

/**
 * Find fuel type in text
 */
function findFuelType(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [alias, fuelType] of Object.entries(FUEL_TYPE_ALIASES)) {
    if (lower.includes(alias)) {
      return fuelType;
    }
  }
  return null;
}

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

/**
 * Parse RECEITA command
 * Format: receita [data] [plataforma] [valor] km [km] horas [horas] corridas [corridas]
 */
function parseReceita(text: string): ParseResult {
  const examples = [
    '📝 Exemplos de receita:',
    '• receita hoje uber 250 km 120 horas 8 corridas 12',
    '• receita 2026-01-25 99 180,50 km 80 horas 6 corridas 8',
    '• receita ontem indrive 150 km 60 horas 4 corridas 5',
  ];

  // Extract numbers and keywords
  const words = text.toLowerCase().split(/\s+/);
  
  // Find date
  let date: string | null = null;
  for (const word of words) {
    date = parseDate(word);
    if (date) break;
  }
  if (!date) date = getTodayDate();
  
  // Find platform
  const platform = findPlatform(text);
  if (!platform) {
    return {
      error: true,
      message: '❌ Plataforma não identificada. Use: uber, 99, indrive, particular ou lojinha.',
      examples,
    };
  }
  
  // Find value (first number that's not obviously km/hours/trips)
  const valueMatch = text.match(/(?:r\$\s*)?(\d+(?:[.,]\d+)?)/gi);
  let value: number | null = null;
  
  for (const match of valueMatch || []) {
    const parsed = parseValue(match);
    if (parsed && parsed >= 10) { // Minimum R$ 10 for revenue
      value = parsed;
      break;
    }
  }
  
  if (!value) {
    return {
      error: true,
      message: '❌ Valor não identificado. Informe o valor recebido.',
      examples,
    };
  }
  
  // Find KM
  const kmMatch = text.match(/km\s*(\d+)/i);
  const km = kmMatch ? parseInt_(kmMatch[1]) : null;
  if (!km) {
    return {
      error: true,
      message: '❌ KM não informado. Exemplo: km 120',
      examples,
    };
  }
  
  // Find hours
  const hoursMatch = text.match(/horas?\s*(\d+)/i);
  const hours = hoursMatch ? parseInt_(hoursMatch[1]) : null;
  if (hours === null) {
    return {
      error: true,
      message: '❌ Horas não informadas. Exemplo: horas 8',
      examples,
    };
  }
  
  // Find trips/corridas
  const tripsMatch = text.match(/corridas?\s*(\d+)/i);
  const trips = tripsMatch ? parseInt_(tripsMatch[1]) : null;
  if (trips === null) {
    return {
      error: true,
      message: '❌ Corridas não informadas. Exemplo: corridas 12',
      examples,
    };
  }
  
  const summary = `📊 *Receita do dia*
📅 Data: ${date}
🚗 Plataforma: ${platform.charAt(0).toUpperCase() + platform.slice(1)}
💰 Valor: ${formatCurrency(value)}
📍 KM: ${km}
⏱️ Horas: ${hours}
🔄 Corridas: ${trips}`;

  return {
    type: 'receita',
    date,
    payload: {
      platform,
      amount: value,
      km_rodados: km,
      hours_minutes: hours * 60,
      trips,
    },
    summary,
  };
}

/**
 * Parse DESPESA command
 * Format: despesa [data] [categoria] [valor] [notas]
 */
function parseDespesa(text: string): ParseResult {
  const examples = [
    '📝 Exemplos de despesa:',
    '• despesa hoje alimentação 35,90',
    '• despesa 2026-01-25 pedágio 12',
    '• despesa ontem estacionamento 20',
    '• despesa hoje manutenção 150 troca de óleo',
  ];

  const words = text.toLowerCase().split(/\s+/);
  
  // Find date
  let date: string | null = null;
  for (const word of words) {
    date = parseDate(word);
    if (date) break;
  }
  if (!date) date = getTodayDate();
  
  // Find category
  const category = findCategory(text);
  if (!category) {
    return {
      error: true,
      message: '❌ Categoria não identificada. Use: alimentação, pedágio, estacionamento, lavagem, manutenção, seguro ou outro.',
      examples,
    };
  }
  
  // Redirect fuel/electric to their specific parsers
  if (category === 'combustivel') {
    return parseCombustivel(text);
  }
  if (category === 'eletrico') {
    return parseEletrico(text);
  }
  
  // Find value
  const valueMatch = text.match(/(?:r\$\s*)?(\d+(?:[.,]\d+)?)/gi);
  let value: number | null = null;
  
  for (const match of valueMatch || []) {
    const parsed = parseValue(match);
    if (parsed && parsed > 0) {
      value = parsed;
      break;
    }
  }
  
  if (!value) {
    return {
      error: true,
      message: '❌ Valor não identificado. Informe o valor da despesa.',
      examples,
    };
  }
  
  const summary = `📊 *Despesa*
📅 Data: ${date}
🏷️ Categoria: ${category.charAt(0).toUpperCase() + category.slice(1)}
💸 Valor: ${formatCurrency(value)}`;

  return {
    type: 'despesa',
    date,
    payload: {
      category,
      amount: value,
    },
    summary,
  };
}

/**
 * Parse COMBUSTÍVEL command
 * Format: combustível [data] [tipo] [valor] [litros] litros km [km]
 */
function parseCombustivel(text: string): ParseResult {
  const examples = [
    '📝 Exemplos de combustível:',
    '• combustível hoje gasolina 250 50 litros km 45000',
    '• combustivel 2026-01-25 etanol 180,50 45 litros km 44500',
    '• gasolina hoje 200 40 litros km 46000',
  ];

  const words = text.toLowerCase().split(/\s+/);
  
  // Find date
  let date: string | null = null;
  for (const word of words) {
    date = parseDate(word);
    if (date) break;
  }
  if (!date) date = getTodayDate();
  
  // Find fuel type
  const fuelType = findFuelType(text) || 'gasolina';
  
  // Find value (total)
  const valueMatch = text.match(/(?:r\$\s*)?(\d+(?:[.,]\d+)?)/gi);
  let value: number | null = null;
  
  for (const match of valueMatch || []) {
    const parsed = parseValue(match);
    if (parsed && parsed >= 20) { // Minimum R$ 20 for fuel
      value = parsed;
      break;
    }
  }
  
  if (!value) {
    return {
      error: true,
      message: '❌ Valor total não identificado. Informe o valor pago.',
      examples,
    };
  }
  
  // Find liters
  const litersMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:litros?|l\b)/i);
  const liters = litersMatch ? parseValue(litersMatch[1]) : null;
  if (!liters) {
    return {
      error: true,
      message: '❌ Litros não informados. Exemplo: 50 litros',
      examples,
    };
  }
  
  // Find odometer (optional)
  const kmMatch = text.match(/km\s*(\d+)/i);
  const odometer = kmMatch ? parseInt_(kmMatch[1]) : null;
  
  const pricePerLiter = value / liters;
  
  const summary = `⛽ *Abastecimento*
📅 Data: ${date}
🛢️ Tipo: ${fuelType.charAt(0).toUpperCase() + fuelType.slice(1)}
💰 Total: ${formatCurrency(value)}
📊 Litros: ${liters.toFixed(2)}
💵 Preço/L: ${formatCurrency(pricePerLiter)}${odometer ? `\n📍 Odômetro: ${odometer.toLocaleString('pt-BR')} km` : ''}`;

  return {
    type: 'combustivel',
    date,
    payload: {
      fuel_type: fuelType,
      total_value: value,
      liters,
      odometer_km: odometer,
    },
    summary,
  };
}

/**
 * Parse ELÉTRICO command
 * Format: elétrico [data] [valor] [kwh] kwh km [km]
 */
function parseEletrico(text: string): ParseResult {
  const examples = [
    '📝 Exemplos de recarga elétrica:',
    '• elétrico hoje 80 20 kwh km 45000',
    '• eletrico 2026-01-25 recarga 50 15 kwh km 44500',
    '• recarga hoje 100 25 kwh',
  ];

  const words = text.toLowerCase().split(/\s+/);
  
  // Find date
  let date: string | null = null;
  for (const word of words) {
    date = parseDate(word);
    if (date) break;
  }
  if (!date) date = getTodayDate();
  
  // Find value (total)
  const valueMatch = text.match(/(?:r\$\s*)?(\d+(?:[.,]\d+)?)/gi);
  let value: number | null = null;
  
  for (const match of valueMatch || []) {
    const parsed = parseValue(match);
    if (parsed && parsed >= 5) { // Minimum R$ 5 for electric
      value = parsed;
      break;
    }
  }
  
  if (!value) {
    return {
      error: true,
      message: '❌ Valor total não identificado. Informe o valor pago.',
      examples,
    };
  }
  
  // Find kWh
  const kwhMatch = text.match(/(\d+(?:[.,]\d+)?)\s*kwh/i);
  const kwh = kwhMatch ? parseValue(kwhMatch[1]) : null;
  if (!kwh) {
    return {
      error: true,
      message: '❌ kWh não informado. Exemplo: 20 kwh',
      examples,
    };
  }
  
  // Find odometer (optional)
  const kmMatch = text.match(/km\s*(\d+)/i);
  const odometer = kmMatch ? parseInt_(kmMatch[1]) : null;
  
  const pricePerKwh = value / kwh;
  
  const summary = `🔋 *Recarga Elétrica*
📅 Data: ${date}
💰 Total: ${formatCurrency(value)}
⚡ kWh: ${kwh.toFixed(2)}
💵 Preço/kWh: ${formatCurrency(pricePerKwh)}${odometer ? `\n📍 Odômetro: ${odometer.toLocaleString('pt-BR')} km` : ''}`;

  return {
    type: 'eletrico',
    date,
    payload: {
      total_value: value,
      kwh,
      odometer_km: odometer,
    },
    summary,
  };
}

/**
 * Main parser function
 */
export function parseWhatsAppMessage(text: string): ParseResult {
  const normalized = text.toLowerCase().trim();
  
  // Detect command type
  if (normalized.startsWith('receita') || normalized.startsWith('faturamento')) {
    return parseReceita(text);
  }
  
  if (normalized.startsWith('despesa') || normalized.startsWith('gasto')) {
    return parseDespesa(text);
  }
  
  if (
    normalized.startsWith('combustivel') ||
    normalized.startsWith('combustível') ||
    normalized.startsWith('gasolina') ||
    normalized.startsWith('etanol') ||
    normalized.startsWith('diesel') ||
    normalized.startsWith('abastecer') ||
    normalized.startsWith('abastecimento')
  ) {
    return parseCombustivel(text);
  }
  
  if (
    normalized.startsWith('eletrico') ||
    normalized.startsWith('elétrico') ||
    normalized.startsWith('recarga') ||
    normalized.startsWith('carregar')
  ) {
    return parseEletrico(text);
  }
  
  // Unknown command
  return {
    error: true,
    message: `❌ Comando não reconhecido.

📋 *Comandos disponíveis:*

*RECEITA* - Registrar ganhos do dia
receita [data] [plataforma] [valor] km [km] horas [horas] corridas [corridas]

*DESPESA* - Registrar gastos
despesa [data] [categoria] [valor]

*COMBUSTÍVEL* - Registrar abastecimento
combustível [data] [tipo] [valor] [litros] litros km [km]

*ELÉTRICO* - Registrar recarga
elétrico [data] [valor] [kwh] kwh km [km]`,
    examples: [
      '• receita hoje uber 250 km 120 horas 8 corridas 12',
      '• despesa hoje alimentação 35,90',
      '• combustível hoje gasolina 250 50 litros km 45000',
      '• elétrico hoje 80 20 kwh',
    ],
  };
}

/**
 * Check if message is a confirmation response
 */
export function isConfirmation(text: string): 'yes' | 'no' | null {
  const normalized = text.toLowerCase().trim();
  
  if (['sim', 's', 'yes', 'y', 'confirmar', 'ok', '1'].includes(normalized)) {
    return 'yes';
  }
  
  if (['não', 'nao', 'n', 'no', 'cancelar', 'cancel', '0'].includes(normalized)) {
    return 'no';
  }
  
  return null;
}
