export interface EditableFieldConfig {
  section: 'medical' | 'vitals' | 'patient';
  path: string; // Ej: 'family_history.diabetes', 'weight', 'phone'
  type: 'text' | 'number' | 'boolean' | 'textarea';
}

export class EditableFieldsManager {
  private original: Map<string, any> = new Map();
  private current: Map<string, any> = new Map();
  private changed: Set<string> = new Set();

  /**
   * Inicializar con datos originales
   */
  init(data: any, section: string): void {
    this.flattenObject(data, section).forEach((value, key) => {
      this.original.set(key, value);
      this.current.set(key, value);
    });
  }

  /**
   * Obtener valor actual
   */
  get(path: string): any {
    return this.current.get(path) ?? '';
  }

  /**
   * Obtener valor original
   */
  getOriginal(path: string): any {
    return this.original.get(path) ?? '';
  }

  /**
   * Actualizar valor
   */
  set(path: string, value: any): void {
    this.current.set(path, value);

    if (this.original.get(path) !== value) {
      this.changed.add(path);
    } else {
      this.changed.delete(path);
    }
  }

  /**
   * Revertir campo
   */
  revert(path: string): void {
    const original = this.original.get(path);
    this.current.set(path, original);
    this.changed.delete(path);
  }

  /**
   * Verificar si cambió
   */
  hasChanged(path: string): boolean {
    return this.changed.has(path);
  }

  /**
   * Obtener todos los cambios
   */
  getChanges(): Record<string, any> {
    const changes: Record<string, any> = {};
    this.changed.forEach((path) => {
      changes[path] = this.current.get(path);
    });
    return changes;
  }

  /**
   * Obtener cambios agrupados por sección y estructura anidada
   */
  getStructuredChanges(): {
    medical?: { family_history?: any; personal_habits?: any };
    vitals?: any;
    patient?: any;
  } {
    const result: any = {};

    this.changed.forEach((path) => {
      const value = this.current.get(path);
      const [section, ...rest] = path.split('.');

      if (!result[section]) result[section] = {};

      // Construir objeto anidado
      let target = result[section];
      for (let i = 0; i < rest.length - 1; i++) {
        if (!target[rest[i]]) target[rest[i]] = {};
        target = target[rest[i]];
      }

      const lastKey = rest[rest.length - 1];
      target[lastKey] = value;
    });

    return result;
  }

  /**
   * Resetear todos los cambios
   */
  resetAll(): void {
    this.changed.clear();
    this.original.forEach((value, key) => {
      this.current.set(key, value);
    });
  }

  /**
   * Convertir objeto anidado a flat map
   */
  private flattenObject(obj: any, prefix: string = ''): Map<string, any> {
    const result = new Map<string, any>();

    Object.keys(obj || {}).forEach((key) => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursivo para objetos anidados
        this.flattenObject(value, newKey).forEach((v, k) => {
          result.set(k, v);
        });
      } else {
        result.set(newKey, value);
      }
    });

    return result;
  }

  get changesCount(): number {
    return this.changed.size;
  }

  get hasAnyChanges(): boolean {
    return this.changed.size > 0;
  }
}
