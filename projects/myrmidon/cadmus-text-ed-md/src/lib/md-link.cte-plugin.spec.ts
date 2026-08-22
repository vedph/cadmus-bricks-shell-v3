import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';

import { MdLinkCtePlugin } from './md-link.cte-plugin';

/**
 * Build a minimal fake MatDialog whose open() returns a dialog ref
 * resolving (via afterClosed()) to the given value.
 */
function dialogStub(returnValue: AssertedCompositeId | undefined): {
  dialog: MatDialog;
  open: ReturnType<typeof vi.fn>;
} {
  const open = vi.fn().mockReturnValue({
    afterClosed: () => of(returnValue),
  });
  return { dialog: { open } as unknown as MatDialog, open };
}

describe('MdLinkCtePlugin', () => {
  it('should be created with the expected metadata', () => {
    const { dialog } = dialogStub(undefined);
    const plugin = new MdLinkCtePlugin(dialog);

    expect(plugin).toBeTruthy();
    expect(plugin.id).toBe('md.link');
    expect(plugin.enabled).toBe(true);
    expect(plugin.name).toBeTruthy();
    expect(plugin.description).toBeTruthy();
    expect(plugin.version).toBeTruthy();
  });

  describe('matches', () => {
    let plugin: MdLinkCtePlugin;

    beforeEach(() => {
      plugin = new MdLinkCtePlugin(dialogStub(undefined).dialog);
    });

    it('should match when selector is undefined', () => {
      expect(plugin.matches({ text: 'x' })).toBe(true);
    });

    it('should match when selector is not "id"', () => {
      expect(plugin.matches({ selector: '$match-first', text: 'x' })).toBe(
        true
      );
    });

    it('should match when selector is "id" and text equals the plugin id', () => {
      expect(plugin.matches({ selector: 'id', text: 'md.link' })).toBe(true);
    });

    it('should not match when selector is "id" and text differs from the plugin id', () => {
      expect(plugin.matches({ selector: 'id', text: 'other' })).toBe(false);
    });
  });

  describe('edit', () => {
    it('should wrap plain (non-link) text into a new link using the dialog result', async () => {
      const newId: AssertedCompositeId = {
        target: { gid: 'x1', label: 'X1' },
      };
      const { dialog, open } = dialogStub(newId);
      const plugin = new MdLinkCtePlugin(dialog);

      const result = await plugin.edit({ text: 'plain text' });

      // the dialog is opened with no pre-existing id, since the text is
      // not a recognizable link
      expect(open).toHaveBeenCalledTimes(1);
      expect(open.mock.calls[0][1]).toEqual({ data: { id: undefined } });

      expect(result.id).toBe('md.link');
      expect(result.text).toBe(
        `[plain text](${JSON.stringify(newId)})`
      );
    });

    it('should return the original text unmodified when the dialog is cancelled', async () => {
      const { dialog, open } = dialogStub(undefined);
      const plugin = new MdLinkCtePlugin(dialog);

      const query = { text: 'plain text' };
      const result = await plugin.edit(query);

      expect(open).toHaveBeenCalledTimes(1);
      expect(result.text).toBe('plain text');
      expect(result.id).toBe('md.link');
      expect(result.query).toBe(query);
    });

    it('should not open the dialog and leave text unchanged for a plain (non-JSON-target) Markdown link', async () => {
      const { dialog, open } = dialogStub(undefined);
      const plugin = new MdLinkCtePlugin(dialog);

      const text = '[a label](https://example.com/path)';
      const result = await plugin.edit({ text });

      expect(open).not.toHaveBeenCalled();
      expect(result.text).toBe(text);
      expect(result.id).toBe('md.link');
    });

    it('should not open the dialog and leave text unchanged when the JSON target is malformed', async () => {
      const { dialog, open } = dialogStub(undefined);
      const plugin = new MdLinkCtePlugin(dialog);

      // starts with '{' but is not valid JSON
      const text = '[a label]({not valid json)';
      const result = await plugin.edit({ text });

      expect(open).not.toHaveBeenCalled();
      expect(result.text).toBe(text);
    });

    it('should parse an existing JSON-target link and pass its id to the dialog for editing', async () => {
      const existingId: AssertedCompositeId = {
        target: { gid: 'g1', label: 'L1' },
        tag: 't1',
      };
      const target = JSON.stringify(existingId);
      const text = `[a label](${target})`;

      const updatedId: AssertedCompositeId = {
        target: { gid: 'g2', label: 'L2' },
      };
      const { dialog, open } = dialogStub(updatedId);
      const plugin = new MdLinkCtePlugin(dialog);

      const result = await plugin.edit({ text });

      expect(open).toHaveBeenCalledTimes(1);
      expect(open.mock.calls[0][1]).toEqual({ data: { id: existingId } });
      expect(result.text).toBe(`[a label](${JSON.stringify(updatedId)})`);
    });

    it('should preserve left and right surrounding text when editing an existing link', async () => {
      const existingId: AssertedCompositeId = {
        target: { gid: 'g1', label: 'L1' },
      };
      const target = JSON.stringify(existingId);
      const text = `before text [a label](${target}) after text`;

      const updatedId: AssertedCompositeId = {
        target: { gid: 'g2', label: 'L2' },
      };
      const { dialog } = dialogStub(updatedId);
      const plugin = new MdLinkCtePlugin(dialog);

      const result = await plugin.edit({ text });

      expect(result.text).toBe(
        `before text [a label](${JSON.stringify(updatedId)}) after text`
      );
    });

    it('should preserve only left surrounding text when there is no right text', async () => {
      const existingId: AssertedCompositeId = {
        target: { gid: 'g1', label: 'L1' },
      };
      const target = JSON.stringify(existingId);
      const text = `before text [a label](${target})`;

      const updatedId: AssertedCompositeId = {
        target: { gid: 'g2', label: 'L2' },
      };
      const { dialog } = dialogStub(updatedId);
      const plugin = new MdLinkCtePlugin(dialog);

      const result = await plugin.edit({ text });

      expect(result.text).toBe(
        `before text [a label](${JSON.stringify(updatedId)})`
      );
    });

    it('should preserve only right surrounding text when there is no left text', async () => {
      const existingId: AssertedCompositeId = {
        target: { gid: 'g1', label: 'L1' },
      };
      const target = JSON.stringify(existingId);
      const text = `[a label](${target}) after text`;

      const updatedId: AssertedCompositeId = {
        target: { gid: 'g2', label: 'L2' },
      };
      const { dialog } = dialogStub(updatedId);
      const plugin = new MdLinkCtePlugin(dialog);

      const result = await plugin.edit({ text });

      expect(result.text).toBe(
        `[a label](${JSON.stringify(updatedId)}) after text`
      );
    });

    it('should correctly unescape a JSON target containing multiple ")" characters (regression)', async () => {
      // regression test for the bug where only the FIRST escaped ")" was
      // being unescaped (m[3].replace('\\)', ')') instead of a global
      // replace). With a gid containing more than one ')', the JSON would
      // fail to parse and the link would be wrongly treated as
      // not-editable.
      const existingId: AssertedCompositeId = {
        target: { gid: 'urn:abc(1)(2)', label: 'multi-paren' },
      };
      // build the markdown text exactly as the plugin itself would
      // (mirrors stringifyId's escaping)
      const jsonTarget = JSON.stringify(existingId).replace(/\)/g, '\\)');
      // sanity check: the fixture actually contains more than one
      // escaped ')'
      expect(jsonTarget.match(/\\\)/g)?.length).toBeGreaterThan(1);

      const text = `[multi](${jsonTarget})`;

      const updatedId: AssertedCompositeId = {
        target: { gid: 'g2', label: 'L2' },
      };
      const { dialog, open } = dialogStub(updatedId);
      const plugin = new MdLinkCtePlugin(dialog);

      const result = await plugin.edit({ text });

      // if unescaping had failed, JSON.parse would throw, the link would
      // be treated as not-editable, and the dialog would never open
      expect(open).toHaveBeenCalledTimes(1);
      expect(open.mock.calls[0][1]).toEqual({ data: { id: existingId } });
      expect(result.text).toBe(`[multi](${JSON.stringify(updatedId)})`);
    });

    it('should escape all ")" characters (not just the first) when stringifying a new id (regression)', async () => {
      // regression test for the mirrored bug in stringifyId(), where
      // s.replace(')', '\\)') only escaped the first occurrence.
      const newId: AssertedCompositeId = {
        target: { gid: 'urn:xyz(9)(8)(7)', label: 'many' },
      };
      const { dialog } = dialogStub(newId);
      const plugin = new MdLinkCtePlugin(dialog);

      const result = await plugin.edit({ text: 'wrap me' });

      // extract the target portion between the (first) '(' after ']' and
      // the final ')'
      const match = /\[wrap me\]\((.+)\)$/.exec(result.text);
      expect(match).toBeTruthy();
      const escapedTarget = match![1];

      // none of the ")" in the raw JSON should remain unescaped
      const rawJson = JSON.stringify(newId);
      const rawParenCount = (rawJson.match(/\)/g) || []).length;
      expect(rawParenCount).toBeGreaterThan(1);
      const escapedParenCount = (escapedTarget.match(/\\\)/g) || []).length;
      expect(escapedParenCount).toBe(rawParenCount);

      // and round-tripping it back through the plugin's own parser
      // should recover the exact same id
      const roundTripText = `[wrap me](${escapedTarget})`;
      const { dialog: dialog2, open: open2 } = dialogStub(newId);
      const plugin2 = new MdLinkCtePlugin(dialog2);
      await plugin2.edit({ text: roundTripText });
      expect(open2.mock.calls[0][1]).toEqual({ data: { id: newId } });
    });

    it('should omit empty-string properties when stringifying the id', async () => {
      const newId: AssertedCompositeId = {
        target: { gid: 'g1', label: 'L1', value: '' } as any,
        note: '',
      };
      const { dialog } = dialogStub(newId);
      const plugin = new MdLinkCtePlugin(dialog);

      const result = await plugin.edit({ text: 'wrap me' });

      expect(result.text).not.toContain('""');
      expect(result.text).not.toContain('"value"');
      expect(result.text).not.toContain('"note"');
    });

    it('should preserve the original query object on the result', async () => {
      const { dialog } = dialogStub({
        target: { gid: 'g1', label: 'L1' },
      });
      const plugin = new MdLinkCtePlugin(dialog);

      const query = { text: 'wrap me', context: { foo: 'bar' } };
      const result = await plugin.edit(query);

      expect(result.query).toBe(query);
    });
  });
});
