import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { RefLookupComponent } from '../../../../../projects/myrmidon/cadmus-refs-lookup/src/public-api';
import {
  GeoJsonFeature,
  WhgRefLookupService,
} from '../../../../../projects/myrmidon/cadmus-refs-whg-lookup/src/public-api';

@Component({
  selector: 'app-whg-ref-lookup-pg',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RefLookupComponent,
  ],
  templateUrl: './whg-ref-lookup-pg.component.html',
  styleUrl: './whg-ref-lookup-pg.component.scss',
})
export class WhgRefLookupPgComponent {
  public item?: GeoJsonFeature;
  public term: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder, public service: WhgRefLookupService) {
    this.term = formBuilder.control(null, Validators.required);
    this.form = formBuilder.group({
      term: this.term,
    });
  }

  public onItemChange(item: any | undefined): void {
    this.item = item;
  }

  public onMoreRequest(): void {
    alert('More...');
  }
}
