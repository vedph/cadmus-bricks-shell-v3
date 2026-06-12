import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import {
  EditorInitializedEvent,
  NgxMonacoEditorComponent,
  StandaloneCodeEditor,
  StandaloneEditorConstructionOptions,
} from '@jean-merelis/ngx-monaco-editor';

import {
  MdBoldCtePlugin,
  MdItalicCtePlugin,
  MdLinkCtePlugin,
} from '@myrmidon/cadmus-text-ed-md';
import { TxtEmojiCtePlugin } from '@myrmidon/cadmus-text-ed-txt';
import {
  CadmusTextEdResult,
  CadmusTextEdService,
} from '@myrmidon/cadmus-text-ed';
import { EmojiImeComponent } from '@myrmidon/cadmus-text-ed-txt';
import {
  EmojiService,
  UnicodeEmoji,
} from '@myrmidon/cadmus-text-ed-txt';

@Component({
  selector: 'app-text-ed-pg',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    NgxMonacoEditorComponent,
  ],
  providers: [
    CadmusTextEdService,
    MdBoldCtePlugin,
    MdItalicCtePlugin,
    TxtEmojiCtePlugin,
    MdLinkCtePlugin,
  ],
  templateUrl: './text-ed-pg.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './text-ed-pg.component.css',
})
export class TextEdPgComponent {
  private _editor?: StandaloneCodeEditor;

  public readonly editorOptions: StandaloneEditorConstructionOptions = {
    minimap: {
      side: 'left',
    },
    wordWrap: 'on',
    automaticLayout: true,
  };

  public selector: FormControl<string>;
  public text: FormControl<string>;
  public context: FormControl<string | null>;
  public editorText: FormControl<string>;
  public form: FormGroup;
  public result?: CadmusTextEdResult;

  constructor(
    formBuilder: FormBuilder,
    private _editService: CadmusTextEdService,
    private _emojiService: EmojiService,
    private _snackbar: MatSnackBar,
    private _dialog: MatDialog
  ) {
    this.selector = formBuilder.control('md.bold', {
      nonNullable: true,
      validators: Validators.required,
    });
    this.text = formBuilder.control('', {
      nonNullable: true,
      validators: Validators.required,
    });
    this.context = formBuilder.control('{ "noPicker": false }');
    this.editorText = formBuilder.control(
      '# Title\n\nthe quick brown **fox**\njumped over the lazy *dog*',
      {
        nonNullable: true,
      }
    );
    this.form = formBuilder.group({
      selector: this.selector,
      text: this.text,
      context: this.context,
      editorText: this.editorText,
    });

    // configure plugins for this service instance
    this._editService.configure({
      plugins: [
        inject(MdBoldCtePlugin),
        inject(MdItalicCtePlugin),
        inject(TxtEmojiCtePlugin),
        inject(MdLinkCtePlugin),
      ],
    });
  }

  public onEditorInit(event: EditorInitializedEvent) {
    this._editor = event.editor;

    // 2080 = Ctrl+B, 2087 = Ctrl+I, 2083 = Ctrl+E, 2090 = Ctrl+L
    // (monaco.KeyMod.CtrlCmd | monaco.KeyCode.Key*)
    this._editor.addCommand(2080, () => {
      this.applyEdit('md.bold');
    });
    this._editor.addCommand(2087, () => {
      this.applyEdit('md.italic');
    });
    this._editor.addCommand(2083, () => {
      this.applyEdit('txt.emoji');
    });
    this._editor.addCommand(2090, () => {
      this.applyEdit('md.link');
    });

    this._editor.focus();
  }

  private parseContext(): any | undefined {
    try {
      const context: any = this.context.value
        ? JSON.parse(this.context.value)
        : undefined;
      return context;
    } catch (e) {
      this._snackbar.open('Invalid context JSON', 'OK', {
        duration: 3000,
      });
      return undefined;
    }
  }

  public async edit() {
    if (this.form.invalid) {
      return;
    }

    this.result = await this._editService.edit({
      selector: this.selector.value,
      text: this.text.value,
      context: this.parseContext(),
    });
  }

  private async getEmojiFromPicker(
    text: string
  ): Promise<UnicodeEmoji | undefined> {
    const dialogRef = this._dialog.open(EmojiImeComponent, {
      data: {
        name: text,
      },
      hasBackdrop: false,
    });

    const result: UnicodeEmoji | undefined = await firstValueFrom(
      dialogRef.afterClosed()
    );
    return result;
  }

  private async applyEdit(selector: string) {
    if (!this._editor) {
      return;
    }
    const selection = this._editor.getSelection();
    const text = selection
      ? this._editor.getModel()!.getValueInRange(selection)
      : '';

    const result = await this._editService.edit({
      selector,
      text: text,
      context: this.parseContext(),
    });

    // if there is a payload with action 'pick-emoji', we need to
    // open the emoji picker and replace the text with the selected emoji
    if (
      result.payloads?.length &&
      result.payloads[0]?.action === 'pick-emoji'
    ) {
      const emoji = await this.getEmojiFromPicker(text);
      if (emoji) {
        result.text = this._emojiService.getEmojiText(emoji);
      }
    }

    this._editor.executeEdits('my-source', [
      {
        range: selection!,
        text: result.text,
        forceMoveMarkers: true,
      },
    ]);
  }
}
