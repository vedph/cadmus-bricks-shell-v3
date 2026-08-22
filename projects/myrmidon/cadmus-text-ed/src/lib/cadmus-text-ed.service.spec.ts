import { TestBed } from '@angular/core/testing';

import {
  CADMUS_TEXT_ED_QUERY_MATCH_ALL,
  CADMUS_TEXT_ED_QUERY_MATCH_FIRST,
  CADMUS_TEXT_ED_SERVICE_OPTIONS_TOKEN,
  CadmusTextEdPlugin,
  CadmusTextEdPluginResult,
  CadmusTextEdQuery,
  CadmusTextEdService,
  cadmusTextEdFactory,
} from './cadmus-text-ed.service';

/**
 * Build a simple test plugin. By default it appends its id to the input
 * text, unless a custom edit function is provided.
 */
function makePlugin(
  id: string,
  overrides: Partial<CadmusTextEdPlugin> = {}
): CadmusTextEdPlugin {
  return {
    id,
    name: id,
    description: id,
    version: '1.0.0',
    enabled: true,
    matches: (query: CadmusTextEdQuery) =>
      query.selector !== 'id' || query.text === id,
    edit: (query: CadmusTextEdQuery) =>
      Promise.resolve<CadmusTextEdPluginResult>({
        id,
        text: `${query.text}+${id}`,
        query,
      }),
    ...overrides,
  };
}

