/**
 * Utilidades para sanitizar y validar entradas de usuario
 */

/**
 * Sanitiza un string eliminando espacios en blanco al inicio y final,
 * y escapando caracteres HTML potencialmente peligrosos
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';

  return input.trim().replace(/[<>]/g, ''); // Elimina caracteres HTML básicos
}

/**
 * Sanitiza un string para búsquedas (más permisivo, solo trim)
 */
export function sanitizeSearch(input: string | null | undefined): string {
  if (!input) return '';
  return input.trim();
}

/**
 * Sanitiza un email (trim y lowercase)
 */
export function sanitizeEmail(input: string | null | undefined): string {
  if (!input) return '';
  return input.trim().toLowerCase();
}

/**
 * Sanitiza un número de teléfono (solo dígitos y caracteres permitidos)
 */
export function sanitizePhone(input: string | null | undefined): string {
  if (!input) return '';
  // Permite dígitos, espacios, +, -, ( y )
  return input.trim().replace(/[^\d\s\+\-\(\)]/g, '');
}

/**
 * Sanitiza un código postal (solo dígitos)
 */
export function sanitizePostalCode(input: string | null | undefined): string {
  if (!input) return '';
  return input.trim().replace(/\D/g, '');
}

/**
 * Sanitiza un CURP (solo letras mayúsculas, números)
 */
export function sanitizeCURP(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Sanitiza un objeto completo aplicando sanitización según el tipo de campo
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fieldSanitizers: Partial<Record<keyof T, (val: any) => string>>
): T {
  const sanitized = { ...obj } as T;

  for (const key in fieldSanitizers) {
    const sanitizer = fieldSanitizers[key];
    if (sanitizer && key in sanitized && sanitized[key] != null) {
      (sanitized as any)[key] = sanitizer((sanitized as any)[key]);
    }
  }

  return sanitized;
}
