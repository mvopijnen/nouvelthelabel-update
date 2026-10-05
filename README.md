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

Theme Check moet nul fouten geven. Alle geërfde fouten zijn opgelost; de oude baseline accepteert geen errors meer. De runner bewaart de ruwe CLI-exitcode en faalt op iedere error. De aanbevolen regels blijven aan en alle uploadmappen worden gecontroleerd. Er blijven 316 waarschuwingen, afzonderlijk gerapporteerd.

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

De Node-API krijgt een expliciete mobiele of desktopconfiguratie. Verkeerde formFactor, viewport of user-agent, ontbrekende runs en inconsistente metadata maken de run ongeldig. De oude desktopbaseline was feitelijk mobiel en is ongeldig verklaard. Gebruik [de gecorrigeerde zes labruns](docs/lab-baseline-round-2-2026-10-05.json).

Zie [de actuele audit van ronde 2](docs/production-readiness-round-2.md), [preview CI en benodigde secrets](docs/shopify-preview-ci.md), [bestandsherkomst](docs/theme-path-mapping.json) en [CSS-bronnen](docs/css-sources.json). De zichtbare prijzen behouden nu Shopify's echte centbedragen. Reviewstyling, selectors, instellingen en overige reviewcode zijn exact beschermd; alleen de expliciet gevraagde observerregistratie is aangepast met dynamische regressietests. De homepageconfiguratie en bestaande branding zijn behouden.

`npm run preview:check` slaat previewwerk zonder credentials expliciet over. De PR-workflow deployt uitsluitend naar een bestaand dedicated unpublished theme; zie de documentatie voor E2E, axe, zes labruns en acceptatie. Zonder uitgevoerde Shopify-previewtests en nametingen is volledige production-readiness nog niet aangetoond. Merge, live-publicatie en bestellingen vallen buiten deze oplevering.
