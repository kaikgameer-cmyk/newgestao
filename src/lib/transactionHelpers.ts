/**
 * Helpers centralizados para identificação de tipos de transação
 * Usados em todo o sistema para garantir consistência entre elétrico e combustível
 */

// Tipos de combustível elétrico (armazenados em fuel_logs.fuel_type)
const ELECTRIC_FUEL_TYPES = ['ac_lento', 'ac_semi', 'dc_rapido', 'residencial'];

// Tipos de combustível tradicional
const FUEL_TYPES = ['gasolina', 'etanol', 'diesel', 'gnv'];

/**
 * Verifica se uma transação/despesa é do tipo Elétrico
 * Baseado na categoria OU no tipo de combustível do fuel_log associado
 */
export function isElectricTransaction(transaction: {
  category?: string | null;
  fuel_logs?: { fuel_type?: string | null } | null;
  fuel_type?: string | null;
}): boolean {
  // Verifica pela categoria
  if (transaction.category === 'eletrico') {
    return true;
  }
  
  // Verifica pelo fuel_type do fuel_logs associado
  if (transaction.fuel_logs?.fuel_type) {
    return ELECTRIC_FUEL_TYPES.includes(transaction.fuel_logs.fuel_type);
  }
  
  // Verifica pelo fuel_type direto (para fuel_logs ou edição)
  if (transaction.fuel_type) {
    return ELECTRIC_FUEL_TYPES.includes(transaction.fuel_type);
  }
  
  return false;
}

/**
 * Verifica se uma transação/despesa é do tipo Combustível tradicional
 */
export function isFuelTransaction(transaction: {
  category?: string | null;
  fuel_logs?: { fuel_type?: string | null } | null;
  fuel_type?: string | null;
}): boolean {
  // Verifica pela categoria
  if (transaction.category === 'combustivel') {
    return true;
  }
  
  // Verifica pelo fuel_type do fuel_logs associado
  if (transaction.fuel_logs?.fuel_type) {
    return FUEL_TYPES.includes(transaction.fuel_logs.fuel_type);
  }
  
  // Verifica pelo fuel_type direto
  if (transaction.fuel_type) {
    return FUEL_TYPES.includes(transaction.fuel_type);
  }
  
  return false;
}

/**
 * Verifica se é uma categoria de energia (combustível ou elétrico)
 */
export function isEnergyCategory(category: string): boolean {
  return category === 'combustivel' || category === 'eletrico';
}

/**
 * Verifica se é categoria elétrica
 */
export function isElectricCategory(category: string): boolean {
  return category === 'eletrico';
}

/**
 * Verifica se é categoria combustível
 */
export function isFuelCategory(category: string): boolean {
  return category === 'combustivel';
}

/**
 * Retorna o label correto da unidade baseado no tipo
 */
export function getEnergyUnitLabel(isElectric: boolean): string {
  return isElectric ? 'kWh' : 'L';
}

/**
 * Retorna o label completo da unidade baseado no tipo
 */
export function getEnergyUnitFullLabel(isElectric: boolean): string {
  return isElectric ? 'kWh' : 'Litros';
}

/**
 * Retorna o nome da categoria baseado no tipo
 */
export function getEnergyCategoryName(isElectric: boolean): string {
  return isElectric ? 'Elétrico' : 'Combustível';
}

/**
 * Retorna o label do campo de quantidade baseado no tipo
 */
export function getEnergyQuantityLabel(isElectric: boolean): string {
  return isElectric ? 'kWh carregados' : 'Litros abastecidos';
}

/**
 * Retorna o placeholder do local baseado no tipo
 */
export function getEnergyStationPlaceholder(isElectric: boolean): string {
  return isElectric ? 'Ex: Posto de recarga Eletroposto' : 'Ex: Posto Shell Centro';
}

/**
 * Retorna o label do local baseado no tipo
 */
export function getEnergyStationLabel(isElectric: boolean): string {
  return isElectric ? 'Local da recarga' : 'Posto';
}

/**
 * Retorna o label do botão de salvar baseado no tipo
 */
export function getEnergySaveButtonLabel(isElectric: boolean): string {
  return isElectric ? 'Salvar Recarga' : 'Salvar Abastecimento';
}
