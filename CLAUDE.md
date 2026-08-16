# Working on this repo

This is a genealogy site. The deliverable is not "a working page" — it is **an
honest account of what the evidence supports**. Those are different goals, and
where they conflict, honesty wins.

Read this before changing `data.js` or `records.js`.

---

## The one rule that matters

**Never write an inference as a fact.**

Every claim on this site is one of three things, and the page says which:

| | means |
|---|---|
| `C.y` confirmed | every event in this person's record is documented and consistent |
| `C.p` probable | identified, but at least one record carries a discrepancy |
| `C.u` unresolved | the trail goes cold — no record found, or too many candidates |

`conf` reflects the **weakest** link in that person's record, not the strongest.
William Valentine is the best-documented man in the tree and is marked
`unresolved`, because his birth has never been found. That is deliberate. Do not
"tidy" it.

When you find a discrepancy, **flag it — don't resolve it**. Add a `flags` entry
and say what doesn't fit. A visible contradiction is a research lead; a silently
smoothed-over one is a lie that survives for decades.

Words to avoid unless a document actually says so: *exactly*, *confirms*,
*proves*, *clearly*. If the evidence is an inference from a census age, say so in
the same sentence.

---

## Traps in this specific dataset

Things that have already caught someone out. Check against these before adding
anything that touches them.

- **The 1921 census ages are unreliable for the younger children.** The
  enumerator recorded five of them 2–7 months too old, which puts Thomas (b.
  1911) and Anne (b. 1914) in the wrong year entirely. Ages in that record are a
  guide, not a source. Brendon's and Mary's birth years are *calculated from
  those ages* and are correspondingly soft.
- **William Valentine's birth has never been found** and probably cannot be —
  Irish civil registration of births began in 1864, he was born around 1842. A
  candidate baptism (1840, to John and Charlotte) was examined and rejected.
  Every date for him is derived from later documents.
- **The Galwey & Co / Book of Kells 1895 rebinding is uncorroborated.** The
  standard published accounts name 1826, an 1874 London rebinding, and Roger
  Powell's in 1953. The firm and its Eustace Street premises are solid; that one
  attribution is flagged in the text and should stay flagged.
- **Two addresses are unreconciled.** Martha Mackey's 1863 address is 134 Great
  Britain Street on the marriage record and 153 in the original spreadsheet.
  There is no Greenville *Street* in Dublin at all — only a Terrace and an
  Avenue, both off the South Circular Road.
- **Surnames drift.** Valentine/Valintine, Mackey/Markey, Kavanagh/Cavanagh. The
  drift is evidence, not noise — record it rather than normalising it.
- **`c1921_names.jpg` etc. are Crown copyright** (ScotlandsPeople, licensed
  personally). Keep source certificates out of `site/`.

---

## Build and check

```bash
npm install          # once
python3 build.py     # rebuilds site/ and dist/
node check.js        # must pass before pushing
npm run serve        # http://localhost:8000
```

`build.py` writes with `newline="\n"` and `.gitattributes` normalises to LF, so
Windows and Linux CI produce identical bytes. If you see a diff of thousands of
unchanged lines, something has broken that — fix it rather than committing it.

`check.js` fails the build on: a record pointing at a missing scan, an unused
image, a headline figure that no longer matches the data, a coordinate outside
Dublin or Cumbernauld, a malformed source link, an unknown status or confidence
value, an unreplaced build placeholder.

**If you add or remove a person, record image, or open question, update the
matching figure in the `.hstats` block of `template.html`.** `check.js` will stop
you if you forget.

---

## Data shapes

### A person — `PEOPLE` in `data.js`

```js
t14: {
  name:'Someone Valentine', gen:4, line:'both', parent:'v7', conf:C.p,
  role:'Occupation', dates:'b. 1922',
  summary:'One sentence that earns its place.',
  facts:[['Born','12 March 1922'],['Born at','Cumbernauld']],
  notes:['Context, reasoning, anything a reader would want to know.'],
  flags:[['probable','What specifically does not fit']],
  sources:[['1922 birth registration','https://...']]
}
```

`gen` 1–4. `line` is `valentine` | `mackey` | `kavanagh` | `walsh` | `both`.
`star:true` marks the principal figures. Add the id to the right generation array
near the bottom of `template.html` or the person will exist but not appear.

### An address — `PLACES` in `data.js`

```js
['1904','5 Somewhere Street','What happened here.',
 53.3500,-6.2600,   // or null, null if it cannot be placed
 'extant',          // extant | renamed | demolished | uncertain
 'house',           // house | street | approx | none
 'med',             // high | med | low | none
 'https://...']     // optional hand-picked Street View link
```

The last field overrides the generated link. Use it when the automatic Street
View lands somewhere unhelpful — Google snaps to the nearest panorama, which on
busy commercial streets is often a shop interior. Two pins already use it.

Pin numbers are assigned automatically in group order, so the map and the tables
always agree. Never hard-code one.

**Do not invent coordinates.** `null` with `'none'` precision is correct and
honest; a plausible-looking wrong coordinate is worse than no coordinate. Kings
Avenue is deliberately left unplaced.

### A record — `records.js`

Scans go in `img/`, JPEG, ~1150px wide, quality ~72. Reference the filename
without extension. `check.js` fails if a record points at a missing image or an
image is never used.

---

## When to hand back to a Cowork session

This repo is edited from two places: here, and a Claude Cowork session that has
the desktop bridge and writes into this folder directly.

**Stop and hand back if the task needs any of these**, because you cannot do them
from the terminal:

- **Reading a scan or PDF** — a new certificate, census page or parish register.
  Transcription needs eyes on the image, and every transcription in here was
  verified against the original a second time before it was committed.
- **Web research** — locating a vanished street, checking what stands somewhere
  now, corroborating a claim.
- **Judging evidence** — whether a record is the right person, what confidence to
  assign, whether a discrepancy is fatal.

You *can* confidently do: typo and prose fixes, data the user has already
transcribed and dated, structural and styling changes, dependency updates, build
and CI problems, and everything git and deployment.

---

## Deployment

Pushing to `main` triggers `.github/workflows/pages.yml`, which installs Leaflet,
runs `build.py`, runs `check.js`, and publishes `site/`.

The site is live but `NOINDEX = True` in `build.py`. The repo is public because
free-tier GitHub Pages requires it. Do not flip `NOINDEX` without asking; it is a
privacy decision about a family, not a config value.

**The `<meta name="robots" content="noindex">` tag is what keeps this out of
search results — not `robots.txt`.** Two reasons, both easy to get wrong:

1. `robots.txt` is only honoured at the *host root*. This is a project site at
   `bevsgit.github.io/valentine-kavanagh-family-history/`, so the file we publish
   sits at a subpath and crawlers ignore it entirely.
2. Even where it is honoured, `Disallow` blocks *crawling*, not *indexing*. A
   crawler that is not allowed to fetch the page never reads the noindex tag, and
   a blocked URL can still be indexed from an external link. So `Disallow` plus
   `noindex` is worse than `noindex` alone.

`robots.txt` therefore says `Allow: /` on purpose. Do not "fix" it to `Disallow`.
This becomes live rather than theoretical the moment a custom domain is added, at
which point the file *would* start being honoured.

`SITE_URL` in `build.py` must be kept correct: Open Graph requires absolute URLs,
and a relative `og:image` is silently ignored, which breaks link previews. If the
site moves to a custom domain, update `SITE_URL` in the same commit.
