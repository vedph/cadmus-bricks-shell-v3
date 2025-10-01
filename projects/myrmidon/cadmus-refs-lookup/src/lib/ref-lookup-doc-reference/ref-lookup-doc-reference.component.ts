import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  Citation,
  CitationComponent,
  CitSchemeService,
} from '@myrmidon/cadmus-refs-citation';

import { RamStorageService } from '@myrmidon/ngx-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';
import { ObjectViewComponent } from '@myrmidon/cadmus-ui-object-view';

import {
  RefLookupConfig,
  RefLookupSetComponent,
} from '../ref-lookup-set/ref-lookup-set.component';

/**
 * The key to be used to retrieve the external lookup configs from the
 * settings storage, when using multiple lookups, like in asserted composite IDs.
 */
export const LOOKUP_CONFIGS_KEY = 'cadmus-refs-lookup.configs';

/**
 * Document reference editor lookup component.
 */
@Component({
  selector: 'cadmus-refs-lookup-doc-reference',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    RefLookupSetComponent,
    CitationComponent,
    ObjectViewComponent,
  ],
  templateUrl: './ref-lookup-doc-reference.component.html',
  styleUrl: './ref-lookup-doc-reference.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LookupDocReferenceComponent implements OnDestroy {
  private _lookupConfig?: RefLookupConfig;
  private _sub?: Subscription;

  /**
   * The list of thesaurus entries for doc-reference-types.
   */
  public readonly typeEntries = input<ThesaurusEntry[]>();

  /**
   * The list of thesaurus entries for doc-reference-tags.
   */
  public readonly tagEntries = input<ThesaurusEntry[]>();

  /**
   * True to disable the lookup set.
   */
  public readonly noLookup = input<boolean>();

  /**
   * True to disable the citation builder.
   */
  public readonly noCitation = input<boolean>();

  /**
   * The reference being edited.
   */
  public readonly reference = model<DocReference>();

  /**
   * The default picker to show when the editor opens.
   */
  public readonly defaultPicker = input<'citation' | 'lookup'>('citation');

  /**
   * Emitted when the user closes the editor.
   */
  public readonly cancel = output<void>();

  /**
   * The last picked item from the lookup set (if any).
   */
  public readonly pickedItem = signal<any>(undefined);

  /**
   * True if at least one picker is enabled (lookup or citation).
   */
  public readonly pickerEnabled = computed<boolean>(
    () =>
      (!this.noLookup() && !!this._lookupConfig) ||
      (!this.noCitation() && !!(this._schemeService?.getSchemes()?.length > 0))
  );

  /**
   * The available pickers, depending on the noLookup and noCitation
   * inputs and on the availability of lookup config and citation schemes.
   */
  public readonly pickers = computed<string[]>(() => {
    // lookup disabled when noLookup or no lookup config
    const noLookup = this.noLookup() || !this._lookupConfig;
    // citation disabled when noCitation or no scheme service
    const noCitation =
      this.noCitation() || !this._schemeService?.getSchemes()?.length;

    if (noLookup && noCitation) {
      return [];
    }
    if (noLookup) {
      return ['citation'];
    }
    if (noCitation) {
      return ['lookup'];
    }
    return ['citation', 'lookup'];
  });

  /**
   * True if the picker type selector must be disabled (only one picker).
   */
  public readonly pickerTypeDisabled = computed<boolean>(() => {
    return this.pickers().length <= 1;
  });

  public readonly pickerExpanded = signal<boolean>(false);
  public readonly lookupConfigs = signal<RefLookupConfig[]>([]);
  public readonly parsedCitation = signal<Citation | undefined>(undefined);

  public type: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public citation: FormControl<string>;
  public note: FormControl<string | null>;
  public form: FormGroup;

  public pickerType: FormControl<string>;

  constructor(
    private _schemeService: CitSchemeService,
    settings: RamStorageService,
    formBuilder: FormBuilder
  ) {
    this.type = formBuilder.control(null, Validators.maxLength(50));
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.citation = formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(300)],
    });
    this.note = formBuilder.control(null, Validators.maxLength(500));
    this.form = formBuilder.group({
      type: this.type,
      tag: this.tag,
      citation: this.citation,
      note: this.note,
    });
    this.pickerType = formBuilder.control(this.defaultPicker(), {
      nonNullable: true,
    });

    this.lookupConfigs.set(
      settings.retrieve<RefLookupConfig[]>(LOOKUP_CONFIGS_KEY) || []
    );
    this._lookupConfig = this.lookupConfigs().length
      ? this.lookupConfigs()[0]
      : undefined;

    // when reference changes, update form
    effect(() => {
      const reference = this.reference();
      console.log('Input reference', reference);
      this.updateForm(reference);
    });

    // when picker type changes, parse citation if it's citation
    this._sub = this.pickerType.valueChanges
      .pipe(distinctUntilChanged(), debounceTime(300))
      .subscribe((value) => {
        if (value === 'citation' && this.citation.value) {
          this.parseCitation();
        }
      });

    // ensure picker type is valid when available pickers change
    effect(() => {
      const availablePickers = this.pickers();
      const currentPickerType = this.pickerType.value;

      if (
        availablePickers.length > 0 &&
        !availablePickers.includes(currentPickerType)
      ) {
        this.pickerType.setValue(availablePickers[0]);
      }
    });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onLookupConfigChange(config: RefLookupConfig): void {
    this._lookupConfig = config;
    this.pickedItem.set(undefined); // reset picked item
  }

  private parseCitation(): void {
    const citation = this._schemeService.parse(
      this.citation.value,
      this._schemeService.getSchemes()[0].id,
      true // we want empty slots so we can fill them
    );
    if (citation) {
      this.parsedCitation.set(citation);
    }
  }

  public togglePicker(): void {
    // don't allow toggling if no pickers are available
    if (this.pickers().length === 0) {
      return;
    }

    this.pickerExpanded.set(!this.pickerExpanded());

    // if expanded and picker is citation, parse citation into it
    if (
      this.pickerExpanded() &&
      this.pickerType.value === 'citation' &&
      this.citation.value
    ) {
      this.parseCitation();
    }
  }

  public onLookupItemChange(item: any): void {
    if (item?.itemId) {
      this.citation.setValue(item.itemId);
      this.citation.markAsDirty();
      this.citation.updateValueAndValidity();
      this.pickedItem.set(item);
      this.pickerExpanded.set(false);
    }
  }

  public onCitationChange(citation?: Citation): void {
    if (
      !citation ||
      !this.pickerExpanded() ||
      this.pickerType.value !== 'citation'
    ) {
      return;
    }
    this.citation.setValue(this._schemeService.toString(citation));
    this.citation.markAsDirty();
    this.citation.updateValueAndValidity();
  }

  private updateForm(reference?: DocReference): void {
    if (!reference) {
      this.form.reset();
      return;
    }

    this.type.setValue(reference.type || null);
    this.tag.setValue(reference.tag || null);
    this.citation.setValue(reference.citation);
    this.note.setValue(reference.note || null);
    this.form.markAsPristine();
  }

  private getReference(): DocReference {
    return {
      type: this.type.value?.trim(),
      tag: this.tag.value?.trim(),
      citation: this.citation.value?.trim(),
      note: this.note.value?.trim(),
    };
  }

  public close(): void {
    this.cancel.emit();
  }

  public save(): void {
    this.reference.set(this.getReference());
  }
}
