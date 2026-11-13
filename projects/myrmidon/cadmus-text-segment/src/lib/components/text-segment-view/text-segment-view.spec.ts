import { Component, input } from '@angular/core';
import { render } from '@testing-library/angular';

import {
  DEFAULT_SEGMENTED_TEXT_SETTINGS,
  SegmentedTextSettings,
  TextSegment,
  resolveSegmentedTextSettings,
} from '../../models';
import { TextSegmentView } from './text-segment-view';

@Component({
  selector: 'test-tip',
  template: `<span class="custom-tip">tip {{ segment()?.id }}</span>`,
})
class TestTipComponent {
  public readonly segment = input<TextSegment<unknown>>();
}

const SEGMENT: TextSegment<unknown> = {
  id: 7,
  index: 6,
  value: 'b',
  payload: { cat: 'Ll' },
};

async function setup(
  segment: TextSegment<unknown> = SEGMENT,
  settings?: Partial<SegmentedTextSettings>,
  extra?: Record<string, unknown>,
) {
  const result = await render(TextSegmentView, {
    inputs: {
      segment,
      settings: resolveSegmentedTextSettings(settings),
      ...extra,
    },
  });
  await result.fixture.whenStable();
  return {
    ...result,
    host: result.fixture.nativeElement as HTMLElement,
    component: result.fixture.componentInstance,
  };
}

describe('TextSegmentView', () => {
  it('should render the segment value in an SVG text box', async () => {
    const { host } = await setup();
    expect(host.querySelector('svg')).toBeTruthy();
    expect(host.querySelector('rect.text-rect')).toBeTruthy();
    expect(host.querySelector('text.text')?.textContent).toBe('b');
  });

  it('should prefer the label over the value', async () => {
    const { host } = await setup({ ...SEGMENT, value: ' ', label: '_' });
    expect(host.querySelector('text.text')?.textContent).toBe('_');
    expect(host.getAttribute('aria-label')).toBe('_');
  });

  it('should expose the segment ID and role on the host', async () => {
    const { host } = await setup();
    expect(host.getAttribute('data-seg-id')).toBe('7');
    expect(host.getAttribute('role')).toBe('option');
    expect(host.getAttribute('aria-selected')).toBe('false');
  });

  it('should not render optional boxes by default', async () => {
    const { host } = await setup();
    expect(host.querySelector('.id-rect')).toBeNull();
    expect(host.querySelector('.index-rect')).toBeNull();
    expect(host.querySelector('.tip-rect')).toBeNull();
  });

  it('should render ID and index boxes stacked below the text', async () => {
    const { host, component } = await setup(SEGMENT, {
      showIdBox: true,
      showIndexBox: true,
    });
    expect(host.querySelector('.id-text')?.textContent).toBe('7');
    expect(host.querySelector('.index-text')?.textContent).toBe('6');
    const g = component.geometry();
    const s = DEFAULT_SEGMENTED_TEXT_SETTINGS;
    expect(g.id!.y).toBeGreaterThanOrEqual(s.textRectHeight);
    expect(g.index!.y).toBeGreaterThan(g.id!.y);
    expect(host.querySelector('svg')?.getAttribute('height')).toBe(
      String(g.height),
    );
  });

  it('should honor the minimum width', async () => {
    const { component } = await setup(
      { ...SEGMENT, value: '' },
      { textRectMinWidth: 20 },
    );
    expect(component.geometry().width).toBeGreaterThanOrEqual(20);
  });

  it('should render a tip below from the template', async () => {
    const { host } = await setup(SEGMENT, {
      showTipBox: true,
      tipPosition: 'below',
      tipTemplate: 'cat={{cat}} {{missing}}',
    });
    expect(host.querySelector('.tip-text')?.textContent).toBe('cat=Ll');
  });

  it('should not render a tip box for popup tips', async () => {
    const { host } = await setup(SEGMENT, {
      showTipBox: true,
      tipPosition: 'popup',
      tipTemplate: 'cat={{cat}}',
    });
    expect(host.querySelector('.tip-rect')).toBeNull();
  });

  it('should render a tip component below', async () => {
    const { host } = await setup(SEGMENT, {
      showTipBox: true,
      tipPosition: 'below',
      tipComponent: TestTipComponent,
    });
    expect(host.querySelector('foreignObject .custom-tip')?.textContent).toBe(
      'tip 7',
    );
  });

  it('should use default colors', async () => {
    const { component } = await setup();
    const s = DEFAULT_SEGMENTED_TEXT_SETTINGS;
    expect(component.fill()).toBe(s.color);
    expect(component.textFill()).toBe(s.textColor);
    expect(component.stroke()).toBe(s.borderColor);
  });

  it('should use segment colors when set', async () => {
    const { component } = await setup({
      ...SEGMENT,
      color: 'red',
      textColor: 'white',
      borderColor: 'blue',
    });
    expect(component.fill()).toBe('red');
    expect(component.textFill()).toBe('white');
    expect(component.stroke()).toBe('blue');
  });

  it('should use selection colors when selected, over result colors', async () => {
    const { host, component } = await setup(
      { ...SEGMENT, color: 'red' },
      undefined,
      { selected: true, hit: true },
    );
    const s = DEFAULT_SEGMENTED_TEXT_SETTINGS;
    expect(component.fill()).toBe(s.selectionColor);
    expect(component.textFill()).toBe(s.selectionTextColor);
    expect(host.classList).toContain('selected');
    expect(host.getAttribute('aria-selected')).toBe('true');
  });

  it('should use result colors for hits', async () => {
    const { host, component } = await setup(SEGMENT, undefined, { hit: true });
    expect(component.fill()).toBe(DEFAULT_SEGMENTED_TEXT_SETTINGS.resultColor);
    expect(host.classList).toContain('hit');
  });

  it('should set host classes for caret, mode and custom class', async () => {
    const { host } = await setup(
      { ...SEGMENT, selectionMode: 'wrapped', cssClass: 'mine' },
      undefined,
      { caret: true },
    );
    expect(host.classList).toContain('caret');
    expect(host.classList).toContain('mode-wrapped');
    expect(host.classList).toContain('mine');
  });

  it('should apply the stroke dash array', async () => {
    const { host } = await setup(SEGMENT, { textRectStrokeDasharray: '4 2' });
    expect(
      host.querySelector('rect.text-rect')?.getAttribute('stroke-dasharray'),
    ).toBe('4 2');
  });
});
