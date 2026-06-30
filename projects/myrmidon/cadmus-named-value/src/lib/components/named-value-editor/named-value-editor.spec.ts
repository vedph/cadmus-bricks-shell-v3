import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NamedValueEditor } from './named-value-editor';

describe('NamedValueEditor', () => {
  let component: NamedValueEditor;
  let fixture: ComponentFixture<NamedValueEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NamedValueEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NamedValueEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
