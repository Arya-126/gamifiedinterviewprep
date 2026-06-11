"""Generates the DSA problem bank -> server/prisma/data/dsa_problems.json

Problems are original restatements of classic DSA exercises (A2Z-sheet style
topics). Each problem carries a Python reference solution; every test case's
expected output is produced by RUNNING that reference solution, so the stored
reference and the stored expectations can never drift apart.

Run from server/:  python scripts/generate_dsa_problems.py
Then:              npx ts-node scripts/seed-dsa.ts
"""
import json
import random
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "prisma" / "data" / "dsa_problems.json"
A2Z = "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/"
random.seed(42)

CODING_TOPICS = [
    "Arrays", "Two Pointers", "Binary Search", "Strings", "Linked List",
    "Recursion & Backtracking", "Stacks & Queues", "Sliding Window", "Heaps",
    "Greedy", "Trees", "BST", "Graphs", "Dynamic Programming", "Tries",
    "Bit Manipulation",
]


def starter(slug: str) -> dict:
    return {
        "python": f"# {slug} — read from stdin, print the answer to stdout\nimport sys\n\ndata = sys.stdin.read().split()\n# TODO: solve\n",
        "javascript": f"// {slug} — read from stdin, print the answer to stdout\nconst data = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/);\n// TODO: solve\n",
        "cpp": f"// {slug} — read from stdin, print the answer to stdout\n#include <bits/stdc++.h>\nusing namespace std;\nint main() {{\n    // TODO: solve\n    return 0;\n}}\n",
        "java": f"// {slug} — read from stdin, print the answer to stdout\nimport java.util.*;\npublic class Main {{\n    public static void main(String[] args) {{\n        Scanner sc = new Scanner(System.in);\n        // TODO: solve\n    }}\n}}\n",
    }


def ints(*xs):
    return " ".join(str(x) for x in xs)


def arr_case(n_lo, n_hi, v_lo, v_hi):
    n = random.randint(n_lo, n_hi)
    return [random.randint(v_lo, v_hi) for _ in range(n)]


