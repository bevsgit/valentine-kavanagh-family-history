# The Valentine & Kavanagh Families of Dublin & Cumbernauld

A family history site covering four generations, 1842–1958: a clickable family tree,
a timeline, a mapped set of addresses linked to Street View, 32 original parish, civil
and census records, and a running list of what is still unresolved.

**Live site:** _add your Pages URL here once it's deployed_

The site is live but asks search engines not to index it (see [Privacy](#privacy) below).

---

## What's here

```
build.py            builds everything. Run this after any change.
check.js            sanity checks. Run after building; CI runs it too.

data.js             THE RESEARCH. People, timeline, places, churches, open questions.
records.js          the record gallery — headings, captions, source links.
template.html       markup, styles and behaviour.
img/                the 32 record scans, plus the two static maps.

site/               ← the website. This is what gets published.
dist/               ← a single self-contained HTML file. Email it, archive it,
                      open it with no internet at all.
sources/            the original research spreadsheet and the census PDF.
```

Everything in `site/` and `dist/` is generated. Don't edit it by hand — edit
`data.js`, `records.js` or `template.html` and rebuild.

---

## Making a change

You need Python 3 and Node.

```bash
npm install          # once, to fetch Leaflet
python3 build.py     # rebuild the site and the single file
node check.js        # make sure nothing broke
npm run serve        # look at it: http://localhost:8000
```

Push to `main` and GitHub Actions rebuilds and republishes automatically.

### Adding a person

Add an entry to `PEOPLE` in `data.js`, then add their id to the right generation
array near the bottom of `template.html`.

```js
t14: {
  name:'Someone Valentine', gen:4, line:'both', parent:'v7', conf:C.p,
  dates:'b. 1922',
  summary:'One sentence that earns its place.',
  facts:[['Born','12 March 1922'],['Born at','Cumbernauld']],
  notes:['Anything a reader would want to know but that is not a bare fact.'],
  flags:[['probable','Why this is not certain']],
  sources:[['1922 birth registration', 'https://...']]
}
```

`conf` reflects the **weakest** link in that person's record, not the strongest:
`C.y` confirmed, `C.p` probable, `C.u` unresolved. Update the **People** figure in
`template.html` — `check.js` will fail the build if you forget.

### Adding an address

Add a row to the relevant group in `PLACES`:

```js
['1904', '5 Somewhere Street', 'What happened here.',
 53.3500, -6.2600,           // coordinates, or null if you can't place it
 'extant',                    // extant | renamed | demolished | uncertain
 'house',                     // house | street | approx | none
 'med',                       // high | med | low | none
 'https://...']               // optional: a hand-picked Street View link
```

The last field wins over the generated link. Use it when the automatic Street View
lands somewhere unhelpful — Google snaps to the nearest panorama, which on busy
commercial streets is often a shop interior. Pin numbers are assigned automatically
in group order, so the map and the tables always agree.

### Adding a record

Add an item to the right group in `records.js` and drop the scan in `img/`.
Keep scans as JPEG, around 1150px wide, quality ~72 — that's the balance the
existing 32 use. `check.js` fails if a record points at an image that isn't there,
or if an image is never used.

---

## Privacy

`build.py` has a `NOINDEX` flag, set to `True`. It writes a `robots.txt` that
disallows crawlers and a `noindex` meta tag. The site is reachable by anyone with
the link, but shouldn't appear in search results for a family name.

Note that on a free GitHub account, Pages only publishes from a **public** repo, so
the underlying research files are readable by anyone who finds the repository.

If you later decide you'd rather be findable — other researchers searching these
surnames finding you is genuinely how connections get made — set `NOINDEX = False`
and rebuild.

---

## A note on the evidence

The confidence markers are not decoration. Roughly a third of the identifications
in here carry a caveat, and the page says so in each case rather than presenting a
tidy tree. Two things in particular are worth remembering when adding to it:

- **William Valentine's birth has never been found.** Irish civil registration of
  births began in 1864 and he was born around 1842. Everything about him is dated
  from later documents.
- **The 1921 census ages are unreliable for the younger children.** The enumerator
  recorded five of them 2–7 months too old, which puts two in the wrong year. Ages
  in that record are a guide, not a source.

The open questions tab is ordered by what would unlock the most.

---

## Sources

Parish registers and civil registration returns via
[irishgenealogy.ie](https://www.irishgenealogy.ie).
1901 and 1911 census returns via the
[National Archives of Ireland](https://nationalarchives.ie/collections/search-the-census/).
1921 census of Scotland via [ScotlandsPeople](https://www.scotlandspeople.gov.uk/)
(Cumbernauld 495/9/19). Building histories from the
[NIAH](https://www.buildingsofireland.ie/) and
[British Listed Buildings](https://britishlistedbuildings.co.uk/).
Map tiles © OpenStreetMap contributors, © CARTO. Mapping by
[Leaflet](https://leafletjs.com/).

Compiled from the research spreadsheet *Valentine Dublin Research*.
