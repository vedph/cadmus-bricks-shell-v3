import { Component, signal } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';
import {
  MolRefLookupService,
  MolAuthorityEntry,
} from '@myrmidon/cadmus-refs-mol-lookup';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-mol-ref-lookup-pg',
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    RefLookupComponent,
    JsonPipe,
  ],
  templateUrl: './mol-ref-lookup-pg.html',
  styleUrl: './mol-ref-lookup-pg.scss',
})
export class MolRefLookupPg {
  public readonly item = signal<MolAuthorityEntry | undefined>(undefined);

  constructor(public service: MolRefLookupService) {}

  public onItemChange(item: any | undefined): void {
    this.item.set(item);
  }
}
