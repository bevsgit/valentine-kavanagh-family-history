#!/usr/bin/env python3
"""
Build the Valentine & Kavanagh family history from source.

Produces two things from one template:
  site/index.html   - the website. Images and Leaflet load as separate files,
                      so the page itself is small and the record scans load
                      only when you scroll to them.
  dist/Valentine_Kavanagh_Family_History.html
                    - one self-contained file with everything inlined.
                      Email it, archive it, open it with no internet.

Sources:
  template.html - markup, styles and behaviour
  data.js       - people, timeline, places, churches, open questions
  records.js    - the record gallery
  img/*.jpg     - the record scans

Run:  python3 build.py
"""
import base64, json, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

SITE = "site"
DIST = "dist"
RECORDS_DIR = os.path.join(SITE, "assets", "records")
LIB_DIR = os.path.join(SITE, "assets", "lib")

# Live but not indexed: search engines are asked to stay away.
# Flip NOINDEX to False if you ever want other researchers to find this.
NOINDEX = True
SITE_TITLE = "The Valentine & Kavanagh Families of Dublin & Cumbernauld"
SITE_DESC = ("Four generations of a Dublin bookbinding family, 1842-1958 - a clickable family tree, "
             "timeline, mapped addresses and 32 original parish, civil and census records.")


def dims(path):
    """Width and height of a JPEG, without needing Pillow."""
    with open(path, "rb") as f:
        b = f.read()
    i = 2
    while i < len(b) - 9:
        if b[i] != 0xFF:
            i += 1
            continue
        m = b[i + 1]
        if m in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            h = int.from_bytes(b[i + 5:i + 7], "big")
            w = int.from_bytes(b[i + 7:i + 9], "big")
            return w, h
        if m in (0xD8, 0xD9) or 0xD0 <= m <= 0xD7:
            i += 2
            continue
        i += 2 + int.from_bytes(b[i + 2:i + 4], "big")
    raise ValueError("could not read dimensions from " + path)


def load_sources():
    keys = sorted(f[:-4] for f in os.listdir("img") if f.endswith(".jpg"))
    return {
        "template": open("template.html", encoding="utf-8").read(),
        "data": open("data.js", encoding="utf-8").read(),
        "records": open("records.js", encoding="utf-8").read(),
        "leaflet_js": open("node_modules/leaflet/dist/leaflet.js", encoding="utf-8").read(),
        "leaflet_css": open("node_modules/leaflet/dist/leaflet.css", encoding="utf-8").read(),
        "keys": keys,
        "dims": {k: dims(os.path.join("img", k + ".jpg")) for k in keys},
    }


def meta_block(for_site):
    m = ['<meta name="description" content="%s">' % SITE_DESC]
    if for_site:
        if NOINDEX:
            m.append('<meta name="robots" content="noindex, nofollow, noarchive">')
        m += [
            '<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">',
            '<meta property="og:type" content="website">',
            '<meta property="og:title" content="%s">' % SITE_TITLE,
            '<meta property="og:description" content="%s">' % SITE_DESC,
            '<meta property="og:image" content="assets/social.jpg">',
            '<meta name="twitter:card" content="summary_large_image">',
        ]
    return "\n".join(m)


def build(src, for_site):
    t = src["template"]

    if for_site:
        head = '<link rel="stylesheet" href="assets/lib/leaflet.css">'
        ljs = '<script src="assets/lib/leaflet.js" defer></script>'
        img = {k: "assets/records/%s.jpg" % k for k in src["keys"]}
    else:
        head = "<style>%s</style>" % src["leaflet_css"]
        ljs = "<script>%s</script>" % src["leaflet_js"]
        img = {}
        for k in src["keys"]:
            with open(os.path.join("img", k + ".jpg"), "rb") as f:
                img[k] = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()

    js = "const IMG=%s;\nconst IMGDIM=%s;\n" % (
        json.dumps(img), json.dumps({k: list(v) for k, v in src["dims"].items()}))

    return (t.replace("<!--__META__-->", meta_block(for_site))
             .replace("<!--__HEAD_ASSETS__-->", head)
             .replace("<!--__LEAFLET_JS__-->", ljs)
             .replace("/*__IMAGES__*/", js)
             .replace("/*__DATA__*/", src["data"] + "\n" + src["records"]))


def main():
    src = load_sources()

    # ---- the website ----
    os.makedirs(RECORDS_DIR, exist_ok=True)
    os.makedirs(LIB_DIR, exist_ok=True)
    for k in src["keys"]:
        shutil.copyfile(os.path.join("img", k + ".jpg"), os.path.join(RECORDS_DIR, k + ".jpg"))
    shutil.copyfile("node_modules/leaflet/dist/leaflet.js", os.path.join(LIB_DIR, "leaflet.js"))
    shutil.copyfile("node_modules/leaflet/dist/leaflet.css", os.path.join(LIB_DIR, "leaflet.css"))

    site_html = build(src, for_site=True)
    open(os.path.join(SITE, "index.html"), "w", encoding="utf-8").write(site_html)

    open(os.path.join(SITE, "robots.txt"), "w", encoding="utf-8").write(
        "User-agent: *\nDisallow: /\n" if NOINDEX else "User-agent: *\nAllow: /\n")
    # stops GitHub Pages running the files through Jekyll
    open(os.path.join(SITE, ".nojekyll"), "w").close()

    # ---- the single file ----
    os.makedirs(DIST, exist_ok=True)
    one = build(src, for_site=False)
    open(os.path.join(DIST, "Valentine_Kavanagh_Family_History.html"), "w", encoding="utf-8").write(one)

    imgbytes = sum(os.path.getsize(os.path.join(RECORDS_DIR, k + ".jpg")) for k in src["keys"])
    print("site/index.html                %6.1f KB  (first load)" % (len(site_html.encode()) / 1024))
    print("  + %d record scans            %6.1f KB  (lazy, on scroll)" % (len(src["keys"]), imgbytes / 1024))
    print("  + leaflet                    %6.1f KB  (deferred)" % (os.path.getsize(os.path.join(LIB_DIR, "leaflet.js")) / 1024))
    print("dist/single file               %6.1f KB  (everything inlined)" % (len(one.encode()) / 1024))


if __name__ == "__main__":
    sys.exit(main())
