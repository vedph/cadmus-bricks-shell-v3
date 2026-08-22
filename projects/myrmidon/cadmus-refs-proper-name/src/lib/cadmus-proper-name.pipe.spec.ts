import { CadmusProperNamePipe } from './cadmus-proper-name.pipe';
import { ProperName } from './models';

describe('CadmusProperNamePipe', () => {
  let pipe: CadmusProperNamePipe;

  beforeEach(() => {
    pipe = new CadmusProperNamePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('returns null for a null value', () => {
    expect(pipe.transform(null)).toBeNull();
  });

  it('returns null for an undefined value', () => {
    expect(pipe.transform(undefined)).toBeNull();
  });

  it('returns null when pieces is empty', () => {
    const name: ProperName = { language: 'lat', pieces: [] };
    expect(pipe.transform(name)).toBeNull();
  });

  it('returns null when pieces is undefined', () => {
    const name = { language: 'lat' } as unknown as ProperName;
    expect(pipe.transform(name)).toBeNull();
  });

  it('joins piece values with no maps and no legend', () => {
    const name: ProperName = {
      language: 'lat',
      pieces: [
        { type: 'p', value: 'Publius' },
        { type: 'n', value: 'Vergilius' },
        { type: 'c', value: 'Maro' },
      ],
    };
    expect(pipe.transform(name)).toBe('Publius, Vergilius, Maro');
  });

  it('appends the types legend when legend is true and no typeMap is given', () => {
    const name: ProperName = {
      language: 'lat',
      pieces: [
        { type: 'p', value: 'Publius' },
        { type: 'n', value: 'Vergilius' },
      ],
    };
    expect(pipe.transform(name, undefined, undefined, 'id', 'value', true)).toBe(
      'Publius, Vergilius (p, n)'
    );
  });

  it('appends an empty legend parenthesis when a piece has an empty type', () => {
    const name: ProperName = {
      language: 'lat',
      pieces: [{ type: '', value: 'Publius' }],
    };
    // an empty type is still pushed into the types array (as ''), so
    // types.length is 1 and the (possibly empty) legend is appended
    expect(pipe.transform(name, undefined, undefined, 'id', 'value', true)).toBe(
      'Publius ()'
    );
  });

  it('resolves piece values against an object valueMap', () => {
    const name: ProperName = {
      language: 'lat',
      pieces: [{ type: 'p', value: 'praenomen-id' }],
    };
    const valueMap = { 'praenomen-id': 'Publius' };
    expect(pipe.transform(name, undefined, valueMap)).toBe('Publius');
  });

  it('falls back to the raw value when the object valueMap has no match', () => {
    const name: ProperName = {
      language: 'lat',
      pieces: [{ type: 'p', value: 'unknown-id' }],
    };
    const valueMap = { 'praenomen-id': 'Publius' };
    expect(pipe.transform(name, undefined, valueMap)).toBe('unknown-id');
  });

  it('resolves piece values against an array-of-objects valueMap using keyName/valueName', () => {
    const name: ProperName = {
      language: 'lat',
      pieces: [{ type: 'p', value: 'praenomen-id' }],
    };
    const valueMap = [
      { id: 'praenomen-id', value: 'Publius' },
      { id: 'nomen-id', value: 'Vergilius' },
    ];
    expect(pipe.transform(name, undefined, valueMap, 'id', 'value')).toBe(
      'Publius'
    );
  });

  it('purges a trailing * from array map keys before matching', () => {
    const name: ProperName = {
      language: 'lat',
      pieces: [{ type: 'continent', value: 'europe' }],
    };
    const typeMap = [{ id: 'continent*', value: 'Continent' }];
    expect(
      pipe.transform(name, typeMap, undefined, 'id', 'value', true)
    ).toBe('europe (Continent)');
  });

  it('returns the raw value from an array map when valueName is falsy', () => {
    const name: ProperName = {
      language: 'lat',
      pieces: [{ type: 'p', value: 'praenomen-id' }],
    };
    const valueMap = [{ id: 'praenomen-id', value: 'Publius' }];
    expect(pipe.transform(name, undefined, valueMap, 'id', '')).toBe(
      'praenomen-id'
    );
  });

  it('falls back to the raw value when an array map has no match', () => {
    const name: ProperName = {
      language: 'lat',
      pieces: [{ type: 'p', value: 'missing-id' }],
    };
    const valueMap = [{ id: 'praenomen-id', value: 'Publius' }];
    expect(pipe.transform(name, undefined, valueMap, 'id', 'value')).toBe(
      'missing-id'
    );
  });

  it('resolves both type and value maps together with a legend', () => {
    const name: ProperName = {
      language: 'lat',
      pieces: [
        { type: 'p', value: 'praenomen-id' },
        { type: 'n', value: 'nomen-id' },
      ],
    };
    const typeMap = { p: 'praenomen', n: 'nomen' };
    const valueMap = { 'praenomen-id': 'Publius', 'nomen-id': 'Vergilius' };
    expect(pipe.transform(name, typeMap, valueMap, 'id', 'value', true)).toBe(
      'Publius, Vergilius (praenomen, nomen)'
    );
  });

  it('treats a piece value that is falsy as an empty string in the output', () => {
    const name: ProperName = {
      language: 'lat',
      pieces: [{ type: 'p', value: '' }],
    };
    expect(pipe.transform(name)).toBe('');
  });
});
