import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SafeHtmlPipe } from '@myrmidon/ngx-tools';

import { ArrayIntersectPipe } from '../../pipes/array-intersect.pipe';

export interface TextBlock {
  id: string;
  text: string;
  decoration?: string;
  tip?: string;
  htmlDecoration?: boolean;
  layerIds?: string[];
}

export interface TextBlockEventArgs {
  decoration?: boolean;
  block: TextBlock;
}

@Component({
  selector: 'cadmus-text-block-view',
  templateUrl: './text-block-view.component.html',
  styleUrls: ['./text-block-view.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ArrayIntersectPipe,
    SafeHtmlPipe,
  ],
})
export class TextBlockViewComponent {
  public readonly selectedIds = input<string[]>();

  public readonly blocks = input<TextBlock[]>([]);

  public readonly blockClick = output<TextBlockEventArgs>();

  public getBlockId(index: number, block: TextBlock): any {
    return block.id;
  }

  public onBlockClick(block: TextBlock, decoration: boolean): void {
    this.blockClick.emit({ decoration: decoration, block: block });
  }
}
