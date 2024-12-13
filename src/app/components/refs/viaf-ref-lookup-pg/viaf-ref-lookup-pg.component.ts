import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import {
  ViafRefLookupService,
  ViafSearchResult,
  ViafService,
  ViafSuggestResult,
} from '../../../../../projects/myrmidon/cadmus-refs-viaf-lookup/src/public-api';
import { RefLookupComponent } from '../../../../../projects/myrmidon/cadmus-refs-lookup/src/public-api';

@Component({
  selector: 'app-viaf-ref-lookup-pg',
  templateUrl: './viaf-ref-lookup-pg.component.html',
  styleUrls: ['./viaf-ref-lookup-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    RefLookupComponent,
  ],
})
export class ViafRefLookupPgComponent {
  public item?: ViafSearchResult;
  public term: FormControl<string | null>;
  public form: FormGroup;
  public suggestResult: ViafSuggestResult | undefined;
  public suggesting?: boolean;

  constructor(
    formBuilder: FormBuilder,
    public service: ViafRefLookupService,
    private _viaf: ViafService
  ) {
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

  public suggestTerm(): void {
    if (this.form.invalid || !this.term.value || this.suggesting) {
      return;
    }
    this.suggesting = true;
    this._viaf.suggest(this.term.value).subscribe({
      next: (r) => {
        this.suggestResult = r;
        this.suggesting = false;
      },
      error: (error) => {
        console.error('Error!');
        if (error) {
          console.log(JSON.stringify(error));
        }
        this.suggesting = false;
      },
    });
  }
}
