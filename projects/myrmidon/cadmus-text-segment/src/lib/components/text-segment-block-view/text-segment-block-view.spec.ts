import { render, screen } from '@testing-library/angular';

import { resolveSegmentedTextSettings } from '../../models';
import { SpacedTextSegmenter } from '../../services/spaced-text-segmenter';
import {
  TextSegmentBlockView,
  getTextSegmentRuns,
} from './text-segment-block-view';

const BLOCKS = new SpacedTextSegmenter().getBlocks('ab c\nde');

async function setup(inputs: Record<string, unknown> = {}) {
  const result = await render(TextSegmentBlockView, {
    inputs: { block: BLOCKS[1], ...inputs },
  });
  await result.fixture.whenStable();
  return { ...result, host: result.fixture.nativeElement as HTMLElement };
}

describe('getTextSegmentRuns', () => {
  const ids = (text: string) =>
    getTextSegmentRuns(new SpacedTextSegmenter().getBlocks(text)[0].segments).map(
      (run) => run.map((s) => s.value).join(''),
    );

  it('should return no runs for no segments', () => {
    expect(getTextSegmentRuns([])).toEqual([]);
  });

  it('should end each run with a whitespace', () => {
    expect(ids('ab  c ')).toEqual(['ab ', ' ', 'c ']);
  });

  it('should keep a text without whitespace in a single run', () => {
    expect(ids('abc')).toEqual(['abc']);
  });
});

describe('TextSegmentBlockView', () => {
  it('should render a segment view for each segment', async () => {
    const { host } = await setup({ block: BLOCKS[0] });
    const ids = [...host.querySelectorAll('[data-seg-id]')].map((e) =>
      e.getAttribute('data-seg-id'),
    );
    expect(ids).toEqual(['1', '2', '3', '4']);
  });

  it('should render the block number as index + 1', async () => {
    const { host } = await setup();
    expect(host.querySelector('.block-number')?.textContent?.trim()).toBe('2');
    expect(screen.getByRole('group', { name: 'block 2' })).toBe(host);
  });

  it('should hide the block number when disabled', async () => {
    const { host } = await setup({
      settings: resolveSegmentedTextSettings({ showBlockNumbers: false }),
    });
    expect(host.querySelector('.block-number')).toBeNull();
  });

  it('should mark selected, hit and caret segments', async () => {
    const { getAllByRole } = await setup({
      selectedIds: new Set([6]),
      hitIds: new Set([7]),
      caretId: 6,
    });
    const options = getAllByRole('option');
    expect(options.length).toBe(2);
    expect(options[0].classList).toContain('selected');
    expect(options[0].classList).toContain('caret');
    expect(options[1].classList).toContain('hit');
    expect(options[1].classList).not.toContain('selected');
  });

  it('should update the selection when the input changes', async () => {
    const { getAllByRole, rerender } = await setup({
      selectedIds: new Set([6]),
    });
    await rerender({
      partialUpdate: true,
      inputs: { selectedIds: new Set([7]) },
    });
    const options = getAllByRole('option');
    expect(options[0].classList).not.toContain('selected');
    expect(options[1].classList).toContain('selected');
  });

  it('should not group segments into runs by default', async () => {
    const { host } = await setup({ block: BLOCKS[0] });
    expect(host.querySelectorAll('.run').length).toBe(0);
  });

  it('should group segments into runs ending with whitespace in word wrap mode', async () => {
    const { host } = await setup({
      block: BLOCKS[0],
      settings: resolveSegmentedTextSettings({ wrapMode: 'word' }),
    });
    const runs = [...host.querySelectorAll('.run')].map((run) =>
      [...run.querySelectorAll('[data-seg-id]')].map((e) =>
        e.getAttribute('data-seg-id'),
      ),
    );
    // "ab c": ab_ | c
    expect(runs).toEqual([['1', '2', '3'], ['4']]);
  });

  it('should render an empty block keeping its height', async () => {
    const { host } = await setup({ block: { index: 0, segments: [] } });
    const segments = host.querySelector('.segments') as HTMLElement;
    expect(segments.style.minHeight).toBe('28px');
  });
});
