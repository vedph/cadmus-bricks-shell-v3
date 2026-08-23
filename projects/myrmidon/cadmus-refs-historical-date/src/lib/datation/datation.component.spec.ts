import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { DatationComponent } from './datation.component';
import { DatationModel } from './datation';

describe('DatationComponent', () => {
  let component: DatationComponent;
  let fixture: ComponentFixture<DatationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatationComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(DatationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function flushDebounce(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 350));
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values when datation is undefined', () => {
    expect(component.form.value().value()).toBe(0);
    expect(component.form.century().value()).toBe(false);
    expect(component.form.span().value()).toBe(false);
    expect(component.form.month().value()).toBe(0);
    expect(component.form.day().value()).toBe(0);
    expect(component.form.about().value()).toBe(false);
    expect(component.form.dubious().value()).toBe(false);
    expect(component.form.hint().value()).toBe('');
    expect(component.form.slide().value()).toBe(0);
  });

  it('should not render a label when label input is not set', () => {
    const p = fixture.nativeElement.querySelector('p.header');
    expect(p).toBeFalsy();
  });

  it('should render the label when set', () => {
    fixture.componentRef.setInput('label', 'Birth');
    fixture.detectChanges();
    const p = fixture.nativeElement.querySelector('p.header');
    expect(p?.textContent).toContain('Birth');
  });

  it('should update the form when datation model is set', () => {
    const model: DatationModel = {
      value: 1345,
      isCentury: true,
      isSpan: false,
      month: 5,
      day: 12,
      isApproximate: true,
      isDubious: false,
      hint: 'circa',
      slide: 2,
    };
    fixture.componentRef.setInput('datation', model);
    fixture.detectChanges();

    expect(component.form.value().value()).toBe(1345);
    expect(component.form.century().value()).toBe(true);
    expect(component.form.span().value()).toBe(false);
    expect(component.form.month().value()).toBe(5);
    expect(component.form.day().value()).toBe(12);
    expect(component.form.about().value()).toBe(true);
    expect(component.form.dubious().value()).toBe(false);
    expect(component.form.hint().value()).toBe('circa');
    expect(component.form.slide().value()).toBe(2);
    expect(component.form().dirty()).toBe(false);
  });

  it('should reset the form when datation model becomes undefined again', () => {
    fixture.componentRef.setInput('datation', {
      value: 100,
      isCentury: true,
    } as DatationModel);
    fixture.detectChanges();

    fixture.componentRef.setInput('datation', undefined);
    fixture.detectChanges();

    expect(component.form.value().value()).toBeFalsy();
    expect(component.form.century().value()).toBeFalsy();
  });

  it('should fill in missing optional model fields with falsy defaults', () => {
    fixture.componentRef.setInput('datation', {
      value: 10,
    } as DatationModel);
    fixture.detectChanges();

    expect(component.form.century().value()).toBe(false);
    expect(component.form.span().value()).toBe(false);
    expect(component.form.month().value()).toBe(0);
    expect(component.form.day().value()).toBe(0);
    expect(component.form.about().value()).toBe(false);
    expect(component.form.dubious().value()).toBe(false);
    expect(component.form.hint().value()).toBe('');
    expect(component.form.slide().value()).toBe(0);
  });

  it('should emit the updated datation after a debounced form edit', async () => {
    component.form.value().value.set(-753);
    component.form.century().value.set(true);

    await flushDebounce();

    const emitted = component.datation();
    expect(emitted?.value).toBe(-753);
    expect(emitted?.isCentury).toBe(true);
  });

  it('should not emit while the form is being updated programmatically from the model', async () => {
    fixture.componentRef.setInput('datation', {
      value: 42,
      isCentury: false,
    } as DatationModel);
    fixture.detectChanges();

    await flushDebounce();

    // no spurious re-emission triggered by the programmatic update itself
    expect(component.datation()?.value).toBe(42);
  });

  it('should sanitize the hint on emit via Datation.sanitizeHint', async () => {
    component.form.hint().value.set('  circa  ');
    await flushDebounce();
    expect(component.datation()?.hint).toBe('circa');
  });

  it('should coerce numeric string values via getDatation on emit', async () => {
    component.form.month().value.set(7);
    component.form.day().value.set(15);
    await flushDebounce();

    const emitted = component.datation();
    expect(emitted?.month).toBe(7);
    expect(emitted?.day).toBe(15);
  });

  it('should flag month control invalid when out of 0-12 range', () => {
    component.form.month().value.set(13);
    expect(component.form.month().invalid()).toBe(true);
    expect(component.form.month().getError('max')).toBeDefined();

    component.form.month().value.set(-1);
    expect(component.form.month().getError('min')).toBeDefined();

    component.form.month().value.set(6);
    expect(component.form.month().valid()).toBe(true);
  });

  it('should flag day control invalid when out of 0-31 range', () => {
    component.form.day().value.set(32);
    expect(component.form.day().getError('max')).toBeDefined();

    component.form.day().value.set(-1);
    expect(component.form.day().getError('min')).toBeDefined();

    component.form.day().value.set(20);
    expect(component.form.day().valid()).toBe(true);
  });

  it('should flag hint control invalid when exceeding max length', () => {
    component.form.hint().value.set('a'.repeat(501));
    expect(component.form.hint().getError('maxLength')).toBeDefined();

    component.form.hint().value.set('a'.repeat(500));
    expect(component.form.hint().valid()).toBe(true);
  });

  it('should render month/day mat-error only after touched or dirty', () => {
    component.form.month().value.set(13);
    fixture.detectChanges();
    let error = fixture.nativeElement.querySelector('mat-error');
    expect(error).toBeFalsy();

    component.form.month().markAsTouched();
    fixture.detectChanges();
    error = fixture.nativeElement.querySelector('mat-error');
    expect(error?.textContent).toContain('month greater than 12');
  });

  it('should render the hint mat-error when maxlength is exceeded and touched', () => {
    component.form.hint().value.set('a'.repeat(501));
    component.form.hint().markAsTouched();
    fixture.detectChanges();

    const errors = Array.from(
      fixture.nativeElement.querySelectorAll('mat-error'),
    ).map((el: any) => el.textContent);
    expect(errors.some((t) => t?.includes('hint too long'))).toBe(true);
  });
});
