import { Component, Input } from '@angular/core';
import { render } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { RefLookupOptionsComponent } from './ref-lookup-options.component';

@Component({
  selector: 'test-opt-content',
  template: `<span class="opt-content">opts</span>`,
})
class TestOptContentComponent {
  @Input() options: unknown;
}

describe('RefLookupOptionsComponent', () => {
  async function setup(data: any) {
    const dialogRef = { close: vi.fn() };
    const result = await render(RefLookupOptionsComponent, {
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    return { ...result, dialogRef };
  }

  it('should create', async () => {
    const { fixture } = await setup({ component: TestOptContentComponent });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose the injected dialog data', async () => {
    const data = { component: TestOptContentComponent, options: { a: 1 } };
    const { fixture } = await setup(data);
    expect(fixture.componentInstance.data).toBe(data);
  });

  it('should render the dynamic component from data.component', async () => {
    const { container } = await setup({ component: TestOptContentComponent });
    expect(container.querySelector('.opt-content')).toBeTruthy();
  });

  it('should close the dialog ref when onClose is called', async () => {
    const { fixture, dialogRef } = await setup({
      component: TestOptContentComponent,
    });
    fixture.componentInstance.onClose();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
