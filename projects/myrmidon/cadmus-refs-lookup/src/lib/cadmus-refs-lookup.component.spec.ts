import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadmusRefsLookupComponent } from './cadmus-refs-lookup.component';

describe('CadmusRefsLookupComponent', () => {
  let component: CadmusRefsLookupComponent;
  let fixture: ComponentFixture<CadmusRefsLookupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadmusRefsLookupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CadmusRefsLookupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
