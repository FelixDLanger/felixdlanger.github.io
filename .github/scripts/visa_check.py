#!/usr/bin/env python3
"""Review of the visa rules shown on Beyond work (assets/map/visa-de.json).

Run by .github/workflows/visa-check.yml. It never edits the data: official rules, open datasets
and news often disagree, so a person decides. It lists what needs a look:
  1. rules whose note gives an end date that has passed or is close,
  2. where the open Passport Index dataset (MIT license) says something else, and how old that dataset is,
  3. how old the data on the site is.
Runs in January, April, July and October, and manual runs, produce the full quarterly review. Other months
report only an end date that has passed since the previous monthly run.

Environment (all optional): TODAY=YYYY-MM-DD, FULL_REVIEW=true, GH_TOKEN (raises the GitHub API rate limit),
VISA_DATASET_FILE and VISA_DATASET_DATE (use a local copy of the dataset instead of downloading it).
"""
import datetime as dt
import json
import os
import pathlib
import re
import sys
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "assets" / "map" / "visa-de.json"
DATASET_URL = "https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index.json"
DATASET_COMMITS = "https://api.github.com/repos/imorte/passport-index-data/commits?path=passport-index.json&per_page=1"
DATASET_PAGE = "https://github.com/imorte/passport-index-data"
SOON_DAYS = 60       # an end date this close counts as "ends soon"
MONTHLY_WINDOW = 35  # other months report end dates that passed within this many days
QUARTER_MONTHS = (1, 4, 7, 10)  # months of the full review

CATEGORY = {"visa free": "free", "visa on arrival": "voa", "eta": "eta", "e-visa": "evisa",
            "visa required": "visa", "no admission": "visa"}
LABEL = {"free": "visa-free", "eta": "online authorization", "voa": "visa on arrival",
         "evisa": "eVisa", "visa": "visa required"}
MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}
END_DATE = re.compile(r"\b(?:until|till|through|to|ends?|expires?)\s+(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})", re.I)
STAY = re.compile(r"(\d+)\s*(day|month|year)s?\b", re.I)

ISO2 = {  # site code -> ISO 3166-1 alpha-2, from Natural Earth
    "ABW": "AW", "AFG": "AF", "AGO": "AO", "AIA": "AI", "ALB": "AL", "ALD": "AX", "AND": "AD", "ARE": "AE", "ARG": "AR", "ARM": "AM",
    "ASM": "AS", "ATF": "TF", "ATG": "AG", "AUS": "AU", "AUT": "AT", "AZE": "AZ", "BDI": "BI", "BEL": "BE", "BEN": "BJ", "BFA": "BF",
    "BGD": "BD", "BGR": "BG", "BHR": "BH", "BHS": "BS", "BIH": "BA", "BLM": "BL", "BLR": "BY", "BLZ": "BZ", "BMU": "BM", "BOL": "BO",
    "BRA": "BR", "BRB": "BB", "BRN": "BN", "BTN": "BT", "BWA": "BW", "CAF": "CF", "CAN": "CA", "CHE": "CH", "CHL": "CL", "CHN": "CN",
    "CIV": "CI", "CMR": "CM", "COD": "CD", "COG": "CG", "COK": "CK", "COL": "CO", "COM": "KM", "CPV": "CV", "CRI": "CR", "CUB": "CU",
    "CUW": "CW", "CYM": "KY", "CYP": "CY", "CZE": "CZ", "DEU": "DE", "DJI": "DJ", "DMA": "DM", "DNK": "DK", "DOM": "DO", "DZA": "DZ",
    "ECU": "EC", "EGY": "EG", "ERI": "ER", "ESP": "ES", "EST": "EE", "ETH": "ET", "FIN": "FI", "FJI": "FJ", "FLK": "FK", "FRA": "FR",
    "FRO": "FO", "FSM": "FM", "GAB": "GA", "GBR": "GB", "GEO": "GE", "GGY": "GG", "GHA": "GH", "GIN": "GN", "GMB": "GM", "GNB": "GW",
    "GNQ": "GQ", "GRC": "GR", "GRD": "GD", "GRL": "GL", "GTM": "GT", "GUM": "GU", "GUY": "GY", "HKG": "HK", "HND": "HN", "HRV": "HR",
    "HTI": "HT", "HUN": "HU", "IDN": "ID", "IMN": "IM", "IND": "IN", "IRL": "IE", "IRN": "IR", "IRQ": "IQ", "ISL": "IS", "ISR": "IL",
    "ITA": "IT", "JAM": "JM", "JEY": "JE", "JOR": "JO", "JPN": "JP", "KAZ": "KZ", "KEN": "KE", "KGZ": "KG", "KHM": "KH", "KIR": "KI",
    "KNA": "KN", "KOR": "KR", "KOS": "XK", "KWT": "KW", "LAO": "LA", "LBN": "LB", "LBR": "LR", "LBY": "LY", "LCA": "LC", "LIE": "LI",
    "LKA": "LK", "LSO": "LS", "LTU": "LT", "LUX": "LU", "LVA": "LV", "MAC": "MO", "MAF": "MF", "MAR": "MA", "MCO": "MC", "MDA": "MD",
    "MDG": "MG", "MDV": "MV", "MEX": "MX", "MHL": "MH", "MKD": "MK", "MLI": "ML", "MLT": "MT", "MMR": "MM", "MNE": "ME", "MNG": "MN",
    "MNP": "MP", "MOZ": "MZ", "MRT": "MR", "MSR": "MS", "MUS": "MU", "MWI": "MW", "MYS": "MY", "NAM": "NA", "NCL": "NC", "NER": "NE",
    "NFK": "NF", "NGA": "NG", "NIC": "NI", "NIU": "NU", "NLD": "NL", "NOR": "NO", "NPL": "NP", "NRU": "NR", "NZL": "NZ", "OMN": "OM",
    "PAK": "PK", "PAN": "PA", "PCN": "PN", "PER": "PE", "PHL": "PH", "PLW": "PW", "PNG": "PG", "POL": "PL", "PRI": "PR", "PRK": "KP",
    "PRT": "PT", "PRY": "PY", "PSX": "PS", "PYF": "PF", "QAT": "QA", "ROU": "RO", "RUS": "RU", "RWA": "RW", "SAU": "SA", "SDN": "SD",
    "SDS": "SS", "SEN": "SN", "SGP": "SG", "SHN": "SH", "SLB": "SB", "SLE": "SL", "SLV": "SV", "SMR": "SM", "SOM": "SO", "SPM": "PM",
    "SRB": "RS", "STP": "ST", "SUR": "SR", "SVK": "SK", "SVN": "SI", "SWE": "SE", "SWZ": "SZ", "SXM": "SX", "SYC": "SC", "SYR": "SY",
    "TCA": "TC", "TCD": "TD", "TGO": "TG", "THA": "TH", "TJK": "TJ", "TKM": "TM", "TLS": "TL", "TON": "TO", "TTO": "TT", "TUN": "TN",
    "TUR": "TR", "TUV": "TV", "TWN": "TW", "TZA": "TZ", "UGA": "UG", "UKR": "UA", "URY": "UY", "USA": "US", "UZB": "UZ", "VAT": "VA",
    "VCT": "VC", "VEN": "VE", "VGB": "VG", "VIR": "VI", "VNM": "VN", "VUT": "VU", "WLF": "WF", "WSM": "WS", "YEM": "YE", "ZAF": "ZA",
    "ZMB": "ZM", "ZWE": "ZW",
}


