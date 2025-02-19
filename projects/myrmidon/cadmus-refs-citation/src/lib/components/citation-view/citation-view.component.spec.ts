import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CitationViewComponent } from './citation-view.component';

describe('CitationViewComponent', () => {
  let component: CitationViewComponent;
  let fixture: ComponentFixture<CitationViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitationViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CitationViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
