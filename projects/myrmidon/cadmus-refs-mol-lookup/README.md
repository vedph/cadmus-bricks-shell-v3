# CadmusRefsMolLookup

📦 `@myrmidon/cadmus-refs-mol-lookup`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.0.

A simple [Manus Online](https://manus.iccu.sbn.it) authority entries lookup service.

## Requirements

⚠️ As MOL does not currently provide any API services, you will need to add the MOL API service to your Cadmus API using the corresponding package (`Mol.Api.Controllers`).

In this workspace, the demo page for this service assumes that the endpoints for this controller are reachable at <http://localhost:5230/api/>. You can change the base address from the app's `env.js` file.

## Usage

1. `npm i @myrmidon/cadmus-refs-mol-lookup`.
2. if you want to use the MOL icon in a set of lookup providers, add to your `public/img` folder the corresponding image you can find here in the demo app at the same location.
3. add to your `env.js` the root URL for the MUFI service, e.g. (change the URL to reflect your configuration):

    ```js
    // MOL
    window.__env.molUrl = 'http://localhost:5230/';
    ```

4. inject `MolRefLookupService` in your controller and bind it to the lookup component used in your component.

## History

### 0.0.1

- 2025-11-26: initial commit.
