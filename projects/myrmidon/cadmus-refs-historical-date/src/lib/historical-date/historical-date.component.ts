import { CommonModule } from '@angular/common';
import { Component, OnInit, input, effect, model, output } from '@angular/core';
import {
  FormGroup,
  FormControl,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';

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
 * Historical date editor.
 */
@Component({
  selector: 'cadmus-refs-historical-date',
  templateUrl: './historical-date.component.html',
  styleUrls: ['./historical-date.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
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
})
export class HistoricalDateComponent implements OnInit {
  private _sub?: Subscription;

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

  /**
   * Emitted when the date changes.
   */
  public readonly dateChange = output<HistoricalDateModel>();

  // set by date text:
  public invalidDateText?: boolean;
  public dateValue?: number;
  public visualExpanded?: boolean;
  // set by events:
  public a?: DatationModel;
  public b?: DatationModel;

  // form
  public form: FormGroup;
  public dateText: FormControl<string | null>;
  public range: FormControl<boolean>;

  constructor(formBuilder: FormBuilder) {
    // form
    this.dateText = formBuilder.control(null, Validators.required);
    this.range = formBuilder.control(false, { nonNullable: true });
    this.form = formBuilder.group({
      dateText: this.dateText,
      range: this.range,
    });

    // when disabled change, toggle form
    effect(() => {
      if (this.disabled()) {
        this.visualExpanded = false;
        this.form.disable();
      } else {
        this.form.enable();
      }
    });

    // when date changes, update form
    effect(() => {
      this.updateForm(this.date());
    });
  }

  public ngOnInit(): void {
    // whenever the date text changes, update datations and fire date change
    this._sub = this.dateText.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((text) => {
        const hd = HistoricalDate.parse(text);
        if (hd) {
          this.invalidDateText = false;
          this.dateValue = hd.getSortValue();
          this.range.setValue(hd.getDateType() === HistoricalDateType.range);
          this.a = hd.a;
          this.b = hd.b;
          this.date.set(hd);
          this.dateChange.emit(this.date()!);
        } else {
          this.invalidDateText = true;
          this.dateValue = 0;
        }
      });
    this.updateForm(this.date());
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private updateForm(date?: HistoricalDateModel): void {
    if (!date) {
      this.form.reset();
    } else {
      const hd = new HistoricalDate(date);
      this.dateText.setValue(hd.toString());
      this.form.markAsPristine();
    }
  }

  public stopPropagation(event: KeyboardEvent): void {
    // this is to avoid space propagating to the expander,
    // which would toggle it
    // https://stackoverflow.com/questions/53543824/input-not-working-inside-angular-material-expansion-panel-cant-add-space
    event.stopPropagation();
  }

  public onDatationAChange(datation: DatationModel | undefined): void {
    this.a = datation;
  }

  public onDatationBChange(datation: DatationModel | undefined): void {
    this.b = datation;
  }

  public resetDatations(): void {
    this.range.setValue(false);
    this.a = undefined;
    this.b = undefined;
  }

  public setDatations(): void {
    const hd = new HistoricalDate();
    hd.a = new Datation(this.a);
    if (this.range.value) {
      hd.b = new Datation(this.b);
    }

    this.dateText.setValue(hd.toString());
    this.visualExpanded = false;
    this.updateFromText();
  }

  private updateFromText(): void {
    try {
      const hd = HistoricalDate.parse(this.dateText.value);
      if (hd) {
        this.invalidDateText = false;
        this.dateValue = hd.getSortValue();
        this.range.setValue(hd.getDateType() === HistoricalDateType.range);
        this.a = hd.a;
        this.b = hd.b;
        this.date.set(hd);
        this.dateChange.emit(this.date()!);
      } else {
        this.invalidDateText = true;
        this.dateValue = 0;
      }
    } catch (error) {
      console.log(error);
      this.invalidDateText = true;
      this.dateValue = 0;
    }
  }

  public save(): void {
    this.updateFromText();
  }
}
