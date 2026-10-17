# Nouvél the Label — afronding PR #2

> Historisch verslag van PR #2. De actuele opdracht en resultaten staan in [production-readiness-round-2.md](production-readiness-round-2.md). De hieronder vermelde 72 errors zijn inmiddels opgelost en prijsafronding is op nieuw verzoek verwijderd. De oude desktopmeting was verkeerd geconfigureerd en is ongeldig; gebruik de gecorrigeerde round-2-baseline. Dit historische document bewijst geen huidige performancewinst of productieacceptatie.

Datum: 5 oktober 2026. Branch: `fix/slideshow-performance-and-metadata`.
Bron voor beschermde code: `8ff750c037e6f376efb739415c44190db2c1ac6d`.
Bestaande concept-PR: https://github.com/mvopijnen/nouvelthelabel-update/pull/2.

## Uitkomst en grenzen

De ten onrechte verwijderde reviewcode is exact hersteld. De repository heeft nu de Shopify-mapstructuur, inclusief ontbrekende gelijknamige layouts en snippets. Slideshow-, font-, metadata- en responsive-afbeeldingsverbeteringen uit de bestaande PR zijn behouden. De tweede slideshowafbeelding is lazy/auto; collectie- en footeropruiming, headerklikgebieden en consistente zichtbare prijsafronding zijn aangevuld.

De controles zijn reproduceerbaar met de vastgelegde npm-dependencies en GitHub Actions. Dit is geen verklaring dat het volledige theme foutloos is: Shopify Theme Check heeft nog 72 bestaande fouten en 316 waarschuwingen. De regressiecontrole meldt geen nieuwe fouten.

De zes verse Lighthouse-runs zijn uitsluitend nulmetingen van de publieke, ongewijzigde storefront via de cloudproxy. Er is geen gewijzigde Shopify-preview of geautoriseerde theme-adminverbinding beschikbaar. Nametingen, bewezen LCP-winst, behoud van lage TBT en definitieve Shopify-praktijkacceptatie ontbreken daarom. Het mobiele doel van LCP ≤ 2,5 s is niet aangetoond. Niets is gemerged, naar Shopify geüpload of live gepubliceerd.

## 1. Reviews exact hersteld

`layout/theme.liquid` is byte voor byte gelijk aan `theme.liquid` in de opgegeven broncommit. De volledige oorspronkelijke layout is hersteld: de eerdere PR wijzigde hier alleen reviewcode en bijbehorende witruimte. Er waren geen andere functionele layoutverbeteringen die daardoor verloren gingen.

De styling, automatische badges, reviewobserver en Judge.me-integratie zijn behouden. `config/settings_data.json`, `sections/testimonials.liquid` en `snippets/product-rating.liquid` zijn eveneens exact gelijk aan de bron. Het behoud van `templates/index.json` bevestigt ook de oorspronkelijke ingeschakelde en uitgeschakelde secties. `scripts/validate-theme.py` vergelijkt deze bestanden als bytes met Git; de regressietests controleren de layout opnieuw. Er is geen reviewcode verwijderd als performance-optimalisatie.

| Bestand | SHA256 |
| --- | --- |
| layout/theme.liquid | 24dd6cce77650d2968f6d4df593a552d3604b781020db8a6d4499000b9dc291a |
| config/settings_data.json | 34c46f020ef22336fe10dd46d1ade74c27f980d8125868534f8cc426b61381ca |
| sections/testimonials.liquid | c899bd31e56bb672db0e38c1cb2ff9d68892c260360c8492b6c1f1445de28211 |
| snippets/product-rating.liquid | c7077bf1740e72cc1f32aa16a9833d1e33a283ce8d5989ad55a3fbc4137613a2 |
| templates/index.json | 46da1447d94b5369ed1362018754dccafe50040da45d4ca689c6e469d4b15ed6 |

## 2. Shopify-mapstructuur en herkomst

