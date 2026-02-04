import { Routes } from '@angular/router';

import { HomeComponent } from './components/home/home.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  // cod/location
  {
    path: 'cod/location',
    loadComponent: () =>
      import('./components/cod/cod-location-pg/cod-location-pg.component').then(
        (m) => m.CodLocationPgComponent,
      ),
  },
  // mat/physical-grid
  {
    path: 'mat/physical-grid',
    loadComponent: () =>
      import('./components/mat/physical-grid-pg/physical-grid-pg.component').then(
        (m) => m.PhysicalGridPgComponent,
      ),
  },
  // mat/physical-measurement-set
  {
    path: 'mat/physical-measurement-set',
    loadComponent: () =>
      import('./components/mat/physical-measurement-set-pg/physical-measurement-set-pg.component').then(
        (m) => m.PhysicalMeasurementSetPgComponent,
      ),
  },
  // mat/physical-dimension
  {
    path: 'mat/physical-dimension',
    loadComponent: () =>
      import('./components/mat/physical-dimension-pg/physical-dimension-pg.component').then(
        (m) => m.PhysicalDimensionPgComponent,
      ),
  },
  // mat/physical-size
  {
    path: 'mat/physical-size',
    loadComponent: () =>
      import('./components/mat/physical-size-pg/physical-size-pg.component').then(
        (m) => m.PhysicalSizePgComponent,
      ),
  },
  // mat/physical-state
  {
    path: 'mat/physical-state',
    loadComponent: () =>
      import('./components/mat/physical-state-pg/physical-state-pg.component').then(
        (m) => m.PhysicalStatePgComponent,
      ),
  },
  // refs/asserted-chronotope
  {
    path: 'refs/asserted-chronotope',
    loadComponent: () =>
      import('./components/refs/asserted-chronotope-pg/asserted-chronotope-pg.component').then(
        (m) => m.AssertedChronotopePgComponent,
      ),
  },
  // refs-asserted-chronotope-set
  {
    path: 'refs/asserted-chronotope-set',
    loadComponent: () =>
      import('./components/refs/asserted-chronotope-set-pg/asserted-chronotope-set-pg.component').then(
        (m) => m.AssertedChronotopeSetPgComponent,
      ),
  },
  // refs/asserted-composite-id
  {
    path: 'refs/asserted-composite-id',
    loadComponent: () =>
      import('./components/refs/asserted-composite-id-pg/asserted-composite-id-pg.component').then(
        (m) => m.AssertedCompositeIdPgComponent,
      ),
  },
  // refs/asserted-composite-ids
  {
    path: 'refs/asserted-composite-ids',
    loadComponent: () =>
      import('./components/refs/asserted-composite-ids-pg/asserted-composite-ids-pg.component').then(
        (m) => m.AssertedCompositeIdsPgComponent,
      ),
  },
  // refs/asserted-id
  {
    path: 'refs/asserted-id',
    loadComponent: () =>
      import('./components/refs/asserted-id-pg/asserted-id-pg.component').then(
        (m) => m.AssertedIdPgComponent,
      ),
  },
  // refs/asserted-ids
  {
    path: 'refs/asserted-ids',
    loadComponent: () =>
      import('./components/refs/asserted-ids-pg/asserted-ids-pg.component').then(
        (m) => m.AssertedIdsPgComponent,
      ),
  },
  // refs/assertion
  {
    path: 'refs/assertion',
    loadComponent: () =>
      import('./components/refs/assertion-pg/assertion-pg.component').then(
        (m) => m.AssertionPgComponent,
      ),
  },
  // refs/chronotope
  {
    path: 'refs/chronotope',
    loadComponent: () =>
      import('./components/refs/chronotope-pg/chronotope-pg.component').then(
        (m) => m.ChronotopePgComponent,
      ),
  },
  // refs/citation
  {
    path: 'refs/citation',
    loadComponent: () =>
      import('./components/refs/citation-pg/citation-pg.component').then(
        (m) => m.CitationPgComponent,
      ),
  },
  // refs/compact-citation
  {
    path: 'refs/compact-citation',
    loadComponent: () =>
      import('./components/refs/compact-citation-pg/compact-citation-pg.component').then(
        (m) => m.CompactCitationPgComponent,
      ),
  },
  // refs/citation-set
  {
    path: 'refs/citation-set',
    loadComponent: () =>
      import('./components/refs/citation-set-pg/citation-set-pg.component').then(
        (m) => m.CitationSetPgComponent,
      ),
  },
  // refs/dbpedia-ref-lookup
  {
    path: 'refs/dbpedia-ref-lookup',
    loadComponent: () =>
      import('./components/refs/dbpedia-ref-lookup-pg/dbpedia-ref-lookup-pg.component').then(
        (m) => m.DbpediaRefLookupPgComponent,
      ),
  },
  // refs/decorated-counts
  {
    path: 'refs/decorated-counts',
    loadComponent: () =>
      import('./components/refs/decorated-counts-pg/decorated-counts-pg.component').then(
        (m) => m.DecoratedCountsPgComponent,
      ),
  },
  // refs/decorated-ids
  {
    path: 'refs/decorated-ids',
    loadComponent: () =>
      import('./components/refs/decorated-ids-pg/decorated-ids-pg.component').then(
        (m) => m.DecoratedIdsPgComponent,
      ),
  },
  // refs/doc-references
  {
    path: 'refs/doc-references',
    loadComponent: () =>
      import('./components/refs/doc-references-pg/doc-references-pg.component').then(
        (m) => m.DocReferencesPgComponent,
      ),
  },
  // refs/external-ids
  {
    path: 'refs/external-ids',
    loadComponent: () =>
      import('./components/refs/external-ids-pg/external-ids-pg.component').then(
        (m) => m.ExternalIdsPgComponent,
      ),
  },
  // refs/geonames-ref-lookup
  {
    path: 'refs/geonames-ref-lookup',
    loadComponent: () =>
      import('./components/refs/geonames-ref-lookup-pg/geonames-ref-lookup-pg.component').then(
        (m) => m.GeonamesRefLookupPgComponent,
      ),
  },
  // refs/historical-date
  {
    path: 'refs/historical-date',
    loadComponent: () =>
      import('./components/refs/historical-date-pg/historical-date-pg.component').then(
        (m) => m.HistoricalDatePgComponent,
      ),
  },
  // refs/pin-target-lookup
  {
    path: 'refs/pin-target-lookup',
    loadComponent: () =>
      import('./components/refs/pin-target-lookup-pg/pin-target-lookup-pg.component').then(
        (m) => m.PinTargetLookupPgComponent,
      ),
  },
  // refs/refs-proper-name
  {
    path: 'refs/proper-name',
    loadComponent: () =>
      import('./components/refs/proper-name-pg/proper-name-pg.component').then(
        (m) => m.ProperNamePgComponent,
      ),
  },
  // refs/ref-lookup
  {
    path: 'refs/ref-lookup',
    loadComponent: () =>
      import('./components/refs/ref-lookup-pg/ref-lookup-pg.component').then(
        (m) => m.RefLookupPgComponent,
      ),
  },
  // refs/ref-lookup-set
  {
    path: 'refs/ref-lookup-set',
    loadComponent: () =>
      import('./components/refs/ref-lookup-set-pg/ref-lookup-set-pg.component').then(
        (m) => m.RefLookupSetPgComponent,
      ),
  },
  // refs/biblissima-ref-lookup
  {
    path: 'refs/biblissima-ref-lookup',
    loadComponent: () =>
      import('./components/refs/biblissima-ref-lookup-pg/biblissima-ref-lookup-pg').then(
        (m) => m.BiblissimaRefLookupPg,
      ),
  },
  // refs/preset-ref-lookup
  {
    path: 'refs/preset-ref-lookup',
    loadComponent: () =>
      import('./components/refs/preset-ref-lookup-pg/preset-ref-lookup-pg.component').then(
        (m) => m.PresetRefLookupPgComponent,
      ),
  },
  // refs/ref-lookup-docs
  {
    path: 'refs/ref-lookup-docs',
    loadComponent: () =>
      import('./components/refs/ref-lookup-doc-references-pg/ref-lookup-doc-references-pg.component').then(
        (m) => m.RefLookupDocReferencesPgComponent,
      ),
  },
  // refs/mol-ref-lookup
  {
    path: 'refs/mol-ref-lookup',
    loadComponent: () =>
      import('./components/refs/mol-ref-lookup-pg/mol-ref-lookup-pg').then(
        (m) => m.MolRefLookupPg,
      ),
  },
  // refs/mufi-ref-lookup
  {
    path: 'refs/mufi-ref-lookup',
    loadComponent: () =>
      import('./components/refs/mufi-ref-lookup-pg/mufi-ref-lookup-pg.component').then(
        (m) => m.MufiRefLookupPgComponent,
      ),
  },
  // refs/viaf-ref-lookup
  {
    path: 'refs/viaf-ref-lookup',
    loadComponent: () =>
      import('./components/refs/viaf-ref-lookup-pg/viaf-ref-lookup-pg.component').then(
        (m) => m.ViafRefLookupPgComponent,
      ),
  },
  // refs/whg-ref-lookup
  {
    path: 'refs/whg-ref-lookup',
    loadComponent: () =>
      import('./components/refs/whg-ref-lookup-pg/whg-ref-lookup-pg.component').then(
        (m) => m.WhgRefLookupPgComponent,
      ),
  },
  // refs/zotero-ref-lookup
  {
    path: 'refs/zotero-ref-lookup',
    loadComponent: () =>
      import('./components/refs/zotero-ref-lookup-pg/zotero-ref-lookup-pg.component').then(
        (m) => m.ZoteroRefLookupPgComponent,
      ),
  },
  // text/emoji-ime
  {
    path: 'text/emoji-ime',
    loadComponent: () =>
      import('./components/text/emoji-ime-pg/emoji-ime-pg.component').then(
        (m) => m.EmojiImePgComponent,
      ),
  },
  // text/text-block-view
  {
    path: 'text/text-block-view',
    loadComponent: () =>
      import('./components/text/text-block-view-pg/text-block-view-pg.component').then(
        (m) => m.TextBlockViewPgComponent,
      ),
  },
  // text/text-ed-pg
  {
    path: 'text/text-ed',
    loadComponent: () =>
      import('./components/text/text-ed-pg/text-ed-pg.component').then(
        (m) => m.TextEdPgComponent,
      ),
  },
  // ui/custom-action-bar
  {
    path: 'ui/custom-action-bar',
    loadComponent: () =>
      import('./components/ui/custom-action-bar-pg/custom-action-bar-pg.component').then(
        (m) => m.CustomActionBarPgComponent,
      ),
  },
  // ui/flag-set
  {
    path: 'ui/flag-set',
    loadComponent: () =>
      import('./components/ui/flag-set-pg/flag-set-pg.component').then(
        (m) => m.FlagSetPgComponent,
      ),
  },
  // ui/note-set
  {
    path: 'ui/note-set',
    loadComponent: () =>
      import('./components/ui/note-set-pg/note-set-pg.component').then(
        (m) => m.NoteSetPgComponent,
      ),
  },
  // ui/object-view
  {
    path: 'ui/object-view',
    loadComponent: () =>
      import('./components/ui/object-view-pg/object-view-pg.component').then(
        (m) => m.ObjectViewPgComponent,
      ),
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', component: HomeComponent },
];
