// https://www.jvandemo.com/how-to-use-environment-variables-to-configure-your-angular-application-without-a-rebuild/
(function (window) {
  window.__env = window.__env || {};
  window.__env.version = "8.0.5";
  // this is for local development with MUFI
  window.__env.mufiUrl = 'http://localhost:5113/api/';
})(this);
