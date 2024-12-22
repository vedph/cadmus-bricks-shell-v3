import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextBlockViewPgComponent } from './text-block-view-pg.component';

describe('TextBlockViewPgComponent', () => {
  let component: TextBlockViewPgComponent;
  let fixture: ComponentFixture<TextBlockViewPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ TextBlockViewPgComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TextBlockViewPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
