import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CitationPgComponent } from './citation-pg.component';

describe('CitationPgComponent', () => {
  let component: CitationPgComponent;
  let fixture: ComponentFixture<CitationPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitationPgComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CitationPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
