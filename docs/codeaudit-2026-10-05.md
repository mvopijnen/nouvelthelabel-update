# Nouvél the Label, codeaudit en optimalisatie
Datum: 5 oktober 2026

## Uitkomst
Acht themebestanden zijn verbeterd op een aparte GitHub-branch. De wijzigingen zijn gebaseerd op main-commit 8ff750c037e6f376efb739415c44190db2c1ac6d, die de eerdere Copilot-verbeteringen al bevat. De live Shopify-winkel is niet gepubliceerd of aangepast. Er is geen Lighthouse- of praktijkmeting uitgevoerd, dus er is geen onderbouwde winst in seconden of percentages te noemen.

## Herstelde fouten en verbeteringen
| Bestand in GitHub | Probleem | Uitgevoerde wijziging | Effect |
| --- | --- | --- | --- |
| slideshow.liquid en slideshow-blocks.liquid | Zowel de sectie als de snippet loopt door alle slides. N slides kunnen N² slide-elementen opleveren. De eerste slide krijgt daardoor meerdere keren active en high priority. | Alleen de sectie doorloopt de slides. De snippet rendert het meegegeven block. Positie, eerste-slide-status en LCP-status worden expliciet doorgegeven. | Drie slides leveren drie elementen op in plaats van negen. De huidige homepage heeft één slide, dus daar speelt de vermenigvuldiging momenteel niet. |
| slideshow.liquid | Vaste preload van een desktopafbeelding op 2000 px kan afwijken van de afbeelding die de browser via srcset of de mobiele source kiest. | Vaste preload verwijderd. Eager loading en fetchpriority high op de eerste hero-afbeelding blijven behouden. | Vermijdt een potentiële extra afbeeldingdownload. De uiteindelijke netwerkbesparing moet in Shopify-preview worden gemeten. |
| theme.liquid | Script voegt Geverifieerd toe aan iedere reviewer, zonder aankoopverificatie te controleren. Permanente body-observer en DOM-bewerkingen op alle pagina’s. | De automatische badges, bijbehorende CSS en observer verwijderd. | Echte Judge.me-verificatie blijft bij de app. Minder inline HTML, scripts en werk op de hoofdthread. theme.liquid daalt van 12.342 naar 3.780 bytes. Dit is bestandsgrootte, geen gemeten laadtijdwinst. |
| preload.liquid | Dezelfde font-URL kan voor meerdere typografierollen worden gepreload. Font-preconnect staat ook bij uitsluitend systeemfonts aan. | Preloads op URL ontdubbeld en font-preconnect conditioneel gemaakt. | Minder overbodige resource hints; geen fonts-hints wanneer alle rollen systeemfonts gebruiken. |
| meta-tags.liquid | Article-JSON-LD gebruikt ongeëscapete strings. Aanhalingstekens kunnen ongeldige JSON veroorzaken. Artikelbeschrijving en social titles zijn niet consequent geёscapet. Prijs gebruikt een locale-afhankelijk geldformaat. | Shopify structured_data voor artikelen, escaping van HTML-attributen en numerieke prijs via divided_by. | Betrouwbare metadata bij aanhalingstekens en ampersands; prijs zonder lokale duizendtalopmaak. |
| ss-footer-4.liquid | Globale init-functie, herhaalde registratie bij sectieload/unload, resize-listeners zonder opruiming. Oude sluit-timers kunnen een opnieuw geopend paneel verbergen. Afbeeldingen missen width en height. | Init in eigen scope, sectiegebonden selectie, idempotente registratie, AbortController voor opruiming, controle van actieve index bij timers, vaste afbeeldingsdimensies en responsive contentafbeeldingen. | Betrouwbaardere footerinteractie, minder achterblijvende listeners en beter voorspelbare afbeeldingsruimte. |
| collectie-hoogtepunten.liquid | Themavariabelen hebben verkeerde namen. Google Fonts wordt ook geladen wanneer themalettertypen geselecteerd zijn. Mobiele clickhandler blokkeert links. IntersectionObserver kan herhaald listeners registreren. Afbeeldingen missen afmetingen en responsive bronnen. | Correcte themevariabelen, conditionele stylesheet zonder CSS-import, links vrijgehouden, observer na binding afgesloten, initialization na DOM-ready ondersteund, responsive bronnen en dimensies toegevoegd. | Themafontoptie werkt, mobiele collectie-links werken, minder onnodige verwerking en beter afgestemde afbeeldingen. Eerste afbeelding is alleen eager wanneer de sectie bovenaan staat. |
| nouvel-editorial-product.liquid | Los img-element met verouderd img_url en zonder width/height of srcset. | image_url en image_tag met meerdere breedtes, sizes en lazy loading. | De browser kan een passende bron kiezen en vooraf ruimte reserveren. |

## Wat al goed was
De laatste main-versie heeft Google Fonts en Lucide uit about-nouvel.liquid verwijderd, de CTA hersteld en de dubbele theme-product-JSON-LD verwijderd ten gunste van de ingeschakelde TinySEO-productembed. Die verbeteringen zijn behouden. theme.js is een module en wordt daardoor al uitgesteld uitgevoerd. De Shopify-headerinjectie en apps zijn behouden.

