import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { EmojiImeComponent } from '@myrmidon/cadmus-text-ed-txt';
import {
  EmojiService,
  UnicodeEmoji,
} from '@myrmidon/cadmus-text-ed-txt';

@Component({
  selector: 'app-emoji-ime-pg',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './emoji-ime-pg.component.html',
  styleUrl: './emoji-ime-pg.component.css',
})
export class EmojiImePgComponent {
  public emoji?: UnicodeEmoji;
  public name: FormControl<string | null>;
  public text?: string;

  constructor(
    private _dialog: MatDialog,
    private _emojiService: EmojiService,
    formBuilder: FormBuilder
  ) {
    this.name = formBuilder.control(null);
  }

  openIme(): void {
    const dialogRef = this._dialog.open(EmojiImeComponent, {
      data: {
        name: this.name.value,
      },
    });

    dialogRef.afterClosed().subscribe((emoji) => {
      this.emoji = emoji;
      this.text = this._emojiService.getEmojiText(emoji);
      this.name.reset();
    });
  }
}
