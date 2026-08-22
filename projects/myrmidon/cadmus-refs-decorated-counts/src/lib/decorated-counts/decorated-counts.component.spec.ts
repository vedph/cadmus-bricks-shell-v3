import { render } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { DecoratedCountsComponent } from './decorated-counts.component';

describe('DecoratedCountsComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should initialize form controls', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    expect(component.id).toBeDefined();
    expect(component.hasCustom).toBeDefined();
    expect(component.custom).toBeDefined();
    expect(component.batch).toBeDefined();
    expect(component.form).toBeDefined();
    expect(component.tag).toBeDefined();
    expect(component.value).toBeDefined();
    expect(component.note).toBeDefined();
    expect(component.editedForm).toBeDefined();
  });

  it('should disable id control when hasCustom is true', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.hasCustom.setValue(true);
    expect(component.id.disabled).toBeTruthy();
  });

  it('should enable id control when hasCustom is false', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.hasCustom.setValue(false);
    expect(component.id.enabled).toBeTruthy();
  });

  it('should add a custom count', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.custom.setValue('custom-id');
    component.addCustomCount();
    expect(component.edited()).toEqual({ id: 'custom-id', value: 0 });
  });

  it('should add a count', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.id.setValue('test-id');
    component.addCount();
    expect(component.edited()).toEqual({ id: 'test-id', value: 0 });
  });

  it('should save a count', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.edited.set({ id: 'test-id', value: 0 });
    component.value.setValue(10);
    component.tag.setValue('test-tag');
    component.note.setValue('test-note');
    component.saveCount();
    expect(component.counts()).toContainEqual({
      id: 'test-id',
      value: 10,
      tag: 'test-tag',
      note: 'test-note',
    });
  });

  it('should delete a count', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.counts.set([{ id: 'test-id', value: 10 }]);
    component.deleteCount(0);
    expect(component.counts()).toEqual([]);
  });

  it('should move a count up', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.counts.set([
      { id: 'id1', value: 10 },
      { id: 'id2', value: 20 },
    ]);
    component.moveCountUp(1);
    expect(component.counts()).toEqual([
      { id: 'id2', value: 20 },
      { id: 'id1', value: 10 },
    ]);
  });

  it('should move a count down', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.counts.set([
      { id: 'id1', value: 10 },
      { id: 'id2', value: 20 },
    ]);
    component.moveCountDown(0);
    expect(component.counts()).toEqual([
      { id: 'id2', value: 20 },
      { id: 'id1', value: 10 },
    ]);
  });

  it('should not move the first count up', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.counts.set([
      { id: 'id1', value: 10 },
      { id: 'id2', value: 20 },
    ]);
    component.moveCountUp(0);
    expect(component.counts()).toEqual([
      { id: 'id1', value: 10 },
      { id: 'id2', value: 20 },
    ]);
  });

  it('should not move the last count down', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.counts.set([
      { id: 'id1', value: 10 },
      { id: 'id2', value: 20 },
    ]);
    component.moveCountDown(1);
    expect(component.counts()).toEqual([
      { id: 'id1', value: 10 },
      { id: 'id2', value: 20 },
    ]);
  });

  it('should not add a count when id is empty', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.id.setValue(null);
    component.addCount();
    expect(component.edited()).toBeUndefined();
  });

  it('should not add a custom count when custom is empty', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.custom.setValue(null);
    component.addCustomCount();
    expect(component.edited()).toBeUndefined();
  });

  it('should delegate addCount to addCustomCount when hasCustom is true', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.hasCustom.setValue(true);
    component.custom.setValue('custom-id');
    component.addCount();
    expect(component.edited()).toEqual({ id: 'custom-id', value: 0 });
  });

  it('should edit an existing count and populate the edited form', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.counts.set([
      { id: 'id1', value: 10, tag: 'tag1', note: 'note1' },
    ]);
    component.editCount(0);
    expect(component.editedIndex()).toBe(0);
    expect(component.edited()).toEqual({
      id: 'id1',
      value: 10,
      tag: 'tag1',
      note: 'note1',
    });
    expect(component.value.value).toBe(10);
    expect(component.tag.value).toBe('tag1');
    expect(component.note.value).toBe('note1');
  });

  it('should close the edited count', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.counts.set([{ id: 'id1', value: 10 }]);
    component.editCount(0);
    component.closeCount();
    expect(component.editedIndex()).toBe(-1);
    expect(component.edited()).toBeUndefined();
  });

  it('should update an existing count on saveCount when editing', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.counts.set([{ id: 'id1', value: 10 }]);
    component.editCount(0);
    component.value.setValue(99);
    component.saveCount();
    expect(component.counts()).toEqual([{ id: 'id1', value: 99 }]);
    // editor is closed after saving
    expect(component.edited()).toBeUndefined();
  });

  it('should not save a count that is an exact duplicate of another', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.counts.set([
      { id: 'id1', value: 10 },
      { id: 'id2', value: 20 },
    ]);
    // trying to save a new count that exactly duplicates the existing id1 entry
    component.edited.set({ id: 'id1', value: 0 });
    component.editedIndex.set(-1);
    component.value.setValue(10);
    component.saveCount();
    // count should remain unchanged (2 items), since {id1,10} already exists
    expect(component.counts()).toEqual([
      { id: 'id1', value: 10 },
      { id: 'id2', value: 20 },
    ]);
  });

  it('should trim tag and note when saving, and treat blank as undefined', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.edited.set({ id: 'id1', value: 0 });
    component.value.setValue(5);
    component.tag.setValue('  spaced-tag  ');
    component.note.setValue('');
    component.saveCount();
    expect(component.counts()).toEqual([
      { id: 'id1', value: 5, tag: 'spaced-tag', note: undefined },
    ]);
  });

  it('should remove an existing count with same ID when distinct is true', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
      inputs: { distinct: true },
    });
    const component = fixture.componentInstance;
    component.counts.set([{ id: 'id1', value: 10 }]);
    // add a new count (not editing an existing index) with the same id
    component.edited.set({ id: 'id1', value: 0 });
    component.editedIndex.set(-1);
    component.value.setValue(50);
    component.saveCount();
    // only the new value should remain, old one removed because distinct
    expect(component.counts()).toEqual([{ id: 'id1', value: 50 }]);
  });

  it('should parse and add batch counts', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.batch.setValue('id1=10 [tag1] (note1); id2=20');
    component.addBatchCounts();
    expect(component.counts()).toEqual([
      { id: 'id1', value: 10, tag: 'tag1', note: 'note1' },
      { id: 'id2', value: 20, tag: undefined, note: undefined },
    ]);
  });

  it('should do nothing when batch is empty', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    component.batch.setValue('   ');
    component.addBatchCounts();
    expect(component.counts()).toBeUndefined();
  });

  it('should replace existing counts with the same ID in batch when distinct is true', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
      inputs: { distinct: true },
    });
    const component = fixture.componentInstance;
    component.counts.set([{ id: 'id1', value: 1 }]);
    component.batch.setValue('id1=99');
    component.addBatchCounts();
    expect(component.counts()).toEqual([{ id: 'id1', value: 99 }]);
  });

  it('should default allowCustomId to true', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    expect(component.allowCustomId()).toBe(true);
  });

  it('should reflect a custom allowCustomId input value', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
      inputs: { allowCustomId: false },
    });
    const component = fixture.componentInstance;
    expect(component.allowCustomId()).toBe(false);
  });

  it('should unsubscribe on destroy without throwing', async () => {
    const { fixture } = await render(DecoratedCountsComponent, {
      providers: [provideNoopAnimations()],
    });
    expect(() => fixture.destroy()).not.toThrow();
  });
});