describe('CadmusTextEdService', () => {
  let service: CadmusTextEdService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CadmusTextEdService],
    });
    service = TestBed.inject(CadmusTextEdService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should export the expected selector constants', () => {
    expect(CADMUS_TEXT_ED_QUERY_MATCH_FIRST).toBe('$match-first');
    expect(CADMUS_TEXT_ED_QUERY_MATCH_ALL).toBe('$match-all');
  });

  describe('getPlugins', () => {
    it('should return an empty array when not configured', () => {
      expect(service.getPlugins()).toEqual([]);
    });

    it('should return an empty array when configured without plugins', () => {
      service.configure({ plugins: [] });
      expect(service.getPlugins()).toEqual([]);
    });

    it('should return a copy of the configured plugins', () => {
      const plugin = makePlugin('p1');
      service.configure({ plugins: [plugin] });

      const plugins = service.getPlugins();
      expect(plugins).toEqual([plugin]);
      expect(plugins).not.toBe((service as any)._options.plugins);
    });
  });

  describe('configure', () => {
    it('should replace previously configured options', () => {
      service.configure({ plugins: [makePlugin('a')] });
      expect(service.getPlugins().map((p) => p.id)).toEqual(['a']);

      service.configure({ plugins: [makePlugin('b'), makePlugin('c')] });
      expect(service.getPlugins().map((p) => p.id)).toEqual(['b', 'c']);
    });
  });

  describe('edit', () => {
    it('should return the input text unchanged when there are no plugins', async () => {
      const query: CadmusTextEdQuery = { text: 'hello' };
      const result = await service.edit(query);
      expect(result).toEqual({ text: 'hello', query });
    });

    it('should return the input text unchanged when plugins array is empty', async () => {
      service.configure({ plugins: [] });
      const query: CadmusTextEdQuery = { text: 'hello' };
      const result = await service.edit(query);
      expect(result).toEqual({ text: 'hello', query });
    });

    it('should return the input text unchanged when selecting by id and no plugin matches that id', async () => {
      service.configure({ plugins: [makePlugin('a')] });
      const query: CadmusTextEdQuery = { selector: 'b', text: 'hello' };
      const result = await service.edit(query);
      expect(result).toEqual({ text: 'hello', query });
    });

    it('should return the input text unchanged when the selected plugin is disabled', async () => {
      const plugin = makePlugin('a', { enabled: false });
      service.configure({ plugins: [plugin] });
      const query: CadmusTextEdQuery = { selector: 'a', text: 'hello' };
      const result = await service.edit(query);
      expect(result).toEqual({ text: 'hello', query });
    });

    it('should edit the text using the plugin selected by id', async () => {
      const plugin = makePlugin('a');
      service.configure({ plugins: [plugin] });
      const query: CadmusTextEdQuery = { selector: 'a', text: 'hello' };
      const result = await service.edit(query);
      expect(result.text).toBe('hello+a');
      expect(result.ids).toEqual(['a']);
      expect(result.payloads).toEqual([undefined]);
      expect(result.error).toBeUndefined();
      expect(result.query).toBe(query);
    });

    it('should propagate the payload returned by the plugin', async () => {
      const plugin = makePlugin('a', {
        edit: (query) =>
          Promise.resolve({
            id: 'a',
            text: query.text,
            query,
            payload: { foo: 'bar' },
          }),
      });
      service.configure({ plugins: [plugin] });
      const result = await service.edit({ selector: 'a', text: 'x' });
      expect(result.payloads).toEqual([{ foo: 'bar' }]);
    });

    it('should propagate an error from the selected plugin', async () => {
      const plugin = makePlugin('a', {
        edit: (query) =>
          Promise.resolve({
            id: 'a',
            text: query.text,
            query,
            error: 'boom',
          }),
      });
      service.configure({ plugins: [plugin] });
      const result = await service.edit({ selector: 'a', text: 'x' });
      expect(result.error).toBe('boom');
      expect(result.ids).toEqual(['a']);
    });

    it('should select the first matching plugin with match-first', async () => {
      const a = makePlugin('a', {
        matches: () => false,
      });
      const b = makePlugin('b', {
        matches: () => true,
      });
      service.configure({ plugins: [a, b] });
      const result = await service.edit({
        selector: CADMUS_TEXT_ED_QUERY_MATCH_FIRST,
        text: 'x',
      });
      expect(result.ids).toEqual(['b']);
      expect(result.text).toBe('x+b');
    });

    it('should return the input text unchanged with match-first when no plugin matches', async () => {
      const a = makePlugin('a', { matches: () => false });
      service.configure({ plugins: [a] });
      const query: CadmusTextEdQuery = {
        selector: CADMUS_TEXT_ED_QUERY_MATCH_FIRST,
        text: 'x',
      };
      const result = await service.edit(query);
      expect(result).toEqual({ text: 'x', query });
    });

    it('should chain all matching plugins with match-all', async () => {
      const a = makePlugin('a');
      const b = makePlugin('b');
      const c = makePlugin('c');
      service.configure({ plugins: [a, b, c] });

      const result = await service.edit({
        selector: CADMUS_TEXT_ED_QUERY_MATCH_ALL,
        text: 'x',
      });

      expect(result.text).toBe('x+a+b+c');
      expect(result.ids).toEqual(['a', 'b', 'c']);
      expect(result.payloads).toEqual([undefined, undefined, undefined]);
    });

    it('should skip disabled plugins when chaining with match-all', async () => {
      const a = makePlugin('a');
      const b = makePlugin('b', { enabled: false });
      const c = makePlugin('c');
      service.configure({ plugins: [a, b, c] });

      const result = await service.edit({
        selector: CADMUS_TEXT_ED_QUERY_MATCH_ALL,
        text: 'x',
      });

      expect(result.ids).toEqual(['a', 'c']);
      expect(result.text).toBe('x+a+c');
    });

    it('should skip non-matching plugins when chaining with match-all', async () => {
      const a = makePlugin('a');
      const b = makePlugin('b', { matches: () => false });
      const c = makePlugin('c');
      service.configure({ plugins: [a, b, c] });

      const result = await service.edit({
        selector: CADMUS_TEXT_ED_QUERY_MATCH_ALL,
        text: 'x',
      });

      expect(result.ids).toEqual(['a', 'c']);
    });

    it('should stop immediately if the first plugin errors, even with match-all', async () => {
      const a = makePlugin('a', {
        edit: (query) =>
          Promise.resolve({
            id: 'a',
            text: query.text,
            query,
            error: 'first-error',
          }),
      });
      const b = makePlugin('b');
      service.configure({ plugins: [a, b] });

      const result = await service.edit({
        selector: CADMUS_TEXT_ED_QUERY_MATCH_ALL,
        text: 'x',
      });

      expect(result.error).toBe('first-error');
      expect(result.ids).toEqual(['a']);
    });

    it('should stop chaining as soon as a later plugin errors', async () => {
      const a = makePlugin('a');
      const b = makePlugin('b', {
        edit: (query) =>
          Promise.resolve({
            id: 'b',
            text: query.text,
            query,
            error: 'mid-error',
          }),
      });
      const c = makePlugin('c');
      service.configure({ plugins: [a, b, c] });

      const result = await service.edit({
        selector: CADMUS_TEXT_ED_QUERY_MATCH_ALL,
        text: 'x',
      });

      expect(result.error).toBe('mid-error');
      expect(result.ids).toEqual(['a', 'b']);
      expect(result.text).toBe('x+a');
    });

    it('should only apply the first plugin when selector is not match-all', async () => {
      const a = makePlugin('a');
      const b = makePlugin('b');
      service.configure({ plugins: [a, b] });

      const result = await service.edit({
        selector: CADMUS_TEXT_ED_QUERY_MATCH_FIRST,
        text: 'x',
      });

      expect(result.ids).toEqual(['a']);
      expect(result.text).toBe('x+a');
    });
  });

  describe('cadmusTextEdFactory', () => {
    it('should create a service instance configured with the given options', async () => {
      const plugin = makePlugin('a');
      const created = cadmusTextEdFactory({ plugins: [plugin] });
      expect(created).toBeInstanceOf(CadmusTextEdService);
      expect(created.getPlugins()).toEqual([plugin]);

      const result = await created.edit({ selector: 'a', text: 'x' });
      expect(result.text).toBe('x+a');
    });
  });

  describe('DI configuration via injection token', () => {
    it('should pick up plugins provided through CADMUS_TEXT_ED_SERVICE_OPTIONS_TOKEN', () => {
      const plugin = makePlugin('a');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CadmusTextEdService,
          {
            provide: CADMUS_TEXT_ED_SERVICE_OPTIONS_TOKEN,
            useValue: { plugins: [plugin] },
          },
        ],
      });
      const injected = TestBed.inject(CadmusTextEdService);
      expect(injected.getPlugins()).toEqual([plugin]);
    });

    it('should work with no token provided (optional injection)', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [CadmusTextEdService],
      });
      const injected = TestBed.inject(CadmusTextEdService);
      expect(injected.getPlugins()).toEqual([]);
    });
  });
});
