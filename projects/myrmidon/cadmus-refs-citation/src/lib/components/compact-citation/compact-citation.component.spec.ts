import { render } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { CompactCitationComponent } from './compact-citation.component';
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

const CIT_A: Citation = {
  schemeId: 'od',
  steps: [
    { stepId: 'book', value: 'α', n: 1, color: '#4287f5' },
    { stepId: 'verse', value: '12', n: 12, color: '#1ECBE1' },
  ],
};

const CIT_B: Citation = {
  schemeId: 'od',
  steps: [
    { stepId: 'book', value: 'α', n: 1, color: '#4287f5' },
    { stepId: 'verse', value: '20', n: 20, color: '#1ECBE1' },
  ],
};

describe('CompactCitationComponent', () => {
  async function setup(inputs: Record<string, unknown> = {}) {
    return render(CompactCitationComponent, {
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

  it('should show "no citation" message when there is none', async () => {
    const { container } = await setup();
    expect(container.textContent).toContain('no citation');
  });

  it('should not show "no citation" message when a citation is set', async () => {
    const { container } = await setup({ citation: CIT_A });
    expect(container.textContent).not.toContain('no citation');
  });

  it('should update a/b signals and range control from an initial single citation', async () => {
    const { fixture } = await setup({ citation: CIT_A });
    expect(fixture.componentInstance.a()).toEqual(CIT_A);
    expect(fixture.componentInstance.b()).toBeUndefined();
    expect(fixture.componentInstance.range.value).toBe(false);
  });

  it('should update a/b signals and range control from an initial span citation', async () => {
    const span: CitationSpan = { a: CIT_A, b: CIT_B };
    const { fixture } = await setup({ citation: span });
    expect(fixture.componentInstance.a()).toEqual(CIT_A);
    expect(fixture.componentInstance.b()).toEqual(CIT_B);
    expect(fixture.componentInstance.range.value).toBe(true);
  });

  it('should compute defaultSchemeId from a single citation', async () => {
    const { fixture } = await setup({ citation: CIT_A });
    expect(fixture.componentInstance.defaultSchemeId()).toBe('od');
  });

  it('should compute defaultSchemeId from a span citation using A', async () => {
    const span: CitationSpan = { a: CIT_A, b: CIT_B };
    const { fixture } = await setup({ citation: span });
    expect(fixture.componentInstance.defaultSchemeId()).toBe('od');
  });

  it('should open the editor for A on editA()', async () => {
    const { fixture } = await setup({ citation: CIT_A });
    fixture.componentInstance.editA();
    fixture.detectChanges();
    expect(fixture.componentInstance.editedIndex()).toBe(0);
    expect(fixture.componentInstance.edited()).toEqual(CIT_A);
  });

  it('should create an empty citation with no scheme ID when editing A with no existing citation or scheme context', async () => {
    // there is no citation and no scheme context yet, so defaultSchemeId()
    // computes to '', and the empty citation created for editing has an
    // empty schemeId until the user picks one in the citation editor
    const { fixture } = await setup();
    fixture.componentInstance.editA();
    fixture.detectChanges();
    expect(fixture.componentInstance.editedIndex()).toBe(0);
    expect(fixture.componentInstance.edited()).toEqual({
      schemeId: '',
      steps: [],
    });
  });

  it('should open the editor for B on editB()', async () => {
    const span: CitationSpan = { a: CIT_A, b: CIT_B };
    const { fixture } = await setup({ citation: span });
    fixture.componentInstance.editB();
    fixture.detectChanges();
    expect(fixture.componentInstance.editedIndex()).toBe(1);
    expect(fixture.componentInstance.edited()).toEqual(CIT_B);
  });

  it('onCitClick should route to editA/editB', async () => {
    const span: CitationSpan = { a: CIT_A, b: CIT_B };
    const { fixture } = await setup({ citation: span });
    fixture.componentInstance.onCitClick(true);
    expect(fixture.componentInstance.editedIndex()).toBe(1);
    fixture.componentInstance.onCitClick(false);
    expect(fixture.componentInstance.editedIndex()).toBe(0);
  });

  it('closeCitation should reset edited state', async () => {
    const { fixture } = await setup({ citation: CIT_A });
    fixture.componentInstance.editA();
    fixture.componentInstance.closeCitation();
    expect(fixture.componentInstance.editedIndex()).toBe(-1);
    expect(fixture.componentInstance.edited()).toBeUndefined();
  });

  it('should add B and open its editor when range is toggled on', async () => {
    const { fixture } = await setup({ citation: CIT_A });
    fixture.componentInstance.range.setValue(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.b()).toBeTruthy();
    expect(fixture.componentInstance.editedIndex()).toBe(1);
  });

  it('should remove B and save when range is toggled off', async () => {
    const span: CitationSpan = { a: CIT_A, b: CIT_B };
    const { fixture } = await setup({ citation: span });
    fixture.componentInstance.range.setValue(false);
    fixture.detectChanges();
    expect(fixture.componentInstance.b()).toBeUndefined();
    expect(fixture.componentInstance.citation()).toEqual(CIT_A);
  });

  it('onCitationChange for A should update a, validate and save in single mode', async () => {
    const { fixture } = await setup();
    fixture.componentInstance.editA();
    fixture.componentInstance.onCitationChange(CIT_A);
    fixture.detectChanges();
    expect(fixture.componentInstance.formError()).toBeUndefined();
    expect(fixture.componentInstance.editedIndex()).toBe(-1);
    expect(fixture.componentInstance.citation()).toEqual(CIT_A);
  });

  it('onCitationChange with undefined citation for A should clear B too', async () => {
    const span: CitationSpan = { a: CIT_A, b: CIT_B };
    const { fixture } = await setup({ citation: span });
    fixture.componentInstance.editA();
    fixture.componentInstance.onCitationChange(undefined);
    expect(fixture.componentInstance.a()).toBeUndefined();
    expect(fixture.componentInstance.b()).toBeUndefined();
  });

  it('should set formError when in range mode and B is missing', async () => {
    // passing a span-shaped citation with only "a" makes isSpan true,
    // range true, and b undefined, which should trigger validation
    const { fixture } = await setup({ citation: { a: CIT_A } as CitationSpan });
    expect(fixture.componentInstance.range.value).toBe(true);
    expect(fixture.componentInstance.b()).toBeUndefined();
    expect(fixture.componentInstance.formError()).toBe('A and B are required');
  });

  it('should set formError when B does not come after A', async () => {
    const span: CitationSpan = { a: CIT_B, b: CIT_A }; // B before A (reverse order)
    const { fixture } = await setup({ citation: span });
    expect(fixture.componentInstance.formError()).toBe('B must come after A');
  });

  it('should save a valid span in range mode via onCitationChange for B', async () => {
    const { fixture } = await setup({ citation: CIT_A });
    fixture.componentInstance.range.setValue(true);
    fixture.detectChanges();
    // editedIndex should now be 1 (editing B)
    fixture.componentInstance.onCitationChange(CIT_B);
    fixture.detectChanges();
    expect(fixture.componentInstance.formError()).toBeUndefined();
    const result = fixture.componentInstance.citation() as CitationSpan;
    expect(result.a).toEqual(CIT_A);
    expect(result.b).toEqual(CIT_B);
  });

  it('should restrict abSchemeKeys to A scheme when editing B', async () => {
    const span: CitationSpan = { a: CIT_A, b: CIT_B };
    const { fixture } = await setup({ citation: span, schemeKeys: ['od'] });
    fixture.componentInstance.editB();
    fixture.detectChanges();
    expect(fixture.componentInstance.abSchemeKeys()).toEqual(['od']);
  });
});
