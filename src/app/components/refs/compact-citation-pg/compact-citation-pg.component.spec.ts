import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompactCitationPgComponent } from './compact-citation-pg.component';

describe('CompactCitationPgComponent', () => {
  let component: CompactCitationPgComponent;
  let fixture: ComponentFixture<CompactCitationPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompactCitationPgComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompactCitationPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
