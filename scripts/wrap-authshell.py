#!/usr/bin/env python3
"""Convert auth page wrappers to <AuthShell> with correct tag balancing.

Algorithm: track a stack of tags. The min-h-screen wrapper divs become <AuthShell>
opens (stack marker "SHELL"); their matching </div> becomes </AuthShell>.
All other <div>/</div> are passed through unchanged.
"""
import re

files = [
    "src/app/(auth)/login/page.tsx",
    "src/app/(auth)/register/page.tsx",
    "src/app/forgot-password/page.tsx",
    "src/app/reset-password/page.tsx",
    "src/app/admin/login/page.tsx",
    "src/app/accept-invite/page.tsx",
    "src/app/trial-expired/page.tsx",
    "src/app/demo-login/page.tsx",
]

SHELL_RE = re.compile(r'<div className="min-h-screen flex items-center justify-center')
SELFCLOSE_RE = re.compile(r"<div\b[^>]*/>")
OPEN_RE = re.compile(r"<div\b[^>]*>")  # opening div (not self-closing)
CLOSE_RE = re.compile(r"</div>")

for path in files:
    lines = open(path).readlines()
    stack = []  # "div" or "SHELL"
    out = []
    errors = []
    for i, line in enumerate(lines, 1):
        if SHELL_RE.search(line):
            indent = line[: line.index("<div")]
            out.append(indent + "<AuthShell>\n")
            stack.append("SHELL")
            continue
        if SELFCLOSE_RE.search(line):
            out.append(line)
            continue
        if OPEN_RE.search(line):
            out.append(line)
            stack.append("div")
            continue
        if CLOSE_RE.search(line):
            if not stack:
                errors.append(f"line {i}: extra </div>")
                out.append(line)
                continue
            tag = stack.pop()
            if tag == "SHELL":
                indent = line[: line.index("</div>")]
                out.append(indent + "</AuthShell>\n")
            else:
                out.append(line)
            continue
        out.append(line)
    if stack:
        errors.append(f"unclosed at EOF: {stack}")
    if errors:
        print(f"{path}: ERRORS {errors}")
    else:
        print(f"{path}: OK")
    open(path, "w").writelines(out)
