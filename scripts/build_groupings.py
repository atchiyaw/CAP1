#!/usr/bin/env python3
"""Build data/groupings.json from Order.pdf using blue highlight detection."""
import fitz
import re
import json
from pathlib import Path

BLUE = (0.0, 0.6901960968971252, 0.9411764740943909)
TOL = 0.02
TECH_LIST = sorted([
    "Web and Mobile Application", "Web Application System", "Web Application",
    "web Application", "Web application", "Mobile Application", "Game Development",
    "Augmented Reality", "Virtual Reality", "System Development", "Arduino/ESP32",
    "IoT (Internet of Things) +", "Other",
], key=len, reverse=True)
SECTION_ORDER = {"BSIT3A": 0, "BSIT3B": 1, "BSIT3C": 2, "BSIT3D": 3, "BSIT3E": 4}


def is_blue_fill(fill):
    return fill and len(fill) >= 3 and all(abs(fill[i] - BLUE[i]) < TOL for i in range(3))


def norm_tech(raw):
    raw = (raw or "").strip()
    mapping = {
        "Web Application": "Web Application",
        "web Application": "Web Application",
        "Web application": "Web Application",
        "Web Application System": "Web Application",
        "Mobile Application": "Mobile Application",
        "Web and Mobile Application": "Web and Mobile Application",
        "Game Development": "Game Development",
        "Augmented Reality": "Augmented Reality",
        "Virtual Reality": "Virtual Reality",
        "System Development": "System Development",
        "Arduino/ESP32": "IoT / Embedded",
        "Other": "IoT / Embedded",
    }
    for k, v in mapping.items():
        if raw == k or raw.startswith(k):
            return v
    if "IoT" in raw:
        return "IoT / Embedded"
    return raw or "Unspecified"


def get_page_lines(page):
    blue_rects = [d["rect"] for d in page.get_drawings() if is_blue_fill(d.get("fill"))]
    lines = []
    for b in page.get_text("dict")["blocks"]:
        if b.get("type") != 0:
            continue
        for line in b.get("lines", []):
            text = "".join(s["text"] for s in line["spans"]).strip()
            if not text:
                continue
            bbox = fitz.Rect(line["bbox"])
            highlighted = any(
                not (bbox.x1 < r.x0 or r.x1 < bbox.x0 or bbox.y1 < r.y0 or r.y1 < bbox.y0)
                for r in blue_rects
            )
            lines.append({
                "text": text,
                "y": bbox.y0,
                "x0": bbox.x0,
                "blue": highlighted,
                "is_name_col": bbox.x0 < 200,
                "is_concept_col": 200 <= bbox.x0 < 470,
                "is_tech_col": bbox.x0 >= 470,
            })
    lines.sort(key=lambda l: (l["y"], l["x0"]))
    return lines


def is_name(text):
    return bool(re.match(r"^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑñ\s\.\-]+,\s", text))


def is_header(text):
    return text in ("Group#", "Title Defense Presenter", "Proponents", "Proposed Concept", "Technology")


def is_bsit_marker(text):
    return bool(re.match(r"^BSIT3[A-E],", text))


def is_presenter_order(text):
    return bool(re.match(r"^\d+(?:st|nd|rd|th)\s+Presenter\s*$", text, re.I))


def extract_concepts_from_lines(lines, y_min, y_max, bsit_ys):
    """Extract discrete concept+tech pairs between y bounds, skipping BSIT anchor rows."""
    region = [ln for ln in lines if y_min <= ln["y"] < y_max and (ln["is_concept_col"] or ln["is_tech_col"])]
    concepts = []
    buf, buf_blue, buf_start_y = [], False, None
    for ln in region:
        if any(abs(ln["y"] - by) <= 8 for by in bsit_ys if y_min <= by < y_max):
            if ln["is_tech_col"] and buf:
                title = re.sub(r"\s+", " ", " ".join(buf).strip())
                if title:
                    concepts.append({"title": title, "technology": norm_tech(ln["text"]), "titleDefense": buf_blue})
                buf, buf_blue = [], False
            continue
        if ln["is_tech_col"]:
            title = re.sub(r"\s+", " ", " ".join(buf).strip())
            if title:
                concepts.append({"title": title, "technology": norm_tech(ln["text"]), "titleDefense": buf_blue})
            buf, buf_blue = [], False
        elif ln["is_concept_col"]:
            if not buf:
                buf_start_y = ln["y"]
            if ln["blue"]:
                buf_blue = True
            buf.append(ln["text"])
    return concepts


