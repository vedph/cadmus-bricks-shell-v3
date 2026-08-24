import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  model,
  OnDestroy,
  Optional,
  output,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { FieldTree, FormField, form } from '@angular/forms/signals';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { EmojiService, UnicodeEmoji } from '../emoji.service';

export interface EmojiImeComponentData {
  name?: string;
  size?: number;
  autoPick?: boolean;
}

@Component({
  selector: 'cadmus-emoji-ime',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
  ],
  templateUrl: './emoji-ime.component.html',
  styleUrl: './emoji-ime.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmojiImeComponent implements AfterViewInit, OnDestroy {
  private _sub?: Subscription;

  @ViewChild('nameInput')
  public inputCtl?: ElementRef;

  private readonly _draft: WritableSignal<{ name: string }>;
  public readonly form: FieldTree<{ name: string }>;

  public readonly emojis = signal<UnicodeEmoji[]>([]);
  public readonly inDialog;

  /**
   * The icon size. Default is 32.
   */
  public readonly size = model<number>(32);

  /**
   * If true, the first matching emoji in the list is automatically
   * picked.
   */
  public readonly autoPick = model<boolean>(false);

  /**
   * Emitted when an emoji is picked.
   */
  public readonly emojiPick = output<UnicodeEmoji>();

  /**
   * Emitted when the dialog is to be closed.
   */
  public readonly closeRequest = output();

  constructor(
    private _emojiService: EmojiService,
    @Optional()
    public dialogRef?: MatDialogRef<EmojiImeComponent>,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data?: EmojiImeComponentData
  ) {
    this._draft = signal({ name: data?.name || '' });
    this.form = form(this._draft);

    if (data?.size) {
      this.size.set(data.size);
    }
    if (data?.autoPick) {
      this.autoPick.set(data.autoPick);
    }
    this.inDialog = !!dialogRef;

    this.lookupEmoji();

    this._sub = toObservable(this.form.name().value)
      .pipe(distinctUntilChanged(), debounceTime(300))
      .subscribe((_) => {
        this.lookupEmoji();
      });
  }

  private lookupEmoji(): void {
    const name = this.form.name().value();
    if (name) {
      this.emojis.set(this._emojiService.lookupEmoji(name));
      if (this.autoPick() && this.emojis().length === 1) {
        this.pickEmoji(this.emojis()[0]);
      }
    }
  }

  public ngAfterViewInit(): void {
    if (this.inputCtl) {
      setTimeout(() => {
        this.inputCtl!.nativeElement.focus();
        if (this.form.name().value()) {
          this.inputCtl!.nativeElement.select();
        }
      });
    }
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onNameEnter(event: Event): void {
    event.preventDefault();
    const first = this.emojis()[0];
    if (first) {
      this.pickEmoji(first);
    }
  }

  public close(): void {
    this.closeRequest.emit();
    this.dialogRef?.close();
  }

  public pickEmoji(emoji?: UnicodeEmoji): void {
    if (!emoji) {
      return;
    }
    this.emojiPick.emit(emoji);
    this.dialogRef?.close(emoji);
  }
}
