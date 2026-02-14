import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
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
import { SparqlSelectResponse } from '@myrmidon/cadmus-refs-sparql';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';
import { EnvService } from '@myrmidon/ngx-tools';

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
  public directUri: FormControl<boolean>;
  public includeCoordinates: FormControl<boolean>;
  public form: FormGroup;

  // raw SPARQL editor
  public rawSparql: FormControl<string>;

  public readonly busy = signal<boolean>(false);
  public readonly results = signal<DbpediaDoc[]>([]);
  public readonly rawResults = signal<SparqlSelectResponse | undefined>(
    undefined,
  );
  public readonly sparqlQuery = signal<string | undefined>(undefined);
  public readonly lastSearchMode = signal<string | undefined>(undefined);
  public readonly elapsed = signal<number | undefined>(undefined);

  constructor(
    public service: DbpediaRefLookupService,
    private _dbpService: DbpediaService,
    private _env: EnvService,
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
    this.directUri = formBuilder.control(false, { nonNullable: true });
    this.includeCoordinates = formBuilder.control(false, {
      nonNullable: true,
    });
    this.form = formBuilder.group({
      limit: this.limit,
      prefix: this.prefix,
      query: this.query,
      types: this.types,
      directUri: this.directUri,
      includeCoordinates: this.includeCoordinates,
    });

    this.rawSparql = formBuilder.control('', { nonNullable: true });
  }

  public onItemChange(item: any): void {
    this.docs = item;
  }

  private _buildOptions(): DbpediaOptions {
    return {
      limit: this.limit.value,
      prefixMatch: this.prefix.value,
      directUri: this.directUri.value,
      includeCoordinates: this.includeCoordinates.value,
      proxyUrl: this._env.get('proxyUrl') || undefined,
      types: this.types.value
        ? this.types.value
            .split('\n')
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : undefined,
    };
  }

  public search(): void {
    if (this.form.invalid) {
      return;
    }
    const options = this._buildOptions();
    this.sparqlQuery.set(undefined);
    this.rawResults.set(undefined);
    this.lastSearchMode.set('Lookup API');
    this.busy.set(true);
    this.elapsed.set(undefined);
    const t0 = performance.now();
    this._dbpService.lookup(this.query.value!, options).subscribe({
      next: (docs: DbpediaDoc[]) => {
        this.results.set(docs);
      },
      error: (error) => {
        console.error(error);
        this.elapsed.set(Math.round(performance.now() - t0));
        this.busy.set(false);
      },
      complete: () => {
        this.elapsed.set(Math.round(performance.now() - t0));
        this.busy.set(false);
      },
    });
  }

  public showQuery(): void {
    if (this.form.invalid) {
      return;
    }
    const options = this._buildOptions();
    this.sparqlQuery.set(
      this._dbpService.buildSearchQuery(this.query.value!, options) ||
        undefined,
    );
    this.results.set([]);
    this.rawResults.set(undefined);
    this.elapsed.set(undefined);
    this.lastSearchMode.set(undefined);
  }

  public searchSparql(): void {
    if (this.form.invalid) {
      return;
    }
    const options = this._buildOptions();
    this.sparqlQuery.set(
      this._dbpService.buildSearchQuery(this.query.value!, options) ||
        undefined,
    );
    this.rawResults.set(undefined);
    this.lastSearchMode.set('SPARQL');
    this.busy.set(true);
    this.elapsed.set(undefined);
    const t0 = performance.now();
    this._dbpService.search(this.query.value!, options).subscribe({
      next: (docs: DbpediaDoc[]) => {
        this.results.set(docs);
      },
      error: (error) => {
        console.error(error);
        this.elapsed.set(Math.round(performance.now() - t0));
        this.busy.set(false);
      },
      complete: () => {
        this.elapsed.set(Math.round(performance.now() - t0));
        this.busy.set(false);
      },
    });
  }

  public executeRawSparql(): void {
    const query = this.rawSparql.value?.trim();
    if (!query) {
      return;
    }
    this.results.set([]);
    this.sparqlQuery.set(query);
    this.lastSearchMode.set('Raw SPARQL');
    this.busy.set(true);
    this.elapsed.set(undefined);
    const t0 = performance.now();
    const options = this._buildOptions();
    this._dbpService.rawQuery(query, options).subscribe({
      next: (response: SparqlSelectResponse) => {
        this.rawResults.set(response);
      },
      error: (error) => {
        console.error(error);
        this.elapsed.set(Math.round(performance.now() - t0));
        this.busy.set(false);
      },
      complete: () => {
        this.elapsed.set(Math.round(performance.now() - t0));
        this.busy.set(false);
      },
    });
  }
}
