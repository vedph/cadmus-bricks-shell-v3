// https://www.jvandemo.com/how-to-use-environment-variables-to-configure-your-angular-application-without-a-rebuild/
(function (window) {
  window.__env = window.__env || {};
  window.__env.version = "10.0.8";
  // this is for local development with MOL
  window.__env.molUrl = "http://localhost:5132/api/";
  // this is for local development with MUFI
  window.__env.mufiUrl = "http://localhost:5132/api/";
  // proxy for external APIs (CORS bypass for local development)
  window.__env.proxyUrl = "http://localhost:5132/api/proxy/";
  // Zotero
  window.__env.zoteroApiKey = "TODO:YOUR_ZOTERO_KEY";
  window.__env.zoteroUserId = "TODO:YOUR_ZOTERO_USER_ID";
  window.__env.zoteroLibraryId = "TODO:YOUR_ZOTERO_LIBRARY_ID";
})(this);
