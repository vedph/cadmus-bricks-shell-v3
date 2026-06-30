import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';

import { FlatLookupPipe } from '@myrmidon/ngx-tools';

import { NamedValue, NamedValueMap } from '../../models';
import { NamedValueEditor } from '../named-value-editor/named-value-editor';

/**
 * Editor for a set of NamedValue's.
 */
@Component({
  selector: 'cadmus-named-value-set-editor',
  imports: [
    FormsModule,
    FlatLookupPipe,
    MatButton,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatTooltip,
    NamedValueEditor,
  ],
  templateUrl: './named-value-set-editor.html',
  styleUrl: './named-value-set-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NamedValueSetEditor {
  /**
   * The list of named values to edit.
   */
  public readonly values = model<NamedValue[] | undefined>();

  /**
   * The list of names to display in the name selection.
   * This is used when you have a closed list of names.
   * Passed down to NamedValueEditor.
   */
  public readonly closedNames = input<NamedValue[] | undefined>();

  /**
   * The named values map. When specified and the user selects a name
   * present in the map keys, the corresponding values will be used
   * to populate the value selection.
   * Passed down to NamedValueEditor.
   */
  public readonly closedValues = input<NamedValueMap | undefined>();

  /**
   * The IDs of the names that are multi-valued. Used to determine
   * if the current name being edited should display multi-value controls.
   * Passed down to NamedValueEditor.
   */
  public readonly multiValuedNames = input<string[] | undefined>([]);

  /**
   * True to allow prefixes. Prefixes can be used when user picks a
   * value from a list and wants to add a prefix to it in addition
   * to the value picked.
   * Passed down to NamedValueEditor.
   */
  public readonly hasPrefix = input<boolean>(false);

  /**
   * The regular expression pattern to use for prefix validation.
   * If not specified, any string is allowed.
   * Passed down to NamedValueEditor.
   */
  public readonly prefixPattern = input<string | undefined>();

  /**
   * The threshold for a value filter to appear. If the number of values
   * edited in this component is greater than this threshold, a filter
   * input will be displayed to allow the user to filter the values list
   * by name. If not specified, no filter will be displayed.
   */
  public readonly valueFilterThreshold = input<number | undefined>(10);

  /**
   * True to enable batch mode, where users edit values without the
   * component firing change events at each edit, until they click the
   * "Save" button; and close the editor without saving by clicking
   * the "Close" button. These buttons do not appear when batch mode
   * is false, and the component fires change events at each edit.
   */
  public readonly batchMode = input(false);

  /**
   * Emitted when the user clicks the close button.
   */
  public readonly close = output();

  /**
   * The working list of edited values. This mirrors `values` except in
   * batch mode, where it stays detached from it until `save` is called.
   */
  private readonly _list = signal<NamedValue[]>([]);

  /**
   * True when, in batch mode, the working list has unsaved local changes.
   */
  private readonly _dirty = signal<boolean>(false);

  /**
   * Index in the working list of the value currently being edited via the
   * embedded NamedValueEditor; -1 when adding a value not yet in the list,
   * undefined when no editor is open.
   */
  private readonly _editedIndex = signal<number>(-1);

  /**
   * The value currently bound to the embedded NamedValueEditor, or
   * undefined when no editor is open.
   */
  public readonly editedValue = signal<NamedValue | undefined>(undefined);

  /**
   * The text used to filter the displayed values by name.
   */
  public readonly filter = signal<string>('');

  /**
   * True when the values filter should be displayed, i.e. when
   * valueFilterThreshold is set and the edited values count exceeds it.
   */
  public readonly showFilter = computed<boolean>(() => {
    const threshold = this.valueFilterThreshold();
    return !!threshold && this._list().length > threshold;
  });

  /**
   * The values to display in the table, filtered by name when the filter
   * is active.
   */
  public readonly filteredValues = computed<NamedValue[]>(() => {
    const list = this._list();
    if (!this.showFilter()) {
      return list;
    }
    const f = this.filter().trim().toLowerCase();
    return f ? list.filter((v) => v.name.toLowerCase().includes(f)) : list;
  });

  /**
   * The index, within the displayed (possibly filtered) values, of the
   * value currently being edited; -1 when none is being edited.
   */
  public readonly editedIndex = computed<number>(() => {
    const i = this._editedIndex();
    if (i < 0) {
      return -1;
    }
    const item = this._list()[i];
    return item ? this.filteredValues().indexOf(item) : -1;
  });

  constructor() {
    // keep the working list in sync with the bound values, unless we're
    // in batch mode with unsaved local edits, which must not be clobbered
    effect(() => {
      const external = this.values();
      if (this.batchMode() && untracked(() => this._dirty())) {
        return;
      }
      this._list.set(external ? [...external] : []);
    });
  }

  /**
   * Opens the embedded editor on a new, empty value.
   */
  public addValue(): void {
    this._editedIndex.set(-1);
    this.editedValue.set({ name: '', value: '' });
  }

  /**
   * Opens the embedded editor on the specified value.
   */
  public editValue(item: NamedValue): void {
    this._editedIndex.set(this._list().indexOf(item));
    this.editedValue.set({ ...item });
  }

  /**
   * Removes the specified value from the list.
   */
  public deleteValue(item: NamedValue): void {
    const list = this._list();
    const index = list.indexOf(item);
    if (index < 0) {
      return;
    }

    const newList = list.filter((_, i) => i !== index);
    this._list.set(newList);
    this.commit(newList);

    const editedIndex = this._editedIndex();
    if (editedIndex === index) {
      this.closeValueEditor();
    } else if (editedIndex > index) {
      this._editedIndex.set(editedIndex - 1);
    }
  }

  /**
   * Handles a change emitted by the embedded NamedValueEditor, updating
   * the working list with the new or edited value.
   */
  public onValueChange(value: NamedValue | undefined): void {
    if (!value) {
      return;
    }
    this.editedValue.set(value);

    const list = [...this._list()];
    const index = this._editedIndex();
    if (index > -1 && index < list.length) {
      list[index] = value;
    } else {
      list.push(value);
      this._editedIndex.set(list.length - 1);
    }
    this._list.set(list);
    this.commit(list);
  }

  /**
   * Closes the embedded editor without affecting the working list.
   */
  public closeValueEditor(): void {
    this._editedIndex.set(-1);
    this.editedValue.set(undefined);
  }

  /**
   * Saves the working list, in batch mode, to the bound values.
   */
  public save(): void {
    this.commit(this._list(), true);
    this.closeValueEditor();
  }

  /**
   * Discards any unsaved batch changes, reverting to the bound values,
   * and notifies that the editor should be closed.
   */
  public closeBatch(): void {
    this._list.set(this.values() ? [...this.values()!] : []);
    this._dirty.set(false);
    this.closeValueEditor();
    this.close.emit();
  }

  /**
   * Propagates the working list to the bound values, unless in batch
   * mode, where it just marks the working list as dirty until saved.
   */
  private commit(list: NamedValue[], force = false): void {
    if (this.batchMode() && !force) {
      this._dirty.set(true);
      return;
    }
    this._dirty.set(false);
    this.values.set([...list]);
  }
}
