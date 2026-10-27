"""Turn the "Asia-Pacific, Annotated" artifact export into a standalone page for the site.

Usage: python3 .github/scripts/prepare_guide.py <artifact-export.html> asia-pacific/index.html
(Python 3 only, no packages; the fonts it points to are already in asia-pacific/fonts.)

What changes (nothing in the guide's content does):
  * a proper <head>: title, description, share preview, icons from the main site
  * Google Fonts replaced by the self-hosted files in ./fonts (no third-party requests)
  * the curator credit in the footer links back to the main site, next to a link to the legal notice
  * EDITS below: tiny wording changes agreed with Felix; once the artifact itself carries one, it is skipped
"""
import re
import sys
import pathlib

src, dest = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
s = src.read_text()

body_at = s.index("<body>")
wrapper_head = s[:body_at]
viewport = re.search(r'<meta name=viewport content="([^"]+)">', wrapper_head).group(1)
wrapper_css = re.search(r"<style>(.*?)</style>", wrapper_head, re.S).group(1)

mast_at = s.index('<header class="mast">')
prefix = s[body_at + len("<body>"):mast_at]
title = re.search(r"<title>(.*?)</title>", prefix, re.S).group(1).strip()
description = re.search(r'<meta name="description" content="([^"]*)">', prefix).group(1)
page_css = re.search(r"<style>(.*?)</style>", prefix, re.S).group(1)
js_flag = re.search(r"<script>(.*?)</script>", prefix, re.S).group(1).strip()
assert "fonts.googleapis.com" in prefix, "expected the Google Fonts link in the export"

rest = s[mast_at:]
rest = rest.replace("Curated by <b>Felix D. Langer</b>", 'Curated by <b><a href="../">Felix D. Langer</a></b>', 1)
assert rest.count("Saved places stay in this browser only.</p>") == 1, "footer wording changed"
rest = rest.replace("Saved places stay in this browser only.</p>", 'Saved places stay in this browser only. <a href="../legal.html">Legal notice</a>.</p>', 1)
EDITS = [  # (old, new, expected count): the static edition and the data each hold one copy
    ("Very rich, and service is hit and miss.", "Very rich.", 2),   # no service verdict on a Bangkok business (27 Oct 2026)
]
for old_text, new_text, n in EDITS:
    found = rest.count(old_text)
    if found == 0:
        print(f"already in the artifact, skipped: {old_text!r}")
        continue
    assert found == n, f"edit no longer matches: {old_text!r} ({found} found, {n} expected)"
    rest = rest.replace(old_text, new_text)
assert "fonts.googleapis" not in rest and "fonts.gstatic" not in rest

LATIN = ("U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, "
         "U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD")
LATIN_EXT = ("U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, "
             "U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF")
faces = []
for family, slug, weights in [("DM Mono", "dm-mono", (400, 500)),
                              ("Shippori Mincho", "shippori-mincho", (500, 600, 800)),
                              ("Zen Kaku Gothic New", "zen-kaku-gothic-new", (400, 500, 700))]:
    for w in weights:
        for subset, rng in (("latin", LATIN), ("latin-ext", LATIN_EXT)):
            faces.append(f'@font-face {{ font-family: "{family}"; font-style: normal; font-weight: {w}; font-display: swap; '
                         f'src: url("fonts/{slug}-{subset}-{w}-normal.woff2") format("woff2"); unicode-range: {rng}; }}')
# the seal character only; every other Chinese, Japanese, Korean or Thai name uses the reader's system font
faces.append('@font-face { font-family: "Shippori Mincho"; font-style: normal; font-weight: 800; font-display: swap; '
             'src: url("fonts/shippori-mincho-seal-800-normal.woff2") format("woff2"); unicode-range: U+8A3B; }')

base = "https://felixdlanger.github.io/asia-pacific/"
head = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="{viewport}">
<title>{title} – Felix Diego Langer</title>
<meta name="description" content="{description}">
<meta name="author" content="Felix Diego Langer">
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Felix Diego Langer">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<link rel="canonical" href="{base}">
<meta property="og:url" content="{base}">
<meta property="og:image" content="{base}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="icon" href="../favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<link rel="preload" href="fonts/zen-kaku-gothic-new-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/shippori-mincho-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<style>{wrapper_css}</style>
<style>
/* Self-hosted fonts (SIL Open Font License, see fonts/OFL.txt) */
{chr(10).join(faces)}
</style>
<style>{page_css}</style>
<script>{js_flag}</script>
</head>
<body>
"""
out = head + rest
if not out.rstrip().endswith("</html>"):
    out = out.rstrip() + "\n</html>\n"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(out)
print(f"{dest}: {len(out.encode()):,} bytes, title '{title}'")
