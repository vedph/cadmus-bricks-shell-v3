import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { RamStorageService } from '@myrmidon/ngx-tools';
import {
  AssertedCompositeId,
  PinRefLookupService,
} from '@myrmidon/cadmus-refs-asserted-ids';
import { ThesaurusService } from '@myrmidon/cadmus-api';

import {
  LinkEditorComponent,
  LinkEditorComponentData,
} from './link-editor.component';

/** Fake thesauri set, keyed like ThesaurusService.getThesauriSet's result. */
function makeThesauriSet() {
  return {
    'asserted-id-scopes': { id: 'asserted-id-scopes', entries: [{ id: 's1', value: 'Scope 1' }] },
    'asserted-id-tags': { id: 'asserted-id-tags', entries: [{ id: 't1', value: 'Tag 1' }] },
    'assertion-tags': { id: 'assertion-tags', entries: [{ id: 'a1', value: 'Ass 1' }] },
    'doc-reference-types': { id: 'doc-reference-types', entries: [{ id: 'rt1', value: 'RT 1' }] },
    'doc-reference-tags': { id: 'doc-reference-tags', entries: [{ id: 'rg1', value: 'RG 1' }] },
  };
}

function baseProviders(
  extra: any[] = [],
  getThesauriSet: ReturnType<typeof vi.fn> = vi
    .fn()
    .mockReturnValue(of(makeThesauriSet()))
) {
  return [
    provideNoopAnimations(),
    provideHttpClientTesting(),
    {
      provide: ThesaurusService,
      useValue: {
        getThesauriSet,
        // used by the nested PinTargetLookupComponent (via
        // AssertedCompositeIdComponent) to load the model-types
        // thesaurus; not under test here, so just return an empty one
        getThesaurus: vi.fn().mockReturnValue(of({ entries: [] })),
      },
    },
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
    ...extra,
  ];
}

