import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ThesaurusEntriesPickerComponent } from '@myrmidon/cadmus-thesaurus-store';
import {
  ThesOrTaxoLabelPipe,
  ThesOrTaxoPick,
  ThesOrTaxoPicker,
  ThesOrTaxoSettings,
  ThesOrTaxoSourceService,
} from '@myrmidon/cadmus-ui-thestaxo';

import {
  ASSERTED_ID_FEATURE_SETTINGS,
  resolveAssertedIdFeatureSettings,
} from './asserted-id-feature-settings';

/**
 * The UI used for picking features:
 * - `thesaurus`: a thesaurus entries picker (list or tree).
 * - `taxonomy`: a list of picked features, plus a taxonomy picker to add more.
 * - `unbound`: a list of picked features, plus a textbox to add more.
 */
export type AssertedIdFeaturesView = 'thesaurus' | 'taxonomy' | 'unbound';

/**
 * The maximum length of a feature typed in unbound mode.
 */
const MAX_TYPED_FEATURE_LENGTH = 100;

/**
 * Picker for the features of an asserted composite ID. Features are a list
 * of strings, which can come from a thesaurus (entry IDs), a taxonomy (node
 * keys), or be just typed (unbound), according to the settings, got from
 * the `settings` input merged over the app-level settings
 * (`ASSERTED_ID_FEATURE_SETTINGS`) and the defaults (thesaurus mode with the
 * entries got from `entries`).
 * When the source for the features is not available (no thesaurus entries,
 * or no taxonomy tree ID), nothing is displayed.
 */
@Component({
  selector: 'cadmus-refs-asserted-id-features',
  templateUrl: './asserted-id-features.component.html',
  styleUrls: ['./asserted-id-features.component.css'],
  imports: [
    AsyncPipe,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    ThesaurusEntriesPickerComponent,
    ThesOrTaxoLabelPipe,
    ThesOrTaxoPicker,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertedIdFeaturesComponent {
  private readonly _source = inject(ThesOrTaxoSourceService);
  private readonly _appSettings = inject(ASSERTED_ID_FEATURE_SETTINGS, {
    optional: true,
  });

  public readonly maxTypedLength = MAX_TYPED_FEATURE_LENGTH;

  /**
   * The thesaurus entries provided by the editor for the features
   * (thesaurus `asserted-id-features`). These are used in thesaurus mode,
   * unless settings specify a thesaurus ID in their source.
   */
  public readonly entries = input<ThesaurusEntry[] | null | undefined>();

  /**
   * The settings for picking features. Each defined property overrides
   * the app-level settings, which in turn override the defaults.
   */
  public readonly settings = input<ThesOrTaxoSettings | null | undefined>();

  /**
   * The label of the control.
   */
  public readonly label = input<string>('features');

  /**
   * The picked features.
   */
  public readonly features = model<string[]>([]);

  /**
   * The effective settings.
   */
  public readonly currentSettings = computed<ThesOrTaxoSettings>(() =>
    resolveAssertedIdFeatureSettings(this._appSettings, this.settings()),
  );

  // the ID of the thesaurus to load, if any
  private readonly _thesaurusId = computed<string | null>(() => {
    const s = this.currentSettings();
    return s.mode === 'thesaurus' && s.source ? s.source : null;
  });

  private readonly _remoteEntries = toSignal(
    toObservable(this._thesaurusId).pipe(
      switchMap((id) =>
        id ? this._source.getThesaurusEntries(id) : of(undefined),
      ),
    ),
    { initialValue: undefined },
  );

  /**
   * The thesaurus entries to pick from, in thesaurus mode: those of the
   * thesaurus specified by settings, else those provided by the editor.
   */
  public readonly thesEntries = computed<ThesaurusEntry[]>(() =>
    this._thesaurusId()
      ? this._remoteEntries() || []
      : this.entries() || [],
  );

  /**
   * The thesaurus entries to bind to the label pipe: undefined when
   * settings specify a thesaurus ID, so that it is loaded by the pipe.
   */
  public readonly labelEntries = computed<ThesaurusEntry[] | undefined>(() =>
    this._thesaurusId() ? undefined : this.entries() || undefined,
  );

  /**
   * The UI to display, or null when the source for features is not
   * available, so that nothing is displayed.
   */
  public readonly view = computed<AssertedIdFeaturesView | null>(() => {
    const s = this.currentSettings();
    switch (s.mode) {
      case 'taxonomy':
        return s.source ? 'taxonomy' : null;
      case 'unbound':
        return 'unbound';
      default:
        return this.thesEntries().length ? 'thesaurus' : null;
    }
  });

  /**
   * The picked entries, in thesaurus mode. Features not found among the
   * entries (e.g. legacy data) are included with their ID as their value,
   * so that they are neither hidden nor lost when picking other entries.
   */
  public readonly pickedEntries = computed<ThesaurusEntry[]>(() => {
    const entries = this.thesEntries();
    return (this.features() || []).map(
      (id) => entries.find((e) => e.id === id) || { id, value: id },
    );
  });

  // the taxonomy picker used to add features: it is reset after each pick,
  // as it just adds a feature to the list. This is done on the picker
  // itself rather than via a bound value, because a bound value going from
  // empty to the picked key and back to empty within the same change
  // detection cycle would not be seen as changed, and thus not pushed to
  // the picker
  private readonly _adder = viewChild(ThesOrTaxoPicker);

  /**
   * The text typed to add a feature, in unbound mode.
   */
  public readonly typedFeature = signal<string>('');

  /**
   * Add the specified feature, unless empty or already present.
   * @param feature The feature to add.
   */
  public addFeature(feature: string | null | undefined): void {
    const f = feature?.trim();
    if (!f) {
      return;
    }
    const features = this.features() || [];
    if (features.includes(f)) {
      return;
    }
    this.features.set([...features, f]);
  }

  /**
   * Remove the feature at the specified index.
   * @param index The index.
   */
  public removeFeature(index: number): void {
    const features = [...(this.features() || [])];
    if (index < 0 || index >= features.length) {
      return;
    }
    features.splice(index, 1);
    this.features.set(features);
  }

  /**
   * Handle the change of the picked entries, in thesaurus mode.
   * @param entries The picked entries.
   */
  public onEntriesChange(entries: ThesaurusEntry[]): void {
    this.features.set(entries.map((e) => e.id));
  }

  /**
   * Handle a pick from the taxonomy picker, adding it to the features.
   * @param pick The pick.
   */
  public onPick(pick: ThesOrTaxoPick): void {
    this.addFeature(pick.value);
    // reset the picker, ready for another pick
    this._adder()?.value.set('');
  }

  public onTypedFeatureInput(event: Event): void {
    this.typedFeature.set((event.target as HTMLInputElement).value);
  }

  /**
   * Add the typed feature, in unbound mode.
   */
  public addTypedFeature(): void {
    this.addFeature(this.typedFeature());
    this.typedFeature.set('');
  }
}
