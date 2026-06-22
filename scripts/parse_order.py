#!/usr/bin/env python3
"""Parse Order.pdf text export into groupings.json structure."""
import re
import json
from pathlib import Path

# Text extracted from Order.pdf (via Read tool)
RAW = Path(__file__).parent.parent / "order_extract.txt"

TECH_PATTERNS = [
    (r"Web and Mobile Application", "Web and Mobile Application"),
    (r"IoT \(Internet of Things\)", "IoT / Embedded"),
    (r"Arduino/ESP32", "IoT / Embedded"),
    (r"Augmented Reality", "Augmented Reality"),
    (r"Virtual Reality", "Virtual Reality"),
    (r"Game Development", "Game Development"),
    (r"Mobile Application", "Mobile Application"),
    (r"Web Application", "Web Application"),
    (r"web Application", "Web Application"),
    (r"Web application", "Web Application"),
    (r"System Development", "System Development"),
    (r"Other", "IoT / Embedded"),
]

def normalize_tech(raw):
    raw = raw.strip()
    for pat, norm in TECH_PATTERNS:
        if re.search(pat, raw, re.I):
            return norm, raw
    if "IoT" in raw or "Arduino" in raw:
        return "IoT / Embedded", raw
    if "AR" in raw and "VR" in raw:
        return "Augmented Reality", raw
    return raw or "Unspecified", raw

def parse_presenter_order(s):
    m = re.search(r"(\d+)(?:st|nd|rd|th)\s+Presenter", s, re.I)
    return int(m.group(1)) if m else None

def extract_tech_from_line(line):
    for pat, norm in TECH_PATTERNS:
        if re.search(pat, line, re.I):
            m = re.search(pat, line, re.I)
            title = line[: m.start()].strip().rstrip("\t")
            return title, norm, line[m.start():].strip()
    return line.strip(), "Unspecified", ""

SECTION_ORDER = {"BSIT3A": 0, "BSIT3B": 1, "BSIT3C": 2, "BSIT3D": 3, "BSIT3E": 4}

def main():
    if not RAW.exists():
        print("Missing order_extract.txt")
        return
    lines = RAW.read_text(encoding="utf-8").splitlines()
    groups = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^(BSIT3[A-E]),\s*(\d+)\s*(.*)$", line.strip())
        if m:
            section, gnum, rest = m.group(1), int(m.group(2)), m.group(3).strip()
            key = (section, gnum)
            presenter_order = parse_presenter_order(rest)
            title_parts = []
            tech_raw = ""
            # Title may be on same line after presenter
            after = re.sub(r"\d+(?:st|nd|rd|th)\s+Presenter\s*", "", rest, flags=re.I).strip()
            if after:
                title_parts.append(after)
            j = i + 1
            while j < len(lines):
                nxt = lines[j].strip()
                if not nxt or re.match(r"^BSIT3[A-E],", nxt) or re.match(r"^-- \d+ of", nxt):
                    break
                if re.match(r"^\d+(?:st|nd|rd|th)\s+Presenter\s*$", nxt, re.I):
                    j += 1
                    continue
                if any(re.search(p, nxt, re.I) for p, _ in TECH_PATTERNS):
                    t, norm, tr = extract_tech_from_line(nxt)
                    if t:
                        title_parts.append(t)
                    tech_raw = tr or nxt
                    j += 1
                    break
                title_parts.append(nxt)
                j += 1
            title = " ".join(title_parts).strip()
            title = re.sub(r"\s+", " ", title)
            norm, _ = normalize_tech(tech_raw)
            groups[key] = {
                "section": section,
                "groupNumber": gnum,
                "presenterOrder": presenter_order,
                "titleDefenseTitle": title,
                "titleDefenseTechnology": tech_raw or norm,
                "titleDefenseTechnologyNorm": norm,
            }
            i = j
            continue
        i += 1

    # Page-1 presenter mapping (presenter name -> title snippet)
    presenters = []
    i = 0
    while i < len(lines) and not lines[i].strip().startswith("BSIT3"):
        line = lines[i].strip()
        if not line or line.startswith("Group#") or line.startswith("--"):
            i += 1
            continue
        # Single presenter line with tab + title + tech
        if "\t" in line:
            parts = line.split("\t")
            name = parts[0].strip()
            rest = "\t".join(parts[1:]).strip()
            t, norm, tr = extract_tech_from_line(rest)
            if not t and i + 1 < len(lines):
                t = rest
                if i + 2 < len(lines):
                    t2 = lines[i + 1].strip()
                    if not t2.startswith("BSIT") and "\t" not in t2:
                        t = (rest + " " + t2).strip()
            presenters.append({"name": name, "title": t or rest, "tech": tr or norm})
        i += 1

    # Build final list with 3 concepts (title defense + 2 reserved placeholders)
    result = []
    for key in sorted(groups.keys(), key=lambda k: (SECTION_ORDER[k[0]], k[1])):
        g = groups[key]
        td_title = g["titleDefenseTitle"]
        td_tech = g["titleDefenseTechnology"]
        norm = g["titleDefenseTechnologyNorm"]
        # Match presenter from page-1 list by title similarity
        presenter = ""
        for p in presenters:
            if p["title"] and (p["title"][:20] in td_title or td_title[:20] in p["title"]):
                presenter = p["name"]
                break
        concepts = [
            {"slot": 1, "title": td_title, "technology": td_tech, "titleDefense": True},
            {"slot": 2, "title": "Reserved Concept 2", "technology": "—", "titleDefense": False},
            {"slot": 3, "title": "Reserved Concept 3", "technology": "—", "titleDefense": False},
        ]
        result.append({
            "section": g["section"],
            "groupNumber": g["groupNumber"],
            "presenter": presenter or "—",
            "proponents": [],
            "presenterOrder": g["presenterOrder"],
            "concepts": concepts,
            "titleDefenseTitle": td_title,
            "titleDefenseTechnology": td_tech,
            "titleDefenseTechnologyNorm": norm,
        })

    out = Path(__file__).parent.parent / "data" / "groupings.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps({"groups": result, "updated": "2026-06-22"}, indent=2), encoding="utf-8")
    print(f"Wrote {len(result)} groups to {out}")

if __name__ == "__main__":
    main()
