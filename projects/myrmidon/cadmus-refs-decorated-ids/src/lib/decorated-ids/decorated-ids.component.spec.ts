import { render } from '@testing-library/angular';

import { DecoratedIdsComponent } from './decorated-ids.component';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';

// the signal-forms FieldTree tags each array-of-object item it adopts
// with a hidden identity Symbol (see signal-forms-migration.md); strip it
// via a JSON round-trip before comparing array-field reads with toEqual.
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

describe('DecoratedIdsComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize form controls', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;
    expect(component.idForm).toBeDefined();
    expect(component.form).toBeDefined();
    expect(component.defaultPicker()).toBe('citation');
    expect(component.editedIndex()).toBe(-1);
    expect(component.edited()).toBeUndefined();
  });

  it('should populate editedIds and mark form pristine when ids are set', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;
    const ids = [{ id: 'id1' }, { id: 'id2' }];

    component.ids.set(ids);
    fixture.detectChanges();

    expect(clean(component.form.editedIds().value())).toEqual(ids);
    expect(component.form().dirty()).toBe(false);
  });

  it('should reset the form when ids is set to undefined', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;

    component.ids.set([{ id: 'id1' }]);
    fixture.detectChanges();

    component.ids.set(undefined);
    fixture.detectChanges();

    expect(clean(component.form.editedIds().value())).toEqual([]);
  });

  it('should close any open editor when ids changes', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;

    component.addId();
    expect(component.edited()).toBeDefined();

    component.ids.set([{ id: 'x' }]);
    fixture.detectChanges();

    expect(component.edited()).toBeUndefined();
    expect(component.editedIndex()).toBe(-1);
    expect(component.idForm().disabled()).toBe(true);
  });

  it('should open the editor for a new id via addId', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;

    component.addId();

    expect(component.editedIndex()).toBe(-1);
    expect(component.edited()).toEqual({ id: '' });
    expect(component.idForm().disabled()).toBe(false);
    expect(component.idForm.id().value()).toBe('');
    expect(component.idForm.rank().value()).toBe(0);
    expect(component.idForm.tag().value()).toBe('');
    expect(component.idForm.sources().value()).toEqual([]);
  });

  it('should open the editor for an existing id via editId', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;
    const refs: DocReference[] = [{ citation: 'c1' }];
    component.ids.set([
      { id: 'id1', rank: 2, tag: 'tag1', sources: refs },
      { id: 'id2' },
    ]);
    fixture.detectChanges();

    component.editId(0);

    expect(component.editedIndex()).toBe(0);
    expect(component.edited()).toEqual({
      id: 'id1',
      rank: 2,
      tag: 'tag1',
      sources: refs,
    });
    expect(component.idForm.id().value()).toBe('id1');
    expect(component.idForm.rank().value()).toBe(2);
    expect(component.idForm.tag().value()).toBe('tag1');
    expect(component.idForm.sources().value()).toEqual(refs);
  });

  it('should default rank to 0 and tag to empty when editing an id without them', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;
    component.ids.set([{ id: 'id1' }]);
    fixture.detectChanges();

    component.editId(0);

    expect(component.idForm.rank().value()).toBe(0);
    expect(component.idForm.tag().value()).toBe('');
    expect(component.idForm.sources().value()).toEqual([]);
  });

  it('should close the id editor via closeEditedId', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;

    component.addId();
    component.closeEditedId();

    expect(component.edited()).toBeUndefined();
    expect(component.editedIndex()).toBe(-1);
    expect(component.idForm().disabled()).toBe(true);
  });

  it('should not save an invalid id (required field empty)', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;

    component.addId();
    // id is required and left empty
    component.saveEditedId();

    expect(clean(component.form.editedIds().value())).toEqual([]);
    // editor remains open since save was rejected
    expect(component.edited()).toBeDefined();
  });

  it('should add a new valid id and close the editor on save', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;

    component.addId();
    component.idForm.id().value.set('  id1  ');
    component.idForm.rank().value.set(3);
    component.idForm.tag().value.set('  tag1  ');
    component.saveEditedId();

    expect(clean(component.form.editedIds().value())).toEqual([
      { id: 'id1', rank: 3, tag: 'tag1', sources: undefined },
    ]);
    expect(component.edited()).toBeUndefined();
  });

  it('should not add a duplicate id when adding a new one', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;
    component.ids.set([{ id: 'id1' }]);
    fixture.detectChanges();

    component.addId();
    component.idForm.id().value.set('id1');
    component.saveEditedId();

    expect(clean(component.form.editedIds().value())).toEqual([{ id: 'id1' }]);
  });

  it('should allow saving an edited id even if its id is unchanged (not a duplicate of itself)', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;
    component.ids.set([{ id: 'id1', rank: 0 }]);
    fixture.detectChanges();

    component.editId(0);
    component.idForm.rank().value.set(9);
    component.saveEditedId();

    expect(clean(component.form.editedIds().value())).toEqual([
      { id: 'id1', rank: 9, tag: undefined, sources: undefined },
    ]);
  });

  it('should replace the id at its index when editing', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;
    component.ids.set([{ id: 'id1' }, { id: 'id2' }]);
    fixture.detectChanges();

    component.editId(1);
    component.idForm.id().value.set('id2-renamed');
    component.saveEditedId();

    expect(clean(component.form.editedIds().value())).toEqual([
      { id: 'id1' },
      { id: 'id2-renamed', rank: 0, tag: undefined, sources: undefined },
    ]);
  });

  it('should delete an id and close the editor', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;
    component.ids.set([{ id: 'id1' }, { id: 'id2' }]);
    fixture.detectChanges();

    component.editId(0);
    component.deleteId(0);

    expect(clean(component.form.editedIds().value())).toEqual([{ id: 'id2' }]);
    expect(component.edited()).toBeUndefined();
  });

  it('should move an id up', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;
    component.ids.set([{ id: 'id1' }, { id: 'id2' }]);
    fixture.detectChanges();

    component.moveIdUp(1);

    expect(clean(component.form.editedIds().value())).toEqual([
      { id: 'id2' },
      { id: 'id1' },
    ]);
  });

  it('should not move the first id up', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;
    component.ids.set([{ id: 'id1' }, { id: 'id2' }]);
    fixture.detectChanges();

    component.moveIdUp(0);

    expect(clean(component.form.editedIds().value())).toEqual([
      { id: 'id1' },
      { id: 'id2' },
    ]);
  });

  it('should move an id down', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;
    component.ids.set([{ id: 'id1' }, { id: 'id2' }]);
    fixture.detectChanges();

    component.moveIdDown(0);

    expect(clean(component.form.editedIds().value())).toEqual([
      { id: 'id2' },
      { id: 'id1' },
    ]);
  });

  it('should not move the last id down', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;
    component.ids.set([{ id: 'id1' }, { id: 'id2' }]);
    fixture.detectChanges();

    component.moveIdDown(1);

    expect(clean(component.form.editedIds().value())).toEqual([
      { id: 'id1' },
      { id: 'id2' },
    ]);
  });

  it('should update sources and mark the id form dirty on onSourcesChange', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;
    const refs: DocReference[] = [{ citation: 'c1' }];

    component.addId();
    component.onSourcesChange(refs);

    expect(component.idForm.sources().value()).toEqual(refs);
    expect(component.idForm().dirty()).toBe(true);
  });

  it('should propagate a valid non-empty list to the ids model via save', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;

    component.form.editedIds().value.set([{ id: 'id1' }]);
    component.save();

    expect(component.ids()).toEqual([{ id: 'id1' }]);
    expect(component.form().dirty()).toBe(false);
  });

  it('should not mark the form pristine when save is called with pristine=false', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;

    component.form.editedIds().value.set([{ id: 'id1' }]);
    component.form.editedIds().markAsDirty();
    component.save(false);

    expect(component.ids()).toEqual([{ id: 'id1' }]);
    expect(component.form().dirty()).toBe(true);
  });

  it('should refuse to save (and mark all as touched) when the list is empty, per the strict min-length validator', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;

    // starting ids is undefined; editedIds remains [] which fails the
    // strictMinLength(1) validator applied to it
    component.save();

    expect(component.form.editedIds().invalid()).toBe(true);
    expect(component.form.editedIds().touched()).toBe(true);
    // ids model is untouched since save bailed out early
    expect(component.ids()).toBeUndefined();
  });

  it('should autosave via the debounced valueChanges when editedIds changes validly', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;

    component.form.editedIds().value.set([{ id: 'id1' }]);
    await new Promise((resolve) => setTimeout(resolve, 600));
    fixture.detectChanges();

    expect(component.ids()).toEqual([{ id: 'id1' }]);
  });

  it('should not autosave while ids are being programmatically updated', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    const component = fixture.componentInstance;

    component.ids.set([{ id: 'ext1' }]);
    fixture.detectChanges();

    await new Promise((resolve) => setTimeout(resolve, 600));
    fixture.detectChanges();

    // still the externally set value - no spurious extra save occurred
    expect(component.ids()).toEqual([{ id: 'ext1' }]);
  });
});
