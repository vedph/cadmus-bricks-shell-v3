import { MdItalicCtePlugin } from './md-italic.cte-plugin';

describe('MdItalicCtePlugin', () => {
  let plugin: MdItalicCtePlugin;

  beforeEach(() => {
    plugin = new MdItalicCtePlugin();
  });

  it('should be created with the expected metadata', () => {
    expect(plugin).toBeTruthy();
    expect(plugin.id).toBe('md.italic');
    expect(plugin.enabled).toBe(true);
    expect(plugin.name).toBeTruthy();
    expect(plugin.description).toBeTruthy();
    expect(plugin.version).toBeTruthy();
  });

  describe('matches', () => {
    it('should match when selector is undefined', () => {
      expect(plugin.matches({ text: 'x' })).toBe(true);
    });

    it('should match when selector is not "id"', () => {
      expect(plugin.matches({ selector: '$match-first', text: 'x' })).toBe(
        true
      );
    });

    it('should match when selector is "id" and text equals the plugin id', () => {
      expect(plugin.matches({ selector: 'id', text: 'md.italic' })).toBe(
        true
      );
    });

    it('should not match when selector is "id" and text differs from the plugin id', () => {
      expect(plugin.matches({ selector: 'id', text: 'other' })).toBe(false);
    });
  });

  describe('edit', () => {
    it('should wrap plain text in single asterisks', async () => {
      const result = await plugin.edit({ text: 'foo' });
      expect(result.text).toBe('*foo*');
      expect(result.id).toBe('md.italic');
    });

    it('should unwrap a single italic span', async () => {
      const result = await plugin.edit({ text: '*foo*' });
      expect(result.text).toBe('foo');
    });

    it('should only unwrap the italic portion, preserving surrounding text', async () => {
      const result = await plugin.edit({ text: 'foo *bar* baz' });
      expect(result.text).toBe('foo *bar* baz'.replace(/\*(.+?)\*/g, '$1'));
    });

    it('should wrap an empty string', async () => {
      const result = await plugin.edit({ text: '' });
      expect(result.text).toBe('**');
    });

    it('should preserve the query and not set an error', async () => {
      const query = { text: 'foo' };
      const result = await plugin.edit(query);
      expect(result.query).toBe(query);
      expect(result.error).toBeUndefined();
    });
  });
});
