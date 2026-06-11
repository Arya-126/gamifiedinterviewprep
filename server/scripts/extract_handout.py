"""Extract exercise MCQs from the JV Global Services handout PDF.

Reads  server/prisma/data/jv_handout.pdf
Writes server/prisma/data/handout_questions.json

Run from server/:  python scripts/extract_handout.py
The JSON is then loaded into Postgres by scripts/seed-handout.ts.
"""
import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader

DATA = Path(__file__).resolve().parent.parent / "prisma" / "data"
PDF = DATA / "jv_handout.pdf"
OUT = DATA / "handout_questions.json"

# Handout heading (uppercased) -> (taxonomy topic name, category)
HEADING_MAP = {
    "NUMBER SYSTEM": ("Number System", "QUANTITATIVE"),
    "TRAILING ZERO": ("Trailing Zeros/Factorials", "QUANTITATIVE"),
    "HCF AND LCM": ("HCF & LCM", "QUANTITATIVE"),
    "UNIT DIGIT": ("Unit Digit", "QUANTITATIVE"),
    "FACTORS": ("Factors", "QUANTITATIVE"),
    "AVERAGES": ("Averages", "QUANTITATIVE"),
    "RATIO AND PROPORTION": ("Ratio & Proportion", "QUANTITATIVE"),
    "PERCENTAGE": ("Percentage", "QUANTITATIVE"),
    "TIME SPEED & DISTANCE": ("Time Speed & Distance", "QUANTITATIVE"),
    "BOAT & STREAM": ("Boats & Streams", "QUANTITATIVE"),
    "PROBLEMS ON RACES": ("Races", "QUANTITATIVE"),
    "TIME & WORK": ("Time & Work", "QUANTITATIVE"),
    "PIPES & CISTERNS": ("Pipes & Cisterns", "QUANTITATIVE"),
    "ALLIGATION AND MIXTURE": ("Alligation & Mixture", "QUANTITATIVE"),
    "PARTNERSHIP": ("Partnership", "QUANTITATIVE"),
    "PROFIT AND LOSS": ("Profit & Loss", "QUANTITATIVE"),
    "SIMPLE INTEREST AND COMPOUND INTEREST": ("Simple & Compound Interest", "QUANTITATIVE"),
    "PROBLEMS ON AGES": ("Ages", "QUANTITATIVE"),
    "ALGEBRA": ("Algebra", "QUANTITATIVE"),
    "SET THEORY": ("Set Theory", "QUANTITATIVE"),
    "PERMUTATION AND COMBINATION": ("Permutation & Combination", "QUANTITATIVE"),
    "PROBABILITY": ("Probability", "QUANTITATIVE"),
    "GEOMETRY AND MENSURATION": ("Geometry & Mensuration", "QUANTITATIVE"),
    "BLOOD RELATION": ("Blood Relations", "LOGICAL"),
    "DIRECTION SENSE": ("Direction Sense", "LOGICAL"),
    "CODING AND DECODING": ("Coding-Decoding", "LOGICAL"),
    "CLOCKS": ("Clocks", "LOGICAL"),
    "CALENDARS": ("Calendars", "LOGICAL"),
    "SEATING ARRANGEMENT": ("Seating Arrangement", "LOGICAL"),
    "NUMBER SERIES": ("Number Series", "LOGICAL"),
    "NUMBER ANALOGY": ("Number Analogy", "LOGICAL"),
    "STATEMENT AND ASSUMPTIONS": ("Statement & Assumptions", "LOGICAL"),
    "STATEMENT AND ARGUMENT": ("Statement & Argument", "LOGICAL"),
    "STATEMENT AND CONCLUSION": ("Statement & Conclusion", "LOGICAL"),
    "DEDUCTIVE REASONING": ("Deductive Reasoning", "LOGICAL"),
    "CAUSE AND EFFECT": ("Cause & Effect", "LOGICAL"),
    "COURSE OF ACTION": ("Course of Action", "LOGICAL"),
    "LOGICAL REASONING": ("Logical Reasoning", "LOGICAL"),
    "LETTER AND SYMBOL SERIES": ("Letter & Symbol Series", "LOGICAL"),
    "DATA INTERPRETATION": ("Data Interpretation", "LOGICAL"),
    "DATA SUFFICIENCY": ("Data Sufficiency", "LOGICAL"),
    "ALPHANUMERIC PROBLEMS": ("Alphanumeric", "LOGICAL"),
    "SYLLOGISM": ("Syllogism", "LOGICAL"),
    "CRYPTARITHMETIC": ("Cryptarithmetic", "LOGICAL"),
    "MACHINE INPUT AND OUTPUT": ("Machine Input/Output", "LOGICAL"),
    "BINARY LOGIC": ("Binary Logic", "LOGICAL"),
    "FLOWCHART": ("Flowchart", "LOGICAL"),
    "CUBES AND DICE": ("Cubes & Dice", "LOGICAL"),
    "VISUAL SEQUENCE": ("Visual Sequence", "LOGICAL"),
}

