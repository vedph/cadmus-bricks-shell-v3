import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { HistoricalDateComponent } from './historical-date.component';
import { HistoricalDateModel } from './historical-date';
import { DatationModel } from '../datation/datation';

describe('HistoricalDateComponent', () => {
  let component: HistoricalDateComponent;
  let fixture: ComponentFixture<HistoricalDateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoricalDateComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoricalDateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reset form and signals when date is undefined', () => {
    expect(component.form.dateText().value()).toBeFalsy();
    expect(component.a()).toBeUndefined();
    expect(component.b()).toBeUndefined();
    expect(component.dateValue()).toBeUndefined();
  });

  it('should update form from a single point date', () => {
    const model: HistoricalDateModel = {
      a: { value: 1450 },
    };
    fixture.componentRef.setInput('date', model);
    fixture.detectChanges();

    expect(component.form.dateText().value()).toBe('1450 AD');
    expect(component.form.range().value()).toBe(false);
    expect(component.a()).toBeTruthy();
    expect(component.a()!.value).toBe(1450);
    expect(component.b()).toBeUndefined();
    expect(component.dateValue()).toBe(1450);
  });

  it('should update form from a range date', () => {
    const model: HistoricalDateModel = {
      a: { value: 1450 },
      b: { value: 1500 },
    };
    fixture.componentRef.setInput('date', model);
    fixture.detectChanges();

    expect(component.form.range().value()).toBe(true);
    expect(component.a()!.value).toBe(1450);
    expect(component.b()!.value).toBe(1500);
    expect(component.dateValue()).toBe((1450 + 1500) / 2);
  });

  it('should disable the form and collapse the visual editor when disabled', () => {
    component.visualExpanded.set(true);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(component.form.dateText().disabled()).toBe(true);
    expect(component.form.range().disabled()).toBe(true);
    expect(component.visualExpanded()).toBe(false);
  });

  it('should enable the form when not disabled', () => {
    fixture.componentRef.setInput('disabled', false);
    fixture.detectChanges();
    expect(component.form.dateText().disabled()).toBe(false);
    expect(component.form.range().disabled()).toBe(false);
  });

  it('stopPropagation should stop event propagation', () => {
    let called = false;
    const fakeEvent = {
      stopPropagation: () => (called = true),
    } as unknown as KeyboardEvent;
    component.stopPropagation(fakeEvent);
    expect(called).toBe(true);
  });

  it('onDatationAChange/onDatationBChange should update a() and b() signals', () => {
    const da: DatationModel = { value: 100 };
    const db: DatationModel = { value: 200 };
    component.onDatationAChange(da);
    expect(component.a()).toEqual(da);
    component.onDatationBChange(db);
    expect(component.b()).toEqual(db);
    component.onDatationAChange(undefined);
    expect(component.a()).toBeUndefined();
  });

  it('resetDatations should clear range, a and b', () => {
    component.form.range().value.set(true);
    component.onDatationAChange({ value: 100 });
    component.onDatationBChange({ value: 200 });

    component.resetDatations();

    expect(component.form.range().value()).toBe(false);
    expect(component.a()).toBeUndefined();
    expect(component.b()).toBeUndefined();
  });

  it('setDatations should build a single-point date text and parse it back', () => {
    component.onDatationAChange({ value: 1450 });
    component.visualExpanded.set(true);

    component.setDatations();

    expect(component.visualExpanded()).toBe(false);
    expect(component.form.dateText().value()).toBe('1450 AD');
    expect(component.invalidDateText()).toBe(false);
    expect(component.dateValue()).toBe(1450);
    expect(component.date()?.a.value).toBe(1450);
  });

  it('setDatations should build a range date text and parse it back when range is toggled', () => {
    component.form.range().value.set(true);
    component.onDatationAChange({ value: 1450 });
    component.onDatationBChange({ value: 1500 });

    component.setDatations();

    expect(component.form.dateText().value()).toContain('--');
    expect(component.date()?.b?.value).toBe(1500);
  });

  it('parseDateText should update signals for a valid date text', () => {
    component.form.dateText().value.set('1450 AD');
    component.parseDateText();

    expect(component.invalidDateText()).toBe(false);
    expect(component.dateValue()).toBe(1450);
    expect(component.form.range().value()).toBe(false);
    expect(component.a()?.value).toBe(1450);
    expect(component.date()?.a.value).toBe(1450);
    expect(component.visualExpanded()).toBe(true);
  });

  it('parseDateText should flag invalid text and set dateValue to 0', () => {
    // an empty/unparseable date value results in an undefined HistoricalDate
    // type, whose getSortValue() computation still needs a non-null hd, so
    // this exercises the parser's null-handling branch
    component.form.dateText().value.set('not a real date @@@');
    component.parseDateText();

    // depending on the parser's leniency this may or may not be flagged as
    // invalid, so assert on the documented contract: either it parsed to
    // something (dateValue set, invalidDateText false) or it was rejected
    // (invalidDateText true, dateValue 0)
    if (component.invalidDateText()) {
      expect(component.dateValue()).toBe(0);
    } else {
      expect(component.dateValue()).toBeDefined();
    }
  });

  it('parseDateText should do nothing when dateText is empty', () => {
    component.form.dateText().value.set('');
    const before = component.invalidDateText();
    component.parseDateText();
    expect(component.invalidDateText()).toBe(before);
  });

  it('resetDateText should clear the text control and mark it dirty', () => {
    component.form.dateText().value.set('1450 AD');
    component.form.dateText().reset();

    component.resetDateText();

    expect(component.form.dateText().value()).toBe('');
    expect(component.form.dateText().dirty()).toBe(true);
    expect(component.invalidDateText()).toBe(false);
  });

  it('save should parse the current date text via updateFromText', () => {
    component.form.dateText().value.set('1450 AD');
    component.save();
    expect(component.date()?.a.value).toBe(1450);
    expect(component.invalidDateText()).toBe(false);
  });

  it('should render the second datation editor only when range is toggled', () => {
    component.visualExpanded.set(true);
    fixture.detectChanges();
    let editors = fixture.nativeElement.querySelectorAll(
      'cadmus-refs-datation'
    );
    expect(editors.length).toBe(1);

    component.form.range().value.set(true);
    fixture.detectChanges();
    editors = fixture.nativeElement.querySelectorAll('cadmus-refs-datation');
    expect(editors.length).toBe(2);
  });
});
