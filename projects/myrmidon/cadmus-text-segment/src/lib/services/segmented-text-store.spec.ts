import { SegmentedTextStore } from './segmented-text-store';
import { SpacedTextSegmenter } from './spaced-text-segmenter';

// IDs: a=1 l=2 p=3 h=4 a=5 _=6 b=7 e=8 t=9 a=10 (LF=11) g=12 a=13 m=14 m=15 a=16
const TEXT = 'alpha beta\ngamma';

function createStore(text = TEXT): SegmentedTextStore {
  const store = new SegmentedTextStore();
  store.setBlocks(new SpacedTextSegmenter().getBlocks(text));
  return store;
}

describe('SegmentedTextStore', () => {
  it('should flatten segments and map positions', () => {
    const store = createStore();
    expect(store.segments().length).toBe(15);
    expect(store.positions().get(12)).toBe(10);
  });

  it('should start a selection at a segment', () => {
    const store = createStore();
    expect(store.startAt(2)).toBe(true);
    expect(store.selectedIds()).toEqual([2]);
    expect(store.caretId()).toBe(2);
    // same again: no change
    expect(store.startAt(2)).toBe(false);
  });

  it('should extend the selection by dragging', () => {
    const store = createStore();
    store.startAt(4);
    store.extendTo(8);
    expect(store.selectedIds()).toEqual([4, 5, 6, 7, 8]);
    // backward from the same anchor
    store.extendTo(2);
    expect(store.selectedIds()).toEqual([2, 3, 4]);
  });

  it('should extend across blocks', () => {
    const store = createStore();
    store.startAt(9);
    store.extendTo(13);
    expect(store.selectedIds()).toEqual([9, 10, 12, 13]);
  });

  it('should extend with shift+click', () => {
    const store = createStore();
    store.startAt(1);
    store.startAt(3, true);
    expect(store.selectedIds()).toEqual([1, 2, 3]);
  });

  it('should not select a wrapped segment alone', () => {
    const store = createStore();
    store.startAt(6);
    expect(store.selectedIds()).toEqual([]);
    store.extendTo(8);
    expect(store.selectedIds()).toEqual([7, 8]);
  });

  it('should move the caret, collapsing the selection', () => {
    const store = createStore();
    store.startAt(5);
    expect(store.moveCaret(1)).toBe(true);
    // skips the space
    expect(store.selectedIds()).toEqual([7]);
    store.moveCaret(-1);
    expect(store.selectedIds()).toEqual([5]);
  });

  it('should start the caret from the text edge', () => {
    const store = createStore();
    store.moveCaret(1);
    expect(store.selectedIds()).toEqual([1]);
    store.clear();
    store.moveCaret(-1);
    expect(store.selectedIds()).toEqual([16]);
  });

  it('should extend and collapse with shift+arrows', () => {
    const store = createStore();
    store.startAt(4);
    store.moveCaret(1, true);
    expect(store.selectedIds()).toEqual([4, 5]);
    store.moveCaret(1, true);
    expect(store.selectedIds()).toEqual([4, 5, 6, 7]);
    store.moveCaret(-1, true);
    expect(store.selectedIds()).toEqual([4, 5]);
    store.moveCaret(-1, true);
    expect(store.selectedIds()).toEqual([4]);
    store.moveCaret(-1, true);
    expect(store.selectedIds()).toEqual([3, 4]);
  });

  it('should not move past the text end', () => {
    const store = createStore();
    store.startAt(16);
    expect(store.moveCaret(1)).toBe(false);
    expect(store.selectedIds()).toEqual([16]);
  });

  it('should move between blocks', () => {
    const store = createStore();
    store.startAt(3);
    store.moveBlock(1);
    expect(store.selectedIds()).toEqual([14]);
    store.moveBlock(-1);
    expect(store.selectedIds()).toEqual([3]);
  });

  it('should move to block edges', () => {
    const store = createStore();
    store.startAt(3);
    store.moveToBlockEdge('end', true);
    expect(store.selectedIds()).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    store.moveToBlockEdge('start');
    expect(store.selectedIds()).toEqual([1]);
  });

  it('should move to text edges', () => {
    const store = createStore();
    store.startAt(13);
    store.moveToTextEdge('start', true);
    expect(store.selectedIds()[0]).toBe(1);
    expect(store.selectedIds().at(-1)).toBe(13);
  });

  it('should select all', () => {
    const store = createStore();
    store.selectAll();
    expect(store.selectedIds().length).toBe(15);
  });

  it('should stop at blocked segments', () => {
    const store = new SegmentedTextStore();
    store.setBlocks([
      {
        index: 0,
        segments: [
          { id: 1, index: 0, value: 'a' },
          { id: 2, index: 1, value: '|', selectionMode: 'blocked' },
          { id: 3, index: 2, value: 'b' },
        ],
      },
    ]);
    store.startAt(1);
    store.extendTo(3);
    expect(store.selectedIds()).toEqual([1]);
    expect(store.moveCaret(1, true)).toBe(false);
    // plain caret moves skip it
    store.moveCaret(1);
    expect(store.selectedIds()).toEqual([3]);
    store.selectAll();
    expect(store.selectedIds()).toEqual([1]);
  });

  it('should set selected IDs sorted and filtered', () => {
    const store = createStore();
    expect(store.setSelectedIds([3, 1, 99, 2, 2])).toBe(true);
    expect(store.selectedIds()).toEqual([1, 2, 3]);
    expect(store.caretId()).toBe(3);
    expect(store.selectedSegments().map((s) => s.value)).toEqual([
      'a',
      'l',
      'p',
    ]);
  });

  it('should clear the selection', () => {
    const store = createStore();
    store.startAt(1);
    expect(store.clear()).toBe(true);
    expect(store.selectedIds()).toEqual([]);
    expect(store.caretId()).toBeNull();
    expect(store.clear()).toBe(false);
  });

  it('should keep the selection of surviving segments on new blocks', () => {
    const store = createStore();
    store.setSelectedIds([1, 2, 3]);
    const changed = store.setBlocks(new SpacedTextSegmenter().getBlocks('al'));
    expect(changed).toBe(true);
    expect(store.selectedIds()).toEqual([1, 2]);
  });

  it('should find and navigate matches', () => {
    const store = createStore();
    store.find.set({ query: 'a', crossSegments: false, caseSensitive: false });
    expect(store.matches().length).toBe(5);
    expect(store.hitSet().has(13)).toBe(true);
    expect(store.currentMatch()).toBe(-1);
    expect(store.goToMatch(1)).toEqual([1]);
    expect(store.selectedIds()).toEqual([1]);
    store.goToMatch(-1);
    expect(store.currentMatch()).toBe(4);
    expect(store.goToMatch(1)).toEqual([1]);
    // reset on new query
    store.find.update((f) => ({ ...f, query: 'b' }));
    expect(store.currentMatch()).toBe(-1);
  });

  it('should return null navigating without matches', () => {
    const store = createStore();
    expect(store.goToMatch(1)).toBeNull();
  });
});
