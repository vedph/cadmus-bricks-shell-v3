import { vi } from 'vitest';
import { render } from '@testing-library/angular';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { RamStorageService } from '@myrmidon/ngx-tools';

import {
  AssertedCompositeIdComponent,
  TAXONOMY_GID_PREFIX,
} from './asserted-composite-id.component';
import { PinRefLookupService } from '../services/pin-ref-lookup.service';

function getProviders() {
  return [
    provideHttpClientTesting(),
    {
      provide: PinRefLookupService,
      useValue: {
        lookup: vi.fn(),
        getName: vi.fn().mockReturnValue(''),
      },
    },
    {
      provide: 'indexLookupDefinitions',
      useValue: {},
    },
    {
      provide: RamStorageService,
      useValue: {
        retrieve: vi.fn(),
      },
    },
  ];
}

describe('AssertedCompositeIdComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize the form with default (unset) state', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    expect(component.form.target().value()).toBeNull();
    expect(component.form.scope().value()).toBe('');
    expect(component.form.tag().value()).toBe('');
    expect(component.form.features().value()).toEqual([]);
    expect(component.form.note().value()).toBe('');
    expect(component.form.assertion().value()).toBeNull();
    expect(component.targetMode()).toBe('internal');
  });

  it('cancel should emit editorClose', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.editorClose.subscribe(spy);

    component.cancel();

    expect(spy).toHaveBeenCalled();
  });

  it('save should not set the id when the form is invalid', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    // target is required and left empty
    component.save();

    expect(component.id()).toBeUndefined();
  });

  it('save should set the id when the form is valid', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    component.form.target().value.set({ gid: 'g1', label: 'l1' });
    component.save();

    expect(component.id()).toEqual({
      target: { gid: 'g1', label: 'l1' },
      scope: '',
      tag: undefined,
      features: undefined,
      note: undefined,
      assertion: undefined,
    });
  });

  it('onAssertionChange should update the assertion control', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    component.onAssertionChange({ rank: 2 } as any);
    expect(component.form.assertion().value()).toEqual({ rank: 2 });

    component.onAssertionChange(undefined);
    expect(component.form.assertion().value()).toBeNull();
  });

  it('onEntriesChange should update the features control with entry ids', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    component.onEntriesChange([
      { id: 'f1', value: 'Feature 1' } as any,
      { id: 'f2', value: 'Feature 2' } as any,
    ]);

    expect(component.form.features().value()).toEqual(['f1', 'f2']);
    expect(component.form.features().dirty()).toBe(true);
  });

  it('onTargetChange should update the target control and collapse the panel when valid', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    component.targetExpanded.set(true);

    component.onTargetChange({ gid: 'g1', label: 'l1' });

    expect(component.form.target().value()).toEqual({ gid: 'g1', label: 'l1' });
    expect(component.targetExpanded()).toBe(false);
  });

  it('should detect a taxonomy target from its gid prefix when the id model is set', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    component.id.set({
      target: { gid: `${TAXONOMY_GID_PREFIX}animals/dog`, label: 'Dog' },
    });
    fixture.detectChanges();

    expect(component.targetMode()).toBe('taxonomy');
  });

  it('onTargetModeChange should be a no-op when the mode is unchanged', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    // default mode is 'internal'
    component.onTargetModeChange('internal');

    expect(component.targetMode()).toBe('internal');
  });
});
