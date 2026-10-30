import {
  createPleiadesQueryControls,
  getQueryBBox,
  getQueryPoint,
  getQueryRegion,
  isInvertedRange,
  pleiadesQueryToFilters,
  pleiadesQueryToRequest,
  pleiadesRequestToQuery,
  PleiadesQueryControls,
} from './pleiades-query-form';

function controls(
  patch: Partial<PleiadesQueryControls> = {},
): PleiadesQueryControls {
  return { ...createPleiadesQueryControls(20), ...patch };
}

describe('pleiades-query-form', () => {
  it('creates defaults', () => {
    const c = createPleiadesQueryControls(30, ['plttl']);
    expect(c.pageSize).toBe(30);
    expect(c.scopes).toEqual(['plttl']);
    expect(c.spatialMode).toBe('none');
    expect(c.sort).toBe('title');
  });

  it('isInvertedRange ignores unset values', () => {
    expect(isInvertedRange(10, 5)).toBe(true);
    expect(isInvertedRange(5, 10)).toBe(false);
    expect(isInvertedRange(10, 0)).toBe(false);
    expect(isInvertedRange(null, 5)).toBe(false);
    expect(isInvertedRange(-100, -300)).toBe(true);
  });

  it('gets point and bbox only when complete', () => {
    expect(getQueryPoint(controls({ pointLat: 1 }))).toBeUndefined();
    expect(getQueryPoint(controls({ pointLat: 1, pointLng: 2 }))).toEqual([
      2, 1,
    ]);
    expect(getQueryBBox(controls({ swLat: 1, swLng: 2 }))).toBeUndefined();
    expect(
      getQueryBBox(controls({ swLat: 1, swLng: 2, neLat: 3, neLng: 4 })),
    ).toEqual({ sw: [2, 1], ne: [4, 3] });
  });

  describe('pleiadesQueryToRequest', () => {
    it('builds a minimal request', () => {
      expect(pleiadesQueryToRequest(controls())).toEqual({
        pageNumber: 1,
        pageSize: 20,
        sort: 'title',
      });
    });

    it('builds text, types, ranks, and years', () => {
      const request = pleiadesQueryToRequest(
        controls({
          text: ' roma ostia ',
          matchAny: true,
          scopes: ['plttl'],
          placeTypes: ['settlement', 'port'],
          rankMin: 90,
          rankMax: 0,
          yearMin: -400,
          yearMax: null,
        }),
        3,
      );
      expect(request).toEqual({
        pageNumber: 3,
        pageSize: 20,
        text: 'roma ostia',
        matchAny: true,
        scopes: ['plttl'],
        placeTypes: ['/settlement', '/port'],
        rankMin: 90,
        yearMin: -400,
        sort: 'title',
      });
    });

    it('drops matchAny without text', () => {
      expect(
        pleiadesQueryToRequest(controls({ matchAny: true })).matchAny,
      ).toBeUndefined();
    });

    it('builds range filters in km -> m, only in range mode', () => {
      const c = controls({
        spatialMode: 'range',
        pointLat: 37.97,
        pointLng: 23.72,
        distanceMin: 1.5,
        distanceMax: 20,
        sort: 'distance',
        swLat: 1,
        swLng: 1,
        neLat: 2,
        neLng: 2,
      });
      const request = pleiadesQueryToRequest(c);
      expect(request.distanceLon).toBe(23.72);
      expect(request.distanceLat).toBe(37.97);
      expect(request.distanceMin).toBe(1500);
      expect(request.distanceMax).toBe(20000);
      expect(request.sort).toBe('distance');
      expect(request.swCornerLat).toBeUndefined();
    });

    it('ignores range without point, and falls back to title sort', () => {
      const request = pleiadesQueryToRequest(
        controls({ spatialMode: 'range', distanceMax: 10, sort: 'distance' }),
      );
      expect(request.distanceMax).toBeUndefined();
      expect(request.sort).toBe('title');
    });

    it('builds bbox filters only in bbox mode', () => {
      const c = controls({
        spatialMode: 'bbox',
        swLat: 37.5,
        swLng: 23,
        neLat: 38.5,
        neLng: 24.2,
        containedInBox: true,
        pointLat: 1,
        pointLng: 1,
      });
      const request = pleiadesQueryToRequest(c);
      expect(request).toMatchObject({
        swCornerLon: 23,
        swCornerLat: 37.5,
        neCornerLon: 24.2,
        neCornerLat: 38.5,
        containedInBox: true,
      });
      expect(request.distanceLat).toBeUndefined();
    });

    it('ignores spatial filters in none mode', () => {
      const request = pleiadesQueryToRequest(
        controls({ pointLat: 1, pointLng: 1, swLat: 1, swLng: 1, neLat: 2, neLng: 2 }),
      );
      expect(request.distanceLat).toBeUndefined();
      expect(request.swCornerLat).toBeUndefined();
    });
  });

  it('gets the region only with 3 vertices', () => {
    expect(getQueryRegion(controls({ region: [[1, 1], [2, 2]] }))).toBeUndefined();
    expect(getQueryRegion(controls({ region: [[1, 1], [2, 2], [3, 1]] }))).toEqual([
      [1, 1],
      [2, 2],
      [3, 1],
    ]);
  });

  it('builds region filters only in polygon mode', () => {
    const region: [number, number][] = [
      [23, 37.5],
      [24.2, 37.5],
      [23.6, 38.5],
    ];
    const request = pleiadesQueryToRequest(
      controls({ spatialMode: 'polygon', region, containedInRegion: true }),
    );
    expect(request.region).toEqual(region);
    expect(request.region).not.toBe(region);
    expect(request.containedInRegion).toBe(true);

    const none = pleiadesQueryToRequest(
      controls({ spatialMode: 'bbox', region, containedInRegion: true }),
    );
    expect(none.region).toBeUndefined();
    expect(none.containedInRegion).toBeUndefined();
  });

  describe('pleiadesQueryToFilters', () => {
    it('drops text and paging, keeping empty scopes', () => {
      expect(
        pleiadesQueryToFilters(
          controls({ text: 'roma', matchAny: true, pageSize: 50 }),
        ),
      ).toEqual({ scopes: [], sort: 'title' });
    });

    it('keeps all the other filters', () => {
      const region: [number, number][] = [
        [170, 10],
        [190, 10],
        [180, 20],
      ];
      expect(
        pleiadesQueryToFilters(
          controls({
            scopes: ['plttl'],
            placeTypes: ['settlement'],
            rankMin: 10,
            yearMax: 300,
            spatialMode: 'polygon',
            region,
            containedInRegion: true,
          }),
        ),
      ).toEqual({
        scopes: ['plttl'],
        placeTypes: ['/settlement'],
        rankMin: 10,
        yearMax: 300,
        region,
        containedInRegion: true,
        sort: 'title',
      });
    });

    it('round-trips through pleiadesRequestToQuery', () => {
      const c = controls({
        scopes: ['nmrmz'],
        spatialMode: 'range',
        pointLat: 37,
        pointLng: 23,
        distanceMax: 50,
        sort: 'distance',
      });
      const back = pleiadesRequestToQuery(pleiadesQueryToFilters(c), controls());
      expect(pleiadesQueryToFilters(back)).toEqual(pleiadesQueryToFilters(c));
    });
  });

  describe('pleiadesRequestToQuery', () => {
    it('round-trips a region request', () => {
      const c = controls({
        spatialMode: 'polygon',
        region: [
          [170, 10],
          [190, 10],
          [180, 20],
        ],
        containedInRegion: true,
      });
      expect(pleiadesRequestToQuery(pleiadesQueryToRequest(c), controls())).toEqual(c);
    });

    it('round-trips a range request', () => {
      const c = controls({
        text: 'athenae',
        scopes: ['nmrmz'],
        placeTypes: ['settlement'],
        rankMin: 90,
        yearMin: -400,
        yearMax: -301,
        spatialMode: 'range',
        pointLat: 37.97,
        pointLng: 23.72,
        distanceMax: 20,
        sort: 'distance',
      });
      const back = pleiadesRequestToQuery(
        pleiadesQueryToRequest(c),
        createPleiadesQueryControls(20),
      );
      expect(back).toEqual(c);
    });

    it('round-trips a bbox request', () => {
      const c = controls({
        spatialMode: 'bbox',
        swLat: 37.5,
        swLng: 23,
        neLat: 38.5,
        neLng: 24.2,
        containedInBox: true,
      });
      expect(pleiadesRequestToQuery(pleiadesQueryToRequest(c), controls())).toEqual(c);
    });

    it('accepts full place type URIs', () => {
      const c = pleiadesRequestToQuery({
        placeTypes: [
          'https://pleiades.stoa.org/vocabularies/place-types/river',
          '/fort',
          'temple',
        ],
      });
      expect(c.placeTypes).toEqual(['river', 'fort', 'temple']);
    });

    it('uses defaults for missing values', () => {
      const c = pleiadesRequestToQuery(
        { sort: 'distance' },
        createPleiadesQueryControls(77, ['plttl']),
      );
      expect(c.pageSize).toBe(77);
      expect(c.scopes).toEqual(['plttl']);
      // no point: no distance sort
      expect(c.sort).toBe('title');
      expect(c.spatialMode).toBe('none');
    });
  });
});
