# CadmusRefsMufiLookup

📦 `@myrmidon/cadmus-refs-mufi-lookup`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.0.

Lookup brick for a simple [MUFI](https://mufi.info) (Medieval Unicode Font Initiative) lookup service.

## Requirements

As MUFI does not currently provide any API services, you will need to add the MUFI API service to your Cadmus API using the corresponding package (`Mufi.Api.Controllers`).

The demo page for this service assumes that the endpoints for this controller are reachable at <http://localhost:5113>. You can change the base address from the app's `env.js` file.

## Usage

1. `npm i @myrmidon/cadmus-refs-mufi-lookup`.
2. if you want to use the MUFI icon in a set of lookup providers, add to your `public/img` folder the corresponding image you can find here in the demo app at the same location.
3. add to your `env.js` the root URL for the MUFI service, e.g. (change the URL to reflect your configuration):

    ```js
    // MUFI
    window.__env.mufiUrl = 'http://localhost:5113/';
    ```

4. inject `MufiRefLookupService` in your controller and bind it to the lookup component used in your component.

💡 The service also provides (when available) the SVG code to visualize the corresponding glyph of a character. So, you can add to this lookup also the visualization similarly to what is done in the demo app page. Should you want to change colors in the SVG, use a replace pipe like in the demo and replace the hardcoded color with your desired color.
