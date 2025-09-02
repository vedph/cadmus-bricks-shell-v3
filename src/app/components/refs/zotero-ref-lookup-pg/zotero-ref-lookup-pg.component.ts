import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import {
  ZoteroItem,
  ZoteroRefLookupService,
  ZoteroService,
} from '../../../../../projects/myrmidon/cadmus-refs-zotero-lookup/src/public-api';
import { RefLookupComponent } from '../../../../../projects/myrmidon/cadmus-refs-lookup/src/public-api';
import { RamStorageService } from '@myrmidon/ngx-tools';

@Component({
  selector: 'app-zotero-ref-lookup-pg',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    RefLookupComponent,
  ],
  templateUrl: './zotero-ref-lookup-pg.component.html',
  styleUrl: './zotero-ref-lookup-pg.component.scss',
})
export class ZoteroRefLookupPgComponent {
  public user: FormControl<string | null>;
  public key: FormControl<string | null>;
  public libraryId: FormControl<string | null>;
  public term: FormControl<string | null>;
  public form: FormGroup;

  public readonly item = signal<ZoteroItem | undefined>(undefined);
  public readonly busy = signal<boolean>(false);

  constructor(
    formBuilder: FormBuilder,
    public service: ZoteroRefLookupService,
    private _zotero: ZoteroService,
    private _storage: RamStorageService
  ) {
    this.user = formBuilder.control(null, Validators.required);
    this.key = formBuilder.control(null, Validators.required);
    this.libraryId = formBuilder.control(null, Validators.required);
    this.term = formBuilder.control(null, Validators.required);
    this.form = formBuilder.group({
      user: this.user,
      key: this.key,
      libraryId: this.libraryId,
      term: this.term,
    });
  }

  public onSubmit(): void {
    if (this.form.valid) {
      this._storage.store('zoteroApiKey', this.key.value);
      this._storage.store('zoteroUserId', this.user.value);

      this.busy.set(true);
      this._zotero
        .searchEverything(this.libraryId.value!, this.term.value!)
        .subscribe({
          next: (item) => this.onItemChange(item),
          error: (err) => {
            console.error(err);
          },
          complete: () => {
            this.busy.set(false);
          },
        });
    }
  }

  public onItemChange(item?: any): void {
    this.item.set(item);
  }
}
