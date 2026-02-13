import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  DbpediaDoc,
  DbpediaOptions,
  DbpediaService,
  DbpediaRefLookupService,
} from '@myrmidon/cadmus-refs-dbpedia-lookup';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

@Component({
  selector: 'app-dbpedia-ref-lookup-pg',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule,
    RefLookupComponent,
  ],
  templateUrl: './dbpedia-ref-lookup-pg.component.html',
  styleUrl: './dbpedia-ref-lookup-pg.component.css',
})
export class DbpediaRefLookupPgComponent {
  public docs?: DbpediaDoc[];

  public limit: FormControl<number>;
  public prefix: FormControl<boolean>;
  public query: FormControl<string | null>;
  public types: FormControl<string>;
  public form: FormGroup;

  public busy?: boolean;
  public results: DbpediaDoc[] = [];

  constructor(
    public service: DbpediaRefLookupService,
    private _dbpService: DbpediaService,
    formBuilder: FormBuilder,
  ) {
    this.limit = formBuilder.control(3, {
      nonNullable: true,
      validators: Validators.required,
    });
    this.prefix = formBuilder.control(false, { nonNullable: true });
    this.query = formBuilder.control('Plato', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    });
    this.types = formBuilder.control('http://dbpedia.org/ontology/Person', {
      nonNullable: true,
    });
    this.form = formBuilder.group({
      limit: this.limit,
      prefix: this.prefix,
      query: this.query,
      types: this.types,
    });
  }

  public onItemChange(item: any): void {
    this.docs = item;
  }

  public search(): void {
    if (this.form.invalid) {
      return;
    }
    const options: DbpediaOptions = {
      limit: this.limit.value,
      prefixMatch: this.prefix.value,
      types: this.types.value ? this.types.value.split('\n') : undefined,
    };
    this.busy = true;
    this._dbpService.lookup(this.query.value!, options).subscribe({
      next: (docs: DbpediaDoc[]) => {
        this.results = docs;
      },
      error: (error) => {
        console.error(error);
      },
      complete: () => {
        this.busy = false;
      },
    });
  }
}
