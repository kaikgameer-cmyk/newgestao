/**
 * Shared Zod validation schemas for edge functions
 * Centralized validation for defense-in-depth security
 */

// Zod-like validation without external dependency (Deno compatible)
export interface ValidationResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validate email format
 */
export function validateEmail(email: unknown): ValidationResult {
  if (typeof email !== 'string') {
    return { success: false, error: 'Email deve ser uma string' };
  }
  
  const trimmed = email.trim().toLowerCase();
  
  if (trimmed.length === 0) {
    return { success: false, error: 'Email é obrigatório' };
  }
  
  if (trimmed.length > 255) {
    return { success: false, error: 'Email deve ter no máximo 255 caracteres' };
  }
  
  if (!EMAIL_REGEX.test(trimmed)) {
    return { success: false, error: 'Formato de email inválido' };
  }
  
  return { success: true, data: trimmed };
}

/**
 * Validate password
 */
export function validatePassword(password: unknown): ValidationResult {
  if (typeof password !== 'string') {
    return { success: false, error: 'Senha deve ser uma string' };
  }
  
  if (password.length < 8) {
    return { success: false, error: 'Senha deve ter no mínimo 8 caracteres' };
  }
  
  if (password.length > 128) {
    return { success: false, error: 'Senha deve ter no máximo 128 caracteres' };
  }
  
  return { success: true, data: password };
}

/**
 * Validate name (optional field)
 */
export function validateName(name: unknown): ValidationResult {
  if (name === undefined || name === null || name === '') {
    return { success: true, data: null };
  }
  
  if (typeof name !== 'string') {
    return { success: false, error: 'Nome deve ser uma string' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length > 100) {
    return { success: false, error: 'Nome deve ter no máximo 100 caracteres' };
  }
  
  return { success: true, data: trimmed };
}

/**
 * Validate city (optional field)
 */
export function validateCity(city: unknown): ValidationResult {
  if (city === undefined || city === null || city === '') {
    return { success: true, data: null };
  }
  
  if (typeof city !== 'string') {
    return { success: false, error: 'Cidade deve ser uma string' };
  }
  
  const trimmed = city.trim();
  
  if (trimmed.length > 100) {
    return { success: false, error: 'Cidade deve ter no máximo 100 caracteres' };
  }
  
  return { success: true, data: trimmed };
}

/**
 * Validate create-user input
 */
export interface CreateUserInput {
  email: string;
  password: string;
  name?: string | null;
  city?: string | null;
  sendWelcomeEmail?: boolean;
}

export function validateCreateUserInput(input: unknown): ValidationResult & { data?: CreateUserInput } {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Dados de entrada inválidos' };
  }
  
  const data = input as Record<string, unknown>;
  
  // Validate email (required)
  const emailResult = validateEmail(data.email);
  if (!emailResult.success) {
    return { success: false, error: emailResult.error };
  }
  
  // Validate password (required)
  const passwordResult = validatePassword(data.password);
  if (!passwordResult.success) {
    return { success: false, error: passwordResult.error };
  }
  
  // Validate name (optional)
  const nameResult = validateName(data.name);
  if (!nameResult.success) {
    return { success: false, error: nameResult.error };
  }
  
  // Validate city (optional)
  const cityResult = validateCity(data.city);
  if (!cityResult.success) {
    return { success: false, error: cityResult.error };
  }
  
  return {
    success: true,
    data: {
      email: emailResult.data as string,
      password: passwordResult.data as string,
      name: nameResult.data as string | null,
      city: cityResult.data as string | null,
      sendWelcomeEmail: data.sendWelcomeEmail !== false,
    },
  };
}

/**
 * Validate webhook payload customer email
 */
export function validateWebhookEmail(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Payload inválido' };
  }
  
  const data = payload as Record<string, unknown>;
  const customer = (data.Customer || data.customer || {}) as Record<string, unknown>;
  const email = customer.email;
  
  if (!email) {
    return { success: false, error: 'Email do cliente não encontrado no payload' };
  }
  
  return validateEmail(email);
}

/**
 * Rate limiting helper - simple in-memory implementation
 * For production, consider using Redis or KV store
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export function checkRateLimit(
  key: string,
  maxRequests: number = 5,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  // Clean up expired entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetAt < now) {
        rateLimitMap.delete(k);
      }
    }
  }
  
  if (!entry || entry.resetAt < now) {
    // Create new entry
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }
  
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  
  // Increment count
  entry.count++;
  rateLimitMap.set(key, entry);
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetIn: entry.resetAt - now,
  };
}

/**
 * Get client IP from request
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
