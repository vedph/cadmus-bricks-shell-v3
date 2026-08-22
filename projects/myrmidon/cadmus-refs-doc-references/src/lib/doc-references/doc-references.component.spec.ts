import { render } from '@testing-library/angular';

import { DocReferencesComponent, DocReference } from './doc-references.component';

describe('DocReferencesComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(DocReferencesComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start with an empty references list', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;
    expect(component.references()).toEqual([]);
    expect(component.refsArr.length).toBe(0);
  });

  it('should populate the form when references are set externally', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;
    const refs: DocReference[] = [
      { citation: 'c1', type: 't1', tag: 'g1', note: 'n1' },
      { citation: 'c2' },
    ];

    component.references.set(refs);
    fixture.detectChanges();

    expect(component.refsArr.length).toBe(2);
    expect(component.refsArr.at(0).value).toEqual({
      type: 't1',
      tag: 'g1',
      citation: 'c1',
      note: 'n1',
    });
    expect(component.refsArr.at(1).value).toEqual({
      type: null,
      tag: null,
      citation: 'c2',
      note: null,
    });
    expect(component.form.pristine).toBe(true);
  });

  it('should reset the form when references is set to a falsy value', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;

    component.references.set([{ citation: 'c1' }]);
    fixture.detectChanges();

    component.references.set(undefined as unknown as DocReference[]);
    fixture.detectChanges();

    expect(component.refsArr.length).toBe(0);
  });

  it('should add an empty reference row via addReference() with no argument', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;

    component.addReference();

    expect(component.refsArr.length).toBe(1);
    expect(component.references()).toEqual([
      { type: undefined, tag: undefined, citation: undefined, note: undefined },
    ]);
  });

  it('should add a reference with given data and emit it via the references model', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;

    component.addReference({
      citation: '  c1  ',
      type: '  t1  ',
      tag: '  g1  ',
      note: '  n1  ',
    });

    expect(component.references()).toEqual([
      { type: 't1', tag: 'g1', citation: 'c1', note: 'n1' },
    ]);
  });

  it('should not duplicate rows when the outbound save loops back (drop-next-input guard)', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;

    component.addReference({ citation: 'c1' });
    fixture.detectChanges();

    expect(component.refsArr.length).toBe(1);
  });

  it('should remove a reference and save', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;
    component.references.set([{ citation: 'c1' }, { citation: 'c2' }]);
    fixture.detectChanges();

    component.removeReference(0);

    expect(component.refsArr.length).toBe(1);
    expect(component.references()).toEqual([
      { type: undefined, tag: undefined, citation: 'c2', note: undefined },
    ]);
  });

  it('should move a reference up', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;
    component.references.set([{ citation: 'c1' }, { citation: 'c2' }]);
    fixture.detectChanges();

    component.moveReferenceUp(1);

    expect(component.references()).toEqual([
      { type: undefined, tag: undefined, citation: 'c2', note: undefined },
      { type: undefined, tag: undefined, citation: 'c1', note: undefined },
    ]);
  });

  it('should not move the first reference up', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;
    component.references.set([{ citation: 'c1' }, { citation: 'c2' }]);
    fixture.detectChanges();

    component.moveReferenceUp(0);

    expect(component.references()).toEqual([
      { type: undefined, tag: undefined, citation: 'c1', note: undefined },
      { type: undefined, tag: undefined, citation: 'c2', note: undefined },
    ]);
  });

  it('should move a reference down', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;
    component.references.set([{ citation: 'c1' }, { citation: 'c2' }]);
    fixture.detectChanges();

    component.moveReferenceDown(0);

    expect(component.references()).toEqual([
      { type: undefined, tag: undefined, citation: 'c2', note: undefined },
      { type: undefined, tag: undefined, citation: 'c1', note: undefined },
    ]);
  });

  it('should not move the last reference down', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;
    component.references.set([{ citation: 'c1' }, { citation: 'c2' }]);
    fixture.detectChanges();

    component.moveReferenceDown(1);

    expect(component.references()).toEqual([
      { type: undefined, tag: undefined, citation: 'c1', note: undefined },
      { type: undefined, tag: undefined, citation: 'c2', note: undefined },
    ]);
  });

  it('should keep row subscriptions aligned with their row after reordering (edits still autosave)', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;
    component.references.set([{ citation: 'c1' }, { citation: 'c2' }]);
    fixture.detectChanges();

    component.moveReferenceUp(1); // now order is c2, c1

    const g = component.refsArr.at(0) as any;
    g.controls['citation'].setValue('c2-edited');

    await new Promise((resolve) => setTimeout(resolve, 400));
    fixture.detectChanges();

    expect(component.references()).toEqual([
      { type: undefined, tag: undefined, citation: 'c2-edited', note: undefined },
      { type: undefined, tag: undefined, citation: 'c1', note: undefined },
    ]);
  });

  it('should clear all references and save', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;
    component.references.set([{ citation: 'c1' }, { citation: 'c2' }]);
    fixture.detectChanges();

    component.clearReferences();

    expect(component.refsArr.length).toBe(0);
    expect(component.references()).toEqual([]);
  });

  it('should autosave a row edit after the debounce period', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;
    component.addReference({ citation: 'c1' });
    fixture.detectChanges();

    const g = component.refsArr.at(0) as any;
    g.controls['note'].setValue('edited note');

    await new Promise((resolve) => setTimeout(resolve, 400));
    fixture.detectChanges();

    expect(component.references()).toEqual([
      { type: undefined, tag: undefined, citation: 'c1', note: 'edited note' },
    ]);
  });

  it('should unsubscribe row and author subscriptions on destroy without throwing', async () => {
    const { fixture } = await render(DocReferencesComponent);
    const component = fixture.componentInstance;
    component.addReference({ citation: 'c1' });
    fixture.detectChanges();

    expect(() => fixture.destroy()).not.toThrow();
  });
});
