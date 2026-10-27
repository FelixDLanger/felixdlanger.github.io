# felixdlanger.github.io

Personal website of Felix Diego Langer, published with GitHub Pages from this repository.
Every change you commit here goes live by itself in a minute or two. The **Actions** tab shows each update and flags any error.

## What's where

| File or folder | What it holds |
| --- | --- |
| `index.html` | Home |
| `research.html` | Research |
| `frameworks.html` | Frameworks & tools |
| `about.html` | About |
| `beyond.html` | Beyond work: photographs, the country map and the travel guide card |
| `_data/papers.yml` | Your working papers, used on Home and Research |
| `images/gallery/` | Photographs for Beyond work. They appear automatically |
| `images/site/` | Named images: portrait and framework diagrams. The note in that folder lists the names |
| `assets/js/visited.js` | Your countries for the map |
| `assets/map/visa-de.json` | Visa rules for German passport holders, shown in the map's visa view |
| `asia-pacific/` | Your travel guide, Asia-Pacific, Annotated, at `/asia-pacific/`. Its card on Beyond work appears only while this folder exists |
| `assets/` | Styles, fonts, scripts and map data. No need to touch these |
| `.github/` | The monthly visa check (see below) |
| `_config.yml` | Site settings, including your ORCID iD and Google Scholar profile once you have them |

## Everyday changes

**Add photos.** Open `images/gallery`, choose **Add file → Upload files**, drag the photos in and press **Commit changes**. Use JPEG, PNG or WebP (not HEIC), ideally about 2000 px on the long side. The file name becomes the caption, and photos are sorted by file name, so `01-singapore-marina-bay.jpg` comes first and is captioned "Singapore marina bay".

This repository is public, so anyone can download the files in it, and a file you delete later stays in the history. Upload web-sized copies rather than originals, and remove the location data first (iPhone: **Share → Options → Location** off before saving a copy).

**Add a framework diagram or your portrait.** Upload it to `images/site/` with one of the names listed in that folder's note, for example `portrait.jpg` or `concentric-value-model.png`.

**Add a paper.** Open `_data/papers.yml`, press the pencil icon, copy one block, paste it at the top and change the values. It then appears on Research, and its question appears on Home.

**Fill in your countries.** Open `assets/js/visited.js`, press the pencil icon and add one name per line, for example `"Germany",`.

**Refresh the visa rules.** They are dated (`asOf`, currently 20 October 2026) and change often. In `assets/map/visa-de.json` each country code holds a category `c`: `free`, `eta` (online authorization), `voa` (visa on arrival), `evisa` or `visa`, plus the allowed stay `s` and an optional note `n`. Update the entry you need and the `asOf` date.

You don't have to remember when. A check runs on the 2nd of every month (**Actions → Visa check**). Each January, and whenever a rule's end date has passed, it opens an issue in this repository, and GitHub notifies you (by e-mail, with the default settings). The issue lists what to look at, with a request you can paste into Claude to do the research. It never changes the data by itself, because official rules and open datasets often disagree. To run it now: **Actions → Visa check → Run workflow**. GitHub pauses schedules in public repositories after 60 days without a commit, so if the site goes 50 days unchanged, the check records its date in `.github/visa-check-last-run` to keep itself running.

**Change text on a page.** Open the page file, press the pencil icon, edit the words between the tags and commit.

**Add your ORCID iD or Google Scholar profile.** Open `_config.yml`, press the pencil icon, fill in `orcid` or `google_scholar` between the quotes and commit. The link appears on Research and in the information search engines read about you.

**Update or remove the travel guide.** To publish a new version, replace `asia-pacific/index.html` with one prepared for this site: ask Claude to prepare it from the updated artifact. The prepared page differs from the artifact in three ways only: a proper page head with title and share preview, the fonts in `asia-pacific/fonts` instead of Google's (so visitors make no requests to third parties), and the curator credit linking back to this site. If the guide's introduction changes, change the card text on `beyond.html` to match, and replace `asia-pacific/og.png`, the share image, if the counts changed. To take the guide offline, delete the `asia-pacific` folder; the card on Beyond work and its mention on Home disappear by themselves.

## Search engines

`sitemap.xml` and `robots.txt` are generated automatically. To see how people find the site, add it to Google Search Console as a **URL prefix** property (`https://felixdlanger.github.io/`), download the verification file Google offers, upload it here with **Add file → Upload files**, then submit `sitemap.xml` under **Sitemaps**. Keep that `google….html` file in the repository for good: Google checks it again from time to time, and deleting it ends the verification. It stays out of the sitemap by itself. Once you have your own domain, add it as a **Domain** property instead.

## Your own domain

Buy the domain, then go to **Settings → Pages → Custom domain**, enter it and save. GitHub shows the DNS records to add at your registrar. Once the domain shows as verified, tick **Enforce HTTPS**. Your tool pages (Concentric Value Model, FlightCompass, TAVE, TRVA Navigator) move under the new domain automatically.

## Credits

Typeface: Source Serif 4 by Adobe, SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).
Travel guide typefaces: DM Mono, Shippori Mincho and Zen Kaku Gothic New, SIL Open Font License 1.1 (`asia-pacific/fonts/OFL.txt`).
Map: Natural Earth 1:50m countries, public domain, in the Equal Earth projection.
No cookies, analytics or third-party requests.
