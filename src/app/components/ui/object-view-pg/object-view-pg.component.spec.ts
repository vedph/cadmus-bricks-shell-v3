import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObjectViewPgComponent } from './object-view-pg.component';

describe('ObjectViewPgComponent', () => {
  let component: ObjectViewPgComponent;
  let fixture: ComponentFixture<ObjectViewPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObjectViewPgComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ObjectViewPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
