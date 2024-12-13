import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';

import {
  CadmusTextEdPlugin,
  CadmusTextEdQuery,
  CadmusTextEdPluginResult,
} from '@myrmidon/cadmus-text-ed';

import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';
import { LinkEditorComponent } from './link-editor/link-editor.component';

interface ParsedLink {
  id?: AssertedCompositeId;
  left?: string;
  right?: string;
  wrapped?: string;
  notEditable?: boolean;
}

/**
 * Markdown Cadmus link CTE plugin.
 */
@Injectable()
export class MdLinkCtePlugin implements CadmusTextEdPlugin {
  // ([1]=left) [2]=text [3]=target ([4]=right)
  private readonly _linkRegex = /^([^[]+)?\[([^\]]+)\]\((.+(?<!\\))\)(.+)?$/;

  public readonly id = 'md.link';
  public readonly name = 'Link';
  public readonly description =
    'Insert Link Markdown code as a JSON value in a hyperlink.';
  public readonly version = '1.0.0';
  public enabled = true;

  constructor(private _dialog: MatDialog) {}

  public matches(query: CadmusTextEdQuery): boolean {
    return query.selector !== 'id' || query.text === this.id;
  }

  /**
   * Parse the specified text which can be:
   * - a standard Markdown link (without JSON as its target):
   * in this case, the plugin will just return the input text.
   * - an existing Markdown link where target is JSON; in this
   * case, the user wants to edit that link. If there is any text
   * not belonging to the link to its left or right, it will be
   * preserved. If target JSON is invalid, the plugin will just
   * return the input text.
   * - empty or other text: in this case, the user wants to wrap
   * the text into a link, after editing it.
   * @param text The text to parse.
   * @returns Parsed link.
   */
  private parseLink(text: string): ParsedLink {
    // empty or unparsable: assume external with label=text
    const m = this._linkRegex.exec(text);
    // no match: just wrap the input text with link
    if (!m) {
      return {
        wrapped: text,
      };
    }
    try {
      // if target is JSON, parse it
      if (m[3].startsWith('{')) {
        // replace \) with ) before parsing
        const json = m[3].replace('\\)', ')');
        return {
          left: m[1],
          wrapped: m[2],
          id: JSON.parse(json),
          right: m[4],
        };
      } else {
        // else that's not a JSON-target link, do not edit
        return {
          notEditable: true,
        };
      }
    } catch (error) {
      // JSON parse error: do not edit
      console.warn(`Error parsing link text: "${text}"`);
      return {
        notEditable: true,
      };
    }
  }

  private async editLink(
    id?: AssertedCompositeId
  ): Promise<AssertedCompositeId | undefined> {
    const dialogRef = this._dialog.open(LinkEditorComponent, {
      data: {
        id,
      },
    });
    const result: AssertedCompositeId | undefined = await firstValueFrom(
      dialogRef.afterClosed()
    );
    return result;
  }

  private stringifyId(id: AssertedCompositeId): string {
    let s = JSON.stringify(id, (key, value) => {
      return value === '' ? undefined : value;
    });
    // escape ) with \) to avoid Markdown parsing issues
    return s.replace(')', '\\)');
  }

  /**
   * Edit the specified text, returning the result.
   *
   * @param query The query object.
   * @returns result promise.
   */
  public async edit(
    query: CadmusTextEdQuery
  ): Promise<CadmusTextEdPluginResult> {
    // parse text
    const parsedLink = this.parseLink(query.text);

    // nope if not editable
    if (parsedLink.notEditable) {
      return {
        id: this.id,
        text: query.text,
        query,
      };
    }

    // edit link
    const id = await this.editLink(parsedLink.id);
    // nope if cancelled
    if (!id) {
      return {
        id: this.id,
        text: query.text,
        query,
      };
    }

    // build link text and return it
    const sb: string[] = [];
    if (parsedLink.left) {
      sb.push(parsedLink.left);
    }
    sb.push('[');
    if (parsedLink.wrapped) {
      sb.push(parsedLink.wrapped);
    }
    sb.push(']');
    sb.push('(');
    sb.push(this.stringifyId(id));
    sb.push(')');

    return {
      id: this.id,
      text: sb.join(''),
      query,
    };
  }
}
