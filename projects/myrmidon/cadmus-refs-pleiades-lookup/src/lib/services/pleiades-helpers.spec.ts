import {
  buildSearchParams,
  buildTypeAheadText,
  formatPleiadesDistance,
  formatPleiadesRegion,
  formatPleiadesYear,
  formatPleiadesYearSpan,
  getPleiadesErrorMessage,
  getPleiadesPlaceUri,
  getUriLastSegment,
  normalizePlaceType,
  parsePleiadesRegion,
} from './pleiades-helpers';

describe('pleiades-helpers', () => {
  describe('getUriLastSegment', () => {
    it('returns empty for null/undefined/empty', () => {
      expect(getUriLastSegment(null)).toBe('');
      expect(getUriLastSegment(undefined)).toBe('');
      expect(getUriLastSegment('')).toBe('');
    });
    it('returns the last segment', () => {
      expect(
        getUriLastSegment(
          'https://pleiades.stoa.org/vocabularies/place-types/settlement',
        ),
      ).toBe('settlement');
    });
    it('ignores a trailing slash', () => {
      expect(getUriLastSegment('https://x.org/a/b/')).toBe('b');
    });
    it('returns a plain value as is', () => {
      expect(getUriLastSegment('certain')).toBe('certain');
    });
  });

  describe('normalizePlaceType', () => {
    it('prefixes bare short names with /', () => {
      expect(normalizePlaceType('settlement')).toBe('/settlement');
    });
    it('keeps /-prefixed names', () => {
      expect(normalizePlaceType('/fort')).toBe('/fort');
    });
    it('keeps full URIs', () => {
      const uri = 'https://pleiades.stoa.org/vocabularies/place-types/river';
      expect(normalizePlaceType(uri)).toBe(uri);
    });
    it('trims and returns empty for blank', () => {
      expect(normalizePlaceType('  temple ')).toBe('/temple');
      expect(normalizePlaceType('  ')).toBe('');
    });
  });

  describe('buildTypeAheadText', () => {
    it('returns empty for no text', () => {
      expect(buildTypeAheadText(undefined)).toBe('');
      expect(buildTypeAheadText('   ')).toBe('');
    });
    it('adds ^= to a single word', () => {
      expect(buildTypeAheadText('epid')).toBe('^=epid');
    });
    it('adds ^= to the last word only', () => {
      expect(buildTypeAheadText('via  app')).toBe('via ^=app');
    });
    it('keeps an operator typed by the user', () => {
      expect(buildTypeAheadText('%=athene')).toBe('%=athene');
      expect(buildTypeAheadText('roma <>ostia')).toBe('roma <>ostia');
      expect(buildTypeAheadText('=roma')).toBe('=roma');
    });
  });

  describe('buildSearchParams', () => {
    it('returns no params for an empty request', () => {
      expect(buildSearchParams({})).toEqual({});
    });

    it('omits zero numeric filters and false flags', () => {
      expect(
        buildSearchParams({
          rankMin: 0,
          yearMax: 0,
          matchAny: false,
          containedInBox: false,
          distanceMax: 0,
        }),
      ).toEqual({});
    });

    it('builds all the params', () => {
      const params = buildSearchParams({
        text: ' via appia ',
        matchAny: true,
        scopes: ['plttl', 'nmrmz'],
        placeTypes: ['settlement', '/fort'],
        rankMin: 50,
        rankMax: 100,
        yearMin: -300,
        yearMax: 100,
        distanceLon: 23.72,
        distanceLat: 37.97,
        distanceMin: 1000,
        distanceMax: 20000,
        swCornerLon: 23,
        swCornerLat: 37.5,
        neCornerLon: 24.2,
        neCornerLat: 38.5,
        containedInBox: true,
        sort: 'distance',
        pageNumber: 2,
        pageSize: 50,
      });
      expect(params).toEqual({
        text: 'via appia',
        matchAny: 'true',
        scopes: 'plttl,nmrmz',
        placeType: '/settlement,/fort',
        rankMin: '50',
        rankMax: '100',
        yearMin: '-300',
        yearMax: '100',
        distanceLon: '23.72',
        distanceLat: '37.97',
        distanceMin: '1000',
        distanceMax: '20000',
        swCornerLon: '23',
        swCornerLat: '37.5',
        neCornerLon: '24.2',
        neCornerLat: '38.5',
        containedInBox: 'true',
        sort: 'distance',
        pageNumber: '2',
        pageSize: '50',
      });
    });

    it('builds region params', () => {
      expect(
        buildSearchParams({
          region: [
            [23, 37.5],
            [24.2000001, 37.5],
            [190, 38.5],
          ],
          containedInRegion: true,
        }),
      ).toEqual({
        region: '23,37.5;24.2,37.5;190,38.5',
        containedInRegion: 'true',
      });
    });

    it('omits regions with less than 3 vertices', () => {
      expect(
        buildSearchParams({
          region: [
            [1, 1],
            [2, 2],
          ],
          containedInRegion: true,
        }),
      ).toEqual({});
    });

    it('keeps zero coordinates', () => {
      const params = buildSearchParams({ distanceLon: 0, distanceLat: 0 });
      expect(params).toEqual({ distanceLon: '0', distanceLat: '0' });
    });

    it('omits the default title sort', () => {
      expect(buildSearchParams({ sort: 'title' })).toEqual({});
    });

    it('omits blank text and empty arrays', () => {
      expect(
        buildSearchParams({ text: '  ', scopes: [], placeTypes: [' '] }),
      ).toEqual({});
    });
  });

  describe('regions', () => {
    it('formats and parses regions', () => {
      const text = formatPleiadesRegion([
        [23, 37.5],
        [-24.25, 37.5],
      ]);
      expect(text).toBe('23,37.5;-24.25,37.5');
      expect(parsePleiadesRegion(text)).toEqual([
        [23, 37.5],
        [-24.25, 37.5],
      ]);
    });

    it('parses empty or invalid regions as undefined', () => {
      expect(parsePleiadesRegion(' ')).toBeUndefined();
      expect(parsePleiadesRegion('1,2;3')).toBeUndefined();
      expect(parsePleiadesRegion('1,x')).toBeUndefined();
    });
  });

  describe('getPleiadesPlaceUri', () => {
    it('builds from an ID', () => {
      expect(getPleiadesPlaceUri('570228')).toBe(
        'https://pleiades.stoa.org/places/570228',
      );
    });
    it('builds from a result', () => {
      expect(
        getPleiadesPlaceUri({ id: '1', uriPrefix: 'https://x.org/p/' }),
      ).toBe('https://x.org/p/1');
    });
    it('uses the default prefix when missing', () => {
      expect(getPleiadesPlaceUri({ id: '1', uriPrefix: '' })).toBe(
        'https://pleiades.stoa.org/places/1',
      );
    });
  });

  describe('years', () => {
    it('formats BC and AD years', () => {
      expect(formatPleiadesYear(-300)).toBe('300 BC');
      expect(formatPleiadesYear(300)).toBe('AD 300');
      expect(formatPleiadesYear(0)).toBe('');
      expect(formatPleiadesYear(null)).toBe('');
    });
    it('formats spans', () => {
      expect(formatPleiadesYearSpan(-750, 300)).toBe('750 BC – AD 300');
      expect(formatPleiadesYearSpan(-750, -750)).toBe('750 BC');
      expect(formatPleiadesYearSpan(null, 300)).toBe('AD 300');
      expect(formatPleiadesYearSpan(-30, null)).toBe('30 BC');
      expect(formatPleiadesYearSpan(null, null)).toBe('');
    });
  });

  describe('formatPleiadesDistance', () => {
    it('formats meters and km', () => {
      expect(formatPleiadesDistance(null)).toBe('');
      expect(formatPleiadesDistance(132.55)).toBe('133 m');
      expect(formatPleiadesDistance(12345)).toBe('12.3 km');
      expect(formatPleiadesDistance(123456)).toBe('123 km');
    });
  });

  describe('getPleiadesErrorMessage', () => {
    it('handles empty and string errors', () => {
      expect(getPleiadesErrorMessage(undefined)).toBe('Unknown error');
      expect(getPleiadesErrorMessage('oops')).toBe('oops');
    });

    it('handles network errors', () => {
      expect(getPleiadesErrorMessage({ status: 0 })).toContain(
        'cannot be reached',
      );
    });

    it('merges validation errors repeated for several params', () => {
      const message = getPleiadesErrorMessage({
        status: 400,
        error: {
          title: 'One or more validation errors occurred.',
          errors: {
            DistanceLat: ['Both are required'],
            DistanceLon: ['Both are required'],
            Sort: ['Sorting by distance requires the distance point'],
          },
        },
      });
      expect(message).toBe(
        'Both are required (DistanceLat, DistanceLon); ' +
          'Sorting by distance requires the distance point (Sort)',
      );
    });

    it('handles rate limit errors', () => {
      expect(
        getPleiadesErrorMessage({
          status: 429,
          error: { error: 'Too many requests.' },
        }),
      ).toBe('Too many requests.');
    });

    it('handles problem details without errors', () => {
      expect(
        getPleiadesErrorMessage({ status: 500, error: { title: 'Boom' } }),
      ).toBe('Boom');
    });

    it('handles 404 without body', () => {
      expect(getPleiadesErrorMessage({ status: 404, error: null })).toBe(
        'Not found',
      );
    });

    it('falls back to the message', () => {
      expect(
        getPleiadesErrorMessage({ status: 500, message: 'Http failure' }),
      ).toBe('Http failure');
    });
  });
});
