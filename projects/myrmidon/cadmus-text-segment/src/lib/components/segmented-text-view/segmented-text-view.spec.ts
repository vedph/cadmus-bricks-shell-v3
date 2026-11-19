import { fireEvent, render, screen } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import {
  TEXT_SEGMENTER,
  TextSegmentClick,
  TextSegmentSelection,
  TextSegmentBlock,
} from '../../models';
import { SpacedTextSegmenter } from '../../services/spaced-text-segmenter';
import {
  SEGMENTED_TEXT_COORDS_DEBOUNCE,
  SegmentedTextView,
} from './segmented-text-view';

// IDs: a=1 l=2 p=3 h=4 a=5 _=6 b=7 e=8 t=9 a=10 (LF=11) g=12 a=13 m=14 m=15 a=16
const SEGMENTER = new SpacedTextSegmenter();
const BLOCKS = SEGMENTER.getBlocks('alpha beta\ngamma');

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setup(
  inputs: Record<string, unknown> = {},
  options: { injectSegmenter?: boolean } = {},
) {
  const changes: TextSegmentSelection[] = [];
  const result = await render(SegmentedTextView, {
    inputs: { blocks: BLOCKS, ...inputs },
    on: {
      selectionChange: (e: TextSegmentSelection) => changes.push(e),
    },
    providers: [
      provideNoopAnimations(),
      ...(options.injectSegmenter
        ? [{ provide: TEXT_SEGMENTER, useValue: SEGMENTER }]
        : []),
    ],
  });
  await result.fixture.whenStable();
  const host = result.fixture.nativeElement as HTMLElement;
  const seg = (id: number) =>
    host.querySelector(`[data-seg-id="${id}"]`) as HTMLElement;
  const viewport = host.querySelector('.viewport') as HTMLElement;
  const selectedIds = () =>
    [...host.querySelectorAll('[data-seg-id].selected')].map((e) =>
      Number(e.getAttribute('data-seg-id')),
    );
  const settle = async () => {
    result.fixture.detectChanges();
    await result.fixture.whenStable();
  };
  return {
    ...result,
    host,
    component: result.fixture.componentInstance,
    changes,
    seg,
    viewport,
    selectedIds,
    settle,
  };
}

