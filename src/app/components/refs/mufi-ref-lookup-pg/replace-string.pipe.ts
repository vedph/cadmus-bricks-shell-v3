import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replaceString',
  standalone: true,
})
export class ReplaceStringPipe implements PipeTransform {
  transform(
    value: string | null | undefined,
    search: string,
    replacement: string
  ): string {
    if (!value) return '';
    return value.replace(new RegExp(search, 'g'), replacement);
  }
}
