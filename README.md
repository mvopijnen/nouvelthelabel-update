# Nouvél the Label — Shopify theme

De actuele themebestanden staan in `assets/`, `config/`, `layout/`, `locales/`, `sections/`, `snippets/` en `templates/`. De oudere export-ZIP is uitsluitend bronmateriaal voor ontbrekende bestanden; vervang de actuele code daar niet mee.

## Lokale controles

Vereist: Node.js 24, npm, Python 3 en Chrome/Chromium. `CHROME_PATH` kan het browserpad instellen; standaard wordt een beschikbare systeeminstallatie gebruikt.

```sh
npm ci
npm run validate
npm test
npm run test:browser
npm run theme-check
npm run package
```

In een cloudomgeving met een beperkt beschrijfbare home-directory: `npm ci --cache /workspace/.npm-cache`. TLS- en pakketintegriteitscontrole blijven ingeschakeld.

Theme Check heeft bestaande fouten. De regressiepoort vergelijkt exacte meldingen met `docs/theme-check-known-errors.json`, bewaart de ruwe CLI-exitcode en faalt op nieuwe fouten. Een geslaagde regressiepoort betekent geen foutloos theme. Alle uploadmappen blijven gecontroleerd; ontwikkelbestanden en meettraces zijn geen theme-input.

De upload-ZIP staat in `artifacts/nouvelthelabel-update-shopify.zip`; alleen de zeven thememappen staan direct in de ZIP-root. GitHub Actions herhaalt de controles en bewaart het uploadbestand en controle-uitvoer als artifact.

## Storefrontmetingen

```sh
node scripts/measure-performance.mjs mobile 1 https://nouvelthelabel.com/ artifacts/performance-baseline
node scripts/measure-performance.mjs desktop 1 https://nouvelthelabel.com/ artifacts/performance-baseline
# Herhaal elk profiel sequentieel voor runs 2 en 3.
python3 scripts/summarize-performance.py artifacts/performance-baseline
node scripts/inspect-storefront.cjs
```

Gebruik voor de nameting een ongepubliceerde Shopify-preview met deze code en een afzonderlijke uitvoermap. Een publieke URL zonder gewijzigd theme is uitsluitend een nulmeting. Houd browser, netwerkbeleid, consent, throttling en cachecondities gelijk. De scripts gebruiken de bestaande HTTPS-proxy indien ingesteld en houden certificaatcontrole actief. Het browsercertificaatvertrouwen moet vooraf werken.

Zie [de volledige audit](docs/codeaudit-2026-10-05.md), [bestandsherkomst](docs/theme-path-mapping.json), [CSS-bronnen](docs/css-sources.json) en [verse labnulmetingen](docs/lab-baseline-2026-10-05.json). Reviews zijn beschermd door exacte Git-vergelijkingen. Merge of live-publicatie valt buiten deze oplevering.
