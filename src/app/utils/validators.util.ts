/**
 * Validadores personalizados para formularios
 */

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Valida que la contraseña tenga al menos 8 caracteres
 */
export function passwordMinLength(minLength: number = 8): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Dejar que Validators.required maneje campos vacíos
    }
    
    const value = control.value as string;
    if (value.length < minLength) {
      return {
        passwordMinLength: {
          requiredLength: minLength,
          actualLength: value.length,
        },
      };
    }
    
    return null;
  };
}

/**
 * Valida formato de CURP mexicano (18 caracteres alfanuméricos)
 */
export function curpValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    
    const curp = control.value as string;
    const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;
    
    if (!curpRegex.test(curp)) {
      return { invalidCURP: true };
    }
    
    return null;
  };
}

/**
 * Valida formato de código postal mexicano (5 dígitos)
 */
export function postalCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    
    const postalCode = control.value as string;
    const postalCodeRegex = /^\d{5}$/;
    
    if (!postalCodeRegex.test(postalCode)) {
      return { invalidPostalCode: true };
    }
    
    return null;
  };
}

/**
 * Valida formato de teléfono mexicano (10 dígitos, opcionalmente con código de país)
 */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    
    const phone = control.value as string;
    // Permite formatos: +52, 52, o sin código, seguido de 10 dígitos
    const phoneRegex = /^(\+?52\s?)?\d{10}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
      return { invalidPhone: true };
    }
    
    return null;
  };
}

/**
 * Valida longitud máxima de un campo
 */
export function maxLengthValidator(maxLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    
    const value = control.value as string;
    if (value.length > maxLength) {
      return {
        maxLength: {
          requiredLength: maxLength,
          actualLength: value.length,
        },
      };
    }
    
    return null;
  };
}

/**
 * Valida que un campo no contenga solo espacios en blanco
 */
export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    
    const value = control.value as string;
    if (value.trim().length === 0) {
      return { whitespace: true };
    }
    
    return null;
  };
}

