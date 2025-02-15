import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CitationStepComponent } from './citation-step.component';

describe('CitationStepComponent', () => {
  let component: CitationStepComponent;
  let fixture: ComponentFixture<CitationStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitationStepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CitationStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
