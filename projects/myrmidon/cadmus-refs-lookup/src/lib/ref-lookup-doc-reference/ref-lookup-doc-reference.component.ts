import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import {
  FormField,
  FormRoot,
  form,
  maxLength,
  required,
} from '@angular/forms/signals';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

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

import { DocReference } from '@myrmidon/cadmus-refs-doc-references';
import { ObjectViewComponent } from '@myrmidon/cadmus-ui-object-view';

import {
  RefLookupConfig,
  RefLookupSetComponent,
} from '../ref-lookup-set/ref-lookup-set.component';
import { LookupProviderOptions } from '../ref-lookup/ref-lookup.component';

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
    FormField,
    FormRoot,
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
export class LookupDocReferenceComponent {
  private _lookupConfig?: RefLookupConfig;

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
   * True to auto-close the picker when a lookup item is picked.
   */
  public readonly autoCloseOnPick = input<boolean>(true);

  /**
   * Optional preset options for lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

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

  private readonly _draft = signal({
    type: '',
    tag: '',
    citation: '',
    note: '',
  });
  public readonly form = form(this._draft, (path) => {
    maxLength(path.type, 50);
    maxLength(path.tag, 50);
    required(path.citation);
    maxLength(path.citation, 300);
    maxLength(path.note, 500);
  });

  private readonly _pickerDraft = signal<{ pickerType: string }>({
    pickerType: this.defaultPicker(),
  });
  public readonly pickerForm = form(this._pickerDraft);

  constructor(
    private _schemeService: CitSchemeService,
    settings: RamStorageService
  ) {
    this.lookupConfigs.set(
      settings.retrieve<RefLookupConfig[]>(LOOKUP_CONFIGS_KEY) || []
    );
    this._lookupConfig = this.lookupConfigs().length
      ? this.lookupConfigs()[0]
      : undefined;

    // when reference changes, update form
    effect(() => {
      const reference = this.reference();
      this.updateForm(reference);
    });

    // when picker type changes, parse citation if it's citation
    toObservable(this.pickerForm.pickerType().value)
      .pipe(distinctUntilChanged(), debounceTime(300), takeUntilDestroyed())
      .subscribe((value) => {
        if (value === 'citation' && this.form.citation().value()) {
          this.parseCitation();
        }
      });

    // ensure picker type is valid when available pickers change
    effect(() => {
      const availablePickers = this.pickers();
      const currentPickerType = this.pickerForm.pickerType().value();

      if (
        availablePickers.length > 0 &&
        !availablePickers.includes(currentPickerType)
      ) {
        this.pickerForm.pickerType().value.set(availablePickers[0]);
      }
    });
  }

  public onLookupConfigChange(config: RefLookupConfig): void {
    this._lookupConfig = config;
    this.pickedItem.set(undefined); // reset picked item
  }

  private parseCitation(): void {
    const citation = this._schemeService.parse(
      this.form.citation().value(),
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
      this.pickerForm.pickerType().value() === 'citation' &&
      this.form.citation().value()
    ) {
      this.parseCitation();
    }
  }

  public onLookupItemChange(item: any): void {
    if (item?.itemId) {
      this.form.citation().value.set(item.itemId);
      this.form.citation().markAsDirty();
      this.pickedItem.set(item);
      if (this.autoCloseOnPick()) {
        this.pickerExpanded.set(false);
      }
    }
  }

  public onCitationChange(citation?: Citation): void {
    if (
      !citation ||
      !this.pickerExpanded() ||
      this.pickerForm.pickerType().value() !== 'citation'
    ) {
      return;
    }
    this.form.citation().value.set(this._schemeService.toString(citation));
    this.form.citation().markAsDirty();
  }

  private updateForm(reference?: DocReference): void {
    if (!reference) {
      this._draft.set({ type: '', tag: '', citation: '', note: '' });
    } else {
      this._draft.set({
        type: reference.type || '',
        tag: reference.tag || '',
        citation: reference.citation,
        note: reference.note || '',
      });
    }
    this.form().reset();
  }

  private getReference(): DocReference {
    return {
      type: this.form.type().value().trim() || undefined,
      tag: this.form.tag().value().trim() || undefined,
      citation: this.form.citation().value().trim(),
      note: this.form.note().value().trim() || undefined,
    };
  }

  public close(): void {
    this.cancel.emit();
  }

  public save(): void {
    this.reference.set(this.getReference());
  }

}
