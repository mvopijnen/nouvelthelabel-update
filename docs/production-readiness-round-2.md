# Production readiness — ronde 2

Uitgangspunt: nieuwste geldige `main`, `6f885d4243d368c14a74e963158337d37488f349`, gecontroleerd op 5 oktober 2026. Branch `fix/production-readiness-round-2`. PR #3 is gecontroleerd en gesloten; hij is **niet gemerged**. Geen redesign, merge, Shopify-upload of live-publicatie uitgevoerd.

## Fase 1 — Theme Check

Alle 72 geërfde errors zijn daadwerkelijk opgelost. Ontbrekende keys zijn toegevoegd in `nl`, `de`, `es`, `fr`, `it` op basis van de Engelse bron en bestaande themevertalingen. Bestaande waarden, inclusief Nederlandse Shopify-checkoutoverrides, blijven exact behouden. De bestaande Nederlandse `sections.featured_blog.item_title` is behouden en naar de andere talen uitgebreid.

`sections/gift-card.liquid` houdt dezelfde officiële afbeelding en geeft breedte/hoogte mee; `height:auto` behoudt haar natuurlijke verhouding. De HTML-dimensies 540×330 zijn gereserveerde weergavedimensies, geen tijdens deze uitvoering geverifieerde intrinsieke assetmeting. Werkelijke gift-cardweergave moet ook in Shopify-preview worden gecontroleerd. De mobiele fallback in `snippets/image.liquid` gebruikt de werkelijke mobiele image-dimensies, of 1×1 wanneer geen image-object aanwezig is; er wordt geen nieuwe afbeelding ingeladen.

Theme Check: ruwe exitcode **0**, **0 errors**, **316 warnings**. Pas na de reparaties is `docs/theme-check-known-errors.json` leeg gemaakt. De runner accepteert geen oude errors meer. Geen regels uitgeschakeld of uitzonderingen toegevoegd; alleen bestaande ontwikkelmappen blijven buiten de theme-input.

## Fase 2 — werkelijke prijzen

De zichtbare Liquid-pipeline `divided_by → round → times → money_without_trailing_zeros` is vervangen door `money`/`money_with_currency` in product/card/cart/account/order/gift-card. De geforceerde `amount_no_decimals`-vervanging op de layout is verwijderd. `Utils.formatMoney` behoudt twee decimalen; quick add en variantupdates gebruiken dezelfde component.

Regressievoorbeelden: €49,95 → €49,95; €100,00 → €100,00; €1.249,50 → €1.249,50. Originele, compare-at- en unitprijzen, kortingen/belastingen als zichtbare bedragen, gift-cardwaarden en dynamische updates zijn gecontroleerd. Exacte bronvergelijkingen tonen dat uitsluitend zichtbare filters/formatter zijn aangepast. Product-/variantprijzen, cartberekeningen, API-payloads, checkout, Shopify-data en structured data zijn ongewijzigd.

## Fase 3 — betrouwbare profielen en nulmeting

De oude desktoprun gaf `preset` mee als Node-API-flags; dat selecteert geen desktopconfiguratie. Hij gebruikte mobiele defaults. De echte desktopconfiguratie wordt nu als derde Node-API-argument doorgegeven. Beide profielen controleren formFactor, scherm, mobile-vlag, DPR en geconfigureerde/werkelijke user-agent. Iedere run bewaart profiel, scherm, beide agents, Lighthouseversie, tijdstip, throttling, metrics, score, batch en bekende deployed codeversie. Ontbrekende of inconsistent gelabelde runs geven een fout, geen mediaan.

Zes verse runs van de **publieke ongewijzigde storefront** via dezelfde cloudproxy, Lighthouse 13.0.1 / Chromium 151. Mobile 412×823/DPR1,75/CPU×4; desktop 1350×940/DPR1/CPU×1. Simulated throttling. Geen gegevens van echte gebruikers. Consent/netwerkcondities van deze labomgeving; enkele analyticsbestemmingen zijn geblokkeerd. Deze beperkingen maken de resultaten niet uitwisselbaar met het aangeleverde PageSpeedrapport.

| Mediaan van drie runs | Mobile | Desktop |
| --- | ---: | ---: |
| Prestaties | 42/100 | 96/100 |
| FCP | 3,09 s | 0,85 s |
| LCP | 14,24 s | 1,00 s |
| TBT | 1.260 ms | 90 ms |
| CLS | 0 | 0 |
| Speed Index | 5,07 s | 1,05 s |

