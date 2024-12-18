import { Routes } from '@angular/router';

import { HomeComponent } from './components/home/home.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  // cod/location
  {
    path: 'cod/location',
    loadComponent: () =>
      import('./components/cod/cod-location-pg/cod-location-pg.component').then(
        (m) => m.CodLocationPgComponent
      ),
  },
  // img/img-annotator
  {
    path: 'img/img-annotator',
    loadComponent: () =>
      import(
        './components/img/img-annotator-pg/img-annotator-pg.component'
      ).then((m) => m.ImgAnnotatorPgComponent),
  },
  // img/img-annotator-toolbar
  {
    path: 'img/img-annotator-toolbar',
    loadComponent: () =>
      import(
        './components/img/img-annotator-toolbar-pg/img-annotator-toolbar-pg.component'
      ).then((m) => m.ImgAnnotatorToolbarPgComponent),
  },
  // img/img-gallery
  {
    path: 'img/img-gallery',
    loadComponent: () =>
      import('./components/img/img-gallery-pg/img-gallery-pg.component').then(
        (m) => m.ImgGalleryPgComponent
      ),
  },
  // img/sd-img-annotator
  // {
  //   path: 'img/sd-img-annotator',
  //   loadComponent: () =>
  //     import(
  //       './components/img/sd-img-annotator-pg/sd-img-annotator-pg.component'
  //     ).then((m) => m.SdImgAnnotatorPgComponent),
  // },
  // img/sd-img-gallery
  // {
  //   path: 'img/sd-img-gallery',
  //   loadComponent: () =>
  //     import(
  //       './components/img/sd-img-gallery-pg/sd-img-gallery-pg.component'
  //     ).then((m) => m.SdImgGalleryPgComponent),
  // },
  // mat/physical-grid
  {
    path: 'mat/physical-grid',
    loadComponent: () =>
      import(
        './components/mat/physical-grid-pg/physical-grid-pg.component'
      ).then((m) => m.PhysicalGridPgComponent),
  },
  // mat/physical-measurement-set
  {
    path: 'mat/physical-measurement-set',
    loadComponent: () =>
      import(
        './components/mat/physical-measurement-set-pg/physical-measurement-set-pg.component'
      ).then((m) => m.PhysicalMeasurementSetPgComponent),
  },
  // mat/physical-size
  {
    path: 'mat/physical-size',
    loadComponent: () =>
      import(
        './components/mat/physical-size-pg/physical-size-pg.component'
      ).then((m) => m.PhysicalSizePgComponent),
  },
  // mat/physical-state
  {
    path: 'mat/physical-state',
    loadComponent: () =>
      import(
        './components/mat/physical-state-pg/physical-state-pg.component'
      ).then((m) => m.PhysicalStatePgComponent),
  },
  // refs/asserted-chronotope
  {
    path: 'refs/asserted-chronotope',
    loadComponent: () =>
      import(
        './components/refs/asserted-chronotope-pg/asserted-chronotope-pg.component'
      ).then((m) => m.AssertedChronotopePgComponent),
  },
  // refs-asserted-chronotope-set
  {
    path: 'refs/asserted-chronotope-set',
    loadComponent: () =>
      import(
        './components/refs/asserted-chronotope-set-pg/asserted-chronotope-set-pg.component'
      ).then((m) => m.AssertedChronotopeSetPgComponent),
  },
  // refs/asserted-composite-id
  {
    path: 'refs/asserted-composite-id',
    loadComponent: () =>
      import(
        './components/refs/asserted-composite-id-pg/asserted-composite-id-pg.component'
      ).then((m) => m.AssertedCompositeIdPgComponent),
  },
  // refs/asserted-id
  {
    path: 'refs/asserted-id',
    loadComponent: () =>
      import('./components/refs/asserted-id-pg/asserted-id-pg.component').then(
        (m) => m.AssertedIdPgComponent
      ),
  },
  // refs/asserted-ids
  {
    path: 'refs/asserted-ids',
    loadComponent: () =>
      import(
        './components/refs/asserted-ids-pg/asserted-ids-pg.component'
      ).then((m) => m.AssertedIdsPgComponent),
  },
  // refs/assertion
  {
    path: 'refs/assertion',
    loadComponent: () =>
      import('./components/refs/assertion-pg/assertion-pg.component').then(
        (m) => m.AssertionPgComponent
      ),
  },
  // refs/chronotope
  {
    path: 'refs/chronotope',
    loadComponent: () =>
      import('./components/refs/chronotope-pg/chronotope-pg.component').then(
        (m) => m.ChronotopePgComponent
      ),
  },
  // refs/dbpedia-ref-lookup
  {
    path: 'refs/dbpedia-ref-lookup',
    loadComponent: () =>
      import(
        './components/refs/dbpedia-ref-lookup-pg/dbpedia-ref-lookup-pg.component'
      ).then((m) => m.DbpediaRefLookupPgComponent),
  },
  // refs/decorated-counts
  {
    path: 'refs/decorated-counts',
    loadComponent: () =>
      import(
        './components/refs/decorated-counts-pg/decorated-counts-pg.component'
      ).then((m) => m.DecoratedCountsPgComponent),
  },
  // refs/decorated-ids
  {
    path: 'refs/decorated-ids',
    loadComponent: () =>
      import(
        './components/refs/decorated-ids-pg/decorated-ids-pg.component'
      ).then((m) => m.DecoratedIdsPgComponent),
  },
  // refs/doc-references
  {
    path: 'refs/doc-references',
    loadComponent: () =>
      import(
        './components/refs/doc-references-pg/doc-references-pg.component'
      ).then((m) => m.DocReferencesPgComponent),
  },
  // refs/external-ids
  {
    path: 'refs/external-ids',
    loadComponent: () =>
      import(
        './components/refs/external-ids-pg/external-ids-pg.component'
      ).then((m) => m.ExternalIdsPgComponent),
  },
  // refs/geonames-ref-lookup
  {
    path: 'refs/geonames-ref-lookup',
    loadComponent: () =>
      import(
        './components/refs/geonames-ref-lookup-pg/geonames-ref-lookup-pg.component'
      ).then((m) => m.GeonamesRefLookupPgComponent),
  },
  // refs/historical-date
  {
    path: 'refs/historical-date',
    loadComponent: () =>
      import(
        './components/refs/historical-date-pg/historical-date-pg.component'
      ).then((m) => m.HistoricalDatePgComponent),
  },
  // refs/pin-target-lookup
  {
    path: 'refs/pin-target-lookup',
    loadComponent: () =>
      import(
        './components/refs/pin-target-lookup-pg/pin-target-lookup-pg.component'
      ).then((m) => m.PinTargetLookupPgComponent),
  },
  // refs/refs-proper-name
  {
    path: 'refs/proper-name',
    loadComponent: () =>
      import('./components/refs/proper-name-pg/proper-name-pg.component').then(
        (m) => m.ProperNamePgComponent
      ),
  },
  // refs/ref-lookup
  {
    path: 'refs/ref-lookup',
    loadComponent: () =>
      import('./components/refs/ref-lookup-pg/ref-lookup-pg.component').then(
        (m) => m.RefLookupPgComponent
      ),
  },
  // refs/ref-lookup-set
  {
    path: 'refs/ref-lookup-set',
    loadComponent: () =>
      import(
        './components/refs/ref-lookup-set-pg/ref-lookup-set-pg.component'
      ).then((m) => m.RefLookupSetPgComponent),
  },
  // refs/viaf-ref-lookup
  {
    path: 'refs/viaf-ref-lookup',
    loadComponent: () =>
      import(
        './components/refs/viaf-ref-lookup-pg/viaf-ref-lookup-pg.component'
      ).then((m) => m.ViafRefLookupPgComponent),
  },
  // refs/whg-ref-lookup
  {
    path: 'refs/whg-ref-lookup',
    loadComponent: () =>
      import(
        './components/refs/whg-ref-lookup-pg/whg-ref-lookup-pg.component'
      ).then((m) => m.WhgRefLookupPgComponent),
  },
  // text/emoji-ime
  {
    path: 'text/emoji-ime',
    loadComponent: () =>
      import('./components/text/emoji-ime-pg/emoji-ime-pg.component').then(
        (m) => m.EmojiImePgComponent
      ),
  },
  // text/text-block-view
  {
    path: 'text/text-block-view',
    loadComponent: () =>
      import(
        './components/text/text-block-view-pg/text-block-view-pg.component'
      ).then((m) => m.TextBlockViewPgComponent),
  },
  // text/text-ed-pg
  {
    path: 'text/text-ed',
    loadComponent: () =>
      import('./components/text/text-ed-pg/text-ed-pg.component').then(
        (m) => m.TextEdPgComponent
      ),
  },
  // ui/custom-action-bar
  {
    path: 'ui/custom-action-bar',
    loadComponent: () =>
      import(
        './components/ui/custom-action-bar-pg/custom-action-bar-pg.component'
      ).then((m) => m.CustomActionBarPgComponent),
  },
  // ui/flag-set
  {
    path: 'ui/flag-set',
    loadComponent: () =>
      import('./components/ui/flag-set-pg/flag-set-pg.component').then(
        (m) => m.FlagSetPgComponent
      ),
  },
  // ui/note-set
  {
    path: 'ui/note-set',
    loadComponent: () =>
      import('./components/ui/note-set-pg/note-set-pg.component').then(
        (m) => m.NoteSetPgComponent
      ),
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', component: HomeComponent },
];
