# Ongepubliceerde Shopify-preview en acceptatie

Workflow: `.github/workflows/shopify-preview.yml`. Geen `pull_request_target`, geen credentials voor forks, geen live-publicatie. Eén dedicated ongepubliceerd theme per repository; runs worden sequentieel uitgevoerd. Gebruik een teststore als cart/checkout-tests niet op de productiestore gewenst zijn.

Maak in Shopify een **ongepubliceerd testtheme** en noteer het ID. Het script controleert de rol voor en na de upload en weigert `main`, `live`, `development`, een ontbrekend ID of een onverwacht uploadresultaat. Het gebruikt alleen `theme push --theme ID --strict --nodelete --json`; nooit `--publish`, `--live` of `--allow-live`. Geërfde `SHOPIFY_FLAG_*`-variabelen worden uit de CLI-omgeving verwijderd. Alleen de gegenereerde upload-ZIP wordt geüpload.

## GitHub-configuratie

Repository Secrets of environment `shopify-preview` Secrets:

| Secret | Waarde en gebruik |
| --- | --- |
| `SHOPIFY_STORE_DOMAIN` | Bare hostname van de teststore, bijvoorbeeld `voorbeeld.myshopify.com`; geen URL/pad/custom storefrontdomain |
| `SHOPIFY_CLI_THEME_TOKEN` | Shopify Theme Access-password/token met theme-lees- en schrijfrechten; uitsluitend doorgeven via environment, nooit argument/log |
| `SHOPIFY_PREVIEW_THEME_ID` | Numeriek ID van het dedicated **unpublished** theme; nooit het live ID |
| `SHOPIFY_STOREFRONT_PASSWORD` | Alleen nodig wanneer de storefront wachtwoordbeveiligd is; geen Shopify-adminwachtwoord |

Repository/environment Variables:

| Variable | Vereiste fixture |
| --- | --- |
| `SHOPIFY_E2E_PRODUCT_HANDLE` | Bestaand product met minimaal twee varianten, minimaal één beschikbare variant met voorraad voor twee stuks. Kies bij voorkeur varianten met verschillende prijzen en een uitverkochte variant zodat prijs- en voorraadwissels daadwerkelijk worden getest. Geen productdata automatisch aanmaken/wijzigen. |
| `SHOPIFY_E2E_COLLECTION_PATH` | Standaard `/collections/all`. Gebruik een bestaande collectie met producten en minstens één beschikbaar checkboxfilter, plus sortering op prijs. |

De drie verplichte secrets ontbreken in deze cloudomgeving. De GitHub-integratie mag secretmetadata niet lezen; de workflow bepaalt aanwezigheid tijdens de CI-run. `npm run preview:check` geeft zonder secrets expliciet `skipped` terug, schrijft `readiness.json` en publiceert niets. Ongeldige aanwezige configuratie geeft een fout. Met credentials maar een ontbrekende fixture faalt E2E duidelijk; dat telt niet als geslaagde Shopify-validatie.

## Uitgevoerde stappen

`npm ci` → `validate` → unit/regressiontests → lokale Chromium-tests → Theme Check zonder fouten → package → credentialscontrole → push naar het bestaande unpublished theme → Playwright + axe → zes Lighthouse-runs → medianen en acceptance → CI-artifacts.

Playwright gebruikt 390×844, 768×1024 en 1280×900. Iedere test krijgt een nieuwe browsercontext en winkelwagen. Het controleert het daadwerkelijke `Shopify.theme.id` vóór storefrontacties; een redirect naar het live theme wordt geweigerd. De tests openen menu/search/cart, collectie/sort/filter/productlinks, laden productafbeeldingen, kiezen varianten en vergelijken zichtbare prijzen en voorraad met Shopify's product-JSON. Daarna: add-to-cart via de UI, winkelwagenregels en totalen met cart-JSON vergelijken, quantity aanpassen, verwijderen en één keer de checkout openen. **Geen klantgegevens, betaalgegevens, bestelbevestiging of bestelling.** De tests ruimen uitsluitend hun eigen verse testsessie-cart op.

Alle page errors, inclusief review/app-errors, laten de run falen. Console- en netwerkfouten worden als diagnose-artifact bewaard. Axe controleert homepage/collection/product/cart op alle drie breedtes, bewaart alle resultaten en faalt op serious/critical findings. Geen uitzonderingen of beveiligingsverzwakking. Functionele failures kunnen latere journey-stappen verhinderen; rapportage toont dan welke stappen niet zijn bereikt.

Authenticatie gebeurt vóór browsertracing. Lighthouse-logexports verwijderen headers/cookies/authorization/postData. Gebruik artifacts uitsluitend binnen de repository: traces kunnen tijdelijke checkout-URL's en gewone sessie-informatie bevatten. Retentie is zeven dagen.

## Performance

Lighthouse 13.0.1; mobile 412×823, mobile=true, DPR 1,75; desktop 1350×940, mobile=false, DPR 1. Desktop gebruikt de echte Node-API desktopconfiguratie. Dit zijn de vastgelegde Lighthouse-profielen; de functionele Playwright-breedtes zijn afzonderlijke tests. Iedere run controleert formFactor, scherm en beide user-agents en schrijft expliciete metadata plus rapport/trace. Een fout profiel, ontbrekende run of inconsistente metadata maakt de samenvatting ongeldig.

`npm run test:performance` meet de daadwerkelijk gecontroleerde preview drie keer per profiel. De medianenpoort gebruikt LCP ≤ 2500 ms, CLS=0 en de Lighthouse-grens voor goede TBT van 200 ms. Dit is een reproduceerbare voorlopige CI-poort; behoud van de eerder gemelde 30 ms moet daarnaast met vergelijkbare vóór/na-medianen worden beoordeeld. De aangeleverde nieuwe opdracht breekt af bij fase 6; verdere acceptancecriteria ontbreken.

Voor vergelijking: meet eerst de bekende baselineversie en daarna de wijziging op **hetzelfde dedicated previewtheme**, dezelfde homepage, browser/Lighthouseversie, netwerk, consent, cache en profielen. Houd uitvoermappen gescheiden en leg beide codeversies vast. Gebruik drie aparte runs per profiel; nooit één run. `scripts/compare-performance.mjs` weigert onvergelijkbare profielen/versies of verschillende preview-URL's. De huidige publieke nulmeting heeft geen bekende repository-revisie en is geen valide nameting van de branch.

```sh
npm run preview:check
npm run package
node scripts/shopify-preview.mjs deploy
npm run test:e2e
npm run test:performance
# Bewaar before/after-uitvoermappen afzonderlijk; beide bevatten zes gevalideerde runs.
node scripts/compare-performance.mjs before/summary.json after/summary.json
```

Voor lokaal uitvoeren: stel de secrets veilig via de omgeving in en gebruik `CHROME_PATH=/usr/bin/chromium` als de systeembrowser wordt gebruikt. Gebruik nooit TLS-bypassflags. De cloudproxy moet storefront, de exacte myshopify-hostnaam, checkout/appresources en benodigde analytics kunnen bereiken; onvoldoende netwerkmogelijkheden blijven als meetbeperking in het rapport staan.

Geen Shopify-previewdeployment, echte E2E, axe-storefrontacceptatie of nameting is tijdens deze uitvoering uitgevoerd: de noodzakelijke Shopify-credentials en preview ontbreken. Het ontbreken daarvan blokkeert volledige production-readinessacceptatie, niet de lokale ontwikkeling en CI-opbouw.
