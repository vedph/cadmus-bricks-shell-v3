import type { StyleSpecification } from 'maplibre-gl';

import {
  guardFilterExpression,
  loadMapStyle,
  patchMapStyle,
} from './map-style-helper';

describe('map-style-helper', () => {
  describe('guardFilterExpression', () => {
    it('guards a comparison against a feature property', () => {
      expect(guardFilterExpression(['<=', ['get', 'ref_length'], 6])).toEqual([
        'all',
        ['has', 'ref_length'],
        ['<=', ['get', 'ref_length'], 6],
      ]);
    });

    it('guards nested comparisons and leaves other expressions alone', () => {
      const match = ['match', ['get', 'network'], ['us-interstate'], true, false];
      expect(
        guardFilterExpression(['all', ['>', ['get', 'rank'], 2], match]),
      ).toEqual([
        'all',
        ['all', ['has', 'rank'], ['>', ['get', 'rank'], 2]],
        match,
      ]);
    });

    it('leaves legacy filters unchanged', () => {
      const legacy = ['<=', 'ref_length', 6];
      expect(guardFilterExpression(legacy)).toEqual(legacy);
    });

    it('leaves non-array values unchanged', () => {
      expect(guardFilterExpression(true)).toBe(true);
    });
  });

  describe('patchMapStyle', () => {
    it('patches layer filters without touching layers without filter', () => {
      const style = {
        version: 8,
        sources: {},
        layers: [
          { id: 'bg', type: 'background' },
          {
            id: 'shield',
            type: 'symbol',
            source: 'osm',
            filter: ['<=', ['get', 'ref_length'], 6],
          },
        ],
      } as unknown as StyleSpecification;

      const patched = patchMapStyle(style);

      expect(patched.layers[0]).toBe(style.layers[0]);
      expect((patched.layers[1] as { filter: unknown }).filter).toEqual([
        'all',
        ['has', 'ref_length'],
        ['<=', ['get', 'ref_length'], 6],
      ]);
      // original untouched
      expect((style.layers[1] as { filter: unknown }).filter).toEqual([
        '<=',
        ['get', 'ref_length'],
        6,
      ]);
    });
  });

  describe('loadMapStyle', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns the patched style when fetch succeeds', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                version: 8,
                sources: {},
                layers: [
                  {
                    id: 'l',
                    type: 'line',
                    source: 's',
                    filter: ['<', ['get', 'x'], 1],
                  },
                ],
              }),
          }),
        ),
      );
      const style = (await loadMapStyle('http://x/style')) as StyleSpecification;
      expect((style.layers[0] as { filter: unknown }).filter).toEqual([
        'all',
        ['has', 'x'],
        ['<', ['get', 'x'], 1],
      ]);
    });

    it('falls back to the URL when fetch fails', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('x'))));
      expect(await loadMapStyle('http://x/style')).toBe('http://x/style');
    });

    it('falls back to the URL on a non-OK response', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })));
      expect(await loadMapStyle('http://x/style')).toBe('http://x/style');
    });
  });
});
