import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ReactiveFormsModule } from '@angular/forms';
import { DecoratedCountsComponent } from './decorated-counts.component';

describe('DecoratedCountsComponent', () => {
  let component: DecoratedCountsComponent;
  let fixture: ComponentFixture<DecoratedCountsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, DecoratedCountsComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DecoratedCountsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form controls', () => {
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

  it('should disable id control when hasCustom is true', () => {
    component.hasCustom.setValue(true);
    expect(component.id.disabled).toBeTruthy();
  });

  it('should enable id control when hasCustom is false', () => {
    component.hasCustom.setValue(false);
    expect(component.id.enabled).toBeTruthy();
  });

  it('should add a custom count', () => {
    component.custom.setValue('custom-id');
    component.addCustomCount();
    expect(component.edited).toEqual({ id: 'custom-id', value: 0 });
  });

  it('should add a count', () => {
    component.id.setValue('test-id');
    component.addCount();
    expect(component.edited).toEqual({ id: 'test-id', value: 0 });
  });

  it('should save a count', () => {
    component.edited = { id: 'test-id', value: 0 };
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

  it('should delete a count', () => {
    component.counts.set([{ id: 'test-id', value: 10 }]);
    component.deleteCount(0);
    expect(component.counts()).toEqual([]);
  });

  it('should move a count up', () => {
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

  it('should move a count down', () => {
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
});
