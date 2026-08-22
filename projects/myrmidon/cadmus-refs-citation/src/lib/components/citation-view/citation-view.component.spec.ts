import { render, screen } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { CitationViewComponent } from './citation-view.component';
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
      domain: {
        range: { min: 1, max: 24 },
      },
    },
    verse: {
      type: 'numeric',
      color: '#1ECBE1',
      suffixPattern: '([a-z])$',
      suffixValidPattern: '^[a-z]$',
      domain: {
        range: { min: 1 },
      },
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

describe('CitationViewComponent', () => {
  async function setup(inputs: Record<string, unknown>) {
    return render(CitationViewComponent, {
      inputs: { defaultSchemeId: 'od', ...inputs },
      providers: [
        provideNoopAnimations(),
        { provide: CitSchemeService, useFactory: createSchemeService },
      ],
    });
  }

  it('should create', async () => {
    const { fixture } = await setup({});
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render nothing when citation is undefined', async () => {
    const { container } = await setup({});
    expect(container.querySelector('.range')).toBeFalsy();
  });

  it('should render a single citation object', async () => {
    const { container } = await setup({ citation: CIT_A });
    expect(container.querySelector('.range')).toBeTruthy();
    expect(screen.getByText('α')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    // no separator, no B
    expect(container.textContent).not.toContain(' - ');
  });

  it('should render a citation span with A and B', async () => {
    const span: CitationSpan = { a: CIT_A, b: CIT_B };
    const { container } = await setup({ citation: span });
    expect(screen.getAllByText('α').length).toBe(2);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
    expect(container.textContent).toContain('-');
  });

  it('should parse a string citation using the scheme service', async () => {
    const { fixture } = await setup({ citation: 'α 12' });
    expect(fixture.componentInstance.a()?.steps.length).toBe(2);
    expect(fixture.componentInstance.a()?.steps[0].value).toBe('α');
    expect(fixture.componentInstance.a()?.steps[1].value).toBe('12');
    expect(fixture.componentInstance.b()).toBeUndefined();
  });

  it('should parse a string range citation with " - " separator', async () => {
    const { fixture } = await setup({ citation: 'α 12 - α 20' });
    expect(fixture.componentInstance.a()?.steps[1].value).toBe('12');
    expect(fixture.componentInstance.b()?.steps[1].value).toBe('20');
  });

  it('should not emit click when not clickable', async () => {
    const { fixture, container } = await setup({
      citation: CIT_A,
      clickable: false,
    });
    let emitted = false;
    fixture.componentInstance.click.subscribe(() => (emitted = true));
    const row = container.querySelector('.step-row') as HTMLElement;
    row.click();
    fixture.detectChanges();
    expect(emitted).toBe(false);
  });

  it('should emit click(false) when A is clicked and clickable', async () => {
    const { fixture, container } = await setup({
      citation: CIT_A,
      clickable: true,
    });
    let emitted: boolean | undefined;
    fixture.componentInstance.click.subscribe((b: boolean) => (emitted = b));
    const row = container.querySelector('.step-row') as HTMLElement;
    row.click();
    fixture.detectChanges();
    expect(emitted).toBe(false);
  });

  it('should emit click(true) when B is clicked and clickable', async () => {
    const span: CitationSpan = { a: CIT_A, b: CIT_B };
    const { fixture, container } = await setup({
      citation: span,
      clickable: true,
    });
    let emitted: boolean | undefined;
    fixture.componentInstance.click.subscribe((b: boolean) => (emitted = b));
    const rows = container.querySelectorAll('.step-row');
    expect(rows.length).toBe(2);
    (rows[1] as HTMLElement).click();
    fixture.detectChanges();
    expect(emitted).toBe(true);
  });
});
