import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import {
  LookupProviderOptions,
  RefLookupConfig,
  RefLookupSetComponent,
  RefLookupSetEvent,
} from '@myrmidon/cadmus-refs-lookup';
import {
  BiblissimaCandidate,
  BiblissimaRefLookupService,
} from '@myrmidon/cadmus-refs-biblissima-lookup';

/**
 * Demo page for the new lookupProviderOptions feature.
 * This demonstrates how to use preset scopes to automatically configure
 * lookup options when a provider is selected.
 */
@Component({
  selector: 'app-preset-ref-lookup-pg',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    RefLookupSetComponent,
  ],
  templateUrl: './preset-ref-lookup-pg.component.html',
  styleUrl: './preset-ref-lookup-pg.component.scss',
})
export class PresetRefLookupPgComponent {
  private readonly _biblissimaService = inject(BiblissimaRefLookupService);

  public selectedItem?: BiblissimaCandidate;

  /**
   * Configuration for the lookup set.
   * Uses Biblissima as the only provider for this demo.
   */
  public readonly configs: RefLookupConfig[] = [
    {
      name: 'Biblissima+',
      iconUrl: '/img/biblissima128.png',
      description: 'Biblissima+ knowledge base',
      label: 'entity',
      service: this._biblissimaService,
      itemIdGetter: (item: BiblissimaCandidate) => item?.id,
      itemLabelGetter: (item: BiblissimaCandidate) => item?.name,
    },
  ];

  /**
   * Preset options for the lookup providers.
   * This demonstrates the new lookupProviderOptions feature.
   *
   * For Biblissima, we define several scopes:
   * - default: null = unlimited search (all entity types)
   * - q168: Human (people only)
   * - q282950: Work (literary/artistic works)
   * - q341508: Organisation
   * - q7089: Place (geographical locations)
   */
  public readonly lookupProviderOptions: LookupProviderOptions = {
    biblissima: {
      default: null, // Allow unlimited search
      q168: {
        label: 'people',
        options: { type: 'Q168' },
      },
      q282950: {
        label: 'works',
        options: { type: 'Q282950' },
      },
      q341508: {
        label: 'organisations',
        options: { type: 'Q341508' },
      },
      q7089: {
        label: 'places',
        options: { type: 'Q7089' },
      },
    },
  };

  /**
   * Same options but without the default scope.
   * This forces users to select a specific scope.
   */
  public readonly forcedScopeOptions: LookupProviderOptions = {
    biblissima: {
      q168: {
        label: 'people',
        options: { type: 'Q168' },
      },
      q282950: {
        label: 'works',
        options: { type: 'Q282950' },
      },
    },
  };

  /**
   * Single scope option - automatically applied without showing selector.
   */
  public readonly singleScopeOptions: LookupProviderOptions = {
    biblissima: {
      q168: {
        label: 'people',
        options: { type: 'Q168' },
      },
    },
  };

  // Track which demo mode is active
  public demoMode: 'default' | 'forced' | 'single' | 'none' = 'default';

  public getCurrentOptions(): LookupProviderOptions | undefined {
    switch (this.demoMode) {
      case 'default':
        return this.lookupProviderOptions;
      case 'forced':
        return this.forcedScopeOptions;
      case 'single':
        return this.singleScopeOptions;
      case 'none':
        return undefined;
    }
  }

  public onItemChange(event: RefLookupSetEvent): void {
    console.log('Item changed:', event);
    this.selectedItem = event.item as BiblissimaCandidate;
  }

  public onMoreRequest(event: RefLookupSetEvent): void {
    console.log('More requested:', event);
  }

  public setDemoMode(mode: 'default' | 'forced' | 'single' | 'none'): void {
    this.demoMode = mode;
    this.selectedItem = undefined;
  }
}