def long_date(d):
    return f"{d.day} {d.strftime('%B')} {d.year}"


def end_dates(note):
    out = []
    for day, mon, year in END_DATE.findall(note or ""):
        try:
            out.append(dt.date(int(year), MONTHS[mon.lower()], int(day)))
        except (KeyError, ValueError):
            pass
    return out


def stay_days(text):
    m = STAY.search(text or "")
    if not m:
        return None
    n, unit = int(m.group(1)), m.group(2).lower()
    return n * {"day": 1, "month": 30, "year": 365}[unit]


def rule(entry):
    parts = [LABEL.get(entry["c"], entry["c"])]
    if entry.get("a"):
        parts[0] += f" ({entry['a']})"
    if entry.get("m"):
        parts.append("freedom of movement")
    if entry.get("s"):
        parts.append(entry["s"])
    if entry.get("n"):
        parts.append(entry["n"])
    return ", ".join(parts)


def fetch_json(url, token=None):
    headers = {"User-Agent": "felixdlanger-visa-check", "Accept": "application/json"}
    if token and url.startswith("https://api.github.com/"):
        headers["Authorization"] = f"Bearer {token}"   # only ever sent to GitHub's own API
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as r:
        return json.load(r)


def load_dataset():
    """Returns (rules for a German passport keyed by ISO-2, date of the dataset) or raises."""
    local = os.environ.get("VISA_DATASET_FILE")
    if local:
        data = json.loads(pathlib.Path(local).read_text())
        stamp = os.environ.get("VISA_DATASET_DATE")
        return data["DE"], dt.date.fromisoformat(stamp) if stamp else None
    data = fetch_json(DATASET_URL)
    stamp = None
    try:
        commits = fetch_json(DATASET_COMMITS, os.environ.get("GH_TOKEN"))
        stamp = dt.date.fromisoformat(commits[0]["commit"]["committer"]["date"][:10])
    except Exception as e:  # the date is a nice-to-have
        print(f"note: could not read the dataset's date: {e}", file=sys.stderr)
    return data["DE"], stamp