291 actuele themebestanden zijn verplaatst naar `assets`, `config`, `layout`, `locales`, `sections`, `snippets` en `templates`, inclusief `templates/customers`. Actuele PR-inhoud is niet vervangen door de oudere export. Bij dubbele basenames is de locatie vastgesteld door vergelijking van de oorspronkelijke main-inhoud met de afzonderlijke ZIP-entries; wijzigingen in de PR zijn daarna op het juiste pad behouden.

Alleen tien ontbrekende varianten zijn uit de export hersteld: `layout/gift-card.liquid`, `layout/password.liquid`, `snippets/cart.liquid`, `snippets/complementary-products.liquid`, `snippets/predictive-search.liquid`, `snippets/product-card.liquid` en de vier ontbrekende locale-bestanden de/es/fr/it. De gelijknamige actuele secties blijven afzonderlijk bestaan. `docs/theme-path-mapping.json` legt de mapping, broncommit en hashes van geïmporteerde bestanden vast. Zichtbare geldformattering in de herstelde gift-card-layout en cart-snippet is daarna afzonderlijk aangepast.

De validator vindt geen ontbrekende statische render-, section-, sections- of assetverwijzingen en geen statische renderrecursie. Contexttemplates zijn tegen hun basistemplate gecontroleerd. Dynamische Shopify/app-uitvoer vereist daarnaast een echte previewtest.

## 3. Slideshow en afbeeldingsselectie

`sections/slideshow.liquid` houdt de eerder herstelde enkele block-lus en verwijderde vaste 2000px-preload. `snippets/slideshow-blocks.liquid` rendert het meegegeven block. De hoofdafbeelding van de eerste relevante sectie blijft eager/high. Alleen `media-2` krijgt lazy/auto. Beide afbeeldingen blijven zichtbaar op desktop; de tweede blijft op mobiel verborgen.

De verse mobiele nulmeting registreert voor `Atelier_sieraden_1_new.webp` zowel width=2000 (65.815 bytes) als width=1400 (56.853 bytes), plus 40.910 bytes voor de verborgen `Minimalist_Essentials_homepage_new_2_nieuw.webp`. Dit onderbouwt het verwijderen van de vaste preload en lagere prioriteit van de tweede afbeelding. De downloadbesparing op de echte gewijzigde storefront moet nog worden gemeten.

De browserfixture gebruikt de echte gerenderde Liquid, beide beeldslots uit de homepageconfiguratie, de echte slideshow-CSS en theme-JavaScript. Op 390 px wordt de verborgen tweede afbeelding niet gedownload; op 1280 px wordt zij wel geladen. Eén, twee en drie slides geven precies evenveel slide-roots, één actieve slide en één high-priority afbeelding. Navigatie en componenthoogte blijven correct op 390, 700 en 1280 px.

`sizes=1075px` blijft behouden: bij een mobiele hoogte van 600 px en beeldverhouding 1543/861 vraagt `object-fit: cover` circa 1075 px intrinsieke breedte voor de uitsnede. `100vw` zou deze resolutiebehoefte onderschatten. Geen extra preload, bron- of srcsetwijziging.

## 4. Rendervertraging: onderzoek uitgevoerd, winst nog niet bewezen

De mobiele traces identificeren dezelfde hoofdafbeelding als LCP. De ongesimuleerde LCP-subdiagnose rapporteert rendervertraging van 1948, 91 en 2051 ms. Deze tijden zijn niet dezelfde metriek als de gesimuleerde LCP in de resultatentabel.

De eerste fade-slide heeft in de HTML al `data-active=true`; de CSS maakt haar zichtbaar. De browsercases controleren opacity=1, visibility=visible en een positieve hoogte met JavaScript uitgeschakeld. Na initialisatie en slidenavigatie blijft de hoogte stabiel. Een eerdere live MutationObserver-controle zag alleen true → true, geen verborgen false-beginstaat.

