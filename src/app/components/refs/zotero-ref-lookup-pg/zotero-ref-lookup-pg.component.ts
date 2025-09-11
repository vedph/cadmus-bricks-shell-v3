import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
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

import { LocalStorageService, RamStorageService } from '@myrmidon/ngx-tools';

import {
  ZoteroItem,
  ZoteroRefLookupService,
  ZoteroService,
} from '@myrmidon/cadmus-refs-zotero-lookup';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

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
export class ZoteroRefLookupPgComponent implements OnInit {
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
    private _ramStorage: RamStorageService,
    private _localStorage: LocalStorageService
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

  public ngOnInit(): void {
    // load saved settings from local storage
    this.user.setValue(this._localStorage.retrieve('zoteroUserId'));
    this.key.setValue(this._localStorage.retrieve('zoteroApiKey'));
    this.libraryId.setValue(this._localStorage.retrieve('zoteroLibraryId'));

    this._ramStorage.store('zoteroApiKey', this.key.value);
    this._ramStorage.store('zoteroUserId', this.user.value);
  }

  public onSubmit(): void {
    if (this.form.valid) {
      this._ramStorage.store('zoteroApiKey', this.key.value);
      this._ramStorage.store('zoteroUserId', this.user.value);

      // store in local settings so we can retrieve values later
      this._localStorage.store('zoteroApiKey', this.key.value);
      this._localStorage.store('zoteroUserId', this.user.value);
      this._localStorage.store('zoteroLibraryId', this.libraryId.value);

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
