# Third-party code

Everything in this folder was written by someone else and is kept here so the app
works offline. Nothing is loaded from a CDN.

## qrcode-generator 2.0.4

- Author: Kazuhiko Arase
- Licence: MIT (see `qrcode-generator/LICENSE`)
- Source: npm package `qrcode-generator@2.0.4`
  (https://registry.npmjs.org/qrcode-generator/-/qrcode-generator-2.0.4.tgz),
  repository https://github.com/kazuhikoarase/qrcode-generator
- Tarball checksum (matches the npm registry):
  `sha512-mZSiP6RnbHl4xL2Ap5HfkjLnmxfKcPWpWe/c+5XxCuetEenqmNFf1FH/ftXPCtFG5/TDobjsjz6sSNL0Sr8Z9g==`
- File used: `dist/qrcode.mjs` (the ES-module build), unchanged except for its name.
  It is saved as `qrcode-esm.js` because some web servers (including Python's
  `http.server` on Windows) send `.mjs` files with the wrong content type, and
  browsers refuse to run a module that isn't served as JavaScript.

The app only uses the library to work out which squares of a QR code are dark
(`qrcode()`, `addData()`, `make()`, `getModuleCount()`, `isDark()`).
`js/qr.js` turns those squares into an SVG picture.