De verse traces geven vóór de ongesimuleerde LCP op de hoofdthread respectievelijk circa 86/18/90 ms UpdateLayoutTree en 58/34/53 ms Layout. De veel hogere totale Style & Layout-kosten over de gehele opname mogen dus niet volledig aan het eerste afbeeldingspaint worden toegeschreven. Er is geen bewijs dat de eerste slide verplicht twee seconden op haar initialisatie wacht. De oorzaak van de wisselende rendervertraging is nog niet volledig vastgesteld. Overgangen, opacity-regels en hoogteberekeningen zijn daarom niet speculatief gewijzigd. Acceptatie van een aantoonbaar lagere rendervertraging blijft open tot een vergelijkbare gewijzigde preview kan worden getraceerd.

## 5. CSS en layout

`assets/theme.css` is 153.660 bytes ongecomprimeerd en inhoudelijk behouden. De publieke `compiled_assets/styles.css` is 136.972 bytes. Shopify genereert deze stylesheet uit Liquid `{% stylesheet %}`-blokken. `docs/css-sources.json` inventariseert de huidige 90 blokken en koppelt bronselectoren aan het echte netwerkantwoord; 87 eerste selectoren worden daarin teruggevonden. Dit is bronidentificatie, geen lokale reproductie van Shopify's volledige build. Inline dynamische `<style>`-blokken staan daar los van. Er is geen gegenereerde stylesheet handmatig aangepast.

Slideshowregels komen uit `snippets/slideshow-carousel.liquid` en `snippets/slideshow-blocks.liquid`. De nieuwe headerregels staan in `sections/header.liquid`. De verse audit noemt circa 31 KiB mogelijk ongebruikte CSS, maar geeft in mobiele run 1 geen renderblokkerende besparing. Het aangeleverde rapport blijft een aparte referentie. Er is geen CSS verwijderd op basis van alleen homepagecoverage.

Forced-reflow-callstacks wijzen onder meer naar SizeQueries, Transition-cascade (`offsetTop`), headerinitialisatie en carouselhoogten. `CarouselBase.getHeights()` verzamelt zijn hoogten al vóór de schrijflus; de voorafgaande reset kan layout forceren. Een breakpointverschil tussen globale 640px-regels en 768px-slideshowregels is vastgelegd, maar niet gewijzigd zonder volledige visuele previewvalidatie. Het JS-algoritme en noodzakelijke responsive berekeningen blijven behouden; alleen geldformattering in theme.js wijzigt. Aanvullende aantoonbare CSS/layoutwinst blijft open.

## 6. Collectie en footer

`sections/collectie-hoogtepunten.liquid` gebruikt nu een eenmaal geregistreerd `collection-highlights`-element. Elke instantie initialiseert en bewaart haar eigen cleanup. Automatische connection/disconnection werkt ook bij vervangende markup zonder opnieuw uitgevoerd inline-script. Unload en disconnect verwijderen observers, DOMContentLoaded-/unload-/interactielisteners en geplande animationframes via AbortController. Er zijn geen globale section-loadlisteners per instantie. De wrapper blijft expliciet een block, zodat de bestaande vormgeving behouden blijft.

De tests herladen en verwijderen de sectie driemaal zonder het script opnieuw uit te voeren, controleren twee onafhankelijke instanties en bevestigen dat mobiele links niet worden geannuleerd. Themafontvariabelen, conditionele externe fonts en responsive afbeeldingen uit de PR zijn behouden. De sectie is niet op de homepage geactiveerd.

`sections/ss-footer-4.liquid` behoudt de bestaande sectiegebonden initialisatie en listeneropruiming. Ook open/sluit/resize-timers worden nu bij unload geannuleerd. De test controleert herhaald initialiseren, snel wisselen en geen achterblijvende wijziging na unload.

## 7. Header

`sections/header.liquid` voegt minimaal 44 × 44 px toe aan de bestaande zoek- en winkelwagenbediening, minimaal 8 px ruimte in de secundaire navigatie en een zichtbare focusring. Bestaande iconen, tekst, drawerattributen en verbergregels zijn behouden.

