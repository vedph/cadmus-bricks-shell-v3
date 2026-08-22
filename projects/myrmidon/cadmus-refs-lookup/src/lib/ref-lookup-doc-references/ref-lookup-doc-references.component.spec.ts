import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Observable, of, Subject } from 'rxjs';

import { LookupDocReferencesComponent } from './ref-lookup-doc-references.component';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { RamStorageService } from '@myrmidon/ngx-tools';
import { CitSchemeService } from '@myrmidon/cadmus-refs-citation';
import { LOOKUP_CONFIGS_KEY } from '../ref-lookup-doc-reference/ref-lookup-doc-reference.component';

class FakeDialogService {
  public result$ = new Subject<boolean | undefined>();
  public confirm(): Observable<boolean | undefined> {
    return this.result$.asObservable();
  }
}

describe('LookupDocReferencesComponent', () => {
  let component: LookupDocReferencesComponent;
  let fixture: ComponentFixture<LookupDocReferencesComponent>;
  let dialogService: FakeDialogService;

  const REF_1: DocReference = { citation: 'ref one', type: 't1', tag: 'g1' };
  const REF_2: DocReference = { citation: 'ref two' };

  beforeEach(async () => {
    dialogService = new FakeDialogService();
    const storage = new RamStorageService();
    storage.store(LOOKUP_CONFIGS_KEY, []);

    await TestBed.configureTestingModule({
      imports: [LookupDocReferencesComponent],
      providers: [
        provideNoopAnimations(),
        { provide: DialogService, useValue: dialogService },
        { provide: RamStorageService, useValue: storage },
        { provide: CitSchemeService, useValue: new CitSchemeService(storage) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LookupDocReferencesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default references to an empty array', () => {
    expect(component.references()).toEqual([]);
  });

  it('addReference should open the editor for a new empty reference at index -1', () => {
    component.addReference();
    expect(component.editedIndex()).toBe(-1);
    expect(component.edited()).toEqual({ citation: '' });
  });

  it('editReference should select an existing reference by index with a deep copy', () => {
    fixture.componentRef.setInput('references', [REF_1, REF_2]);
    fixture.detectChanges();

    component.editReference(REF_1, 0);

    expect(component.editedIndex()).toBe(0);
    expect(component.edited()).toEqual(REF_1);
    expect(component.edited()).not.toBe(REF_1); // deep copy
  });

  it('closeReference should reset edited state', () => {
    component.addReference();
    component.closeReference();
    expect(component.editedIndex()).toBe(-1);
    expect(component.edited()).toBeUndefined();
  });

  it('saveReference should append a new reference when editedIndex is -1', () => {
    fixture.componentRef.setInput('references', [REF_1]);
    fixture.detectChanges();
    component.addReference();

    component.saveReference(REF_2);

    expect(component.references()).toEqual([REF_1, REF_2]);
    expect(component.editedIndex()).toBe(-1);
    expect(component.edited()).toBeUndefined();
  });

  it('saveReference should replace the reference at editedIndex', () => {
    fixture.componentRef.setInput('references', [REF_1, REF_2]);
    fixture.detectChanges();
    component.editReference(REF_1, 0);

    const updated: DocReference = { citation: 'updated' };
    component.saveReference(updated);

    expect(component.references()).toEqual([updated, REF_2]);
  });

  describe('deleteReference', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('references', [REF_1, REF_2]);
      fixture.detectChanges();
    });

    it('should remove the reference when the user confirms', () => {
      component.deleteReference(0);
      dialogService.result$.next(true);

      expect(component.references()).toEqual([REF_2]);
    });

    it('should not remove the reference when the user cancels', () => {
      component.deleteReference(0);
      dialogService.result$.next(false);

      expect(component.references()).toEqual([REF_1, REF_2]);
    });

    it('should close the editor if the deleted reference was being edited', () => {
      component.editReference(REF_1, 0);
      component.deleteReference(0);
      dialogService.result$.next(true);

      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });

    it('should leave the editor open when a different reference is deleted', () => {
      component.editReference(REF_2, 1);
      component.deleteReference(0);
      dialogService.result$.next(true);

      expect(component.editedIndex()).toBe(1);
      expect(component.references()).toEqual([REF_2]);
    });
  });

  describe('moveReferenceUp/Down', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('references', [REF_1, REF_2]);
      fixture.detectChanges();
    });

    it('moveReferenceUp should swap with the previous item', () => {
      component.moveReferenceUp(1);
      expect(component.references()).toEqual([REF_2, REF_1]);
    });

    it('moveReferenceUp should be a no-op at index 0', () => {
      component.moveReferenceUp(0);
      expect(component.references()).toEqual([REF_1, REF_2]);
    });

    it('moveReferenceDown should swap with the next item', () => {
      component.moveReferenceDown(0);
      expect(component.references()).toEqual([REF_2, REF_1]);
    });

    it('moveReferenceDown should be a no-op at the last index', () => {
      component.moveReferenceDown(1);
      expect(component.references()).toEqual([REF_1, REF_2]);
    });
  });

  it('should render a row per reference in the table', () => {
    fixture.componentRef.setInput('references', [REF_1, REF_2]);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('should render the badge with the reference count', () => {
    fixture.componentRef.setInput('references', [REF_1, REF_2]);
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge?.textContent?.trim()).toBe('2');
  });

  it('should not render the badge when there are no references', () => {
    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge).toBeFalsy();
  });

  it('should render the editor panel only when a reference is being edited', () => {
    expect(
      fixture.nativeElement.querySelector('mat-expansion-panel')
    ).toBeFalsy();

    component.addReference();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('mat-expansion-panel')
    ).toBeTruthy();
  });
});
