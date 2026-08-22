import { TestBed } from '@angular/core/testing';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { ProperNameService } from './proper-name.service';
import { TypeThesaurusEntry } from '../models';

describe('ProperNameService', () => {
  let service: ProperNameService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProperNameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('parseTypeEntries', () => {
    it('returns an empty array for undefined entries', () => {
      expect(service.parseTypeEntries(undefined)).toEqual([]);
    });

    it('returns an empty array for an empty array', () => {
      expect(service.parseTypeEntries([])).toEqual([]);
    });

    it('parses a flat list of entries without singleton or hierarchy', () => {
      const entries: ThesaurusEntry[] = [
        { id: 'p', value: 'praenomen' },
        { id: 'n', value: 'nomen' },
        { id: 'c', value: 'cognomen' },
      ];
      const result = service.parseTypeEntries(entries);
      expect(result).toHaveLength(3);
      // without an _order entry, sortedIds is empty and ordinal stays
      // undefined for every entry
      expect(result[0]).toEqual({
        id: 'p',
        value: 'praenomen',
        single: false,
        ordinal: undefined,
      });
      expect(result[1].ordinal).toBeUndefined();
      expect(result[2].ordinal).toBeUndefined();
      expect(result.every((r) => !r.values)).toBe(true);
    });

    it('marks entries ending with * as single and strips the suffix from id', () => {
      const entries: ThesaurusEntry[] = [{ id: 'continent*', value: 'continent' }];
      const result = service.parseTypeEntries(entries);
      expect(result).toEqual([
        {
          id: 'continent',
          value: 'continent',
          single: true,
          ordinal: undefined,
        },
      ]);
    });

    it('does not treat a single "*" id as a singleton suffix (length must be > 1)', () => {
      const entries: ThesaurusEntry[] = [{ id: '*', value: 'star' }];
      const result = service.parseTypeEntries(entries);
      // id.length is 1, so the '*' is not stripped and single stays false
      expect(result[0].id).toBe('*');
      expect(result[0].single).toBe(false);
    });

    it('attaches dotted child entries to the last preceding parent entry', () => {
      const entries: ThesaurusEntry[] = [
        { id: 'continent*', value: 'continent' },
        { id: 'continent.europe', value: 'Europe' },
        { id: 'continent.n-america', value: 'North America' },
        { id: 'country*', value: 'country' },
        { id: 'region*', value: 'region' },
      ];
      const result = service.parseTypeEntries(entries);
      expect(result).toHaveLength(3);

      const continent = result.find((r) => r.id === 'continent')!;
      expect(continent.single).toBe(true);
      expect(continent.values).toEqual([
        { id: 'continent.europe', value: 'Europe' },
        { id: 'continent.n-america', value: 'North America' },
      ]);

      const country = result.find((r) => r.id === 'country')!;
      expect(country.values).toBeUndefined();
    });

    it('treats a dotted entry with no preceding parent as a top-level entry', () => {
      const entries: ThesaurusEntry[] = [{ id: 'orphan.child', value: 'child' }];
      const result = service.parseTypeEntries(entries);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('orphan.child');
    });

    it('honors _order to assign ordinals and excludes it from the results', () => {
      const entries: ThesaurusEntry[] = [
        { id: 'continent*', value: 'continent' },
        { id: 'continent.europe', value: 'Europe' },
        { id: 'country*', value: 'country' },
        { id: 'region*', value: 'region' },
        { id: '_order', value: 'continent country site' },
      ];
      const result = service.parseTypeEntries(entries);
      expect(result.find((r) => r.id === '_order')).toBeUndefined();
      expect(result).toHaveLength(3);

      const continent = result.find((r) => r.id === 'continent')!;
      const country = result.find((r) => r.id === 'country')!;
      const region = result.find((r) => r.id === 'region')!;

      expect(continent.ordinal).toBe(1);
      expect(country.ordinal).toBe(2);
      // "region" is not listed in _order ("site" is instead), so it falls
      // back to the "next" ordinal, i.e. results.length + 1 at the time it
      // was pushed (3rd entry pushed => 3)
      expect(region.ordinal).toBe(3);
    });

    it('honors _order for singleton (*-suffixed) entries even when file order differs', () => {
      // regression test: the ordinal lookup must strip the trailing '*'
      // singleton marker before matching against _order, since _order's
      // ids never carry it (see README example). Here the entries are
      // declared out of order on purpose, to prove _order (not file
      // order) drives the resulting ordinal.
      const entries: ThesaurusEntry[] = [
        { id: 'country*', value: 'country' },
        { id: 'continent*', value: 'continent' },
        { id: 'region*', value: 'region' },
        { id: '_order', value: 'continent country region' },
      ];
      const result = service.parseTypeEntries(entries);

      const continent = result.find((r) => r.id === 'continent')!;
      const country = result.find((r) => r.id === 'country')!;
      const region = result.find((r) => r.id === 'region')!;

      expect(continent.ordinal).toBe(1);
      expect(country.ordinal).toBe(2);
      expect(region.ordinal).toBe(3);
    });

    it('ignores an empty _order value (yields no sorted ids, so ordinal is undefined)', () => {
      const entries: ThesaurusEntry[] = [
        { id: '_order', value: '' },
        { id: 'p', value: 'praenomen' },
      ];
      const result = service.parseTypeEntries(entries);
      expect(result).toEqual([
        { id: 'p', value: 'praenomen', single: false, ordinal: undefined },
      ]);
    });
  });

  describe('getValueEntries', () => {
    it('returns an empty array for undefined/empty types', () => {
      expect(service.getValueEntries(undefined as any)).toEqual([]);
      expect(service.getValueEntries([])).toEqual([]);
    });

    it('returns an empty array when no type has values', () => {
      const types: TypeThesaurusEntry[] = [
        { id: 'p', value: 'praenomen' },
        { id: 'n', value: 'nomen' },
      ];
      expect(service.getValueEntries(types)).toEqual([]);
    });

    it('concatenates values from all types that have them', () => {
      const types: TypeThesaurusEntry[] = [
        {
          id: 'continent',
          value: 'continent',
          values: [
            { id: 'continent.europe', value: 'Europe' },
            { id: 'continent.asia', value: 'Asia' },
          ],
        },
        { id: 'country', value: 'country' },
        {
          id: 'region',
          value: 'region',
          values: [{ id: 'region.veneto', value: 'Veneto' }],
        },
      ];
      const result = service.getValueEntries(types);
      expect(result).toEqual([
        { id: 'continent.europe', value: 'Europe' },
        { id: 'continent.asia', value: 'Asia' },
        { id: 'region.veneto', value: 'Veneto' },
      ]);
    });
  });
});
