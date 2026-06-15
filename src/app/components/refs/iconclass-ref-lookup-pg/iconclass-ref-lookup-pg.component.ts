import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
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
  IconclassNotation,
  IconclassRefLookupService,
  IconclassSearchResult,
  IconclassService,
} from '@myrmidon/cadmus-refs-iconclass-lookup';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

@Component({
  selector: 'app-iconclass-ref-lookup-pg',
  templateUrl: './iconclass-ref-lookup-pg.component.html',
  styleUrls: ['./iconclass-ref-lookup-pg.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
export class IconclassRefLookupPgComponent {
  public item?: IconclassNotation;
  public term: FormControl<string | null>;
  public form: FormGroup;
  public searchResult: IconclassSearchResult | undefined;
  public searching?: boolean;

  constructor(
    formBuilder: FormBuilder,
    public service: IconclassRefLookupService,
    private _iconclass: IconclassService,
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

  public searchTerm(): void {
    if (this.form.invalid || !this.term.value || this.searching) {
      return;
    }
    this.searching = true;
    this._iconclass.search(this.term.value).subscribe({
      next: (r) => {
        this.searchResult = r;
        this.searching = false;
      },
      error: (error) => {
        console.error('Error!');
        if (error) {
          console.log(JSON.stringify(error));
        }
        this.searching = false;
      },
    });
  }
}
