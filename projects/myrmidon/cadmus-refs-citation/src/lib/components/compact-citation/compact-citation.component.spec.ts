import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompactCitationComponent } from './compact-citation.component';

describe('CompactCitationComponent', () => {
  let component: CompactCitationComponent;
  let fixture: ComponentFixture<CompactCitationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompactCitationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompactCitationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
