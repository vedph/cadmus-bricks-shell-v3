import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutoFocusDirective } from './auto-focus.directive';

@Component({
  template: `<input cadmusAutoFocus type="text" />`,
  imports: [AutoFocusDirective],
})
class HostComponent {}

describe('AutoFocusDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
  });

  it('should create an instance', () => {
    const el = document.createElement('div');
    const directive = new AutoFocusDirective({ nativeElement: el } as any);
    expect(directive).toBeTruthy();
  });

  it('should focus the host element after view init', () => {
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(document.activeElement).toBe(input);
  });

  it('should call focus() on the native element directly', () => {
    const el = document.createElement('input');
    document.body.appendChild(el);
    const focusSpy = vi.spyOn(el, 'focus');
    const directive = new AutoFocusDirective({ nativeElement: el } as any);

    directive.ngAfterViewInit();

    expect(focusSpy).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('should not throw when the native element is falsy', () => {
    const directive = new AutoFocusDirective({ nativeElement: undefined } as any);
    expect(() => directive.ngAfterViewInit()).not.toThrow();
  });
});