describe('LinkEditorComponent', () => {
  describe('standalone (no dialog)', () => {
    let component: LinkEditorComponent;
    let fixture: ComponentFixture<LinkEditorComponent>;
    let getThesauriSet: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      getThesauriSet = vi.fn().mockReturnValue(of(makeThesauriSet()));
      await TestBed.configureTestingModule({
        imports: [LinkEditorComponent],
        providers: baseProviders([], getThesauriSet),
      }).compileComponents();

      fixture = TestBed.createComponent(LinkEditorComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should not be in dialog mode when no MatDialogRef is injected', () => {
      expect(component.inDialog).toBe(false);
      // @Optional() DI yields null (not undefined) when nothing is provided
      expect(component.dialogRef).toBeNull();
      expect(component.data).toBeNull();
    });

    it('should leave id undefined when there is no dialog data', () => {
      expect(component.id()).toBeUndefined();
    });

    it('should load all five thesauri on init with the expected keys', () => {
      expect(getThesauriSet).toHaveBeenCalledTimes(1);
      expect(getThesauriSet).toHaveBeenCalledWith([
        'asserted-id-scopes',
        'asserted-id-tags',
        'assertion-tags',
        'doc-reference-types',
        'doc-reference-tags',
      ]);
    });

    it('should populate the entry signals from the loaded thesauri', () => {
      expect(component.idScopeEntries()).toEqual([
        { id: 's1', value: 'Scope 1' },
      ]);
      expect(component.idTagEntries()).toEqual([{ id: 't1', value: 'Tag 1' }]);
      expect(component.assTagEntries()).toEqual([{ id: 'a1', value: 'Ass 1' }]);
      expect(component.refTypeEntries()).toEqual([
        { id: 'rt1', value: 'RT 1' },
      ]);
      expect(component.refTagEntries()).toEqual([
        { id: 'rg1', value: 'RG 1' },
      ]);
    });

    it('onIdChange should update the id model', () => {
      const id: AssertedCompositeId = { target: { gid: 'g1', label: 'L1' } };
      component.onIdChange(id);
      expect(component.id()).toEqual(id);
    });

    it('close should emit closeRequest and not throw when there is no dialogRef', () => {
      const spy = vi.fn();
      component.closeRequest.subscribe(spy);

      expect(() => component.close()).not.toThrow();
      expect(spy).toHaveBeenCalled();
    });

    it('save should not throw when there is no dialogRef', () => {
      component.onIdChange({ target: { gid: 'g1', label: 'L1' } });
      expect(() => component.save()).not.toThrow();
    });

    it('should render with zero margin when not in a dialog', () => {
      const div: HTMLElement = fixture.nativeElement.querySelector('div');
      expect(div.style.margin).toBe('0px');
    });

    it('should invoke close() when the Cancel button is clicked', () => {
      const spy = vi.spyOn(component, 'close');
      const buttons: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button')
      );
      const cancelBtn = buttons.find((b) => b.textContent?.includes('Cancel'));
      cancelBtn?.click();
      expect(spy).toHaveBeenCalled();
    });

    it('should invoke save() when the OK button is clicked', () => {
      const spy = vi.spyOn(component, 'save');
      const buttons: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button')
      );
      const okBtn = buttons.find((b) => b.textContent?.includes('OK'));
      okBtn?.click();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('dialog mode', () => {
    let component: LinkEditorComponent;
    let fixture: ComponentFixture<LinkEditorComponent>;
    let dialogRefClose: ReturnType<typeof vi.fn>;
    const existingId: AssertedCompositeId = {
      target: { gid: 'g0', label: 'L0' },
    };
    const dialogData: LinkEditorComponentData = {
      id: existingId,
      canEditTarget: true,
      canSwitchMode: true,
      defaultPartTypeKey: 'key1',
    };

    beforeEach(async () => {
      dialogRefClose = vi.fn();
      await TestBed.configureTestingModule({
        imports: [LinkEditorComponent],
        providers: baseProviders([
          {
            provide: MatDialogRef,
            useValue: { close: dialogRefClose },
          },
          {
            provide: MAT_DIALOG_DATA,
            useValue: dialogData,
          },
        ]),
      }).compileComponents();

      fixture = TestBed.createComponent(LinkEditorComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should be in dialog mode when a MatDialogRef is injected', () => {
      expect(component.inDialog).toBe(true);
    });

    it('should initialize id from the injected dialog data', () => {
      expect(component.id()).toEqual(existingId);
    });

    it('should expose the injected dialog data as-is', () => {
      expect(component.data).toEqual(dialogData);
    });

    it('should render with a 16px margin when in a dialog', () => {
      const div: HTMLElement = fixture.nativeElement.querySelector('div');
      expect(div.style.margin).toBe('16px');
    });

    it('close should emit closeRequest and close the dialog', () => {
      const spy = vi.fn();
      component.closeRequest.subscribe(spy);

      component.close();

      expect(spy).toHaveBeenCalled();
      expect(dialogRefClose).toHaveBeenCalledWith();
    });

    it('save should close the dialog with the current id', () => {
      const newId: AssertedCompositeId = { target: { gid: 'g1', label: 'L1' } };
      component.onIdChange(newId);

      component.save();

      expect(dialogRefClose).toHaveBeenCalledWith(newId);
    });
  });

  describe('missing dialog data', () => {
    it('should not throw and should leave id undefined when data is provided but has no id', async () => {
      await TestBed.configureTestingModule({
        imports: [LinkEditorComponent],
        providers: baseProviders([
          {
            provide: MatDialogRef,
            useValue: { close: vi.fn() },
          },
          {
            provide: MAT_DIALOG_DATA,
            useValue: {},
          },
        ]),
      }).compileComponents();

      const fixture = TestBed.createComponent(LinkEditorComponent);
      expect(() => fixture.detectChanges()).not.toThrow();
      await fixture.whenStable();

      expect(fixture.componentInstance.id()).toBeUndefined();
    });
  });
});