De lokale browsercases controleren de echte gerenderde headersectie op grootte en overlap (ingestelde mobiele sidebar en de ondersteunde desktoplayout left-center). Een compacte interactiefixture controleert daarnaast focus en Tab-volgorde op drie breedtes. Dit is geen volledige header-/drawer-previewtest. Op de publieke, nog ongewijzigde homepage en collectiepagina zijn beide drawers met de echte bediening geopend en via Escape gesloten op mobiel en desktop. De gewijzigde volledige header moet nog visueel op een Shopify-preview worden gecontroleerd.

## 8. Netwerk, console en beschermde functies

De bron laat zien dat General in theme.js theme-async.js dynamisch toevoegt en een window.load-handler registreert voor `Cart.fetchBasket()` naar cart.js. De async-module importeert Cart; zij veroorzaakt die eerste fetch niet zelf. Er is geen aangetoond voordeel van verdere uitstelstrategie; winkelwageninitialisatie en berekeningen blijven ongewijzigd. De desktopketenreferentie van 6.412 ms is niet gelijkgesteld aan LCP.

`snippets/preload.liquid` behoudt de al uitgevoerde ontdubbeling op font-URL en conditionele font-preconnect. De normale browser ziet cdn.shopify.com, fonts.shopifycdn.com en Shopify's shop.app-hint, zonder dubbele hints in deze twee pagina's. Editorialsecties kunnen eigen Google Fonts-hints toevoegen wanneer die secties gebruikt worden; geen ongebruikte hints blind verwijderd. Shopify-headers en appresources zijn behouden.

`scripts/inspect-storefront.cjs` bezocht homepage en collectie op 390 en 1280 px met een normale Chromium-useragent, zonder Lighthouse-useragent. Alle vier pagina's geven HTTP 200 en geen pageerrors. Zoeken en de lege cart drawer openen en sluiten in alle vier controles. Gemeten tijd vanaf klik tot geopende drawer bedraagt 470–553 ms; dit is een functionele diagnose, geen vergelijkbare voor/nameting of add-to-cart/checkouttest.

De homepage meldt een ongeldig serverheader `X-Frame-Options: ALLOW-FROM`. Dat is reproduceerbaar buiten Lighthouse en komt uit de serverrespons; het theme kan die header niet herstellen. Er is ook één consolemelding van een 404 zonder vastgelegde response-URL; de oorzaak is niet vastgesteld. Geblokkeerde analyticsrequests naar Google/DoubleClick geven ERR_TUNNEL_CONNECTION_FAILED en zijn cloudnetwerkproblemen. Afgebroken telemetry- en accelerated-checkoutrequests zijn geen bewijs dat klanten dezelfde fout ervaren.

De eerder gemelde specifieke Lighthouse-useragentfout is in deze normale browser niet gereproduceerd. Een privacybanner en customerPrivacy-API zijn in deze sessie niet waargenomen; consentgedrag is daardoor niet gevalideerd. Geen privacybanner, CSP, checkoutfunctie, appinstelling of reviewintegratie is verwijderd of gewijzigd. Definitieve consent-/checkout- en gewijzigde storefronttests blijven vereist.

## 9. Hele euro's zonder wijziging van werkelijke bedragen

Zichtbare Liquid-bedragen worden uitsluitend voor uitvoer afgerond via `divided_by: 100.0 | round | times: 100 | money_without_trailing_zeros`. Currencylabels worden waar nodig behouden. Dit geldt in product-price, product-card--price, cart, account, order en gift-card (sectie en layout). Utils.formatMoney in `assets/theme.js` geeft dezelfde hele-euronotatie voor dynamische updates. Berekeningen, API-payloads en voorraadlogica zijn niet gewijzigd.