Alle afzonderlijke runs en instellingen: [lab-baseline-round-2-2026-10-05.json](lab-baseline-round-2-2026-10-05.json). De eerdere desktopmediaan is ongeldig gemaakt in het historische JSON. De publieke Shopify-themecode heeft geen geverifieerde repository-revisie en toont nog een vaste 2000px-preload en eager verborgen tweede afbeelding die in deze branch al anders zijn. Dit is dus geen nameting of baseline van een aantoonbaar gedeployde `main`. Er is **geen gemeten storefrontverbetering van ronde 2**.

## Fase 4 — echte preview CI/E2E

De volledige voorwaardelijke workflow en scripts zijn gebouwd; configuratie en veiligheidsgrenzen staan in [shopify-preview-ci.md](shopify-preview-ci.md). Zelftests verifiëren missing-secret skip, afwijzen van live/onjuiste theme-ID's, pakketextractie en uitsluitend gerichte unpublished upload. De Playwright-runner ontdekt alle drie deviceprojecten.

De echte Shopify-deploy/E2E/axe/preview-performance zijn **niet uitgevoerd** wegens ontbrekende Shopify-previewcredentials. Dit is een expliciete skip, geen geslaagde storefronttest. Er is niets naar Shopify geüpload. De workflow wacht niet op publicatie en heeft geen live-publicatiestap.

## Fase 5 — onderbouwde, afzonderlijke optimalisaties

De mobiele LCP-diagnose in de nieuwe drie rapporten geeft circa **1.964 / 1.921 / 1.996 ms render delay**. Dit is de ruwe trace-diagnose, terwijl de tabel hierboven Lighthouse's gesimuleerde metrics bevat; die mogen niet rechtstreeks worden opgeteld of afgetrokken. De afbeelding is al vroeg vindbaar, eager en high-priority. De eerste slide heeft actieve servergerenderde markup; bestaande Chromium-tests tonen zichtbaarheid vóór JavaScript en stabiele hoogte voor 1/2/3 slides. Er is geen nieuwe preload of initialisatieanimatie toegevoegd/verwijderd. Een gegarandeerde besparing van 2.090 ms is niet aangetoond.

De long-taskaudit wijst onder meer naar Google-tags, Shopify web pixels, accelerated checkout/trekkie/performancekit, privacybanner, inline code en themecode. Apps, analyticsinstellingen, privacy en checkout zijn behouden. De netwerkboom `theme.js → theme-async.js` is aanwezig; cartinitialisatie is niet willekeurig uitgesteld. Normale browsercontroles openen search/cart op homepage en collectie op 390/1280px in circa 460–520 ms, zonder unhandled page errors. Dat bewijst nog geen volledige cart-/checkoutacceptatie.

Twee afzonderlijke wijzigingen met eigen checkpoint:

1. **Reviewobserver:** daadwerkelijke badgeverwerking observeert Judge.me/reviewwidgets. Een lichte discoveryobserver op body blijft nodig voor late/vervangen widgets en legacy-markup; hij inspecteert toegevoegde subtrees en scant niet telkens body. Oude widgetregistraties worden verwijderd. De oorspronkelijke naamselectors, badgecreatie, tekst/iconverwerking en styling zijn exact behouden. Tests controleren bestaande/nagekomen/vervangen widgets, naamvervanging, native labels/icons, verwijderde badges, section-events en fallback buiten bekende containers. Een gecontroleerde DOM-test telt bij 1.000 niet-gerelateerde toevoegingen **1.000 → 0 review-querySelectorAll-calls**, geen storefront-LCP/TBT-besparing. Judge.me en geverifieerd-badges blijven aanwezig.
2. **Transition cascade:** de trace wees `theme.js` column 6821 aan: offsetTop-metingen afgewisseld met writes van `--transition--delay` (circa 16,6 ms reflow in mobile run 1). Alle benodigde posities worden nu eerst gemeten; horizontale/verticale delays, rijgroepering, cropper en per-iteminterval blijven gelijk. Geen extra layoutreads voor uitsluitend verticale cascades. Tests bewijzen exacte delays en uitsluitend reads vóór writes. Een aparte Chromium-fixture met **400 werkelijke transition-items**, CPU×4, drie runs vóór/na: mediane initialisatie **58,6 → 8,7 ms**, style-recalculations **400 → 1**; layout-count in deze fixture bleef 0. Dit is een componentbenchmark en bewijst geen storefrontscore of LCP-winst. Script: `node scripts/benchmark-transitions.cjs`.

