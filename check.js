#!/usr/bin/env node
/**
 * Sanity checks for the family history build.
 *
 * Run after `python3 build.py`. Catches the things that quietly rot as the
 * research grows: a record pointing at an image that isn't there, a headline
 * figure that no longer matches the data, a place with a broken coordinate.
 *
 *   node check.js
 *
 * Exits non-zero on failure, so CI stops before publishing something wrong.
 */
const fs = require('fs');
const path = require('path');

const problems = [];
const notes = [];
const fail = (m) => problems.push(m);
const ok = (m) => notes.push(m);

// ---------------------------------------------------------------- load data
const dataSrc = fs.readFileSync('data.js', 'utf8');
const recSrc = fs.readFileSync('records.js', 'utf8');
let D;
try {
  D = new Function(dataSrc + '\n' + recSrc +
    ';return {PEOPLE,TIMELINE,PLACES,CHURCHES,LANDMARKS,QUESTIONS,RECORDS};')();
} catch (e) {
  console.error('FAIL  data.js / records.js did not parse:\n  ' + e.message);
  process.exit(1);
}
ok('data.js and records.js parse');

// ------------------------------------------------------------------- people
const people = Object.keys(D.PEOPLE);
people.forEach((id) => {
  const p = D.PEOPLE[id];
  if (!p.name) fail(`person "${id}" has no name`);
  if (!['confirmed', 'probable', 'unresolved'].includes(p.conf))
    fail(`person "${id}" has an unknown confidence: ${p.conf}`);
  (p.sources || []).forEach((s) => {
    if (!Array.isArray(s) || s.length !== 2) fail(`person "${id}" has a malformed source`);
    else if (!/^https?:\/\//.test(s[1])) fail(`person "${id}" source is not a URL: ${s[1]}`);
  });
  if (p.parent && !D.PEOPLE[p.parent]) fail(`person "${id}" names a parent that does not exist: ${p.parent}`);
});
ok(`${people.length} people, all with a name, a confidence and well-formed sources`);

// ------------------------------------------------------------------- places
let pins = 0;
const seenCoord = {};
Object.entries(D.PLACES).forEach(([group, g]) => {
  if (!g.color || !g.label) fail(`place group "${group}" is missing a label or colour`);
  g.rows.forEach((r) => {
    const [yr, addr, note, lat, lng, status, prec, conf, override] = r;
    if (!yr || !addr || !note) fail(`place "${addr}" is missing a year, address or note`);
    if (!['extant', 'renamed', 'demolished', 'uncertain'].includes(status))
      fail(`place "${addr}" has an unknown status: ${status}`);
    if (!['house', 'street', 'approx', 'none'].includes(prec))
      fail(`place "${addr}" has an unknown precision: ${prec}`);
    if (!['high', 'med', 'low', 'none'].includes(conf))
      fail(`place "${addr}" has an unknown confidence: ${conf}`);
    if (override && !/^https:\/\/www\.google\.[a-z.]+\/maps\//.test(override))
      fail(`place "${addr}" has a hand-picked link that is not a Google Maps URL`);
    if (lat == null) {
      if (prec !== 'none') fail(`place "${addr}" has no coordinate but claims precision "${prec}"`);
      return;
    }
    pins++;
    const inDublin = lat > 53.31 && lat < 53.40 && lng > -6.34 && lng < -6.20;
    const inCumbernauld = lat > 55.9 && lat < 56.0 && lng > -4.1 && lng < -3.9;
    if (!inDublin && !inCumbernauld)
      fail(`place "${addr}" sits outside Dublin and Cumbernauld: ${lat}, ${lng}`);
    const key = lat.toFixed(5) + ',' + lng.toFixed(5);
    seenCoord[key] = (seenCoord[key] || 0) + 1;
  });
});
[...D.CHURCHES, ...D.LANDMARKS].forEach((c) => {
  if (typeof c[3] !== 'number' || typeof c[4] !== 'number') fail(`"${c[0]}" has no coordinate`);
  else pins++;
});
ok(`${pins} map pins, all inside Dublin or Cumbernauld`);
const dupes = Object.entries(seenCoord).filter(([, n]) => n > 1);
if (dupes.length) ok(`${dupes.length} coordinate(s) shared by more than one address — the map nudges these apart`);

// ------------------------------------------------------------------ records
const imgDir = 'img';
const onDisk = new Set(fs.readdirSync(imgDir).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)));
const used = new Set();
D.RECORDS.forEach((grp) => {
  if (!grp.title || !grp.blurb) fail('a record group is missing a title or blurb');
  grp.items.forEach((it) => {
    if (!it.h || !it.m) fail(`record "${it.h || '?'}" is missing a heading or meta line`);
    if (it.link && !/^https?:\/\//.test(it.link)) fail(`record "${it.h}" has a bad link`);
    (it.imgs || []).forEach((k) => {
      used.add(k);
      if (!onDisk.has(k)) fail(`record "${it.h}" wants img/${k}.jpg, which is not there`);
    });
  });
});
// the two static maps are referenced from the markup rather than the records list
['image28', 'image29'].forEach((k) => {
  used.add(k);
  if (!onDisk.has(k)) fail(`the Places fallback wants img/${k}.jpg, which is not there`);
});
[...onDisk].filter((k) => !used.has(k)).forEach((k) => fail(`img/${k}.jpg is never used — remove it or reference it`));
ok(`${used.size} record images, all present and all used`);

// ------------------------------------------------- headline figures in the page
const tpl = fs.readFileSync('template.html', 'utf8');
const stat = (label) => {
  const m = tpl.match(new RegExp('<b>(\\d+)</b><span>' + label + '</span>'));
  return m ? Number(m[1]) : null;
};
const expect = [
  ['People', people.length],
  ['Record images', used.size],
  ['Open questions', D.QUESTIONS.length],
];
expect.forEach(([label, want]) => {
  const got = stat(label);
  if (got === null) fail(`the "${label}" figure is missing from template.html`);
  else if (got !== want) fail(`the page says ${got} ${label} but the data has ${want}`);
});
ok('headline figures match the data');

// --------------------------------------------------------------- built output
const siteIndex = path.join('site', 'index.html');
if (fs.existsSync(siteIndex)) {
  const html = fs.readFileSync(siteIndex, 'utf8');
  if (html.includes('__IMAGES__') || html.includes('__DATA__') || html.includes('__LEAFLET'))
    fail('site/index.html still contains an unreplaced build placeholder');
  if (!html.includes('assets/lib/leaflet.js')) fail('site/index.html does not reference Leaflet');
  const missing = [...html.matchAll(/assets\/records\/([\w.-]+)\.jpg/g)]
    .map((m) => m[1]).filter((k) => !fs.existsSync(path.join('site', 'assets', 'records', k + '.jpg')));
  if (missing.length) fail('site references missing image files: ' + [...new Set(missing)].join(', '));
  ['robots.txt', '.nojekyll', 'assets/favicon.svg', 'assets/social.jpg'].forEach((f) => {
    if (!fs.existsSync(path.join('site', f))) fail(`site/${f} is missing`);
  });
  ok('site/index.html is fully built and all its assets exist');
} else {
  fail('site/index.html not found — run `python3 build.py` first');
}

// ------------------------------------------------------------------- report
notes.forEach((n) => console.log('  ok   ' + n));
if (problems.length) {
  console.error('\n' + problems.length + ' problem(s):');
  problems.forEach((p) => console.error('  FAIL ' + p));
  process.exit(1);
}
console.log('\nAll checks passed.');