def differences(countries, dataset):
    rows = []
    for code, entry in sorted(countries.items(), key=lambda kv: kv[1]["name"]):
        src = dataset.get(ISO2.get(code, ""))
        if not src or entry["c"] == "home":
            continue
        cat = CATEGORY.get(src.get("status", ""), "")
        if not cat:
            continue
        theirs_days, ours_days = src.get("days"), stay_days(entry.get("s"))
        if cat != entry["c"] or (theirs_days and ours_days and abs(theirs_days - ours_days) > 3):
            theirs = LABEL[cat] + (f", {theirs_days} days" if theirs_days else "")
            rows.append((entry["name"], rule(entry), theirs))
    return rows


def table(header, rows):
    out = ["| " + " | ".join(header) + " |", "|" + "---|" * len(header)]
    out += ["| " + " | ".join(str(c).replace("|", "/") for c in r) + " |" for r in rows]
    return "\n".join(out)


def main():
    today = dt.date.fromisoformat(os.environ["TODAY"]) if os.environ.get("TODAY") else dt.date.today()
    manual = os.environ.get("FULL_REVIEW", "").lower() == "true"
    full = manual or today.month in QUARTER_MONTHS
    doc = json.loads(DATA.read_text())
    countries, as_of = doc["countries"], dt.date.fromisoformat(doc["asOf"])

    passed, soon, just_passed = [], [], []
    for entry in sorted(countries.values(), key=lambda e: e["name"]):
        for end in end_dates(entry.get("n")):
            if end < today:
                passed.append((entry["name"], rule(entry), f"{long_date(end)}, passed"))
                if (today - end).days <= MONTHLY_WINDOW:
                    just_passed.append(entry["name"])
            elif (end - today).days <= SOON_DAYS:
                soon.append((entry["name"], rule(entry), f"{long_date(end)}, in {(end - today).days} days"))

    dataset_note, diff_rows, newer = "", [], False
    try:
        dataset, stamp = load_dataset()
        diff_rows = differences(countries, dataset)
        newer = bool(stamp and stamp > as_of)
        when = f"was last updated on **{long_date(stamp)}**" if stamp else "has no readable update date"
        if newer:
            dataset_note = (f"The open [Passport Index dataset]({DATASET_PAGE}) {when}, after your data, "
                            "so these may be real changes. Confirm each with an official source before you change anything.")
        else:
            dataset_note = (f"The open [Passport Index dataset]({DATASET_PAGE}) {when}, before your data, "
                            "so treat these as leads rather than facts.")
    except Exception as e:
        dataset_note = f"The open Passport Index dataset could not be read this time ({type(e).__name__}: {e})."

    if manual:
        title = f"Visa rules: check of {long_date(today)}"
    elif full:
        title = f"Visa rules: quarterly check, {today.strftime('%B')} {today.year}"
    elif just_passed:
        title = "Visa rules: an end date has passed (" + ", ".join(just_passed) + ")"
    else:
        title = ""
    report = bool(title)

    lines = [f"The visa view on Beyond work shows rules for German passport holders as of **{long_date(as_of)}** "
             f"({(today - as_of).days} days ago). Official source: {doc['check']}", ""]
    if passed or soon:
        lines += ["### Rules with an end date", "", table(["Country", "On the site", "End date"], passed + soon), ""]
    else:
        lines += ["### Rules with an end date", "", "None has passed or ends in the next two months.", ""]
    lines += ["### Where an open dataset differs", "", dataset_note, ""]
    if diff_rows:
        body = table(["Country", "On the site", "Dataset"], diff_rows)
        if newer:
            lines += [body, ""]
        else:
            lines += [f"<details><summary>{len(diff_rows)} differences</summary>", "", body, "", "</details>", ""]
    flagged = [r[0] for r in passed + soon] + ([r[0] for r in diff_rows] if newer else [])
    lines += ["### How to update", "",
              "1. Open `assets/map/visa-de.json`, press the pencil icon and change the country's `c` (category: "
              "`free`, `eta`, `voa`, `evisa` or `visa`), `s` (allowed stay) and `n` (note).",
              "2. Set `asOf` to today's date and commit. The site updates within a minute or two.",
              "3. Close this issue.", "",
              "Or let Claude do the research. Paste this, with a link to the file:", "",
              "> Check these entries in my visa-de.json against the Auswärtiges Amt and each destination's official "
              "immigration site, and give me the corrected file with asOf updated: "
              + (", ".join(dict.fromkeys(flagged)) if flagged else "every entry whose rule may have changed since " + long_date(as_of)) + ".",
              "", "_Opened by `.github/workflows/visa-check.yml`. It checks on the 2nd of every month and writes the full review each quarter, in January, April, July and October._"]

    out_dir = pathlib.Path(os.environ.get("RUNNER_TEMP") or tempfile.gettempdir())
    path = out_dir / "visa-report.md"
    path.write_text("\n".join(lines) + "\n")
    outputs = {"report": "true" if report else "false", "title": title, "file": str(path)}
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as fh:
            for k, v in outputs.items():
                fh.write(f"{k}={v}\n")
    print(json.dumps(outputs, indent=2))
    print("\n".join(lines))


if __name__ == "__main__":
    main()