describe('SegmentedTextView', () => {
  describe('rendering', () => {
    it('should render all blocks and segments', async () => {
      const { host } = await setup();
      expect(screen.getAllByRole('group').length).toBe(2);
      expect(host.querySelectorAll('[data-seg-id]').length).toBe(15);
    });

    it('should render the empty state', async () => {
      await setup({ blocks: [] });
      expect(screen.getByText('no text')).toBeTruthy();
    });

    it('should apply settings to segments', async () => {
      const { host } = await setup({ settings: { showIdBox: true } });
      expect(host.querySelectorAll('.id-rect').length).toBe(15);
    });

    it('should re-render when blocks change', async () => {
      const { host, rerender } = await setup();
      await rerender({
        partialUpdate: true,
        inputs: { blocks: SEGMENTER.getBlocks('xyz') },
      });
      expect(host.querySelectorAll('[data-seg-id]').length).toBe(3);
    });

    it('should hide the coordinates without a segmenter', async () => {
      await setup();
      expect(screen.queryByLabelText('coordinates')).toBeNull();
    });

    it('should show the coordinates with an injected segmenter', async () => {
      await setup({}, { injectSegmenter: true });
      expect(screen.getByLabelText('coordinates')).toBeTruthy();
    });

    it('should hide toolbar parts on request', async () => {
      await setup({ showZoom: false, showFind: false, segmenter: SEGMENTER });
      expect(screen.queryByLabelText('find')).toBeNull();
      expect(screen.queryByLabelText('zoom')).toBeNull();
      expect(screen.getByLabelText('coordinates')).toBeTruthy();
    });
  });

  describe('pointer selection', () => {
    it('should select a segment on click and emit', async () => {
      const { seg, selectedIds, changes, component } = await setup();
      fireEvent.pointerDown(seg(2), { button: 0 });
      fireEvent.pointerUp(seg(2), { button: 0 });
      expect(selectedIds()).toEqual([2]);
      expect(changes.length).toBe(1);
      expect(changes[0].ids).toEqual([2]);
      expect(changes[0].segments[0].value).toBe('l');
      expect(component.selectedIds()).toEqual([2]);
    });

    it('should select by dragging, emitting once at the end', async () => {
      const { seg, viewport, selectedIds, changes } = await setup();
      fireEvent.pointerDown(seg(2), { button: 0 });
      fireEvent.pointerMove(seg(4));
      fireEvent.pointerMove(seg(8));
      expect(changes.length).toBe(0);
      fireEvent.pointerUp(viewport);
      expect(selectedIds()).toEqual([2, 3, 4, 5, 6, 7, 8]);
      expect(changes.length).toBe(1);
    });

    it('should extend with shift+click', async () => {
      const { seg, selectedIds, changes } = await setup();
      fireEvent.pointerDown(seg(13), { button: 0 });
      fireEvent.pointerUp(seg(13));
      fireEvent.pointerDown(seg(9), { button: 0, shiftKey: true });
      fireEvent.pointerUp(seg(9));
      expect(selectedIds()).toEqual([9, 10, 12, 13]);
      expect(changes.length).toBe(2);
    });

    it('should clear the previous selection on a new one', async () => {
      const { seg, selectedIds } = await setup();
      fireEvent.pointerDown(seg(2), { button: 0 });
      fireEvent.pointerMove(seg(4));
      fireEvent.pointerUp(seg(4));
      fireEvent.pointerDown(seg(14), { button: 0 });
      fireEvent.pointerUp(seg(14));
      expect(selectedIds()).toEqual([14]);
    });

    it('should ignore non-primary buttons', async () => {
      const { seg, selectedIds } = await setup();
      fireEvent.pointerDown(seg(2), { button: 2 });
      fireEvent.pointerUp(seg(2), { button: 2 });
      expect(selectedIds()).toEqual([]);
    });

    it('should not select a wrapped segment alone', async () => {
      const { seg, selectedIds, changes } = await setup();
      fireEvent.pointerDown(seg(6), { button: 0 });
      fireEvent.pointerUp(seg(6));
      expect(selectedIds()).toEqual([]);
      expect(changes.length).toBe(0);
    });

    it('should stop dragging before blocked segments', async () => {
      const blocks: TextSegmentBlock[] = [
        {
          index: 0,
          segments: [
            { id: 1, index: 0, value: 'a' },
            { id: 2, index: 1, value: '|', selectionMode: 'blocked' },
            { id: 3, index: 2, value: 'b' },
          ],
        },
      ];
      const { seg, selectedIds } = await setup({ blocks });
      fireEvent.pointerDown(seg(1), { button: 0 });
      fireEvent.pointerMove(seg(3));
      fireEvent.pointerUp(seg(3));
      expect(selectedIds()).toEqual([1]);
    });
  });

  describe('segment click', () => {
    const BLOCKED: TextSegmentBlock[] = [
      {
        index: 0,
        segments: [
          { id: 1, index: 0, value: 'a' },
          { id: 2, index: 1, value: 'b', selectionMode: 'blocked' },
          { id: 3, index: 2, value: 'c' },
        ],
      },
    ];

    async function setupClicks(inputs: Record<string, unknown> = {}) {
      const s = await setup(inputs);
      const clicks: TextSegmentClick[] = [];
      s.component.segmentClick.subscribe((e) => clicks.push(e));
      return { ...s, clicks };
    }

    it('should emit a click on a selectable segment', async () => {
      const { seg, clicks, selectedIds } = await setupClicks();
      fireEvent.pointerDown(seg(2), { button: 0 });
      fireEvent.pointerUp(seg(2), { button: 0 });
      expect(clicks.map((c) => c.segment.id)).toEqual([2]);
      expect(clicks[0].event.type).toBe('pointerup');
      expect(selectedIds()).toEqual([2]);
    });

    it('should emit a click on a blocked segment, without selecting', async () => {
      const { seg, clicks, selectedIds, changes } = await setupClicks({
        blocks: BLOCKED,
      });
      fireEvent.pointerDown(seg(2), { button: 0 });
      fireEvent.pointerUp(seg(2), { button: 0 });
      expect(clicks.map((c) => c.segment.id)).toEqual([2]);
      expect(selectedIds()).toEqual([]);
      expect(changes.length).toBe(0);
    });

    it('should clear the selection when clicking a blocked segment', async () => {
      const { seg, clicks, selectedIds, changes } = await setupClicks({
        blocks: BLOCKED,
      });
      fireEvent.pointerDown(seg(1), { button: 0 });
      fireEvent.pointerUp(seg(1), { button: 0 });
      expect(selectedIds()).toEqual([1]);
      fireEvent.pointerDown(seg(2), { button: 0 });
      fireEvent.pointerUp(seg(2), { button: 0 });
      expect(selectedIds()).toEqual([]);
      expect(changes.map((c) => c.ids)).toEqual([[1], []]);
      expect(clicks.map((c) => c.segment.id)).toEqual([1, 2]);
    });

    it('should not emit a click when released on another segment', async () => {
      const { seg, clicks } = await setupClicks();
      fireEvent.pointerDown(seg(2), { button: 0 });
      fireEvent.pointerMove(seg(4));
      fireEvent.pointerUp(seg(4), { button: 0 });
      expect(clicks.length).toBe(0);
    });

    it('should not emit a click on pointer cancel', async () => {
      const { seg, clicks } = await setupClicks();
      fireEvent.pointerDown(seg(2), { button: 0 });
      fireEvent.pointerCancel(seg(2));
      expect(clicks.length).toBe(0);
    });

    it('should not emit a click for non-primary buttons', async () => {
      const { seg, clicks } = await setupClicks();
      fireEvent.pointerDown(seg(2), { button: 2 });
      fireEvent.pointerUp(seg(2), { button: 2 });
      expect(clicks.length).toBe(0);
    });
  });

  describe('keyboard selection', () => {
    it('should move the caret with arrows', async () => {
      const { viewport, selectedIds, seg } = await setup();
      viewport.focus();
      fireEvent.keyDown(viewport, { key: 'ArrowRight' });
      expect(selectedIds()).toEqual([1]);
      expect(seg(1).classList).toContain('caret');
      fireEvent.keyDown(viewport, { key: 'ArrowRight' });
      expect(selectedIds()).toEqual([2]);
    });

    it('should extend with shift+arrows', async () => {
      const { viewport, selectedIds, seg, changes } = await setup();
      fireEvent.pointerDown(seg(4), { button: 0 });
      fireEvent.pointerUp(seg(4));
      fireEvent.keyDown(viewport, { key: 'ArrowRight', shiftKey: true });
      fireEvent.keyDown(viewport, { key: 'ArrowRight', shiftKey: true });
      expect(selectedIds()).toEqual([4, 5, 6, 7]);
      fireEvent.keyDown(viewport, { key: 'ArrowLeft', shiftKey: true });
      expect(selectedIds()).toEqual([4, 5]);
      expect(changes.length).toBe(4);
    });

    it('should move between blocks with up/down', async () => {
      const { viewport, selectedIds, seg } = await setup();
      fireEvent.pointerDown(seg(3), { button: 0 });
      fireEvent.pointerUp(seg(3));
      fireEvent.keyDown(viewport, { key: 'ArrowDown', shiftKey: true });
      expect(selectedIds()).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14]);
    });

    it('should select to the block end with shift+End', async () => {
      const { viewport, selectedIds, seg } = await setup();
      fireEvent.pointerDown(seg(7), { button: 0 });
      fireEvent.pointerUp(seg(7));
      fireEvent.keyDown(viewport, { key: 'End', shiftKey: true });
      expect(selectedIds()).toEqual([7, 8, 9, 10]);
    });

    it('should select all with ctrl+A and clear with Escape', async () => {
      const { viewport, selectedIds } = await setup();
      fireEvent.keyDown(viewport, { key: 'a', ctrlKey: true });
      expect(selectedIds().length).toBe(15);
      fireEvent.keyDown(viewport, { key: 'Escape' });
      expect(selectedIds()).toEqual([]);
    });

    it('should not handle unrelated keys', async () => {
      const { viewport, changes } = await setup();
      const notCanceled = fireEvent.keyDown(viewport, { key: 'x' });
      expect(notCanceled).toBe(true);
      expect(changes.length).toBe(0);
    });
  });

  describe('selectedIds model', () => {
    it('should select from the bound IDs', async () => {
      const { selectedIds, changes } = await setup({ selectedIds: [14, 12, 13] });
      expect(selectedIds()).toEqual([12, 13, 14]);
      // binding does not emit a user selection
      expect(changes.length).toBe(0);
    });

    it('should follow changes of the bound IDs', async () => {
      const { selectedIds, rerender, settle } = await setup({
        selectedIds: [1],
      });
      await rerender({ partialUpdate: true, inputs: { selectedIds: [2, 3] } });
      await settle();
      expect(selectedIds()).toEqual([2, 3]);
    });
  });

  describe('find', () => {
    it('should highlight matches within segments', async () => {
      const { host } = await setup();
      fireEvent.input(screen.getByLabelText('find'), {
        target: { value: 'a' },
      });
      const hits = [...host.querySelectorAll('.hit')].map((e) =>
        Number(e.getAttribute('data-seg-id')),
      );
      expect(hits).toEqual([1, 5, 10, 13, 16]);
      expect(screen.getByText('5 found')).toBeTruthy();
    });

    it('should report no match', async () => {
      await setup();
      fireEvent.input(screen.getByLabelText('find'), {
        target: { value: 'zz' },
      });
      expect(screen.getByText('no match')).toBeTruthy();
    });

    it('should find across segments when toggled', async () => {
      const { host } = await setup();
      fireEvent.click(screen.getByLabelText('find across segments'));
      fireEvent.input(screen.getByLabelText('find'), {
        target: { value: 'ta' },
      });
      const hits = [...host.querySelectorAll('.hit')].map((e) =>
        Number(e.getAttribute('data-seg-id')),
      );
      expect(hits).toEqual([9, 10]);
    });

    it('should go to matches with Enter, selecting them', async () => {
      const { selectedIds, changes } = await setup();
      const input = screen.getByLabelText('find');
      fireEvent.input(input, { target: { value: 'm' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(selectedIds()).toEqual([14]);
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(selectedIds()).toEqual([15]);
      expect(screen.getByText('2/2')).toBeTruthy();
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
      expect(selectedIds()).toEqual([14]);
      expect(changes.length).toBe(3);
    });

    it('should clear the matches', async () => {
      const { host } = await setup();
      fireEvent.input(screen.getByLabelText('find'), {
        target: { value: 'a' },
      });
      fireEvent.click(screen.getByLabelText('clear find'));
      expect(host.querySelectorAll('.hit').length).toBe(0);
    });
  });

  describe('coordinates', () => {
    it('should fill coordinates from the selection', async () => {
      const { seg, changes } = await setup({ segmenter: SEGMENTER });
      fireEvent.pointerDown(seg(8), { button: 0 });
      fireEvent.pointerMove(seg(9));
      fireEvent.pointerUp(seg(9));
      expect(
        (screen.getByLabelText('coordinates') as HTMLInputElement).value,
      ).toBe('1.2@2x2');
      expect(changes[0].coords).toBe('1.2@2x2');
    });

    it('should select from typed coordinates after debounce', async () => {
      const { selectedIds, changes, settle } = await setup({
        segmenter: SEGMENTER,
      });
      fireEvent.input(screen.getByLabelText('coordinates'), {
        target: { value: '2.1' },
      });
      expect(selectedIds()).toEqual([]);
      await wait(SEGMENTED_TEXT_COORDS_DEBOUNCE + 100);
      await settle();
      expect(selectedIds()).toEqual([12, 13, 14, 15, 16]);
      expect(changes.length).toBe(1);
      expect(changes[0].coords).toBe('2.1');
    });

    it('should flag invalid coordinates', async () => {
      const { selectedIds, settle } = await setup({ segmenter: SEGMENTER });
      fireEvent.input(screen.getByLabelText('coordinates'), {
        target: { value: '9.9' },
      });
      await wait(SEGMENTED_TEXT_COORDS_DEBOUNCE + 100);
      await settle();
      expect(screen.getByText('invalid coordinates')).toBeTruthy();
      expect(selectedIds()).toEqual([]);
    });
  });

  describe('zoom', () => {
    it('should start at 100% with reset disabled', async () => {
      const { host } = await setup();
      const content = host.querySelector('.content') as HTMLElement;
      expect(content.style.zoom).toBe('1');
      expect(
        (screen.getByLabelText('reset zoom') as HTMLButtonElement).disabled,
      ).toBe(true);
    });

    it('should zoom with ctrl+wheel and reset', async () => {
      const { host, viewport, component, settle } = await setup();
      fireEvent.wheel(viewport, { deltaY: -100, ctrlKey: true });
      await settle();
      expect(component.viewForm.zoom().value()).toBeCloseTo(1.1);
      const content = host.querySelector('.content') as HTMLElement;
      expect(content.style.zoom).toBe('1.1');
      fireEvent.click(screen.getByLabelText('reset zoom'));
      expect(component.viewForm.zoom().value()).toBe(1);
    });
  });

  describe('tip popup', () => {
    it('should show the tip popup on hover', async () => {
      const { seg, settle } = await setup({
        settings: {
          showTipBox: true,
          tipPosition: 'popup',
          tipTemplate: 'id={{$id}}',
        },
      });
      fireEvent.pointerOver(seg(3));
      await settle();
      const tip = await screen.findByRole('tooltip');
      expect(tip.textContent?.trim()).toBe('id=3');
    });

    it('should not show the popup when tips are disabled', async () => {
      const { seg, settle } = await setup({
        settings: { tipTemplate: 'id={{$id}}' },
      });
      fireEvent.pointerOver(seg(3));
      await settle();
      expect(screen.queryByRole('tooltip')).toBeNull();
    });
  });
});
