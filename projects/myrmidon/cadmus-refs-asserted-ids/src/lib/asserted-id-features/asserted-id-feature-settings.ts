import { InjectionToken, Provider } from '@angular/core';

import {
  mergeThesOrTaxoSettings,
  ThesOrTaxoSettings,
} from '@myrmidon/cadmus-ui-thestaxo';

/**
 * The default settings for the features of asserted composite IDs: pick
 * them from the thesaurus entries provided by the editor (typically from
 * thesaurus `asserted-id-features`), as a tree when hierarchical.
 */
export const DEFAULT_ASSERTED_ID_FEATURE_SETTINGS: Readonly<ThesOrTaxoSettings> =
  {
    mode: 'thesaurus',
  };

/**
 * Injection token for the app-level settings used to pick the features of
 * asserted composite IDs. When not provided, features are picked from the
 * thesaurus entries provided by the editor. Provide it via
 * `provideAssertedIdFeatureSettings` to pick features from a taxonomy
 * or from another thesaurus.
 */
export const ASSERTED_ID_FEATURE_SETTINGS = new InjectionToken<
  ThesOrTaxoSettings | null | undefined
>('ASSERTED_ID_FEATURE_SETTINGS');

/**
 * Provide the app-level settings used to pick the features of asserted
 * composite IDs, e.g. in your app.config.ts providers:
 * `provideAssertedIdFeatureSettings({ mode: 'taxonomy', source: 'roles' })`.
 * @param settings The settings.
 * @returns The provider.
 */
export function provideAssertedIdFeatureSettings(
  settings: ThesOrTaxoSettings,
): Provider {
  return { provide: ASSERTED_ID_FEATURE_SETTINGS, useValue: settings };
}

/**
 * Get the effective settings for picking the features of asserted composite
 * IDs, by merging (in order of increasing priority) the defaults, the
 * app-level settings, and the settings got from a component input.
 * Undefined or null properties override nothing.
 * @param appSettings The app-level (injected) settings, if any.
 * @param inputSettings The settings got from input, if any.
 * @returns The effective settings.
 */
export function resolveAssertedIdFeatureSettings(
  appSettings?: ThesOrTaxoSettings | null,
  inputSettings?: ThesOrTaxoSettings | null,
): ThesOrTaxoSettings {
  return mergeThesOrTaxoSettings(
    DEFAULT_ASSERTED_ID_FEATURE_SETTINGS,
    appSettings,
    inputSettings,
  );
}
