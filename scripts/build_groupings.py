#!/usr/bin/env python3
"""Build data/groupings.json from Order.pdf — complete titles, blue = Title Defense."""
import fitz
import re
import json
from pathlib import Path

BLUE = (0.0, 0.6901960968971252, 0.9411764740943909)
TOL = 0.02
SECTION_ORDER = {"BSIT3A": 0, "BSIT3B": 1, "BSIT3C": 2, "BSIT3D": 3, "BSIT3E": 4}
HEADERS = {"Group#", "Title Defense Presenter", "Proponents", "Proposed Concept", "Technology"}


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


def is_name(text):
    return bool(re.match(r"^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑñ\s\.\-]+,\s", text))


def is_bsit(text):
    return bool(re.match(r"^BSIT3[A-E],", text))


def is_presenter_order(text):
    return bool(re.match(r"^\d+(?:st|nd|rd|th)\s+Presenter\s*$", text, re.I))


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
                "y1": bbox.y1,
                "x0": bbox.x0,
                "blue": highlighted,
                "name": bbox.x0 < 200,
                "concept": 200 <= bbox.x0 < 470,
                "tech": bbox.x0 >= 470,
            })
    lines.sort(key=lambda l: (l["y"], l["x0"]))
    return lines


def cluster_rows(lines):
    """Cluster lines into horizontal rows by y-position."""
    usable = [ln for ln in lines if ln["concept"] or ln["tech"]]
    if not usable:
        return []
    rows, current = [], [usable[0]]
    for ln in usable[1:]:
        if abs(ln["y"] - current[0]["y"]) <= 5:
            current.append(ln)
        else:
            rows.append(current)
            current = [ln]
    rows.append(current)
    return rows


def extract_all_concepts(lines):
    """Extract complete concepts — merges multi-line titles before tech rows."""
    rows = cluster_rows(lines)
    concepts, buf, buf_blue = [], [], False
    i = 0
    while i < len(rows):
        row = rows[i]
        row_y = min(ln["y"] for ln in row)
        concept_parts = [ln["text"] for ln in row if ln["concept"] and ln["text"] not in HEADERS]
        tech_parts = [ln["text"] for ln in row if ln["tech"] and ln["text"] not in HEADERS]

        if any(ln["blue"] for ln in row if ln["concept"]):
            buf_blue = True
        buf.extend(concept_parts)

        if tech_parts:
            # Continuation lines may sit on the next row(s) before tech (e.g. SafeRoute + Fire Protection)
            j = i + 1
            while j < len(rows):
                nxt = rows[j]
                nxt_y = min(ln["y"] for ln in nxt)
                nxt_concept = [ln["text"] for ln in nxt if ln["concept"]]
                nxt_tech = [ln["text"] for ln in nxt if ln["tech"]]
                nxt_name = any(ln["name"] and is_name(ln["text"]) for ln in nxt)
                if nxt_tech or nxt_name or nxt_y - row_y > 14:
                    break
                if nxt_concept and not any(":" in t[:40] for t in nxt_concept):
                    buf.extend(nxt_concept)
                    j += 1
                    row_y = nxt_y
                else:
                    break

            title = re.sub(r"\s+", " ", " ".join(buf)).strip()
            title = re.sub(r"TrainingSystem", "Training System", title)
            tech_raw = " ".join(tech_parts)
            if i + 1 < len(rows) and not buf:
                pass
            if title:
                concepts.append({
                    "title": title,
                    "technology": norm_tech(tech_raw),
                    "titleDefense": buf_blue,
                    "y": min(ln["y"] for ln in rows[i]),
                    "y_end": row_y,
                })
            buf, buf_blue = [], False
            i = j
        elif concept_parts and not tech_parts:
            # Buffer concept-only row; may complete on a later row with tech
            i += 1
        else:
            i += 1

    # Merge orphaned short concept-only rows into previous concept when clearly a fragment
    merged = []
    for c in concepts:
        if merged and (
            merged[-1]["title"].endswith((" and", " of", " for", " in", " Bureau of", " the"))
            or len(c["title"]) < 40 and not c["titleDefense"]
        ):
            if not c["titleDefense"] and abs(c["y"] - merged[-1]["y_end"]) <= 18:
                merged[-1]["title"] = re.sub(
                    r"\s+", " ", merged[-1]["title"] + " " + c["title"]
                ).strip()
                merged[-1]["y_end"] = c["y_end"]
                continue
        merged.append(c)
    return merged


