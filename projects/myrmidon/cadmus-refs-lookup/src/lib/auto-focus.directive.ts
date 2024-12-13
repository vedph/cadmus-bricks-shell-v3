import { AfterViewInit, Directive, ElementRef } from '@angular/core';

/**
 * Directive to set the focus on the host element when it is rendered.
 */
@Directive({
  selector: '[cadmusAutoFocus]',
})
export class AutoFocusDirective implements AfterViewInit {
  private readonly _inputElement: HTMLElement;

  constructor(elementRef: ElementRef) {
    this._inputElement = elementRef.nativeElement;
  }

  public ngAfterViewInit(): void {
    this._inputElement?.focus();
  }
}
