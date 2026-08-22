import { render } from '@testing-library/angular';
import { of } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { IndexLookupDefinitions } from '@myrmidon/cadmus-core';

import { AssertedIdsComponent } from './asserted-ids.component';
import { AssertedId } from '../asserted-id/asserted-id.component';
import { PinRefLookupService } from '../services/pin-ref-lookup.service';

const INDEX_LOOKUP_DEFINITIONS: IndexLookupDefinitions = {
  item_eid: {
    typeId: 'it.vedph.metadata',
    name: 'eid',
  },
};

function getProviders(dialogConfirm = vi.fn().mockReturnValue(of(true))) {
  return [
    { provide: DialogService, useValue: { confirm: dialogConfirm } },
    {
      provide: PinRefLookupService,
      useValue: {
        lookup: vi.fn().mockReturnValue(of([])),
        getName: vi.fn().mockReturnValue(''),
      },
    },
    {
      provide: 'indexLookupDefinitions',
      useValue: INDEX_LOOKUP_DEFINITIONS,
    },
  ];
}

describe('AssertedIdsComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedIdsComponent, {
      providers: getProviders(),
    });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start with an empty ids list and no editor open', async () => {
    const { fixture } = await render(AssertedIdsComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    expect(component.ids()).toEqual([]);
    expect(component.editedIndex()).toBe(-1);
    expect(component.edited()).toBeUndefined();
  });

  describe('editor lifecycle', () => {
    it('addId should open a new editor with an empty scope/value', async () => {
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;

      component.addId();

      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toEqual({ scope: '', value: '' });
    });

    it('editId should open the editor with a deep copy of the id', async () => {
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      const id: AssertedId = { scope: 's', value: 'v' };

      component.editId(id, 2);

      expect(component.editedIndex()).toBe(2);
      expect(component.edited()).toEqual(id);
      expect(component.edited()).not.toBe(id);
    });

    it('closeId should close the editor', async () => {
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;

      component.addId();
      component.closeId();

      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });

    it('onIdChange should save the id and close the editor', async () => {
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      const id: AssertedId = { scope: 's', value: 'v' };

      component.addId();
      component.onIdChange(id);

      expect(component.ids()).toEqual([id]);
      expect(component.edited()).toBeUndefined();
    });
  });

  describe('saveId', () => {
    it('should append a new id when adding', async () => {
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      const id: AssertedId = { scope: 's1', value: 'v1' };

      component.addId();
      component.saveId(id);

      expect(component.ids()).toEqual([id]);
      expect(component.editedIndex()).toBe(-1);
    });

    it('should replace the id at its index when editing', async () => {
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      const first: AssertedId = { scope: 's1', value: 'v1' };
      const second: AssertedId = { scope: 's2', value: 'v2' };
      component.ids.set([first]);
      fixture.detectChanges();

      component.editId(first, 0);
      component.saveId(second);

      expect(component.ids()).toEqual([second]);
    });
  });

  describe('deleteId', () => {
    it('should remove the id when the user confirms', async () => {
      const confirm = vi.fn().mockReturnValue(of(true));
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(confirm),
      });
      const component = fixture.componentInstance;
      component.ids.set([
        { scope: 's1', value: 'v1' },
        { scope: 's2', value: 'v2' },
      ]);
      fixture.detectChanges();

      component.deleteId(0);

      expect(confirm).toHaveBeenCalled();
      expect(component.ids()).toEqual([{ scope: 's2', value: 'v2' }]);
    });

    it('should not remove the id when the user cancels', async () => {
      const confirm = vi.fn().mockReturnValue(of(false));
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(confirm),
      });
      const component = fixture.componentInstance;
      component.ids.set([{ scope: 's1', value: 'v1' }]);
      fixture.detectChanges();

      component.deleteId(0);

      expect(component.ids()).toEqual([{ scope: 's1', value: 'v1' }]);
    });

    it('should close the editor when deleting the entry being edited', async () => {
      const confirm = vi.fn().mockReturnValue(of(true));
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(confirm),
      });
      const component = fixture.componentInstance;
      const id: AssertedId = { scope: 's1', value: 'v1' };
      component.ids.set([id]);
      fixture.detectChanges();

      component.editId(id, 0);
      component.deleteId(0);

      expect(component.edited()).toBeUndefined();
      expect(component.editedIndex()).toBe(-1);
    });
  });

  describe('reordering', () => {
    it('moveIdUp should swap with the previous entry', async () => {
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      const a: AssertedId = { scope: 'a', value: 'a' };
      const b: AssertedId = { scope: 'b', value: 'b' };
      component.ids.set([a, b]);
      fixture.detectChanges();

      component.moveIdUp(1);

      expect(component.ids()).toEqual([b, a]);
    });

    it('moveIdUp should be a no-op at index 0', async () => {
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      const a: AssertedId = { scope: 'a', value: 'a' };
      component.ids.set([a]);
      fixture.detectChanges();

      component.moveIdUp(0);

      expect(component.ids()).toEqual([a]);
    });

    it('moveIdDown should swap with the next entry', async () => {
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      const a: AssertedId = { scope: 'a', value: 'a' };
      const b: AssertedId = { scope: 'b', value: 'b' };
      component.ids.set([a, b]);
      fixture.detectChanges();

      component.moveIdDown(0);

      expect(component.ids()).toEqual([b, a]);
    });

    it('moveIdDown should be a no-op at the last index', async () => {
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      const a: AssertedId = { scope: 'a', value: 'a' };
      const b: AssertedId = { scope: 'b', value: 'b' };
      component.ids.set([a, b]);
      fixture.detectChanges();

      component.moveIdDown(1);

      expect(component.ids()).toEqual([a, b]);
    });
  });

  describe('template rendering', () => {
    it('should render a table row per id', async () => {
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      component.ids.set([
        { scope: 's1', value: 'v1' },
        { scope: 's2', value: 'v2' },
      ]);
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
    });

    it('should not render a table when there are no ids', async () => {
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(),
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('table')).toBeNull();
    });

    it('should render the editor when an id is being edited', async () => {
      const { fixture } = await render(AssertedIdsComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;

      component.addId();
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('cadmus-refs-asserted-id'),
      ).toBeTruthy();
    });
  });
});