`theme.css` en Shopify's `compiled_assets/styles.css` blijven intact. Het laatste wordt opgebouwd uit `{% stylesheet %}`-blokken in sections/snippets; bronnen staan in `docs/css-sources.json`. Een homepagecoverage met ongebruikte CSS is onvoldoende bewijs voor verwijdering zonder alle schermen/interacties. De slideshowhoogtemetingen in de bestaande code gebruiken al een read-pass vóór writes. Geen extra carousel- of SizeQueries-ingreep zonder previewbewijs.

Mobiele `sizes=1075px` blijft: de 1543×861-afbeelding vult een 600px-hoge uitsnede; een nominale 390px viewportbreedte is geen juiste bronbreedte voor object-fit cover. In de publieke diagnose worden zowel 2000px als 1200px gedownload plus de verborgen tweede 1200px-afbeelding. Die vaste preload ontbreekt al in de branch; de tweede afbeelding is al lazy/auto sinds `main`. Nieuwe juiste downloads en kwaliteit moeten in deze gewijzigde preview opnieuw worden gecontroleerd.

Themepreconnects: CDN en conditionele fonts; de publieke derde verbinding naar shop.app komt niet uit `snippets/preload.liquid`. Geen Shopify-beheerde resource/header aangepast. Normale Chromium-UA: geen page errors op de vier bezochte pagina's; wel proxy-tunnelfouten naar analytics en een ongeldige serverheader `X-Frame-Options: ALLOW-FROM`. Dat laatste behoort bij server/Shopify-configuratie, niet een Liquid-beveiligingspolicyfix. Privacybanner-script wordt aangevraagd, maar privacy-API/banner zijn in deze sessie niet beschikbaar. De specifieke Lighthouse-UA-fout is niet als klantfout bevestigd. Privacy/consentacceptatie blijft open; geen beleid verzwakt of banner verwijderd.

## Validation en resterende acceptatie

Elke themefase is afzonderlijk gecontroleerd: structuur/JSON/schema/refs/JS, regressietests, negen Chromium-slideshowcases en Theme Check. Definitieve eindcontrole: frozen `npm ci`, structuurvalidatie, **34/34 regressietests**, **9/9 Chromium-slideshowcases**, Theme Check **0 errors / 316 warnings**, package met **301 themebestanden**. Playwright discovery vindt de drie projecten; dat telt niet als uitvoering van Shopify E2E. Benchmarkresultaten en controles blijven in `artifacts/`; de upload-ZIP bevat alleen zeven Shopify-mappen.

Configuratie, testimonials, product-rating en homepage-index blijven byte-exact gelijk aan de beschermde bron. Voor `layout/theme.liquid` blijven alle bytes buiten de twee expliciet geautoriseerde wijzigingsgebieden (money-format en observerregistratie) exact beschermd. De JS-bronvergelijking staat uitsluitend de centformatter en twee exacte transition-substituties toe. Dit is geen redesign; foto's, teksten, branding, kleuren, typografie en homepagevolgorde zijn behouden.

**Production-readiness is nog niet aangetoond.** Nodig: veilige previewcredentials/fixtures, de echte E2E/axe/consent/checkoutcontrole, drie vergelijkbare vóór- en nametingen per profiel op hetzelfde bekende previewtheme en beoordeling van medianen. De mobiele LCP-doelstelling ≤2,5 s is in de huidige labnulmeting niet gehaald; TBT is eveneens te hoog. De voorlopige CI-acceptancepoort en comparison-script geven een echte fout bij overschrijding/ongelijke condities, geen gegarandeerde score. De nieuwe gebruikersopdracht breekt af bij fase 6; eventuele verdere acceptancecriteria blijven onbevestigd.

Cloudconfiguratiedraft: complete `install_script` en `start_skill` opgeslagen, plus non-secret previewvariabelen en zes concreet waargenomen ontbrekende analytics-hosts (`ad.doubleclick.net`, `analytics.google.com`, `stats.g.doubleclick.net`, `www.google.com`, `www.googleadservices.com`, `www.merchant-center-analytics.goog`). Bestaande hosts blijven behouden. Deze draft is nog niet toegepast/gepubliceerd; de nulmeting gebruikt de eerdere actieve netwerkcondities. Review/save/publicatie in omgevingsinstellingen is nodig voor nieuwe instanties. Geen Shopify-tokenwaarde opgeslagen of gevraagd in chat.

GitHub Actions: beide eerste PR-runs slagen, inclusief de expliciete credential-skip en artifact-upload. GitHub meldde de Node-20-deprecatie van v4 Actions; officiële Node-24-releases zijn gecontroleerd via action.yml en onveranderlijke commit-SHA's. De workflows zijn daarop bijgewerkt en de runner is vastgezet op Ubuntu 24.04. De uiteindelijke checks worden op de nieuwe HEAD opnieuw uitgevoerd.
