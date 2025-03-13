import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTooltip } from '@angular/material/tooltip';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

import { Flag } from '../flag-set/flag-set.component';

/**
 * A badge showing a set of flags.
 */
@Component({
  selector: 'cadmus-flag-set-badge',
  imports: [CommonModule, MatTooltip, ColorToContrastPipe],
  templateUrl: './flag-set-badge.component.html',
  styleUrl: './flag-set-badge.component.css',
})
export class FlagSetBadgeComponent {
  /**
   * The flags to display.
   */
  public readonly flags = input<Flag[]>([]);

  /**
   * True to hide flag initials and just show the color.
   */
  public readonly noInitials = input<boolean>(false);

  /**
   * The symbol to use for the flag. Default is a filled circle.
   */
  public readonly flagSymbol = input<string>('\u25cf');

  /**
   * The size of the flag symbol. Default is 1em.
   */
  public readonly flagSize = input<string>('1em');

  public readonly flagInitials = computed<string[]>(() => {
    return this.noInitials() ? [] : this.getFlagInitials(this.flags());
  });

  public readonly flagColors = computed<string[]>(() => {
    return this.flags().map(
      (flag) => flag.color || this.generateColor(flag.id)
    );
  });

  private getFlagInitials(flags: Flag[]): string[] {
    const initials = new Map<string, number>();
    return flags.map((flag) => {
      let initial = flag.label.slice(0, 2).toUpperCase();
      let count = initials.get(initial) || 0;
      while (initials.has(initial)) {
        count++;
        initial = flag.label[0].toUpperCase() + flag.label[count].toUpperCase();
      }
      initials.set(initial, count);
      return initial;
    });
  }

  private generateColor(id: string): string {
    const seed = this.hashString(id);
    const hue = seed % 360;
    const saturation = 70 + (seed % 30); // 70-100%
    const lightness = 80 + (seed % 10); // 80-90%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
