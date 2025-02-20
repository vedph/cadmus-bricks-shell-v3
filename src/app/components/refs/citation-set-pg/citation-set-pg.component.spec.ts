import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CitationSetPgComponent } from './citation-set-pg.component';

describe('CitationSetPgComponent', () => {
  let component: CitationSetPgComponent;
  let fixture: ComponentFixture<CitationSetPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitationSetPgComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CitationSetPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
