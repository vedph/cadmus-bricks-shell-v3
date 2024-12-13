import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to convert a 1-based column index to an Excel-like column label.
 * Usage:
 * ```html
 * {{ 1 | excelColumn }} <!-- A -->
 * {{ 26 | excelColumn }} <!-- Z -->
 * {{ 27 | excelColumn }} <!-- AA -->
 * ```
 */
@Pipe({
  name: 'excelColumn',
  standalone: true,
})
export class ExcelColumnPipe implements PipeTransform {
  transform(value: number): string {
    if (value < 1) {
      return '';
    }

    let columnLabel = '';
    let n = value;

    while (n > 0) {
      n--;
      columnLabel = String.fromCharCode(65 + (n % 26)) + columnLabel;
      n = Math.floor(n / 26);
    }

    return columnLabel;
  }
}