## Dubbele code, structuur en resterende aandachtspunten
| Bevinding | Beoordeling en vervolgstap |
| --- | --- |
| Back-upassets | Zeven bestanden met backup in de naam beslaan samen 356.073 bytes. In de Liquid- en JSON-bestanden zijn geen laadverwijzingen gevonden. Het opruimen helpt beheer, maar verlaagt de actuele storefront-download niet zolang deze assets niet worden geladen. Daarom niet verwijderd. |
| Oudere ZIP binnen repository | De embedded Shopify-export bevat oudere versies van theme.liquid, about-nouvel.liquid en meta-tags.liquid. De losse bestanden op main zijn hiervoor leidend. Het importeren van alleen die embedded export zou verbeteringen terugdraaien. |
| Platte repositorystructuur | Shopify verwacht assets, config, layout, locales, sections, snippets en templates. De repository bevat themebestanden grotendeels op het hoofdniveau. Deze PR behoudt de bestaande organisatie; hij maakt de repository niet automatisch geschikt voor directe Shopify GitHub-themesynchronisatie. Voor publicatie moeten de bestanden op hun correcte themepaden terechtkomen. |
| Andere custom secties gebruiken algemene CSS-klassen | Voorbeelden zijn .nouvel-container en .ch-title. Meerdere instanties met verschillende instellingen kunnen elkaars CSS beïnvloeden. Secties volledig scopen is een volgende onderhoudsstap, met visuele vergelijking om geen ontwerpwijzigingen te veroorzaken. |
| Externe lettertypen in editorialsecties | Deze blijven bestaan wanneer eigen fonts geselecteerd zijn. Ze zijn onderdeel van de gekozen vormgeving. Om ze te elimineren moet het merk kiezen voor themefonts of correct zelf gehoste fonts. Niet ongemerkt vervangen. |
| Footer heeft 110 instellingen | Theme Check waarschuwt over de omvang. Dit is geen gevonden parsefout. Vereenvoudiging of splitsing vereist behoud van bestaande configuratie en een previewtest. |
| Verouderde filters en documentatietypes | De footer bevat hex_to_rgba; sommige bestaande snippet-docs beschrijven een boolean als string. Dat levert waarschuwingen op, geen blokkerende fout voor de gewijzigde bestanden. |
| Apps en product-SEO | TinySEO is ingeschakeld in settings_data.json. De werkelijk geproduceerde product-JSON-LD is nog niet op een live productpagina gecontroleerd. Ook de runtimekosten van Judge.me, maattabellen en TinySEO kunnen uit de ZIP alleen niet worden vastgesteld. |

## Verificatie
| Controle | Resultaat |
| --- | --- |
| Herkomst gewijzigde bestanden | Alle acht oorspronkelijke bestanden zijn vergeleken met de versie op de vastgelegde GitHub-main-commit voordat ze zijn gewijzigd. |
| Shopify Theme Check | Alle acht gewijzigde bestanden slagen zonder blokkerende fouten. Er blijven bovenstaande waarschuwingen bestaan. Controle uitgevoerd op gereconstrueerde Shopify-directorystructuur met gebundelde documentatiefallback, omdat ophalen van de laatste documentatie niet beschikbaar was. |
| JSON en sectieschema’s | Alle JSON-bestanden uit de gereconstrueerde export zijn geparseerd. Gewijzigde sectieschema’s zijn onderdeel van Theme Check. |
| JavaScriptassets | Alle twaalf aangeleverde JS-assets slagen voor node-syntaxcontrole. Dat omvat ook de backup-assets. |
| Renderverwijzingen | Geen ontbrekende doelen gevonden voor statische render/section-verwijzingen in de aangeleverde export. |
| Slideshowregressie | Met LiquidJS en eenvoudige media/carouselstubs: drie blocks leverden vóór de wijziging negen slide-roots op en na de wijziging drie. Eén actieve slide en één high-priority afbeelding. Lagere slideshowsectie heeft alleen lazy afbeeldingen. |
| Fontregressie | Identieke font-URL wordt één keer gepreload. Alleen systeemfonts produceren geen font-preloads of font-preconnect. |
| Footerregressie | In jsdom: tweemaal initialiseren geeft geen dubbele toggles, snel schakelen houdt het juiste paneel open en unload verwijdert listeners. |
| Metadataregressie | Gequote titels blijven geldige JSON; beschrijvingen met aanhalingstekens en ampersands worden correct geёscapet. De officiële structured_data-output zelf komt van Shopify en is niet lokaal nagebootst als productietest. |
| Collectie-interactie | In jsdom: mobiele links worden niet door de component geannuleerd, klikken op een kaart wisselt nog de afbeelding en de observer stopt na binding. |
| Praktijktests | Nog nodig in een ongepubliceerd Shopify-theme: desktop/mobiel, slideshow met één en meerdere slides, footer, Theme Editor sectieherladen, collectie-links, echte reviewbadges, productvarianten en winkelmand. |
| Performance | Nog nodig: dezelfde homepage en productpagina voor/na vergelijken onder gelijke omstandigheden, meerdere runs, LCP/CLS/INP en netwerkrequests. Geen verzonnen snelheidsscores. |

## Publicatievolgorde
Maak eerst een ongepubliceerde kopie van het actuele Shopify-theme. Breng alleen de acht gewijzigde bestanden over naar hun juiste layout/sections/snippets-paden. Gebruik niet de oude ZIP als volledig vervangend theme. Voer de praktijktests en vergelijkende performance-metingen uit en publiceer daarna de gecontroleerde versie.
