import { render } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { CitationSetComponent } from './citation-set.component';
import { Citation, CitationSpan, CitScheme, CitSchemeSet, CitMappedValues } from '../../models';
import { CitSchemeService } from '../../services/cit-scheme.service';
import { MapFormatter } from '../../services/map.formatter';
import { RamStorageService } from '@myrmidon/ngx-tools';

//#region Scheme
const OD_SCHEME: CitScheme = {
  id: 'od',
  name: 'Odyssey',
  path: ['book', 'verse'],
  optionalFrom: 'verse',
  textOptions: {
    pathPattern: '^\\s*([αβγδεζηθικλμνξοπρστυφχψω])\\s+(\\d+(?:[a-z])?)\\s*$',
    template: '{book} {verse}',
    hint: 'book (α-ω) verse (1-N[a-z])',
  },
  color: '#4287f5',
  steps: {
    book: {
      type: 'numeric',
      color: '#4287f5',
      format: 'agl',
      domain: { range: { min: 1, max: 24 } },
    },
    verse: {
      type: 'numeric',
      color: '#1ECBE1',
      suffixPattern: '([a-z])$',
      suffixValidPattern: '^[a-z]$',
      domain: { range: { min: 1 } },
    },
  },
};
//#endregion

function createSchemeService(): CitSchemeService {
  const service = new CitSchemeService(new RamStorageService());
  service.configure({
    formats: {},
    schemes: { od: OD_SCHEME },
  } as CitSchemeSet);
  const aglFormatter = new MapFormatter();
  const aglMap: CitMappedValues = {};
  for (let n = 0x3b1; n <= 0x3c9; n++) {
    if (n === 0x3c2) {
      continue;
    }
    aglMap[String.fromCharCode(n)] = n - 0x3b0;
  }
  aglFormatter.configure(aglMap);
  service.addFormatter('agl', aglFormatter);
  return service;
}

const CIT_1: Citation = {
  schemeId: 'od',
  steps: [
    { stepId: 'book', value: 'α', n: 1, color: '#4287f5' },
    { stepId: 'verse', value: '12', n: 12, color: '#1ECBE1' },
  ],
};

const CIT_2: Citation = {
  schemeId: 'od',
  steps: [
    { stepId: 'book', value: 'β', n: 2, color: '#4287f5' },
    { stepId: 'verse', value: '5', n: 5, color: '#1ECBE1' },
  ],
};

const CIT_3: Citation = {
  schemeId: 'od',
  steps: [
    { stepId: 'book', value: 'α', n: 1, color: '#4287f5' },
    { stepId: 'verse', value: '20', n: 20, color: '#1ECBE1' },
  ],
};