def parse_bsit_markers(lines):
    markers = []
    for i, ln in enumerate(lines):
        if not is_bsit(ln["text"]):
            continue
        m = re.match(r"^(BSIT3[A-E]),\s*(\d+)\s*(.*)$", ln["text"])
        if not m:
            continue
        rest = m.group(3).strip()
        po = re.search(r"(\d+)(?:st|nd|rd|th)\s+Presenter", rest, re.I)
        if not po:
            for j in range(i + 1, min(i + 3, len(lines))):
                if is_presenter_order(lines[j]["text"]):
                    po = re.search(r"(\d+)", lines[j]["text"])
                    break
        markers.append({
            "section": m.group(1),
            "groupNumber": int(m.group(2)),
            "presenterOrder": int(po.group(1)) if po else None,
            "y": ln["y"],
        })
    return markers


def assign_concept_to_presenter(concept, presenters):
    """Assign each concept to exactly one blue-presenter block."""
    cy = concept["y"]
    for i, pres in enumerate(presenters):
        y_lo = pres["y"] - 35
        y_hi = presenters[i + 1]["y"] - 6 if i + 1 < len(presenters) else 9999
        if y_lo <= cy < y_hi:
            return i
    # Blue title-defense rows may start slightly before their presenter name
    if concept["titleDefense"]:
        for i, pres in enumerate(presenters):
            if abs(cy - pres["y"]) <= 25 or (cy < pres["y"] and (i + 1 >= len(presenters) or cy < presenters[i + 1]["y"] - 6)):
                nxt = presenters[i + 1]["y"] if i + 1 < len(presenters) else 9999
                if cy < nxt - 10:
                    return i
    return None


def parse_page_blocks(lines):
    """Build presenter blocks by assigning each complete concept to one presenter."""
    blue_presenters = [
        ln for ln in lines
        if ln["blue"] and ln["name"] and is_name(ln["text"]) and not is_bsit(ln["text"])
    ]
    concepts = extract_all_concepts(lines)
    by_idx = {i: {"presenter": p["text"], "proponents": [], "concepts": []} for i, p in enumerate(blue_presenters)}

    for c in concepts:
        idx = assign_concept_to_presenter(c, blue_presenters)
        if idx is not None:
            by_idx[idx]["concepts"].append(c)

    blocks = []
    for i, pres in enumerate(blue_presenters):
        y_hi = blue_presenters[i + 1]["y"] if i + 1 < len(blue_presenters) else 9999
        block = by_idx[i]
        block["proponents"] = [
            ln["text"] for ln in lines
            if ln["name"] and is_name(ln["text"]) and not ln["blue"]
            and pres["y"] < ln["y"] < y_hi
        ]
        if block["concepts"]:
            blocks.append(block)
    return blocks


def build_group_entry(marker, block):
    concepts_raw = block["concepts"]
    td = next((c for c in concepts_raw if c["titleDefense"]), concepts_raw[0])
    reserved = [c for c in concepts_raw if c is not td and not c["titleDefense"]]

    concepts = [{
        "slot": 1,
        "title": td["title"],
        "technology": td["technology"],
        "titleDefense": True,
    }]
    for slot, c in enumerate(reserved[:2], start=2):
        concepts.append({
            "slot": slot,
            "title": c["title"],
            "technology": c["technology"],
            "titleDefense": False,
        })

    return {
        "section": marker["section"],
        "groupNumber": marker["groupNumber"],
        "presenter": block["presenter"],
        "proponents": block["proponents"],
        "presenterOrder": marker["presenterOrder"],
        "concepts": concepts,
        "titleDefenseTitle": td["title"],
        "titleDefenseTechnology": td["technology"],
    }


def main():
    doc = fitz.open(Path(__file__).parent.parent / "Order.pdf")
    all_blocks, all_markers = [], []

    for page in doc:
        lines = get_page_lines(page)
        all_blocks.extend(parse_page_blocks(lines))
        all_markers.extend(parse_bsit_markers(lines))

    all_markers.sort(key=lambda m: (SECTION_ORDER[m["section"]], m["groupNumber"]))

    result = []
    for mi, marker in enumerate(all_markers):
        if mi >= len(all_blocks):
            break
        result.append(build_group_entry(marker, all_blocks[mi]))

    result.sort(key=lambda x: (SECTION_ORDER[x["section"]], x["groupNumber"]))

    out = Path(__file__).parent.parent / "data" / "groupings.json"
    out.write_text(
        json.dumps({"groups": result, "meta": {"source": "Order.pdf", "totalGroups": len(result)}}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote {len(result)} groups (markers={len(all_markers)}, blocks={len(all_blocks)})")


if __name__ == "__main__":
    main()
