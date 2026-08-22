import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import {
  BarCustomAction,
  BarCustomActionRequest,
  CustomActionBarComponent,
} from './custom-action-bar.component';

describe('CustomActionBarComponent', () => {
  let component: CustomActionBarComponent;
  let fixture: ComponentFixture<CustomActionBarComponent>;

  const actions: BarCustomAction[] = [
    { id: 'edit', iconId: 'edit', tip: 'Edit item' },
    { id: 'delete', iconId: 'delete', tip: 'Delete item' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomActionBarComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomActionBarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default actions to an empty array', () => {
    expect(component.actions()).toEqual([]);
  });

  it('should render no buttons when actions is empty', () => {
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    expect(buttons.length).toBe(0);
  });

  it('should render a button for each action', async () => {
    fixture.componentRef.setInput('actions', actions);
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    expect(buttons.length).toBe(actions.length);
  });

  it('should render the icon id for each action', async () => {
    fixture.componentRef.setInput('actions', actions);
    fixture.detectChanges();
    await fixture.whenStable();

    const icons = fixture.debugElement.queryAll(By.css('mat-icon'));
    expect(icons.length).toBe(2);
    expect(icons[0].nativeElement.textContent.trim()).toBe('edit');
    expect(icons[1].nativeElement.textContent.trim()).toBe('delete');
  });

  it('should emit actionRequest with id and payload when a button is clicked', async () => {
    const payload = { id: 42 };
    fixture.componentRef.setInput('actions', actions);
    fixture.componentRef.setInput('payload', payload);
    fixture.detectChanges();
    await fixture.whenStable();

    let received: BarCustomActionRequest | undefined;
    component.actionRequest.subscribe((r) => (received = r));

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[0].nativeElement.click();

    expect(received).toBeTruthy();
    expect(received!.id).toBe('edit');
    expect(received!.payload).toBe(payload);
  });

  it('should call onCustomAction and emit request directly', () => {
    let received: BarCustomActionRequest | undefined;
    component.actionRequest.subscribe((r) => (received = r));

    component.onCustomAction(actions[1], 'some-payload');

    expect(received).toEqual({ id: 'delete', payload: 'some-payload' });
  });

  it('should disable all buttons when disabled input is true', async () => {
    fixture.componentRef.setInput('actions', actions);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons.forEach((b) => {
      expect(b.nativeElement.disabled).toBe(true);
    });
  });

  it('should disable a single button when its own disabled callback returns true', async () => {
    const conditionalActions: BarCustomAction[] = [
      { id: 'a', iconId: 'a', disabled: (payload: any) => payload === 'lock' },
      { id: 'b', iconId: 'b', disabled: (payload: any) => payload === 'lock' },
    ];
    fixture.componentRef.setInput('actions', conditionalActions);
    fixture.componentRef.setInput('payload', 'unlock');
    fixture.detectChanges();
    await fixture.whenStable();

    let buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons.forEach((b) => expect(b.nativeElement.disabled).toBe(false));

    fixture.componentRef.setInput('payload', 'lock');
    fixture.detectChanges();
    await fixture.whenStable();

    buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons.forEach((b) => expect(b.nativeElement.disabled).toBe(true));
  });

  it('should apply a custom style to a button when action.style is set', async () => {
    const styledActions: BarCustomAction[] = [
      { id: 'x', iconId: 'x', style: { color: 'red' } },
    ];
    fixture.componentRef.setInput('actions', styledActions);
    fixture.detectChanges();
    await fixture.whenStable();

    const button = fixture.debugElement.query(By.css('button'));
    expect(button.nativeElement.style.color).toBe('red');
  });

  it('should not throw and use empty tooltip when action.tip is not set', async () => {
    const noTipActions: BarCustomAction[] = [{ id: 'x', iconId: 'x' }];
    fixture.componentRef.setInput('actions', noTipActions);
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });
});