describe('CitationSetComponent', () => {
  async function setup(inputs: Record<string, unknown> = {}) {
    return render(CitationSetComponent, {
      inputs,
      providers: [
        provideNoopAnimations(),
        { provide: CitSchemeService, useFactory: createSchemeService },
      ],
    });
  }

  it('should create', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should compact citation spans with a missing B into plain citations', async () => {
    const span: CitationSpan = { a: CIT_1 };
    const { fixture } = await setup({ citations: [span, CIT_2] });
    const edited = fixture.componentInstance.editedCitations();
    expect(edited.length).toBe(2);
    expect((edited[0] as CitationSpan).a).toBeUndefined();
    expect(edited[0]).toEqual(CIT_1);
  });

  it('should keep genuine spans with both A and B', async () => {
    const span: CitationSpan = { a: CIT_1, b: CIT_3 };
    const { fixture } = await setup({ citations: [span] });
    const edited = fixture.componentInstance.editedCitations();
    expect((edited[0] as CitationSpan).a).toEqual(CIT_1);
    expect((edited[0] as CitationSpan).b).toEqual(CIT_3);
  });

  it('newCitation should open editor with an empty citation using defaultSchemeId', async () => {
    const { fixture } = await setup({ defaultSchemeId: 'od' });
    fixture.componentInstance.newCitation();
    fixture.detectChanges();
    expect(fixture.componentInstance.editedCitationIndex()).toBe(-1);
    expect((fixture.componentInstance.editedCitation() as Citation).schemeId).toBe(
      'od'
    );
  });

  it('newCitation should fall back to the first available scheme when no default is set', async () => {
    const { fixture } = await setup();
    fixture.componentInstance.newCitation();
    expect((fixture.componentInstance.editedCitation() as Citation).schemeId).toBe(
      'od'
    );
  });

  it('editCitation should select the citation at the given index', async () => {
    const { fixture } = await setup({ citations: [CIT_1, CIT_2] });
    fixture.componentInstance.editCitation(1);
    fixture.detectChanges();
    expect(fixture.componentInstance.editedCitationIndex()).toBe(1);
    expect(fixture.componentInstance.editedCitation()).toEqual(CIT_2);
  });

  it('closeCitation should reset edited state', async () => {
    const { fixture } = await setup({ citations: [CIT_1] });
    fixture.componentInstance.editCitation(0);
    fixture.componentInstance.closeCitation();
    expect(fixture.componentInstance.editedCitationIndex()).toBeUndefined();
    expect(fixture.componentInstance.editedCitation()).toBeUndefined();
  });

  it('saveCitation should append a new citation when index is -1', async () => {
    const { fixture } = await setup({ citations: [CIT_1] });
    fixture.componentInstance.newCitation();
    fixture.componentInstance.saveCitation(CIT_2);
    fixture.detectChanges();
    expect(fixture.componentInstance.citations()?.length).toBe(2);
    expect(fixture.componentInstance.citations()?.[1]).toEqual(CIT_2);
  });

  it('saveCitation should replace the citation at the edited index', async () => {
    const { fixture } = await setup({ citations: [CIT_1, CIT_2] });
    fixture.componentInstance.editCitation(0);
    fixture.componentInstance.saveCitation(CIT_3);
    fixture.detectChanges();
    expect(fixture.componentInstance.citations()?.[0]).toEqual(CIT_3);
    expect(fixture.componentInstance.citations()?.length).toBe(2);
  });

  it('moveCitationUp should swap with the previous item', async () => {
    const { fixture } = await setup({ citations: [CIT_1, CIT_2] });
    fixture.componentInstance.moveCitationUp(1);
    fixture.detectChanges();
    expect(fixture.componentInstance.citations()).toEqual([CIT_2, CIT_1]);
  });

  it('moveCitationUp should be a no-op at index 0', async () => {
    const { fixture } = await setup({ citations: [CIT_1, CIT_2] });
    fixture.componentInstance.moveCitationUp(0);
    fixture.detectChanges();
    expect(fixture.componentInstance.citations()).toEqual([CIT_1, CIT_2]);
  });

  it('moveCitationDown should swap with the next item', async () => {
    const { fixture } = await setup({ citations: [CIT_1, CIT_2] });
    fixture.componentInstance.moveCitationDown(0);
    fixture.detectChanges();
    expect(fixture.componentInstance.citations()).toEqual([CIT_2, CIT_1]);
  });

  it('moveCitationDown should be a no-op at the last index', async () => {
    const { fixture } = await setup({ citations: [CIT_1, CIT_2] });
    fixture.componentInstance.moveCitationDown(1);
    fixture.detectChanges();
    expect(fixture.componentInstance.citations()).toEqual([CIT_1, CIT_2]);
  });

  it('deleteCitation should remove the citation at the given index', async () => {
    const { fixture } = await setup({ citations: [CIT_1, CIT_2] });
    fixture.componentInstance.deleteCitation(0);
    fixture.detectChanges();
    expect(fixture.componentInstance.citations()).toEqual([CIT_2]);
  });

  it('sort should reorder citations according to scheme comparison', async () => {
    // CIT_2 (book beta=2) should come after CIT_1 and CIT_3 (book alpha=1)
    const { fixture } = await setup({ citations: [CIT_2, CIT_3, CIT_1] });
    fixture.componentInstance.sort();
    fixture.detectChanges();
    expect(fixture.componentInstance.citations()).toEqual([CIT_1, CIT_3, CIT_2]);
  });

  it('getSchemeColor should return the scheme color when known', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance.getSchemeColor('od')).toBe('#4287f5');
  });

  it('getSchemeColor should return transparent for an unknown scheme', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance.getSchemeColor('unknown')).toBe(
      'transparent'
    );
  });

  it('should render a row per edited citation, and the editor when one is being edited', async () => {
    const { container, fixture } = await setup({ citations: [CIT_1, CIT_2] });
    expect(container.querySelectorAll('tbody tr').length).toBe(2);
    expect(container.querySelector('mat-expansion-panel')).toBeFalsy();

    fixture.componentInstance.editCitation(0);
    fixture.detectChanges();
    expect(container.querySelector('mat-expansion-panel')).toBeTruthy();
  });
});