De tests bevestigen €49,95 → €50, €100,00 → €100 en €1.249,50 → €1.250, plus vergelijkingsprijzen, eenheidsprijzen, echte ProductPrice-variant-events en cart-/drawerbedragen. Productmetadata blijft numeriek 49.95; het onderliggende bedrag blijft 4995 cent. Een exacte JS-vergelijking bevestigt dat de formatterinstelling de enige wijziging in main's theme.js is. Prijsrange-inputs en machineleesbare prijzen zijn niet afgerond. Gift-card-redemptioncode, QR-identifier en werkelijke saldi blijven intact.

## 10. Controle-uitkomsten

| Controle | Uitkomst en beperking |
| --- | --- |
| npm-installatie uit lockfile | npm ci met beschrijfbare workspacecache; gepinde dependencies, integriteitscontrole behouden |
| Structuur, JSON, schema's, statische verwijzingen, renderrecursie, JS-assets | Geslaagd met `npm run validate`; alle ondersteunde themebestanden gecontroleerd |
| Liquid en gedrag | 18 tests geslaagd, 0 overgeslagen; alle 169 Liquid-bestanden geparseerd met gedocumenteerde Shopify-tagadapters |
| Slideshow/browser | 9 cases geslaagd op 390/700/1280 px met 1/2/3 slides, twee afbeeldingen per slide, voor-JS-zichtbaarheid, netwerkselectie en stabiele componenthoogte |
| Zoekvoorstellen en recommendations | Echte JS-componenten tegen gecontroleerde fetchresponses getest; geen live-productdatatest |
| Wachtwoord en cadeaukaart | Layouts en secties geparseerd en gerenderd, controls en geldweergave gecontroleerd; Shopify-login/redemption niet uitgevoerd |
| Article-/Productmetadata | Escaping en delegatie getest; Shopify structured_data-filter is lokaal een adapter, daadwerkelijke app-JSON-LD blijft previewcontrole |
| Reviews en configuratie | Exacte bytevergelijking met de opgegeven broncommit geslaagd |
| Theme Check, ruwe CLI | Exit 1: 72 bestaande fouten en 316 waarschuwingen; geen schoon resultaat geclaimd |
| Theme Check, regressiepoort | Geen nieuwe fouten ten opzichte van de vastgelegde oorspronkelijke foutmeldingen |
| ZIP | 301 bestanden, CRC- en rootpadcontrole; alleen zeven thememappen, geen ontwikkelbestanden of oude export |
| Shopify-praktijktests en echte nametingen | Niet uitgevoerd: geen gewijzigde preview/geautoriseerde adminverbinding |

De 72 resterende fouten bestaan uit 70 MatchingTranslations en twee ImgWidthAndHeight-bevindingen, voor de bestaande officiële gift-card-afbeelding en src-loze image-fallback. De ongeldige pickup-schemanaam en parserverwarrende comment in custom-styles zijn wel hersteld. Waarschuwingen betreffen onder meer oude filters, documentatietypes, vertalingen en omvangrijke sectieschema's.

De exacte bestaande fouten zijn vastgelegd in `docs/theme-check-known-errors.json`; `scripts/theme-check.mjs` bewaart de ruwe CLI-exitcode en faalt op nieuwe fouten. Geen check is uitgeschakeld. `.theme-check.yml` sluit alleen ontwikkelmappen en grote meettraces uit; alle zeven uploadmappen blijven onder de aanbevolen regels. Het scannen van de ruwe traces veroorzaakte eerst een geheugentekort; de afbakening naar echte theme-input voorkomt dit. GitHub Actions voert installatie, validator, regressietests, browsercases, Theme Check-regressiecontrole en ZIP-opbouw uit. Een lokale groene controle is niet automatisch een geslaagde GitHub-run.

## 11. Verse mobiele en desktopnulmetingen

Lighthouse 13.0.1, Chromium 151, publieke homepage https://nouvelthelabel.com/, steeds een nieuw browserprofiel, zes sequentiële runs zonder gelijktijdige build of andere browser. Mobiel: 412 × 823, DPR 1,75, gesimuleerde RTT 150 ms/throughput 1638,4 Kbps/CPU 4×. Desktop: Lighthouse-desktoppreset; exacte instellingen en elke ruwe waarde staan in `docs/lab-baseline-2026-10-05.json`. Dezelfde instellingen zijn per profiel gecontroleerd.

