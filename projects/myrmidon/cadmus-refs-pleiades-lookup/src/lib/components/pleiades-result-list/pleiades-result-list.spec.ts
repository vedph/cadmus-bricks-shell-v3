import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PleiadesSearchResult } from '../../models';
import { PleiadesResultListComponent } from './pleiades-result-list';

function result(id: string, located = true): PleiadesSearchResult {
  return {
    id,
    uriPrefix: 'https://pleiades.stoa.org/places/',
    name: 'Place ' + id,
    type: 'https://pleiades.stoa.org/vocabularies/place-types/settlement',
    types: ['https://pleiades.stoa.org/vocabularies/place-types/settlement'],
    lat: located ? 37 : null,
    lng: located ? 23 : null,
    distance: located ? 1234 : null,
  };
}

describe('PleiadesResultListComponent', () => {
  let fixture: ComponentFixture<PleiadesResultListComponent>;
  let component: PleiadesResultListComponent;
  let el: HTMLElement;

  async function flush() {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function panel(index: number): HTMLElement {
    return el.querySelectorAll('mat-expansion-panel')[index] as HTMLElement;
  }

  function button(index: number, label: string): HTMLElement {
    return panel(index).querySelector(`[aria-label="${label}"]`) as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PleiadesResultListComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(PleiadesResultListComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    await flush();
  });

  it('shows a placeholder without results', () => {
    expect(el.querySelector('.empty')).toBeTruthy();
  });

  it('lists the results with their summary', async () => {
    fixture.componentRef.setInput('results', [result('1'), result('2', false)]);
    await flush();
    expect(el.querySelectorAll('mat-expansion-panel').length).toBe(2);
    expect(panel(0).querySelector('.name')!.textContent).toContain('Place 1');
    expect(panel(0).querySelector('.type')!.textContent).toContain(
      'settlement',
    );
    expect(panel(0).querySelector('.distance')!.textContent).toContain(
      '1.2 km',
    );
    expect(panel(1).querySelector('.unlocated')).toBeTruthy();
  });

  it('emits fly-to, details and pick requests', async () => {
    const r = result('1');
    fixture.componentRef.setInput('results', [r]);
    await flush();
    const fly = vi.fn();
    const details = vi.fn();
    const pick = vi.fn();
    component.flyToRequest.subscribe(fly);
    component.detailsRequest.subscribe(details);
    component.placePick.subscribe(pick);

    button(0, 'show in map').click();
    button(0, 'details').click();
    button(0, 'pick').click();

    expect(fly).toHaveBeenCalledWith(r);
    expect(details).toHaveBeenCalledWith(r);
    expect(pick).toHaveBeenCalledWith(r);
    expect(component.selectedId()).toBe('1');
  });

  it('links to the Pleiades page', async () => {
    fixture.componentRef.setInput('results', [result('42')]);
    await flush();
    const link = panel(0).querySelector(
      '[aria-label="open in Pleiades"]',
    ) as HTMLAnchorElement;
    expect(link.href).toBe('https://pleiades.stoa.org/places/42');
    expect(link.target).toBe('_blank');
  });

  it('disables fly-to for unlocated places', async () => {
    fixture.componentRef.setInput('results', [result('1', false)]);
    await flush();
    expect(
      (button(0, 'show in map') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('hides pick and fly-to buttons on request', async () => {
    fixture.componentRef.setInput('results', [result('1')]);
    fixture.componentRef.setInput('hidePick', true);
    fixture.componentRef.setInput('hideFlyTo', true);
    await flush();
    expect(button(0, 'pick')).toBeNull();
    expect(button(0, 'show in map')).toBeNull();
    expect(button(0, 'details')).toBeTruthy();
  });

  it('expands the selected result', async () => {
    fixture.componentRef.setInput('results', [result('1'), result('2')]);
    await flush();
    component.selectedId.set('2');
    await flush();
    expect(panel(1).classList).toContain('mat-expanded');
    expect(panel(1).classList).toContain('selected');
    expect(panel(1).querySelector('.meta')!.textContent).toContain('37.00000');
  });

  it('updates the selection when panels open and close', async () => {
    const r = result('1');
    fixture.componentRef.setInput('results', [r]);
    await flush();
    component.onOpened(r);
    expect(component.selectedId()).toBe('1');
    component.onClosed(result('2'));
    expect(component.selectedId()).toBe('1');
    component.onClosed(r);
    expect(component.selectedId()).toBeUndefined();
  });
});
