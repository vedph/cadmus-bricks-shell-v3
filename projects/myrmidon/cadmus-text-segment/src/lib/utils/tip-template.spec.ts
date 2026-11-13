import { TextSegment } from '../models';
import {
  fillTipTemplate,
  resolvePath,
  resolveSegmentTip,
  truncateText,
} from './tip-template';

const SEGMENT: TextSegment<unknown> = {
  id: 3,
  index: 2,
  value: 'p',
  label: 'P',
  tip: 'own tip',
  payload: { uni: { category: 'Ll' }, userId: 'John', tags: ['x', 'y'] },
};

describe('tip-template', () => {
  it('should resolve paths', () => {
    expect(resolvePath({ a: { b: 1 } }, 'a.b')).toBe(1);
    expect(resolvePath({ a: [5, 6] }, 'a.1')).toBe(6);
    expect(resolvePath({ a: 1 }, 'a.b')).toBeUndefined();
    expect(resolvePath(undefined, 'a')).toBeUndefined();
  });

  it('should fill the template, dropping unresolved placeholders', () => {
    expect(
      fillTipTemplate("cat.='{{uni.category}}' {{notdefined}}", SEGMENT),
    ).toBe("cat.='Ll'");
  });

  it('should fill segment properties', () => {
    expect(fillTipTemplate('{{$id}}/{{$index}}/{{$value}}/{{$label}}', SEGMENT)).toBe(
      '3/2/p/P',
    );
  });

  it('should tolerate spaces in placeholders', () => {
    expect(fillTipTemplate('{{ userId }}', SEGMENT)).toBe('John');
  });

  it('should stringify objects', () => {
    expect(fillTipTemplate('{{tags}}', SEGMENT)).toBe('["x","y"]');
  });

  it('should truncate text with ellipsis', () => {
    expect(truncateText('abcdef', 3)).toBe('abc…');
    expect(truncateText('abc', 3)).toBe('abc');
    expect(truncateText('abc')).toBe('abc');
  });

  it('should resolve tip by precedence', () => {
    expect(resolveSegmentTip(SEGMENT, {})).toBe('own tip');
    expect(resolveSegmentTip(SEGMENT, { tipTemplate: '{{userId}}' })).toBe(
      'John',
    );
    expect(
      resolveSegmentTip(SEGMENT, {
        tipTemplate: '{{userId}}',
        tipFn: (s) => 'fn ' + s.id,
      }),
    ).toBe('fn 3');
    expect(
      resolveSegmentTip(SEGMENT, { tipTemplate: '{{userId}}', tipMaxLength: 2 }),
    ).toBe('Jo…');
    expect(resolveSegmentTip({ id: 1, index: 0, value: 'a' }, {})).toBe('');
  });
});