PROBLEMS = [
    {
        "topic": "Arrays",
        "title": "Maximum Subarray Sum",
        "slug": "max-subarray-sum",
        "difficulty": "MEDIUM",
        "statement": textwrap.dedent("""\
            Given an array of integers (which may include negatives), find the maximum
            possible sum of a non-empty contiguous subarray.

            **Input**: first line contains `n`; second line contains `n` space-separated integers.
            **Output**: a single integer — the maximum subarray sum.
        """),
        "constraints": "1 <= n <= 10^5, -10^9 <= a[i] <= 10^9",
        "reference": textwrap.dedent("""\
            import sys
            data = sys.stdin.read().split()
            n = int(data[0]); a = list(map(int, data[1:1+n]))
            best = cur = a[0]
            for x in a[1:]:
                cur = max(x, cur + x)
                best = max(best, cur)
            print(best)
        """),
        "inputs": [
            ("5\n1 -2 3 4 -1", True),
            ("4\n-3 -1 -7 -2", True),
            ("1\n42", False),
            ("8\n2 -1 2 3 4 -5 6 -10", False),
        ] + [(f"{len(a)}\n{ints(*a)}", False) for a in (arr_case(5, 40, -50, 50) for _ in range(8))],
    },
    {
        "topic": "Two Pointers",
        "title": "Pair With Target Sum (Sorted Array)",
        "slug": "pair-with-target-sum",
        "difficulty": "EASY",
        "statement": textwrap.dedent("""\
            You are given an array sorted in non-decreasing order and a target value.
            Find two distinct positions whose values add up to the target, using O(1)
            extra space. Print the 1-based indices of the leftmost such pair found by
            the classic two-pointer scan (one pointer from each end). If no pair sums
            to the target, print `-1 -1`.

            **Input**: first line `n target`; second line `n` sorted integers.
            **Output**: two integers — the 1-based indices, or `-1 -1`.
        """),
        "constraints": "2 <= n <= 10^5, -10^9 <= a[i], target <= 10^9",
        "reference": textwrap.dedent("""\
            import sys
            data = sys.stdin.read().split()
            n, target = int(data[0]), int(data[1])
            a = list(map(int, data[2:2+n]))
            l, r = 0, n - 1
            while l < r:
                s = a[l] + a[r]
                if s == target:
                    print(l + 1, r + 1); break
                if s < target: l += 1
                else: r -= 1
            else:
                print(-1, -1)
        """),
        "inputs": [
            ("4 6\n1 2 4 5", True),
            ("5 100\n1 2 3 4 5", True),
            ("2 0\n-5 5", False),
        ] + [
            (lambda a, t: (f"{len(a)} {t}\n{ints(*sorted(a))}", False))(arr_case(4, 30, -30, 30), random.randint(-20, 40))
            for _ in range(9)
        ],
    },
    {
        "topic": "Binary Search",
        "title": "First and Last Position of a Target",
        "slug": "first-last-position",
        "difficulty": "MEDIUM",
        "statement": textwrap.dedent("""\
            Given an array sorted in non-decreasing order (duplicates allowed) and a
            target value, print the 0-based index of the first and last occurrence of
            the target. If the target is absent, print `-1 -1`. Aim for O(log n).

            **Input**: first line `n target`; second line `n` sorted integers.
            **Output**: two integers — first and last index, or `-1 -1`.
        """),
        "constraints": "1 <= n <= 10^5",
        "reference": textwrap.dedent("""\
            import sys
            from bisect import bisect_left, bisect_right
            data = sys.stdin.read().split()
            n, target = int(data[0]), int(data[1])
            a = list(map(int, data[2:2+n]))
            lo = bisect_left(a, target)
            if lo == n or a[lo] != target:
                print(-1, -1)
            else:
                print(lo, bisect_right(a, target) - 1)
        """),
        "inputs": [
            ("6 8\n5 7 7 8 8 10", True),
            ("6 6\n5 7 7 8 8 10", True),
            ("1 1\n1", False),
        ] + [
            (lambda a, t: (f"{len(a)} {t}\n{ints(*sorted(a))}", False))(arr_case(5, 40, 0, 15), random.randint(0, 15))
            for _ in range(9)
        ],
    },
    {
        "topic": "Strings",
        "title": "Valid Anagram",
        "slug": "valid-anagram",
        "difficulty": "EASY",
        "statement": textwrap.dedent("""\
            Two lowercase strings are anagrams when one can be formed by rearranging
            the letters of the other, using every letter exactly once. Decide whether
            the given pair is an anagram pair.

            **Input**: two lines, strings `s` and `t`.
            **Output**: `true` or `false`.
        """),
        "constraints": "1 <= |s|, |t| <= 10^5, lowercase a-z",
        "reference": textwrap.dedent("""\
            import sys
            s, t = sys.stdin.read().split()
            print("true" if sorted(s) == sorted(t) else "false")
        """),
        "inputs": [
            ("anagram\nnagaram", True),
            ("rat\ncar", True),
            ("a\na", False),
            ("ab\nabb", False),
        ] + [
            (lambda w: (f"{w}\n{''.join(random.sample(w, len(w)))}", False))(
                "".join(random.choice("abcde") for _ in range(random.randint(3, 12))))
            for _ in range(4)
        ] + [
            (lambda: (f"{''.join(random.choice('abc') for _ in range(6))}\n{''.join(random.choice('abc') for _ in range(6))}", False))()
            for _ in range(4)
        ],
    },
    {
        "topic": "Linked List",
        "title": "Reverse Nodes in K-Sized Groups",
        "slug": "reverse-k-group",
        "difficulty": "MEDIUM",
        "statement": textwrap.dedent("""\
            A singly linked list is given as a sequence of values. Reverse the nodes
            of the list k at a time: every complete group of k consecutive nodes is
            reversed in place; a final group with fewer than k nodes is left as-is.
            Print the resulting sequence.

            **Input**: first line `n k`; second line `n` integers (the list, head first).
            **Output**: the transformed list, space-separated.
        """),
        "constraints": "1 <= k <= n <= 10^5",
        "reference": textwrap.dedent("""\
            import sys
            data = sys.stdin.read().split()
            n, k = int(data[0]), int(data[1])
            a = data[2:2+n]
            out = []
            i = 0
            while i + k <= n:
                out.extend(reversed(a[i:i+k])); i += k
            out.extend(a[i:])
            print(" ".join(out))
        """),
        "inputs": [
            ("5 2\n1 2 3 4 5", True),
            ("5 3\n1 2 3 4 5", True),
            ("4 1\n9 8 7 6", False),
            ("3 3\n1 2 3", False),
        ] + [
            (lambda a: (f"{len(a)} {random.randint(1, len(a))}\n{ints(*a)}", False))(arr_case(2, 25, 0, 99))
            for _ in range(8)
        ],
    },
    {
        "topic": "Recursion & Backtracking",
        "title": "Counting N-Queens Arrangements",
        "slug": "n-queens-count",
        "difficulty": "HARD",
        "statement": textwrap.dedent("""\
            On an n x n chessboard, count the number of ways to place n queens so
            that no two queens attack each other (no shared row, column, or diagonal).

            **Input**: a single integer `n`.
            **Output**: the number of distinct valid arrangements.
        """),
        "constraints": "1 <= n <= 10",
        "reference": textwrap.dedent("""\
            import sys
            n = int(sys.stdin.read().split()[0])
            count = 0
            def place(row, cols, d1, d2):
                global count
                if row == n:
                    count += 1; return
                for c in range(n):
                    if cols & (1 << c) or d1 & (1 << (row + c)) or d2 & (1 << (row - c + n)):
                        continue
                    place(row + 1, cols | (1 << c), d1 | (1 << (row + c)), d2 | (1 << (row - c + n)))
            place(0, 0, 0, 0)
            print(count)
        """),
        "inputs": [("4", True), ("1", True), ("2", False), ("3", False), ("5", False),
                   ("6", False), ("7", False), ("8", False), ("9", False), ("10", False)],
    },
    {
        "topic": "Stacks & Queues",
        "title": "Balanced Bracket Sequence",
        "slug": "valid-parentheses",
        "difficulty": "EASY",
        "statement": textwrap.dedent("""\
            A string consists only of the characters `()[]{}`. It is balanced when
            every opening bracket is closed by the matching bracket type in the
            correct order. Decide whether the string is balanced.

            **Input**: one line — the bracket string.
            **Output**: `true` or `false`.
        """),
        "constraints": "1 <= |s| <= 10^5",
        "reference": textwrap.dedent("""\
            import sys
            s = sys.stdin.read().strip()
            pairs = {')': '(', ']': '[', '}': '{'}
            st = []
            ok = True
            for ch in s:
                if ch in '([{':
                    st.append(ch)
                elif not st or st.pop() != pairs.get(ch):
                    ok = False; break
            print("true" if ok and not st else "false")
        """),
        "inputs": [
            ("()[]{}", True),
            ("(]", True),
            ("([{}])", False),
            ("(((", False),
            ("()(", False),
            ("{[()()]}[]", False),
            ("][", False),
            ("(", False),
            ("{[(])}", False),
            ("()" * 50, False),
        ],
    },
    {
        "topic": "Sliding Window",
        "title": "Longest Substring Without Repeats",
        "slug": "longest-unique-substring",
        "difficulty": "MEDIUM",
        "statement": textwrap.dedent("""\
            Find the length of the longest contiguous substring of the given string
            that contains no repeated characters.

            **Input**: one line — a lowercase string.
            **Output**: a single integer — the maximum length.
        """),
        "constraints": "1 <= |s| <= 10^5",
        "reference": textwrap.dedent("""\
            import sys
            s = sys.stdin.read().strip()
            last = {}
            best = start = 0
            for i, ch in enumerate(s):
                if ch in last and last[ch] >= start:
                    start = last[ch] + 1
                last[ch] = i
                best = max(best, i - start + 1)
            print(best)
        """),
        "inputs": [
            ("abcabcbb", True),
            ("bbbbb", True),
            ("pwwkew", False),
            ("abcdef", False),
        ] + [
            ("".join(random.choice("abcdefg") for _ in range(random.randint(5, 60))), False)
            for _ in range(8)
        ],
    },
    {
        "topic": "Heaps",
        "title": "K-th Largest Element",
        "slug": "kth-largest",
        "difficulty": "EASY",
        "statement": textwrap.dedent("""\
            Given an unsorted array, output the k-th largest element (by sorted
            order, not the k-th distinct value). A heap of size k gives O(n log k).

            **Input**: first line `n k`; second line `n` integers.
            **Output**: the k-th largest value.
        """),
        "constraints": "1 <= k <= n <= 10^5",
        "reference": textwrap.dedent("""\
            import sys, heapq
            data = sys.stdin.read().split()
            n, k = int(data[0]), int(data[1])
            a = list(map(int, data[2:2+n]))
            print(heapq.nlargest(k, a)[-1])
        """),
        "inputs": [
            ("6 2\n3 2 1 5 6 4", True),
            ("9 4\n3 2 3 1 2 4 5 5 6", True),
            ("1 1\n7", False),
        ] + [
            (lambda a: (f"{len(a)} {random.randint(1, len(a))}\n{ints(*a)}", False))(arr_case(3, 40, -100, 100))
            for _ in range(9)
        ],
    },
    {
        "topic": "Greedy",
        "title": "Maximum Non-Overlapping Meetings",
        "slug": "max-meetings",
        "difficulty": "MEDIUM",
        "statement": textwrap.dedent("""\
            One meeting room is available. Each meeting has a start and end time.
            A meeting can be scheduled only if it starts strictly after the
            previously scheduled meeting ends. Maximize the number of meetings held.

            **Input**: first line `n`; then `n` lines each with `start end`.
            **Output**: the maximum number of meetings.
        """),
        "constraints": "1 <= n <= 10^5, 0 <= start < end <= 10^9",
        "reference": textwrap.dedent("""\
            import sys
            data = sys.stdin.read().split()
            n = int(data[0])
            ms = []
            for i in range(n):
                s, e = int(data[1 + 2*i]), int(data[2 + 2*i])
                ms.append((e, s))
            ms.sort()
            count, last_end = 0, -1
            for e, s in ms:
                if s > last_end:
                    count += 1; last_end = e
            print(count)
        """),
        "inputs": [
            ("6\n1 2\n3 4\n0 6\n5 7\n8 9\n5 9", True),
            ("3\n1 10\n2 3\n4 5", True),
            ("1\n0 1", False),
        ] + [
            (lambda n: (f"{n}\n" + "\n".join(
                (lambda s: f"{s} {s + random.randint(1, 10)}")(random.randint(0, 50)) for _ in range(n)), False))(random.randint(2, 25))
            for _ in range(9)
        ],
    },
    {
        "topic": "BST",
        "title": "Lowest Common Ancestor in a BST",
        "slug": "bst-lowest-common-ancestor",
        "difficulty": "MEDIUM",
        "statement": textwrap.dedent("""\
            A binary search tree is built by inserting the given distinct values one
            by one, in order, using standard BST insertion (smaller to the left,
            larger to the right). For two values `a` and `b` that are guaranteed to
            be in the tree, print the value of their lowest common ancestor.

            **Input**: first line `n`; second line `n` distinct integers (insertion
            order); third line `a b`.
            **Output**: the LCA node's value.
        """),
        "constraints": "2 <= n <= 10^4",
        "reference": textwrap.dedent("""\
            import sys
            data = sys.stdin.read().split()
            n = int(data[0])
            vals = list(map(int, data[1:1+n]))
            a, b = int(data[1+n]), int(data[2+n])
            left, right, root = {}, {}, vals[0]
            for v in vals[1:]:
                cur = root
                while True:
                    if v < cur:
                        if cur in left: cur = left[cur]
                        else: left[cur] = v; break
                    else:
                        if cur in right: cur = right[cur]
                        else: right[cur] = v; break
            lo, hi = min(a, b), max(a, b)
            cur = root
            while not (lo <= cur <= hi):
                cur = left[cur] if cur > hi else right[cur]
            print(cur)
        """),
        "inputs": [
            ("7\n6 2 8 0 4 7 9\n2 8", True),
            ("7\n6 2 8 0 4 7 9\n2 4", True),
            ("2\n5 3\n3 5", False),
        ] + [
            (lambda vals: (f"{len(vals)}\n{ints(*vals)}\n{ints(*random.sample(vals, 2))}", False))(
                random.sample(range(0, 200), random.randint(4, 30)))
            for _ in range(9)
        ],
    },
    {
        "topic": "Graphs",
        "title": "Counting Islands in a Grid",
        "slug": "number-of-islands",
        "difficulty": "MEDIUM",
        "statement": textwrap.dedent("""\
            A grid of `1`s (land) and `0`s (water) is given. An island is a maximal
            group of land cells connected horizontally or vertically. Count the
            islands.

            **Input**: first line `rows cols`; then `rows` lines, each a string of
            `0`/`1` of length `cols`.
            **Output**: the number of islands.
        """),
        "constraints": "1 <= rows, cols <= 500",
        "reference": textwrap.dedent("""\
            import sys
            from collections import deque
            data = sys.stdin.read().split()
            rows, cols = int(data[0]), int(data[1])
            grid = [list(data[2 + r]) for r in range(rows)]
            count = 0
            for r in range(rows):
                for c in range(cols):
                    if grid[r][c] == '1':
                        count += 1
                        q = deque([(r, c)]); grid[r][c] = '0'
                        while q:
                            y, x = q.popleft()
                            for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                                ny, nx = y+dy, x+dx
                                if 0 <= ny < rows and 0 <= nx < cols and grid[ny][nx] == '1':
                                    grid[ny][nx] = '0'; q.append((ny, nx))
            print(count)
        """),
        "inputs": [
            ("4 5\n11110\n11010\n11000\n00000", True),
            ("4 5\n11000\n11000\n00100\n00011", True),
            ("1 1\n0", False),
            ("1 1\n1", False),
        ] + [
            (lambda r, c: (f"{r} {c}\n" + "\n".join(
                "".join(random.choice("0011") for _ in range(c)) for _ in range(r)), False))(
                random.randint(2, 12), random.randint(2, 12))
            for _ in range(8)
        ],
    },
    {
        "topic": "Dynamic Programming",
        "title": "Longest Strictly Increasing Subsequence",
        "slug": "longest-increasing-subsequence",
        "difficulty": "MEDIUM",
        "statement": textwrap.dedent("""\
            Find the length of the longest strictly increasing subsequence of the
            given array (elements keep their relative order but need not be
            contiguous). An O(n log n) solution exists.

            **Input**: first line `n`; second line `n` integers.
            **Output**: the LIS length.
        """),
        "constraints": "1 <= n <= 10^5",
        "reference": textwrap.dedent("""\
            import sys
            from bisect import bisect_left
            data = sys.stdin.read().split()
            n = int(data[0]); a = list(map(int, data[1:1+n]))
            tails = []
            for x in a:
                i = bisect_left(tails, x)
                if i == len(tails): tails.append(x)
                else: tails[i] = x
            print(len(tails))
        """),
        "inputs": [
            ("8\n10 9 2 5 3 7 101 18", True),
            ("6\n0 1 0 3 2 3", True),
            ("4\n7 7 7 7", False),
            ("1\n5", False),
        ] + [(f"{len(a)}\n{ints(*a)}", False) for a in (arr_case(5, 50, 0, 40) for _ in range(8))],
    },
    {
        "topic": "Bit Manipulation",
        "title": "The Lonely Number",
        "slug": "single-number",
        "difficulty": "EASY",
        "statement": textwrap.dedent("""\
            Every value in the array appears exactly twice, except one value that
            appears exactly once. Find it in O(n) time and O(1) extra space.

            **Input**: first line `n` (odd); second line `n` integers.
            **Output**: the value that appears once.
        """),
        "constraints": "1 <= n <= 10^5 (n odd)",
        "reference": textwrap.dedent("""\
            import sys
            from functools import reduce
            from operator import xor
            data = sys.stdin.read().split()
            n = int(data[0])
            print(reduce(xor, map(int, data[1:1+n])))
        """),
        "inputs": [
            ("3\n2 2 1", True),
            ("5\n4 1 2 1 2", True),
            ("1\n99", False),
        ] + [
            (lambda pairs, single: (
                lambda arr: (f"{len(arr)}\n{ints(*arr)}", False))(
                random.sample(pairs * 2 + [single], len(pairs) * 2 + 1)))(
                random.sample(range(0, 500), random.randint(2, 20)),
                random.choice(range(500, 600)))
            for _ in range(9)
        ],
    },
]


