import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PleiadesPlace } from '../../models';
import { PleiadesPlaceDetailsComponent } from './pleiades-place-details';

const PLACE: PleiadesPlace = {
  id: '570228',
  uri: 'https://pleiades.stoa.org/places/570228',
  title: 'Epidauros',
  description: 'Epidauros is located on a small peninsula.',
  details: '<p>Palaia Epidauros</p><script>alert(1)</script>',
  provenance: 'Barrington Atlas: BAtlas 58 E2 Epidauros',
  rights: 'Copyright © The Contributors.',
  reviewState: 'published',
  created: '2024-02-25T00:00:00',
  modified: '2024-06-01T00:00:00',
  lat: 37.6334625,
  lng: 23.16015635,
  bbox: [23.160067, 37.63328, 23.1602457, 37.633645],
  types: ['https://pleiades.stoa.org/vocabularies/place-types/settlement'],
  subjects: ['dare:ancient=1'],
  names: [
    {
      id: 4258,
      uri: 'https://pleiades.stoa.org/places/570228/epidauros',
      romanized: 'Epidauros',
      attested: 'Ἐπίδαυρος',
      language: 'grc',
      type: 'geographic',
      certainty:
        'https://pleiades.stoa.org/vocabularies/association-certainty/certain',
      transcriptionAccuracy: 'accurate',
      transcriptionCompleteness: 'complete',
      startYear: -750,
      endYear: 300,
      description: null,
    },
  ],
  locations: [
    {
      id: 3935,
      uri: 'https://pleiades.stoa.org/places/570228/darmc-location-24044',
      title: 'DARMC location 24044',
      certainty:
        'https://pleiades.stoa.org/vocabularies/association-certainty/certain',
      accuracy: 'https://pleiades.stoa.org/features/metadata/darmc-a',
      accuracyValue: 10,
      startYear: -750,
      endYear: 300,
      description: null,
      geometry: { type: 'Point', coordinates: [23.160067, 37.63328] },
    },
  ],
  connections: [
    {
      id: 1004,
      place: { id: '573318', title: 'Kynortion (mountain)' },
      type: 'https://pleiades.stoa.org/vocabularies/relationship-types/part_of_physical',
      certainty: 'less-certain',
      title: 'Kynortion (mountain)',
      startYear: null,
      endYear: null,
    },
  ],
  incomingConnections: [
    {
      id: 986,
      place: { id: '570127', title: 'Sanctuary of Asklepios at Epidauros' },
      type: 'https://pleiades.stoa.org/vocabularies/relationship-types/at',
      certainty: 'certain',
      title: 'Epidauros',
      startYear: null,
      endYear: null,
    },
  ],
  linkedPlaces: [{ id: '573318', title: 'Kynortion (mountain)' }],
};

describe('PleiadesPlaceDetailsComponent', () => {
  let fixture: ComponentFixture<PleiadesPlaceDetailsComponent>;
  let component: PleiadesPlaceDetailsComponent;
  let el: HTMLElement;

  async function flush() {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PleiadesPlaceDetailsComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PleiadesPlaceDetailsComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    await flush();
  });

  it('shows a placeholder without place', () => {
    expect(el.querySelector('.empty')).toBeTruthy();
  });

  describe('with place', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('place', PLACE);
      await flush();
    });

    it('renders header and metadata', () => {
      expect(el.querySelector('.title')!.textContent).toContain('Epidauros');
      expect(el.querySelector('.state')!.textContent).toContain('published');
      expect(el.querySelector('.description')!.textContent).toContain(
        'peninsula',
      );
      const meta = el.querySelector('.meta')!.textContent!;
      expect(meta).toContain('settlement');
      expect(meta).toContain('37.63346, 23.16016');
      expect(meta).toContain('Barrington Atlas');
      expect(meta).toContain('dare:ancient=1');
    });

    it('renders names and locations', () => {
      const text = el.textContent!;
      expect(text).toContain('Ἐπίδαυρος');
      expect(text).toContain('750 BC – AD 300');
      expect(text).toContain('DARMC location 24044');
      expect(text).toContain('Point');
      expect(text).toContain('10 m');
      expect(el.querySelector('.attested')!.getAttribute('lang')).toBe('grc');
    });

    it('renders connections with readable types', () => {
      const items = el.querySelectorAll('.connections li');
      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain('part of physical');
      expect(items[0].textContent).toContain('(less-certain)');
      expect(items[1].textContent).toContain('Sanctuary of Asklepios');
      expect(el.querySelectorAll('.linked a').length).toBe(1);
    });

    it('sanitizes the HTML details', () => {
      const html = el.querySelector('.html-details')!;
      expect(html.textContent).toContain('Palaia Epidauros');
      expect(html.querySelector('script')).toBeNull();
    });

    it('requests connected places', () => {
      const spy = vi.fn();
      component.placeRequest.subscribe(spy);
      (el.querySelector('.connections li a') as HTMLElement).click();
      (el.querySelector('.linked a') as HTMLElement).click();
      expect(spy).toHaveBeenNthCalledWith(1, '573318');
      expect(spy).toHaveBeenNthCalledWith(2, '573318');
    });

    it('emits locate and pick requests', () => {
      const locate = vi.fn();
      const pick = vi.fn();
      component.locateRequest.subscribe(locate);
      component.placePick.subscribe(pick);
      (el.querySelector('[aria-label="show in map"]') as HTMLElement).click();
      (el.querySelector('[aria-label="pick"]') as HTMLElement).click();
      expect(locate).toHaveBeenCalledWith(PLACE);
      expect(pick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '570228',
          name: 'Epidauros',
          uriPrefix: 'https://pleiades.stoa.org/places/',
          lat: 37.6334625,
        }),
      );
    });

    it('hides pick and locate buttons on request', async () => {
      fixture.componentRef.setInput('hidePick', true);
      fixture.componentRef.setInput('hideLocate', true);
      await flush();
      expect(el.querySelector('[aria-label="pick"]')).toBeNull();
      expect(el.querySelector('[aria-label="show in map"]')).toBeNull();
    });
  });

  it('marks drafts and disables locate for unlocated places', async () => {
    fixture.componentRef.setInput('place', {
      ...PLACE,
      reviewState: 'drafting',
      lat: null,
      lng: null,
      bbox: null,
      connections: [],
      incomingConnections: [],
      linkedPlaces: [],
    });
    await flush();
    expect(el.querySelector('.state.draft')).toBeTruthy();
    expect(
      (el.querySelector('[aria-label="show in map"]') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(el.querySelector('.connections')).toBeNull();
    expect(el.textContent).toContain('not located');
  });
});