# Verbal subsection heading prefixes (matched case-insensitively at line start)
VERBAL_SUBSECTIONS = [
    ("reading comprehension", "Reading Comprehension"),
    ("sentence correction", "Sentence Correction"),
    ("sentence improvement", "Sentence Improvement"),
    ("sentence completion", "Sentence Completion"),
    ("identify the correct sentence", "Sentence Correction"),
    ("spotting errors", "Spotting Errors"),
    ("fill in the blank", "Fill in the Blanks"),
    ("antonyms", "Antonyms"),
    ("synonyms", "Synonyms"),
    ("one-word substitution", "One-word Substitution"),
    ("one word substitution", "One-word Substitution"),
    ("verbal reasoning", "Verbal Analogy"),
    ("verbal analogy", "Verbal Analogy"),
    ("verbal classification", "Verbal Classification"),
    ("jumbled sentence", "Jumbled Sentences"),
    ("logical sequence of words", "Logical Sequence of Words"),
]

# Headings after which we stop parsing entirely
STOP_HEADINGS = {"VERBAL ABILITY V", "SOFT SKILLS", "GROUP DISCUSSION", "RESUME WRITING",
                 "RESUME COVER LETTER", "INTERVIEW SKILLS"}

# Topics where figures are essential and lost in text extraction
IMAGE_TOPICS = {"Visual Sequence", "Cubes & Dice", "Flowchart"}
IMAGE_HINTS = re.compile(
    r"\b(table|chart|graph|figure|diagram|image|pie[- ]chart|line graph|bar graph|given below shows)\b", re.I)

HEADER_RE = re.compile(r"JV Global Services LLP|^\s*\d{1,3}\s*$")
HEADING_RE = re.compile(r"^[A-Z][A-Z &,/–—-]{3,}\s*$")
EXERCISE_RE = re.compile(r"^\s*exercise\s+problems?\s*:?\s*$", re.I)
DIRECTIONS_RE = re.compile(r"^\s*directions?\b[^:]{0,60}:", re.I)
PASSAGE_RE = re.compile(r"^\s*passage\s+[IVX0-9]+\s*$", re.I)
QSTART_RE = re.compile(r"^\s*Q?\.?\s*(\d{1,3})[\.\)]\s*(.*)$")
# option marker: letter a-e followed by ". " at line start, after newline, or after 2+ spaces
OPT_SPLIT_RE = re.compile(r"(?:(?<=^)|(?<=\n)|(?<=\s\s)|(?<=\t))([a-e])\.\s+")
# lenient fallback: also allow a single space before the marker
OPT_SPLIT_LENIENT_RE = re.compile(r"(?:(?<=^)|(?<=\n)|(?<=\s))([a-e])\.\s+")
# verbal sections use "(A) Word" style; normalize to "a. Word" (whitespace before
# the paren required so set-theory "n(A)" etc. are untouched)
PAREN_OPT_RE = re.compile(r"(?:(?<=^)|(?<=\n)|(?<=\s))\(([A-E])\)\s*")
# topics like Statement & Assumptions / Data Sufficiency define one shared answer
# legend in their directions ("Give answer: a. If only assumption I is implicit ...")
LEGEND_TRIGGER_RE = re.compile(r"give answer|mark your answer|read both", re.I)
LEGEND_ITEM_RE = re.compile(r"^\(?([a-eA-E])[\.\)]\s+(.{15,})$")


