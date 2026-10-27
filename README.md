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
| `legal.html` | Legal notice, linked from every footer: no advice, research status, dates, the guide, links, liability, copyright and privacy |
| `_data/papers.yml` | Your working papers, used on Home and Research |
| `images/gallery/` | Photographs for Beyond work. They appear automatically |
| `images/site/` | Named images: portrait and framework diagrams. The note in that folder lists the names |
| `assets/js/visited.js` | Your countries for the map |
| `assets/map/visa-de.json` | Visa rules for German passport holders, shown in the map's visa view |
| `asia-pacific/` | Your travel guide, Asia-Pacific, Annotated, at `/asia-pacific/`. Its card on Beyond work appears only while this folder exists |
| `assets/` | Styles, fonts, scripts and map data. No need to touch these |
| `.github/` | The monthly visa check (see below) and the script that prepares the travel guide. Never published |
| `_config.yml` | Site settings, including your ORCID iD and Google Scholar profile once you have them |

## Everyday changes

**Add photos.** Open `images/gallery`, choose **Add file → Upload files**, drag the photos in and press **Commit changes**. Use JPEG, PNG or WebP (not HEIC), ideally about 2000 px on the long side. The file name becomes the caption, and photos are sorted by file name, so `01-singapore-marina-bay.jpg` comes first and is captioned "Singapore marina bay".

This repository is public, so anyone can download the files in it, and a file you delete later stays in the history. Upload web-sized copies rather than originals, and remove the location data first (iPhone: **Share → Options → Location** off before saving a copy).

**Add a framework diagram or your portrait.** Upload it to `images/site/` with one of the names listed in that folder's note, for example `portrait.jpg` or `concentric-value-model.png`.

**Add a paper.** Open `_data/papers.yml`, press the pencil icon, copy one block, paste it at the top and change the values. It then appears on Research, and its question appears on Home.

**Fill in your countries.** Open `assets/js/visited.js`, press the pencil icon and add one name per line, for example `"Germany",`.

**Refresh the visa rules.** In `assets/map/visa-de.json` each country code holds a category `c`: `free`, `eta` (online authorization), `voa` (visa on arrival), `evisa` or `visa`, plus the allowed stay `s`, an optional note `n` and, once an entry has been re-checked, the date of that check `r` (the map then adds "Checked …" to its rule). `asOf` (currently 20 October 2026) dates the full compilation: change it only after re-checking every entry. Write an end date as `until 31 Dec 2027`, so the check below can track it.

You don't have to remember when. A check runs on the 2nd of every month (**Actions → Visa check**) and opens an issue only when an entry needs a look: its end date has passed, or the open dataset was updated after the entry was last checked and disagrees. GitHub emails you about the issue (default settings). The same evening, 18:43 Bangkok time, a scheduled Claude task researches exactly those entries in official sources and opens a pull request; you review it and press **Merge**, which also closes the issue. Nothing changes on the site until you merge. Every run's full report, flagged or not, is on its page under **Actions → Visa check**, where **Run workflow** runs it now (an issue from such a run is picked up on the next 2nd). GitHub pauses schedules in public repositories after 60 days without a commit, so if the site goes 50 days unchanged, the check records its date in `.github/visa-check-last-run` to keep itself running.

**Change text on a page.** Open the page file, press the pencil icon, edit the words between the tags and commit. When you change `legal.html`, update its “Last updated” date at the bottom.

**Add your ORCID iD or Google Scholar profile.** Open `_config.yml`, press the pencil icon, fill in `orcid` or `google_scholar` between the quotes and commit. The link appears on Research and in the information search engines read about you.

**Update or remove the travel guide.** To publish a new version, replace `asia-pacific/index.html` with one prepared for this site: ask Claude to prepare it from the updated artifact with `.github/scripts/prepare_guide.py`. The prepared page differs from the artifact in four ways only: a proper page head with title, share preview and canonical address; the fonts in `asia-pacific/fonts` instead of Google's (so visitors make no requests to third parties); the curator credit linking back to this site, with a link to the legal notice; and one softened remark (Mil Toast House now reads “Very rich.”). Make that last change in the artifact too, so the two stay alike. If the guide's introduction changes, change the card text on `beyond.html` to match, and replace `asia-pacific/og.png`, the share image, if the counts changed. To take the guide offline, delete the `asia-pacific` folder; the card on Beyond work and its mention on Home disappear by themselves.

## Search engines

`sitemap.xml` and `robots.txt` are generated automatically. The steps below happen in Google Search Console (search.google.com/search-console), not on google.com. It works in a phone's browser too.

1. **Add the property.** Choose **URL prefix** and enter `https://felixdlanger.github.io/`. Not **Domain**: that one can only be verified with a DNS record, and the DNS of github.io belongs to GitHub.
2. **Verify** in one of two ways, then keep the file or the code for good: Google checks it again from time to time, and removing it ends the verification.
   - **HTML file** (in place): `googlef6011c11b645f255.html` is in this repository. After any upload, wait two minutes, check that the file opens in a private browser tab, then press **Verify**, signed in with the Google account that downloaded the file.
   - **HTML tag**: copy the code inside `content="…"` from the tag Google shows, paste it between the quotes of `google_site_verification` in `_config.yml`, commit, wait two minutes and press **Verify**.
3. **Submit the sitemap.** Left menu → **Indexing → Sitemaps** → under **Add a new sitemap**, type `sitemap.xml` after the address shown → **Submit**.
4. **Ask for the first crawl.** Paste `https://felixdlanger.github.io/` into the inspection bar at the top of Search Console → **Request indexing**. Repeat for the Research, Frameworks and About pages. Google caps these requests at a small number a day.
5. **Bing.** In Bing Webmaster Tools, sign in and choose **Import from Google Search Console**: the site and its sitemap come across verified. Bing's index also feeds DuckDuckGo, Yahoo and Copilot.

Once you have your own domain, add it as a **Domain** property instead.

## Your own domain

Buy the domain, then go to **Settings → Pages → Custom domain**, enter it and save. GitHub shows the DNS records to add at your registrar. Once the domain shows as verified, tick **Enforce HTTPS**. Your tool pages (Concentric Value Model, FlightCompass, TAVE, TRVA Navigator) move under the new domain automatically.

## Credits

Typeface: Source Serif 4 by Adobe, SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).
Travel guide typefaces: DM Mono, Shippori Mincho and Zen Kaku Gothic New, SIL Open Font License 1.1 (`asia-pacific/fonts/OFL.txt`).
Map: Natural Earth 1:50m countries, public domain, in the Equal Earth projection.
No cookies, analytics or third-party requests on this site, the guide or the four tool pages, which keep their own fonts and libraries in their repositories.
