## Wijziging

De eerdere PR verwijderde ten onrechte reviewcode en leverde nog een plat theme aan. De reviewlayout is nu exact hersteld uit `8ff750c037e6f376efb739415c44190db2c1ac6d`; reviewinstellingen, badges, observer, Judge.me en reviewschema's zijn behouden. De actuele bestanden staan op hun Shopify-paden. Tien ontbrekende layout/snippet/locale-varianten zijn gericht uit de oudere export hersteld, met vastgelegde herkomst.

De enkele slideshowlus en verwijderde vaste 2000px-preload blijven behouden. De hoofdafbeelding blijft eager/high; de tweede afbeelding is lazy/auto. De mobiele 1075px-sizes en bestaande uitsnede blijven intact. Collectieopruiming werkt per instantie, ook bij herladen zonder opnieuw uitgevoerd inline-script; footertimers worden bij unload verwijderd. Zoek- en winkelwagenklikgebieden zijn minimaal 44 × 44 px met zichtbare focus. Liquid en JavaScript ronden uitsluitend zichtbare geldweergave af op hele euro's; de echte bedragen, berekeningen en machineprijzen blijven ongewijzigd.

Bestaande font-, metadata- en responsive-afbeeldingsverbeteringen blijven behouden. Geen CSS-purge, speculatieve animatie/layoutwijziging, uitgestelde cartinitialisatie of wijziging van Shopify-resources, beveiliging, privacybanner, checkout of reviewapps. Homepageconfiguratie en uitgeschakelde secties zijn exact behouden.

## Validatie

- Exacte bytevergelijking van beschermde reviewbestanden, instellingen en homepage tegen de broncommit.
- Volledige Shopify-structuur, JSON/schema's, verwijzingen, statische renderrecursie en JS-assets gecontroleerd.
- 18 regressietests geslaagd, inclusief alle 169 Liquid-bestanden, echte variant-component, prijsvoorbeelden, cart/drawer-rendering, zoekvoorstellen, recommendations, metadata, cadeaukaart/wachtwoord en sectieherladen.
- 9 browsercases geslaagd: 390/700/1280 px × 1/2/3 slides, beide afbeeldingsslots, zichtbaarheid zonder JavaScript, netwerkselectie, navigatie, hoogte en headerfocus/klikgebieden. Dit zijn componentfixtures; volledige gewijzigde Shopify-praktijkvalidatie ontbreekt.
- Shopify Theme Check heeft ruwe exitcode 1: 72 bestaande fouten en 316 waarschuwingen. Geen nieuwe fouten ten opzichte van de gedocumenteerde bronbaseline; de CI-poort claimt geen schoon Theme Check-resultaat.
- Reproduceerbare scripts, gepinde npm-lockfile en GitHub Actions toegevoegd. De upload-ZIP bevat 301 themebestanden en uitsluitend de zeven thememappen in de ZIP-root.

## Labmetingen en open acceptatie

Drie verse runs per profiel op de **publieke ongewijzigde homepage**, Lighthouse 13.0.1 via cloudproxy:

| Mediaan | Score | FCP | LCP | TBT | CLS | Speed Index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobiel | 43 | 3,52 s | 6,74 s | 1073 ms | 0 | 5,38 s |
| Desktop | 53 | 2,91 s | 6,16 s | 850 ms | 0 | 3,48 s |

Gedeeltelijk geblokkeerde analytics en sterke variatie beperken deze nulmetingen. Geen echtegebruikersdata en geen directe vergelijking met de aangeleverde PageSpeed-referenties. De mobiele trace toont 1948/91/2051 ms rendervertraging en dubbele 2000/1400px-transfers; een verplichte verborgen slideshow-beginstaat is niet aangetoond. Geen gegarandeerde score of bewezen LCP-winst.

Normale browserdiagnose van homepage en collectie op mobiel/desktop: HTTP 200, geen pageerrors, zoeken en cart drawer openen/sluiten. Een ongeldig X-Frame-Options-serverheader is reproduceerbaar; cloudnetwerkfouten zijn onderscheiden van mogelijke storefrontfouten. Privacykeuzes en checkout zijn niet volledig gevalideerd.

**Nog open:** een geautoriseerde, ongepubliceerde Shopify-preview met de gewijzigde code. Zonder die toegang zijn drie nametingen per profiel, aantoonbare render-/CSS/layoutwinst, LCP ≤ 2,5 s, lage TBT na wijziging, volledige visuele/praktijkacceptatie en privacy/checkoutvalidatie niet vastgesteld. De publieke URL is geen gewijzigde preview. Deze PR blijft een concept; niets is gemerged of live gepubliceerd.

Uitwerking per opdrachtonderdeel, bestanden en beperkingen: [audit](https://github.com/mvopijnen/nouvelthelabel-update/blob/fix/slideshow-performance-and-metadata/docs/codeaudit-2026-10-05.md). Herkomst: [mapping](https://github.com/mvopijnen/nouvelthelabel-update/blob/fix/slideshow-performance-and-metadata/docs/theme-path-mapping.json). Meetinstellingen en alle runs: [labnulmetingen](https://github.com/mvopijnen/nouvelthelabel-update/blob/fix/slideshow-performance-and-metadata/docs/lab-baseline-2026-10-05.json). Uploadbestand: artifact `shopify-theme-and-checks`, bestand `nouvelthelabel-update-shopify.zip`.
