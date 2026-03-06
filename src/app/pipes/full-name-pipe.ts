import { Pipe, PipeTransform } from '@angular/core';

type NameLike = {
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  full_name?: string | null;
};

@Pipe({
  name: 'FullNamePipe',
  standalone: true,
})
export class FullNamePipePipe implements PipeTransform {
  transform(info: NameLike | null | undefined): string {
    if (!info) return 'Usuario';

    const hasParts = !!(info.first_name || info.middle_name || info.last_name);
    if (hasParts) {
      const names = [info.first_name, info.middle_name, info.last_name].filter(
        (v): v is string => !!v
      );
      return names.join(' ') || 'Usuario';
    }

    if (info.full_name) return info.full_name;
    return 'Usuario';
  }
}