| Profiel/run | Score | FCP | LCP | TBT | CLS | Speed Index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobiel 1 | 43 | 3,56 s | 6,74 s | 1073 ms | 0 | 5,46 s |
| Mobiel 2 | 73 | 1,38 s | 2,79 s | 1061 ms | 0 | 2,02 s |
| Mobiel 3 | 39 | 3,52 s | 8,88 s | 1335 ms | 0 | 5,38 s |
| Mobiel mediaan | 43 | 3,52 s | 6,74 s | 1073 ms | 0 | 5,38 s |
| Desktop 1 | 50 | 2,97 s | 6,16 s | 990 ms | 0 | 3,64 s |
| Desktop 2 | 75 | 1,39 s | 2,89 s | 850 ms | 0 | 2,69 s |
| Desktop 3 | 53 | 2,91 s | 6,86 s | 752 ms | 0 | 3,48 s |
| Desktop mediaan | 53 | 2,91 s | 6,16 s | 850 ms | 0 | 3,48 s |

Dit zijn labmetingen met beperkingen: cloudproxy, gedeeltelijk geblokkeerde analytics en sterke variatie. Geen echtegebruikersdata. Ze mogen niet als directe herhaling of verslechtering ten opzichte van de aangeleverde PageSpeed-rapporten worden voorgesteld. De oorspronkelijke mobiel 72/LCP 6,0 s/TBT 30 ms en desktop 99/LCP 0,9 s/TBT 20 ms blijven referenties.

De publieke URL en collectie-URL zijn geen preview van de wijziging. Er zijn nul nametingen. LCP-winst, lage TBT na wijziging en behoud van desktopprestaties zijn niet vastgesteld. Voor acceptatie zijn drie nieuwe runs per profiel op een ongepubliceerd gewijzigd theme nodig en vergelijkbare controlemetingen wanneer omstandigheden/netwerkbeleid afwijken. Leg URL, codeversie, consentstatus, browser, throttling en cachecondities vast; vergelijk medianen en bijbehorende netwerktraces. Gebruik `scripts/measure-performance.mjs` en `scripts/summarize-performance.py`.

## 12. Oplevering en vervolg

De PR-beschrijving en dit auditdocument vervangen de eerdere onjuiste claim over reviewverwijdering en platte oplevering. `npm run package` maakt `artifacts/nouvelthelabel-update-shopify.zip` en `artifacts/upload-manifest.json`. De zeven thememappen staan direct in de ZIP-root. Bronexport en ontwikkelbestanden blijven buiten het uploadbestand.

Reviews en reviewcode zijn exact behouden. Zichtbare prijzen blijven afgerond op hele euro's; werkelijke prijzen en berekeningen zijn ongewijzigd. Bestaande homepageconfiguratie, uitsnede, overgangen en uitgeschakelde secties zijn behouden. De gewijzigde header en herstelde ontbrekende pagina's vereisen nog volledige visuele Shopify-validatie; lokaal componentbehoud vervangt die niet.

De cloudomgeving kan de ontwikkelworkflow uitvoeren. Browsermetingen houden TLS-verificatie ingeschakeld. Chromium gebruikt in deze machine de bestaande `/home/agent/.pki/nssdb`; beschrijfbare toegang tot deze database blijkt noodzakelijk. Alleen de geautoriseerde platform-CA is toegevoegd. Een geïsoleerde XDG-database alleen was hier geen werkende vervanging. Herbruikbare installatie/opstartinstructies worden hiervoor gecorrigeerd; een opgeslagen concept voert niets uit en publiceert niets.

Open acceptatie: aantoonbare oorzaak/vermindering van rendervertraging, eventuele gemeten CSS/layoutwinst, volledige previewtests inclusief privacy/cart/checkout en drie echte nametingen per profiel. Geen merge of live-publicatie uitvoeren.
