import { Pipe, type PipeTransform } from '@angular/core';
import { format, parseISO } from 'date-fns';

@Pipe({
  name: 'ItemDate',
  standalone: true,
})
export class ItemDatePipe implements PipeTransform {
  transform(
    value: string | Date | null | undefined,
    pattern: string = 'yyyy-MM-dd HH:mm'
  ): string {
    if (!value) return 'Sin fecha';

    try {
      const date = value instanceof Date ? value : parseISO(String(value)); // para strings ISO del backend

      return format(date, pattern);
    } catch {
      return 'Fecha inválida';
    }
  }
}
