import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NamedValueSetEditor } from './named-value-set-editor';

describe('NamedValueSetEditor', () => {
  let component: NamedValueSetEditor;
  let fixture: ComponentFixture<NamedValueSetEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NamedValueSetEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NamedValueSetEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
