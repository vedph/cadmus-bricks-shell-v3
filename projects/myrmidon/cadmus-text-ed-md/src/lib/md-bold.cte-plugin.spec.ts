import { MdBoldCtePlugin } from './md-bold.cte-plugin';

describe('MdBoldCtePlugin', () => {
  let plugin: MdBoldCtePlugin;

  beforeEach(() => {
    plugin = new MdBoldCtePlugin();
  });

  it('should be created with the expected metadata', () => {
    expect(plugin).toBeTruthy();
    expect(plugin.id).toBe('md.bold');
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
      expect(plugin.matches({ selector: 'id', text: 'md.bold' })).toBe(true);
    });

    it('should not match when selector is "id" and text differs from the plugin id', () => {
      expect(plugin.matches({ selector: 'id', text: 'other' })).toBe(false);
    });
  });

  describe('edit', () => {
    it('should wrap plain text in double asterisks', async () => {
      const result = await plugin.edit({ text: 'foo' });
      expect(result.text).toBe('**foo**');
      expect(result.id).toBe('md.bold');
    });

    it('should unwrap a single bold span', async () => {
      const result = await plugin.edit({ text: '**foo**' });
      expect(result.text).toBe('foo');
    });

    it('should unwrap all bold spans in the text', async () => {
      const result = await plugin.edit({ text: '**foo** and **bar**' });
      expect(result.text).toBe('foo and bar');
    });

    it('should only unwrap the bold portion, preserving surrounding text', async () => {
      const result = await plugin.edit({ text: 'foo **bar** baz' });
      expect(result.text).toBe('foo bar baz');
    });

    it('should wrap the whole text when it is not already bold (single asterisks are not bold)', async () => {
      const result = await plugin.edit({ text: '*foo*' });
      expect(result.text).toBe('***foo***');
    });

    it('should wrap an empty string', async () => {
      const result = await plugin.edit({ text: '' });
      expect(result.text).toBe('****');
    });

    it('should preserve the query and not set an error', async () => {
      const query = { text: 'foo' };
      const result = await plugin.edit(query);
      expect(result.query).toBe(query);
      expect(result.error).toBeUndefined();
    });
  });
});
