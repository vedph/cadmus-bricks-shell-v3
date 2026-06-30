import {
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { form, FormField, pattern, required } from '@angular/forms/signals';

import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';

import { NamedValue, NamedValueMap } from '../../models';

/**
 * Internal editable state backing the signal form. `text` holds either the
 * freely typed value, or (when the name is multi-valued and its values are
 * closed) the space-separated accumulation of picked values. `picked` is the
 * currently selected option of the closed-values selector: for a single
 * (non multi-valued) closed value it is the value itself, while for a
 * multi-valued one it's just a transient pick that gets appended to `text`
 * and then reset. `fallback` preserves an externally set value that does not
 * match any item of the closed values list, so it is not lost while no
 * matching option is picked.
 */
interface NamedValueFormModel {
  name: string;
  text: string;
  prefix: string;
  picked: string;
  fallback: string;
}

function emptyFormModel(): NamedValueFormModel {
  return { name: '', text: '', prefix: '', picked: '', fallback: '' };
}

/**
 * Editor for a single NamedValue.
 */
@Component({
  selector: 'cadmus-named-value-editor',
  imports: [
    FormField,
    MatIconButton,
    MatError,
    MatFormField,
    MatIcon,
    MatInput,
    MatLabel,
    MatOption,
    MatSelect,
    MatTooltip,
  ],
  templateUrl: './named-value-editor.html',
  styleUrl: './named-value-editor.css',
})
export class NamedValueEditor {
  /**
   * The named value to edit.
   */
  public readonly value = model<NamedValue | undefined>();

  /**
   * The list of names to display in the name selection.
   * This is used when you have a closed list of names.
   */
  public readonly closedNames = input<NamedValue[] | undefined>();

  /**
   * The named values map. When specified and the user selects a name
   * present in the map keys, the corresponding values will be used
   * to populate the value selection.
   */
  public readonly closedValues = input<NamedValueMap | undefined>();

  /**
   * The IDs of the names that are multi-valued. Used to determine
   * if the current name being edited should display multi-value controls.
   */
  public readonly multiValuedNames = input<string[] | undefined>([]);

  /**
   * True to allow prefixes. Prefixes can be used when user picks a
   * value from a list and wants to add a prefix to it in addition
   * to the value picked.
   */
  public readonly hasPrefix = input<boolean>(false);

  /**
   * The regular expression pattern to use for prefix validation.
   * If not specified, any string is allowed.
   */
  public readonly prefixPattern = input<string | undefined>();

  /**
   * Event emitted when the user cancels the value editing.
   */
  public readonly valueCancel = output();

  private readonly _model = signal<NamedValueFormModel>(emptyFormModel());

  /**
   * The signal form backing the editable controls.
   */
  public readonly form = form(this._model, (s) => {
    required(s.name, { message: 'Name is required.' });
    pattern(
      s.prefix,
      () => {
        const raw = this.prefixPattern();
        return raw ? new RegExp(raw) : undefined;
      },
      { when: ({ value }) => !!value() }
    );
  });

  /**
   * The closed values available for the currently selected name, if any.
   */
  public readonly closedValueItems = computed<NamedValue[] | undefined>(() => {
    const name = this._model().name;
    return name ? this.closedValues()?.[name] : undefined;
  });

  /**
   * True if the currently selected name accepts multiple values.
   */
  public readonly isMulti = computed<boolean>(() => {
    const name = this._model().name;
    return !!name && !!this.multiValuedNames()?.includes(name);
  });

  /**
   * True if the currently selected name's values are constrained
   * by a closed values map.
   */
  public readonly isConstrained = computed<boolean>(
    () => !!this.closedValueItems()?.length
  );

  /**
   * True if names come from a closed list and one is currently selected.
   */
  public readonly closedNameSelected = computed<boolean>(
    () => !!this.closedNames() && !!this._model().name
  );

  /**
   * True if the prefix textbox should be displayed.
   */
  public readonly showPrefix = computed<boolean>(
    () => this.closedNameSelected() && this.hasPrefix() && this.isConstrained()
  );

  private readonly finalValue = computed<string>(() => {
    const m = this._model();
    if (!this.closedNameSelected() || !this.isConstrained()) {
      return m.text;
    }
    if (this.isMulti()) {
      return m.text;
    }
    // single value constrained by a map: prefix + picked option, or the
    // preserved fallback when nothing has been picked yet
    return m.picked ? `${m.prefix || ''}${m.picked}` : m.fallback;
  });

  private readonly assembled = computed<NamedValue>(() => ({
    name: this._model().name,
    value: this.finalValue(),
  }));

  private _lastResetName = '';

  constructor() {
    // when a closed value is picked for a multi-valued name, append it
    // (with its prefix, if any) to the accumulated text and reset the
    // picker so another value can be picked
    effect(() => {
      const m = this._model();
      if (
        !m.picked ||
        !this.closedNameSelected() ||
        !this.isConstrained() ||
        !this.isMulti()
      ) {
        return;
      }
      const piece = `${m.prefix || ''}${m.picked}`;
      this._model.update((cur) => ({
        ...cur,
        text: cur.text ? `${cur.text} ${piece}` : piece,
        picked: '',
      }));
    });

    // receive externally set values (e.g. a new item to edit), unless
    // they're just an echo of our own last emitted value. Registered
    // before the outbound effect below so that, on initial creation, an
    // externally bound value is loaded into the model before the outbound
    // effect gets a chance to run (and would otherwise re-emit the still
    // empty initial model, clobbering it).
    effect(() => {
      const external = this.value();
      const current = untracked(() => this.assembled());
      if (this._sameValue(external, current)) {
        return;
      }
      this.applyExternalValue(external);
    });

    // push local edits to the bound value, unless they already match it
    effect(() => {
      const current = this.assembled();
      const external = untracked(() => this.value());
      if (this._sameValue(current, external)) {
        return;
      }
      this.value.set(current);
    });
  }

  private _sameValue(a: NamedValue | undefined, b: NamedValue | undefined): boolean {
    return (a?.name ?? '') === (b?.name ?? '') && (a?.value ?? '') === (b?.value ?? '');
  }

  private applyExternalValue(v: NamedValue | undefined): void {
    const name = v?.name ?? '';
    const rawValue = v?.value ?? '';
    const multi = !!name && !!this.multiValuedNames()?.includes(name);
    const items = name ? this.closedValues()?.[name] : undefined;

    this._lastResetName = name;

    if (items?.length && !multi) {
      const match = items.find((it) => it.value === rawValue);
      this._model.set({
        name,
        text: '',
        prefix: '',
        picked: match?.value ?? '',
        fallback: match ? '' : rawValue,
      });
    } else {
      this._model.set({ name, text: rawValue, prefix: '', picked: '', fallback: '' });
    }
  }

  /**
   * Called when the user finishes changing the name (selection change for
   * a closed list, blur for free typing): resets the value-related fields,
   * as they no longer apply to the new name.
   */
  public onNameChanged(): void {
    const name = this._model().name;
    if (name === this._lastResetName) {
      return;
    }
    this._lastResetName = name;
    this._model.update((m) => ({
      ...m,
      text: '',
      prefix: '',
      picked: '',
      fallback: '',
    }));
  }

  /**
   * Clears the editor and notifies cancellation.
   */
  public cancel(): void {
    this._lastResetName = '';
    this._model.set(emptyFormModel());
    this.value.set(undefined);
    this.valueCancel.emit();
  }
}
