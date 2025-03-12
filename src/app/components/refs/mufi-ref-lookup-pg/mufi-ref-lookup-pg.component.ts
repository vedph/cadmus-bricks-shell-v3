import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ReplaceStringPipe, SafeHtmlPipe } from '@myrmidon/ngx-tools';

import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

import {
  MufiRefLookupService,
  MufiChar,
} from '../../../../../projects/myrmidon/cadmus-refs-mufi-lookup/src/public-api';

@Component({
  selector: 'app-mufi-ref-lookup-pg',
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    RefLookupComponent,
    SafeHtmlPipe,
    ReplaceStringPipe,
  ],
  templateUrl: './mufi-ref-lookup-pg.component.html',
  styleUrl: './mufi-ref-lookup-pg.component.scss',
})
export class MufiRefLookupPgComponent {
  public item?: MufiChar;

  constructor(public service: MufiRefLookupService) {}

  public onItemChange(item: any | undefined): void {
    this.item = item;
  }

  public onMoreRequest(): void {
    alert('More...');
  }
}