def parse_presenter_blocks(lines, bsit_ys):
    blocks = []
    presenters = [ln for ln in lines if ln["blue"] and ln["is_name_col"] and is_name(ln["text"])]
    for i, pres in enumerate(presenters):
        y_min = pres["y"] - 5
        y_max = presenters[i + 1]["y"] - 5 if i + 1 < len(presenters) else 9999
        proponents = [
            ln["text"] for ln in lines
            if y_min <= ln["y"] < y_max and ln["is_name_col"] and is_name(ln["text"]) and not ln["blue"]
        ]
        concepts = extract_concepts_from_lines(lines, y_min, y_max, bsit_ys)
        if concepts:
            blocks.append({"presenter": pres["text"], "proponents": proponents, "concepts": concepts})
    return blocks


def parse_bsit_markers(lines):
    markers = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        if not is_bsit_marker(ln["text"]):
            i += 1
            continue
        m = re.match(r"^(BSIT3[A-E]),\s*(\d+)\s*(.*)$", ln["text"])
        if not m:
            i += 1
            continue
        section, gnum, rest = m.group(1), int(m.group(2)), m.group(3).strip()
        po = re.search(r"(\d+)(?:st|nd|rd|th)\s+Presenter", rest, re.I)
        if not po and i + 1 < len(lines) and is_presenter_order(lines[i + 1]["text"]):
            po = re.search(r"(\d+)", lines[i + 1]["text"])
        markers.append({
            "section": section,
            "groupNumber": gnum,
            "presenterOrder": int(po.group(1)) if po else None,
            "y": ln["y"],
        })
        i += 1
    return markers


def main():
    doc = fitz.open(Path(__file__).parent.parent / "Order.pdf")
    all_blocks, all_markers = [], []

    for page in doc:
        lines = get_page_lines(page)
        bsit_ys = [ln["y"] for ln in lines if is_bsit_marker(ln["text"])]
        all_blocks.extend(parse_presenter_blocks(lines, bsit_ys))
        all_markers.extend(parse_bsit_markers(lines))

    # Sequential match: markers sorted by section+group ↔ blocks in document order
    all_markers.sort(key=lambda m: (SECTION_ORDER[m["section"]], m["groupNumber"]))
    used = set()
    result = []

    for mi, m in enumerate(all_markers):
        bi = mi
        if bi >= len(all_blocks):
            break
        if bi in used:
            continue
        used.add(bi)
        g = all_blocks[bi]

        td = next((c for c in g["concepts"] if c["titleDefense"]), g["concepts"][0])
        reserved = [c for c in g["concepts"] if c is not td and not c["titleDefense"]]
        concepts = [{"slot": 1, "title": td["title"], "technology": td["technology"], "titleDefense": True}]
        for slot, c in enumerate(reserved[:2], start=2):
            concepts.append({"slot": slot, "title": c["title"], "technology": c["technology"], "titleDefense": False})
        while len(concepts) < 3:
            concepts.append({"slot": len(concepts) + 1, "title": f"Reserved Concept {len(concepts) + 1}", "technology": "—", "titleDefense": False})

        result.append({
            "section": m["section"],
            "groupNumber": m["groupNumber"],
            "presenter": g["presenter"],
            "proponents": g["proponents"],
            "presenterOrder": m["presenterOrder"],
            "concepts": concepts[:3],
            "titleDefenseTitle": td["title"],
            "titleDefenseTechnology": td["technology"],
        })

    result.sort(key=lambda x: (SECTION_ORDER[x["section"]], x["groupNumber"]))
    out = Path(__file__).parent.parent / "data" / "groupings.json"
    out.write_text(json.dumps({"groups": result, "meta": {"source": "Order.pdf", "totalGroups": len(result)}}, indent=2, ensure_ascii=False), encoding="utf-8")
    full = sum(1 for g in result if sum(1 for c in g["concepts"] if not c["titleDefense"] and not c["title"].startswith("Reserved")) >= 1)
    print(f"Wrote {len(result)} groups, {full} with ≥1 reserved concept, blocks={len(all_blocks)}, markers={len(all_markers)}")


if __name__ == "__main__":
    main()