def expected_output(reference: str, stdin: str) -> str:
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as f:
        f.write(reference)
        path = f.name
    try:
        proc = subprocess.run(
            [sys.executable, path], input=stdin, capture_output=True, text=True, timeout=30
        )
        if proc.returncode != 0:
            raise RuntimeError(f"reference crashed: {proc.stderr[:500]}")
        return proc.stdout.strip()
    finally:
        Path(path).unlink(missing_ok=True)


def slugify(name: str) -> str:
    import re
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", name.lower()))


def main():
    out = {"topics": CODING_TOPICS, "problems": []}
    for p in PROBLEMS:
        cases = []
        for stdin, is_sample in p["inputs"]:
            cases.append({
                "input": stdin,
                "expectedOutput": expected_output(p["reference"], stdin),
                "isSample": is_sample,
            })
        sample_io = [
            {"input": c["input"], "output": c["expectedOutput"]}
            for c in cases if c["isSample"]
        ]
        out["problems"].append({
            "topicSlug": slugify(p["topic"]),
            "title": p["title"],
            "slug": p["slug"],
            "difficulty": p["difficulty"],
            "statement": p["statement"],
            "constraints": p["constraints"],
            "sampleIo": sample_io,
            "starterCode": starter(p["slug"]),
            "referenceSolution": {"python": p["reference"]},
            "timeLimitMs": 2000,
            "memoryLimitMb": 256,
            "source": "Original statement; topic follows the Striver A2Z sheet structure",
            "sourceUrl": A2Z,
            "cases": cases,
        })
        print(f"  {p['slug']:32} {len(cases)} cases ({sum(c['isSample'] for c in cases)} sample)")

    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {len(out['problems'])} problems -> {OUT.name}")


if __name__ == "__main__":
    main()
