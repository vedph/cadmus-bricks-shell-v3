import { render } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AssertionComponent } from './assertion.component';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';

describe('AssertionComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize form controls with defaults', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    expect(component.tag.value).toBeNull();
    expect(component.rank.value).toBe(0);
    expect(component.note.value).toBeNull();
    expect(component.references.value).toEqual([]);
    expect(component.defaultPicker()).toBe('citation');
    expect(component.visualExpanded()).toBe(false);
  });

  it('should update the form when an assertion is set externally', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    const refs: DocReference[] = [{ citation: 'c1' }];

    component.assertion.set({ tag: 'tag1', rank: 3, note: 'note1', references: refs });
    fixture.detectChanges();

    expect(component.tag.value).toBe('tag1');
    expect(component.rank.value).toBe(3);
    expect(component.note.value).toBe('note1');
    expect(component.references.value).toEqual(refs);
  });

  it('should reset the form when the assertion is set to undefined', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;

    component.assertion.set({ tag: 'tag1', rank: 3, note: 'note1' });
    fixture.detectChanges();

    component.assertion.set(undefined);
    fixture.detectChanges();

    expect(component.tag.value).toBeNull();
    expect(component.rank.value).toBe(0);
    expect(component.note.value).toBeNull();
    expect(component.references.value).toEqual([]);
  });

  it('should treat missing tag/note in the assertion as null form values', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;

    component.assertion.set({ rank: 1 });
    fixture.detectChanges();

    expect(component.tag.value).toBeNull();
    expect(component.note.value).toBeNull();
    expect(component.references.value).toEqual([]);
  });

  it('should build and set the assertion from form values on saveAssertion', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;

    component.tag.setValue('  t1  ');
    component.rank.setValue(2);
    component.note.setValue('  n1  ');
    component.saveAssertion();

    expect(component.assertion()).toEqual({
      tag: 't1',
      rank: 2,
      note: 'n1',
      references: undefined,
    });
  });

  it('should trim tag and note', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;

    component.tag.setValue('  spaced  ');
    component.rank.setValue(1);
    component.saveAssertion();

    expect(component.assertion()?.tag).toBe('spaced');
  });

  it('should set assertion to undefined when all fields are empty', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;

    component.saveAssertion();

    expect(component.assertion()).toBeUndefined();
  });

  it('should keep the assertion defined when only references are set', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    const refs: DocReference[] = [{ citation: 'c1' }];

    component.references.setValue(refs);
    component.saveAssertion();

    expect(component.assertion()).toEqual({
      tag: undefined,
      rank: 0,
      note: undefined,
      references: refs,
    });
  });

  it('should update references and save on onReferencesChange', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;
    const refs: DocReference[] = [{ citation: 'c1' }, { citation: 'c2' }];

    component.tag.setValue('t');
    component.onReferencesChange(refs);

    expect(component.references.value).toEqual(refs);
    expect(component.assertion()?.references).toEqual(refs);
  });

  it('should autosave via the debounced valueChanges when the user edits a control', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;

    component.tag.setValue('user-typed');
    // wait past the 300ms debounce
    await new Promise((resolve) => setTimeout(resolve, 400));
    fixture.detectChanges();

    expect(component.assertion()?.tag).toBe('user-typed');
  });

  it('should not autosave a debounced no-op after an externally set assertion', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    const component = fixture.componentInstance;

    // an external, untrimmed tag - if the debounced valueChanges handler
    // fires (bug), it would silently overwrite this with a trimmed value
    component.assertion.set({ tag: '  untrimmed  ', rank: 1 });
    fixture.detectChanges();

    await new Promise((resolve) => setTimeout(resolve, 400));
    fixture.detectChanges();

    expect(component.assertion()?.tag).toBe('  untrimmed  ');
  });

  it('should unsubscribe on destroy without throwing', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    expect(() => fixture.destroy()).not.toThrow();
  });
});
