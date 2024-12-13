import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';

import {
  CadmusTextEdPlugin,
  CadmusTextEdQuery,
  CadmusTextEdPluginResult,
} from '@myrmidon/cadmus-text-ed';

import { EmojiService, UnicodeEmoji } from './emoji.service';
import { EmojiImeComponent } from './emoji-ime/emoji-ime.component';

/**
 * Emoji inserter plugin.
 * See https://github.com/ikatyang/emoji-cheat-sheet/blob/master/README.md.
 * List from https://api.github.com/emojis.
 */
@Injectable()
export class TxtEmojiCtePlugin implements CadmusTextEdPlugin {
  public readonly id = 'txt.emoji';
  public readonly name = 'Plain text Emoji IME';
  public readonly description = 'Insert Emoji Unicode character from its name.';
  public readonly version = '1.0.0';
  public enabled = true;

  constructor(
    private _emojiService: EmojiService,
    private _dialog: MatDialog
  ) {}

  private async getEmojiFromPicker(
    text: string
  ): Promise<UnicodeEmoji | undefined> {
    const dialogRef = this._dialog.open(EmojiImeComponent, {
      data: {
        name: text,
      },
    });
    const result: UnicodeEmoji | undefined = await firstValueFrom(
      dialogRef.afterClosed()
    );
    return result;
  }

  public matches(query: CadmusTextEdQuery): boolean {
    return query.selector !== 'id' || query.text === this.id;
  }

  /**
   * Edit the specified text, returning the result.
   *
   * @param query The query object. Set context.noPicker to true to disable
   * the automatic usage of the picker to select an emoji. When this is true
   * and a picker is required, the plugin will return a payload with action
   * set to 'pick-emoji'.
   * @returns result promise.
   */
  public async edit(
    query: CadmusTextEdQuery
  ): Promise<CadmusTextEdPluginResult> {
    // if text is equal to an emoji name, insert it
    let emoji = this._emojiService.getEmoji(query.text);
    if (emoji) {
      const result: CadmusTextEdPluginResult = {
        id: this.id,
        text: this._emojiService.getEmojiText(emoji),
        query,
      };
      return result;
    }

    // if text is not an emoji name, get from picker if allowed,
    // else return a payload to ask for it
    if (!query.context?.noPicker) {
      emoji = await this.getEmojiFromPicker(query.text);
      if (emoji) {
        const result: CadmusTextEdPluginResult = {
          id: this.id,
          text: this._emojiService.getEmojiText(emoji),
          query,
        };
        return result;
      } else {
        return {
          id: this.id,
          text: query.text,
          query,
        };
      }
    } else {
      return {
        id: this.id,
        text: query.text,
        query,
        payload: {
          action: 'pick-emoji'
        }
      };
    }
  }
}
