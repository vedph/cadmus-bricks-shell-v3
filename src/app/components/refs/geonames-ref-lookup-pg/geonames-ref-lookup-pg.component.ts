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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';

import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';
import {
  GeoNamesBBox,
  GeoNamesRefLookupService,
  GeoNamesSearchRequest,
  GeoNamesService,
  GeoNamesToponym,
} from '@myrmidon/cadmus-refs-geonames-lookup';

interface Pair<T> {
  key: string;
  value: T;
}

@Component({
  selector: 'app-geonames-ref-lookup-pg',
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
    MatSelectModule,
    RefLookupComponent,
  ],
  templateUrl: './geonames-ref-lookup-pg.component.html',
  styleUrl: './geonames-ref-lookup-pg.component.scss',
})
export class GeonamesRefLookupPgComponent {
  public toponyms?: GeoNamesToponym[];

  public searchType: FormControl<number>;
  public text: FormControl<string>;
  public maxRows: FormControl<number | null>;
  public startRow: FormControl<number | null>;
  public countries: FormControl<string | null>;
  public countryBias: FormControl<string | null>;
  public continentCode: FormControl<string | null>;
  public adminCode1: FormControl<string | null>;
  public adminCode2: FormControl<string | null>;
  public adminCode3: FormControl<string | null>;
  public adminCode4: FormControl<string | null>;
  public adminCode5: FormControl<string | null>;
  public featureClasses: FormControl<string | null>;
  public featureCodes: FormControl<string | null>;
  public cities: FormControl<string | null>;
  public lang: FormControl<string | null>;
  public searchLang: FormControl<string | null>;
  public style: FormControl<string>;
  public fuzzy: FormControl<number | null>;
  public bbox: FormControl<string | null>;
  public orderBy: FormControl<string>;
  public inclBbox: FormControl<boolean>;
  public form: FormGroup;

  public busy?: boolean;
  public availableContinentCodes: Pair<string>[] = [
    { key: 'AF', value: 'Africa' },
    { key: 'AS', value: 'Asia' },
    { key: 'EU', value: 'Europe' },
    { key: 'NA', value: 'North America' },
    { key: 'OC', value: 'Oceania' },
    { key: 'SA', value: 'South America' },
    { key: 'AN', value: 'Antarctica' },
  ];
  public availableFeatureClasses: Pair<string>[] = [
    { key: 'A', value: 'admin divisions' },
    { key: 'H', value: 'hydrographic features' },
    { key: 'L', value: 'landscapes' },
    { key: 'P', value: 'populated places' },
    { key: 'R', value: 'roads' },
    { key: 'S', value: 'spots' },
    { key: 'T', value: 'terrains' },
    { key: 'U', value: 'undersea' },
    { key: 'V', value: 'vegetation' },
  ];
  public availableCities: Pair<string>[] = [
    { key: 'cities1000', value: 'cities1000' },
    { key: 'cities5000', value: 'cities5000' },
    { key: 'cities15000', value: 'cities15000' },
  ];

