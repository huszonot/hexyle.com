# Hexyle Shopify Product Board — Implementációs Terv

## Áttekintés

Interaktív termék-összeállító (mood board) applikáció. A felhasználó Shopify termékképeket húzhat egy háttérképre, a háttérképek között carousel-lel válthat, az elhelyezett képek adatait JSON tömbben tartja nyilván.

**Stack:** Vanilla JS ES modules, PHP (csak a háttérkép listahoz), nincs build tool.

---

## Fájlszerkezet

```
C:\www\hexyle.com\
├── index.php                   # HTML shell + Shopify credentials injektálása
├── api/
│   └── backgrounds.php         # img/bg/ mappa tartalmát adja vissza JSON-ként
├── img/
│   └── bg/                     # Háttérképek helye (jpg/png/webp)
├── css/
│   └── app.css                 # Teljes styling
├── js/
│   ├── app.js                  # Belépési pont, modulok összekötése
│   ├── state.js                # Központi állapotkezelés + pub/sub
│   ├── shopify.js              # Shopify Storefront API GraphQL kliens
│   ├── sidebar.js              # Termék lista renderelés + drag forrás
│   ├── board.js                # Board drag&drop + touch drag logika
│   └── carousel.js             # Háttérkép carousel
└── docs/
    └── plan.md                 # Ez a fájl
```

---

## Modul felelősségek

### `index.php`
- HTML shell renderelése (sidebar + board + carousel gombok)
- Shopify credentials injektálása PHP env változókból:
  ```php
  <script>
    window.SHOPIFY_DOMAIN = "<?= getenv('SHOPIFY_DOMAIN') ?>";
    window.SHOPIFY_TOKEN  = "<?= getenv('SHOPIFY_TOKEN') ?>";
  </script>
  ```
- `<script type="module" src="/js/app.js">` betöltése

### `api/backgrounds.php`
- `img/bg/` mappa fájllistáját adja vissza JSON tömbként
- `glob()` + `basename()` + `json_encode()`
- Így elég új képet bemásolni a mappába, nincs JS módosítás

### `js/state.js`
- Központi state objektum: `products`, `backgrounds`, `currentBgIndex`, `placedItems`
- Egyszerű pub/sub: `on(event, fn)` / `emit(event, data)`
- Mutáló függvények: `addPlacedItem(item)`, `removePlacedItem(elId)`, `updateItemPosition(elId, x, y)`
- **Pozíciók tárolása százalékban (0–100)** a board méretéhez képest → responsive resize gond nélkül

### `js/shopify.js`
- Shopify Storefront API (GraphQL, `2024-04` verzió)
- `X-Shopify-Storefront-Access-Token` header — böngészőből hívható, CORS engedélyezett
- `fetchProducts(cursor)` — termék ID, cím, ár, első kép URL lekérése
- Cursor-alapú lapozás (`after: $cursor`) — "Load more" gombhoz

### `js/sidebar.js`
- Termék kártyák renderelése `#product-list`-be
- Desktop: `draggable="true"` + `dragstart` → `dataTransfer.setData('product-id', id)`
- Mobile: `touchstart` → átadja az aktív drag terméket `board.js`-nek
- Kártya tartalmaz: kép, termék neve, ár

### `js/board.js`
- **Desktop DnD:**
  - `dragover` → `preventDefault()` (szükséges a drop engedélyezéséhez!)
  - `drop` → koordináta%-ba konvertálás → `state.addPlacedItem()` → `renderPlacedItem()`
- **Touch drag:**
  - `#touch-ghost` overlay elem követi az ujjat (`position:fixed`, `pointer-events:none`)
  - `touchmove` listener `{ passive: false }` → `preventDefault()` (scroll letiltás!)
  - `touchend` → ha board felett ér véget → pozíció%-ba → `state.addPlacedItem()`
