import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CitationSetComponent } from './citation-set.component';

describe('CitationSetComponent', () => {
  let component: CitationSetComponent;
  let fixture: ComponentFixture<CitationSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitationSetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CitationSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
