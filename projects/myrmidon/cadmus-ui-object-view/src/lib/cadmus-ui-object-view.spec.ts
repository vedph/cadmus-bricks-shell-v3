import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadmusUiObjectView } from './cadmus-ui-object-view';

describe('CadmusUiObjectView', () => {
  let component: CadmusUiObjectView;
  let fixture: ComponentFixture<CadmusUiObjectView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadmusUiObjectView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CadmusUiObjectView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
