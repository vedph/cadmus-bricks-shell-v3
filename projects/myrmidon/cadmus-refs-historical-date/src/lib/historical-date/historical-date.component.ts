import { CommonModule } from '@angular/common';
import {
  Component,
  input,
  effect,
  model,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import {
  FieldTree,
  FormField,
  disabled,
  form,
  required,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import {
  HistoricalDate,
  HistoricalDateModel,
  HistoricalDateType,
} from './historical-date';
import { Datation, DatationModel } from '../datation/datation';
import { DatationComponent } from '../datation/datation.component';

/**
 * The editable controls for the historical date's text/range editor.
 */
interface HistoricalDateControls {
  dateText: string;
  range: boolean;
}

/**
 * Historical date editor.
 */
@Component({
  selector: 'cadmus-refs-historical-date',
  templateUrl: './historical-date.component.html',
  styleUrls: ['./historical-date.component.css'],
  imports: [
    CommonModule,
    FormField,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    DatationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoricalDateComponent {
  /**
   * The historical date model to edit.
   */
  public readonly date = model<HistoricalDateModel>();

  /**
   * The optional label to display.
   */
  public readonly label = input<string>();

  /**
   * True if the editor is disabled.
   */
  public readonly disabled = input<boolean>();

  // set by date text:
  public readonly invalidDateText = signal<boolean>(false);
  public readonly dateValue = signal<number | undefined>(undefined);
  public readonly visualExpanded = signal<boolean>(false);
  // set by events:
  public readonly a = signal<DatationModel | undefined>(undefined);
  public readonly b = signal<DatationModel | undefined>(undefined);

  private readonly _draft = signal<HistoricalDateControls>({
    dateText: '',
    range: false,
  });
  public readonly form: FieldTree<HistoricalDateControls>;

  constructor() {
    this.form = form(this._draft, (path) => {
      required(path.dateText);
      disabled(path.dateText, { when: () => !!this.disabled() });
      disabled(path.range, { when: () => !!this.disabled() });
    });

    // when disabled changes, collapse the visual editor
    effect(() => {
      if (this.disabled()) {
        this.visualExpanded.set(false);
      }
    });

    // when date changes, update form
    effect(() => {
      this.updateForm(this.date());
    });
  }

  private updateForm(date?: HistoricalDateModel): void {
    if (!date) {
      this._draft.set({ dateText: '', range: false });
      this.a.set(undefined);
      this.b.set(undefined);
      this.dateValue.set(undefined);
    } else {
      const hd = new HistoricalDate(date);
      this._draft.set({
        dateText: hd.toString(),
        range: hd.getDateType() === HistoricalDateType.range,
      });
      this.a.set(hd.a);
      this.b.set(hd.b);
      this.dateValue.set(hd.getSortValue());
    }
    this.form().reset();
  }

  public stopPropagation(event: KeyboardEvent): void {
    // this is to avoid space propagating to the expander,
    // which would toggle it
    // https://stackoverflow.com/questions/53543824/input-not-working-inside-angular-material-expansion-panel-cant-add-space
    event.stopPropagation();
  }

  public onDatationAChange(datation: DatationModel | undefined): void {
    this.a.set(datation);
  }

  public onDatationBChange(datation: DatationModel | undefined): void {
    this.b.set(datation);
  }

  public resetDatations(): void {
    this.form.range().value.set(false);
    this.a.set(undefined);
    this.b.set(undefined);
  }

  public setDatations(): void {
    const hd = new HistoricalDate();
    hd.a = new Datation(this.a());
    if (this.form.range().value()) {
      hd.b = new Datation(this.b());
    }

    this.form.dateText().value.set(hd.toString());
    this.visualExpanded.set(false);
    this.updateFromText();
  }

  public parseDateText(): void {
    if (!this.form.dateText().value()) {
      return;
    }
    try {
      const hd = HistoricalDate.parse(this.form.dateText().value());
      if (hd) {
        this.invalidDateText.set(false);
        this.dateValue.set(hd.getSortValue());
        this.form.range().value.set(hd.getDateType() === HistoricalDateType.range);
        this.a.set(hd.a);
        this.b.set(hd.b);
        this.date.set(hd);
        this.visualExpanded.set(true);
      } else {
        this.invalidDateText.set(true);
        this.dateValue.set(0);
      }
    } catch (error) {
      console.error(error);
      this.invalidDateText.set(true);
      this.dateValue.set(0);
    }
  }

  public resetDateText(): void {
    this.form.dateText().value.set('');
    this.form.dateText().markAsDirty();
    this.invalidDateText.set(false);
  }

  private updateFromText(): void {
    try {
      const hd = HistoricalDate.parse(this.form.dateText().value());
      if (hd) {
        this.invalidDateText.set(false);
        this.dateValue.set(hd.getSortValue());
        this.form.range().value.set(hd.getDateType() === HistoricalDateType.range);
        this.a.set(hd.a);
        this.b.set(hd.b);
        this.date.set(hd);
      } else {
        this.invalidDateText.set(true);
        this.dateValue.set(0);
      }
    } catch (error) {
      console.error(error);
      this.invalidDateText.set(true);
      this.dateValue.set(0);
    }
  }

  public save(): void {
    this.updateFromText();
  }

}
