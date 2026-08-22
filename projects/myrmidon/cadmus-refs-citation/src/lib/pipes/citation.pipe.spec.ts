import { vi } from 'vitest';

import { CitationPipe } from './citation.pipe';
import { CitSchemeService } from '../services/cit-scheme.service';
import { Citation, CitationSpan } from '../models';

describe('CitationPipe', () => {
  let schemeService: CitSchemeService;
  let pipe: CitationPipe;

  beforeEach(() => {
    schemeService = {
      toString: vi.fn().mockReturnValue('@dc:If. I 1'),
    } as unknown as CitSchemeService;
    pipe = new CitationPipe(schemeService);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('returns an empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('delegates to CitSchemeService.toString for a Citation', () => {
    const citation: Citation = {
      schemeId: 'dc',
      steps: [{ stepId: 'cantica', value: 'If.' }],
    };
    const result = pipe.transform(citation);

    expect(schemeService.toString).toHaveBeenCalledWith(citation);
    expect(result).toBe('@dc:If. I 1');
  });

  it('delegates to CitSchemeService.toString for a CitationSpan', () => {
    const span: CitationSpan = {
      a: { schemeId: 'dc', steps: [{ stepId: 'cantica', value: 'If.' }] },
      b: { schemeId: 'dc', steps: [{ stepId: 'cantica', value: 'Purg.' }] },
    };
    pipe.transform(span);

    expect(schemeService.toString).toHaveBeenCalledWith(span);
  });
});
