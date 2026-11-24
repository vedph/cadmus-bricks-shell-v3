import { render } from '@testing-library/angular';
import { By } from '@angular/platform-browser';

import { AssertedCompositeIdComponent } from '@myrmidon/cadmus-refs-asserted-ids';

import {
  AssertedCompositeIdPgComponent,
  FEATURE_SETTINGS,
} from './asserted-composite-id-pg.component';

const PROVIDERS = [{ provide: 'indexLookupDefinitions', useValue: {} }];

describe('AssertedCompositeIdPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedCompositeIdPgComponent, {
      providers: PROVIDERS,
    });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should pass the feature settings for the selected mode', async () => {
    const { fixture } = await render(AssertedCompositeIdPgComponent, {
      providers: PROVIDERS,
    });
    const editor = () =>
      fixture.debugElement.query(By.directive(AssertedCompositeIdComponent))
        .componentInstance as AssertedCompositeIdComponent;
    expect(editor().featureSettings()).toBe(FEATURE_SETTINGS.thesaurus);

    fixture.componentInstance.featureMode.setValue('taxonomy');
    fixture.detectChanges();

    expect(editor().featureSettings()).toEqual({
      mode: 'taxonomy',
      source: 'animals',
    });
  });
});