def slugify(name: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", name.lower()))


def clean(text: str) -> str:
    text = text.replace("’", "'").replace("‘", "'")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def parse():
    reader = PdfReader(str(PDF))
    # Build a flat list of (page, line) skipping repeated headers
    lines = []
    for pno, page in enumerate(reader.pages, start=1):
        for raw in (page.extract_text() or "").split("\n"):
            if HEADER_RE.search(raw) and len(raw.strip()) < 45:
                continue
            lines.append((pno, raw.rstrip()))

    questions = []
    topic = None          # (name, category)
    capturing = False     # inside an exercise/question block
    context = None        # Directions/Passage text applying to following questions
    context_buf = None    # accumulating context lines
    cur = None            # current question dict being accumulated
    stopped = False
    legend = {}           # shared answer options from topic directions {letter: text}
    legend_mode = False   # currently collecting legend lines
    legend_last = None    # letter of last legend entry (for wrapped lines)

    def flush():
        nonlocal cur
        if not cur:
            return
        body = "\n".join(cur["lines"])
        body = PAREN_OPT_RE.sub(lambda m: m.group(1).lower() + ". ", body)

        # split body into stem + options by option markers; retry leniently if too few
        def split_opts(rx):
            parts = rx.split(body)
            stem = clean(parts[0])
            options = {}
            for i in range(1, len(parts) - 1, 2):
                letter = parts[i]
                text = clean(parts[i + 1])
                if letter not in options and text:
                    options[letter] = text
            return stem, options

        stem, options = split_opts(OPT_SPLIT_RE)
        if len(options) < 3:
            stem2, options2 = split_opts(OPT_SPLIT_LENIENT_RE)
            if len(options2) > len(options):
                stem, options = stem2, options2

        uses_legend = False
        if len(options) < 3 and len(legend) >= 4:
            # body letter-items (assumptions/arguments) belong to the stem;
            # the topic's shared legend supplies the real answer options
            romans = ["I", "II", "III", "IV", "V"]
            for i, l in enumerate(sorted(options)):
                stem += f"\n{romans[i] if i < len(romans) else l}. {options[l]}"
            options = dict(legend)
            uses_legend = True

        opts = [{"letter": l, "text": options[l]} for l in sorted(options)]
        if not stem and len(opts) >= 3:
            stem = "Choose the correct option as per the section directions."
        t_name, t_cat = cur["topic"]
        requires_image = (
            t_name in IMAGE_TOPICS
            or bool(IMAGE_HINTS.search(cur.get("context") or ""))
            or (bool(IMAGE_HINTS.search(stem)) and t_name in ("Data Interpretation", "Geometry & Mensuration"))
        )
        incomplete = len(opts) < 3 and not requires_image
        # 0-option items are almost always numbered theory lists / formulas — drop
        # them unless the figure carries the options (image topics). 1–2 option
        # items are kept flagged (e.g. Statement & Assumptions has only a/b).
        if len(opts) == 0 and not requires_image:
            cur = None
            return
        if len(opts) < 3 and len(stem) < 15:
            cur = None
            return
        if stem and (opts or requires_image or incomplete):
            questions.append({
                "category": t_cat,
                "topic": t_name,
                "topicSlug": slugify(t_name),
                "page": cur["page"],
                "number": cur["number"],
                "stem": stem,
                "context": clean(cur["context"]) if cur.get("context") else None,
                "options": opts,
                "requiresImage": requires_image,
                "incomplete": incomplete,
                "legendOptions": uses_legend,
            })
        cur = None

    for pno, line in lines:
        s = line.strip()
        if not s:
            continue

        # main topic headings
        if HEADING_RE.match(s):
            key = re.sub(r"\s+", " ", s).strip()
            if key in STOP_HEADINGS:
                flush()
                stopped = True
                continue
            if key in HEADING_MAP:
                flush()
                topic = HEADING_MAP[key]
                # capture from the heading itself: several topics (Number Series,
                # Course of Action, Seating Arrangement, ...) have no "Exercise
                # problems:" marker. Theory's numbered lists produce option-less
                # pseudo-questions which flush() drops.
                capturing = True
                context = None
                context_buf = None
                stopped = False
                legend = {}
                legend_mode = False
                legend_last = None
                continue
            if key.startswith("VERBAL ABILITY"):
                flush()
                topic = None  # set by subsection
                capturing = False
                context = None
                stopped = False
                continue
            # unknown all-caps line inside a topic: ignore (often layout noise)
            continue

        if stopped:
            continue

        # verbal subsection headings (also lines like "Verbal Ability I")
        low = s.lower()
        if low.startswith("verbal ability"):
            flush()
            topic = None
            capturing = False
            context = None
            continue
        matched_sub = None
        for prefix, t_name in VERBAL_SUBSECTIONS:
            if low.startswith(prefix):
                matched_sub = t_name
                break
        if matched_sub:
            flush()
            topic = (matched_sub, "VERBAL")
            capturing = True
            # instruction text on the same/next lines becomes context
            context_buf = [s]
            context = None
            legend = {}
            legend_mode = False
            legend_last = None
            continue

        if EXERCISE_RE.match(s):
            flush()
            capturing = True
            context = None
            context_buf = None
            continue

        if DIRECTIONS_RE.match(s):
            flush()
            capturing = True
            context_buf = [s]
            context = None
            continue

        if PASSAGE_RE.match(s):
            flush()
            capturing = True
            context_buf = [s]
            context = None
            continue

        if not capturing or topic is None:
            continue

        m = QSTART_RE.match(s)
        if m and (cur is None or int(m.group(1)) != cur["number"]):
            legend_mode = False
            # close context accumulation: it now applies to questions
            if context_buf is not None:
                context = "\n".join(context_buf)
                context_buf = None
            flush()
            cur = {
                "topic": topic,
                "page": pno,
                "number": int(m.group(1)),
                "lines": [m.group(2)],
                "context": context,
            }
            continue

        # shared answer legend in the directions ("Give answer: a. If only ...")
        if cur is None and LEGEND_TRIGGER_RE.search(s):
            legend_mode = True
            legend = {}
            legend_last = None
            if context_buf is not None:
                context_buf.append(s)
            continue
        if cur is None and legend_mode:
            lm = LEGEND_ITEM_RE.match(s)
            if lm:
                legend_last = lm.group(1).lower()
                legend[legend_last] = clean(lm.group(2))
            elif legend_last:
                legend[legend_last] += " " + clean(s)
            continue

        if cur is not None:
            cur["lines"].append(s)
        elif context_buf is not None:
            context_buf.append(s)

    flush()
    return questions


def main():
    qs = parse()
    OUT.write_text(json.dumps(qs, indent=1, ensure_ascii=False), encoding="utf-8")

    by_topic = {}
    for q in qs:
        k = f"{q['category'][:5]:5} {q['topic']}"
        by_topic.setdefault(k, [0, 0, 0])
        by_topic[k][0] += 1
        if q["requiresImage"]:
            by_topic[k][1] += 1
        if q["incomplete"]:
            by_topic[k][2] += 1

    total = len(qs)
    img = sum(1 for q in qs if q["requiresImage"])
    inc = sum(1 for q in qs if q["incomplete"])
    print(f"Extracted {total} questions -> {OUT.name}")
    print(f"  clean (solvable as text): {total - img - inc}")
    print(f"  requiresImage:            {img}")
    print(f"  incomplete options:       {inc}\n")
    for k in sorted(by_topic):
        t, i, c = by_topic[k]
        flags = f"  (img {i}, inc {c})" if i or c else ""
        print(f"  {k:45} {t:4}{flags}")


if __name__ == "__main__":
    sys.exit(main())
