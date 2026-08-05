#!/usr/bin/env python3
"""Fix AuthShell closing tags: every <AuthShell> at indent N needs the next </div> at indent N replaced."""
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

for path in files:
    lines = open(path).readlines()
    pending = []  # stack of indents awaiting a closing </div>
    out = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("<AuthShell>"):
            indent = line[: line.index("<AuthShell>")]
            pending.append(indent)
            out.append(line)
            continue
        if stripped == "</div>" and pending:
            indent = line[: line.index("</div>")]
            if indent == pending[-1]:
                pending.pop()
                out.append(indent + "</AuthShell>\n")
                continue
        out.append(line)
    if pending:
        print(f"{path}: WARNING {len(pending)} unclosed AuthShell")
    else:
        print(f"{path}: OK")
    open(path, "w").writelines(out)