  constructor(
    public service: GeoNamesRefLookupService,
    private _geoNamesService: GeoNamesService,
    formBuilder: FormBuilder
  ) {
    this.searchType = formBuilder.control(0, { nonNullable: true });
    this.text = formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    });
    this.maxRows = formBuilder.control<number | null>(3, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(100)],
    });
    this.startRow = formBuilder.control<number | null>(null, {
      nonNullable: true,
    });
    this.countries = formBuilder.control<string | null>(null);
    this.countryBias = formBuilder.control<string | null>(null);
    this.continentCode = formBuilder.control<string | null>(null);
    this.adminCode1 = formBuilder.control<string | null>(null);
    this.adminCode2 = formBuilder.control<string | null>(null);
    this.adminCode3 = formBuilder.control<string | null>(null);
    this.adminCode4 = formBuilder.control<string | null>(null);
    this.adminCode5 = formBuilder.control<string | null>(null);
    this.featureClasses = formBuilder.control<string | null>(null);
    this.featureCodes = formBuilder.control<string | null>(null);
    this.cities = formBuilder.control<string | null>(null);
    this.lang = formBuilder.control<string | null>(null);
    this.searchLang = formBuilder.control<string | null>(null);
    this.style = formBuilder.control<string>('SHORT', { nonNullable: true });
    this.fuzzy = formBuilder.control<number | null>(null);
    this.bbox = formBuilder.control<string | null>(null);
    this.orderBy = formBuilder.control<string>('relevance', {
      nonNullable: true,
    });
    this.inclBbox = formBuilder.control<boolean>(false, { nonNullable: true });
    this.form = formBuilder.group({
      searchType: this.searchType,
      text: this.text,
      maxRows: this.maxRows,
      startRow: this.startRow,
      countries: this.countries,
      countryBias: this.countryBias,
      continentCode: this.continentCode,
      adminCode1: this.adminCode1,
      adminCode2: this.adminCode2,
      adminCode3: this.adminCode3,
      adminCode4: this.adminCode4,
      adminCode5: this.adminCode5,
      featureClasses: this.featureClasses,
      featureCodes: this.featureCodes,
      cities: this.cities,
      lang: this.lang,
      searchLang: this.searchLang,
      style: this.style,
      fuzzy: this.fuzzy,
      bbox: this.bbox,
      orderBy: this.orderBy,
      inclBbox: this.inclBbox,
    });
  }

  public onFeatureSelected(change: MatSelectChange): void {
    const feature = change.value;
    if (!feature) {
      return;
    }
    // append the feature string character to the feature classes
    // unless it is already present
    if (this.featureClasses.value?.indexOf(feature) === -1) {
      this.featureClasses.setValue((this.featureClasses.value || '') + feature);
      this.featureClasses.markAsDirty();
      this.featureClasses.updateValueAndValidity();
    }
  }

  public onItemChange(item: any): void {
    this.toponyms = item;
  }

  private parseBBox(value: string | null): GeoNamesBBox | undefined {
    if (!value) {
      return undefined;
    }
    // parse north south east west separated by whitespaces
    const parts = value.split(/\s+/);
    if (parts.length < 4) {
      return undefined;
    }
    return {
      north: parseFloat(parts[0]),
      south: parseFloat(parts[1]),
      east: parseFloat(parts[2]),
      west: parseFloat(parts[3]),
    };
  }

  public search(): void {
    if (this.form.invalid) {
      return;
    }
    const request: GeoNamesSearchRequest = {
      userName: 'myrmex',
      type: 'json',
      searchType: this.searchType.value,
      text: this.text.value,
      maxRows: this.maxRows.value || undefined,
      startRow: this.startRow.value || undefined,
      countries: this.countries.value
        ? this.countries.value?.trim()?.split(' ')
        : undefined,
      countryBias: this.countryBias.value || undefined,
      continentCode: (this.continentCode.value as any) || undefined,
      adminCode1: this.adminCode1.value || undefined,
      adminCode2: this.adminCode2.value || undefined,
      adminCode3: this.adminCode3.value || undefined,
      adminCode4: this.adminCode4.value || undefined,
      adminCode5: this.adminCode5.value || undefined,
      featureClasses: this.featureClasses.value
        ? this.featureClasses.value
        : undefined,
      featureCodes: this.featureCodes.value
        ? this.featureCodes.value.split(' ')
        : undefined,
      cities: (this.cities.value as any) || undefined,
      lang: this.lang.value || undefined,
      searchLang: this.searchLang.value || undefined,
      style: this.style.value as any,
      fuzzy: this.fuzzy.value || undefined,
      bbox: this.parseBBox(this.bbox.value),
      orderBy: this.orderBy.value as any,
      inclBbox: this.inclBbox.value || undefined,
    };

    this.busy = true;
    this._geoNamesService.search(request).subscribe({
      next: (result) => {
        this.toponyms = result.geonames;
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