- **Elhelyezett elemek:**
  - `position:absolute`, `left: X%`, `top: Y%`, `transform: translate(-50%,-50%)`
  - Újraelhelyezhetők (dragstart + drop ugyanazzal a logikával)
  - Törlés: `.remove-btn` gomb → `state.removePlacedItem()` + DOM eltávolítás
  - `<img>` belsején `pointer-events: none` → nem triggereli a böngésző natív kép-dragját

### `js/carousel.js`
- `initCarousel()` → `/api/backgrounds.php` lekérés → `state.backgrounds` feltöltés
- `nextBackground()` / `prevBackground()` → index léptető → `<img#background-image>.src` csere
- Az elhelyezett `.placed-item` divek a DOM-ban maradnak, csak a háttér `<img>` src változik

### `js/app.js`
- Összes modul inicializálása sorrendben
- Carousel gombok event listenerek bekötése
- Shopify termékek betöltése → sidebar renderelés

---

## CSS Layout

```
#app               → display:flex; height:100vh; overflow:hidden
#sidebar           → width:260px; overflow-y:auto
#board-container   → flex:1; position:relative
#board             → position:relative; width:100%; height:100%
#background-image  → position:absolute; inset:0; width:100%; height:100%; object-fit:cover
.placed-item       → position:absolute; transform:translate(-50%,-50%); cursor:grab
.placed-item img   → pointer-events:none; max-width:120px
#touch-ghost       → position:fixed; z-index:9999; pointer-events:none; display:none; opacity:0.8
```

**Responsive (≤768px):** `#app` `flex-direction:column-reverse`, sidebar vízszintes csík alul.

---

## Adatfolyam

```
PHP env vars → index.php → window.SHOPIFY_*
                               ↓
                         shopify.js → Shopify GraphQL API
                               ↓
                         state.products → sidebar.js → DOM kártyák
                                                          ↓
                                              dragstart / touchstart
                                                          ↓
                                                    board.js drop
                                                          ↓
                                              state.addPlacedItem()
                                                          ↓
                                              state.placedItems[]  ← élő JSON
                                                          ↓
                                              renderPlacedItem() → DOM
```

---

## Technikai figyelmeztetések

| Téma | Megoldás |
|------|---------|
| Touch scroll conflict | `touchmove` listener `{ passive: false }` + `preventDefault()` |
| HTML5 DnD drop reject | `dragover` handler-ben `preventDefault()` kötelező |
| Natív kép drag conflict | `<img>` `pointer-events: none` |
| Shopify CORS | Storefront API natívan engedélyezi, Admin API-t NEM szabad böngészőből hívni |
| Responsive pozíciók | X/Y tárolás %-ban, nem pixelben |
| Háttérkép kitöltés | `object-fit: cover` |
| Elem azonosítás | `uid = () => Math.random().toString(36).slice(2)` |

---

## Implementációs sorrend

1. `index.php` — HTML struktúra + credential injektálás
2. `css/app.css` — layout skeleton
3. `js/state.js` — állapotkezelés (mások tőle függnek)
4. `js/shopify.js` — API kliens, izolált tesztelés
5. `js/sidebar.js` — termék lista + desktop dragstart
6. `js/board.js` — desktop drop kezelés
7. `js/carousel.js` + `api/backgrounds.php`
8. `js/app.js` — összekötés
9. Touch drag hozzáadása `board.js`-hez és `sidebar.js`-hez
10. Törlés funkció befejezése

---

## Ellenőrzés / Tesztelés

- Shopify termékek megjelennek a sidebarban (konzolban hiba nélkül)
- Desktop: termék kép ráhúzható a boardra, marad a helyén, törölhető
- Mobile (Chrome DevTools touch emuláció): termék kép húzható, scroll nem indul el drag közben
- Carousel: háttérképváltás nem mozdítja el az elhelyezett termékeket
- `state.placedItems` konzolban JSON tömbként kiolvasható
- Responsive: 768px alatt sidebar alul jelenik meg
