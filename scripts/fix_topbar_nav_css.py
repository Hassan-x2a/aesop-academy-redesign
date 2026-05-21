#!/usr/bin/env python3
"""Replace the faint topbar-nav-btn CSS with a visible accent-colored version."""
import os
from pathlib import Path

OLD_CSS = """.topbar-nav{display:flex;align-items:center;gap:0.3rem;flex-shrink:0;}
.topbar-nav-btn{
  font-size:0.75rem;color:var(--text-dim);text-decoration:none;
  padding:0.12rem 0.45rem;border-radius:3px;
  border:1px solid var(--border);line-height:1.6;
  transition:all 0.15s;
}
.topbar-nav-btn:hover{color:var(--gold);border-color:var(--gold-dim);}
.topbar-nav-btn.disabled{opacity:0.2;pointer-events:none;cursor:default;}
"""

NEW_CSS = """.topbar-nav{display:flex;align-items:center;gap:0.35rem;flex-shrink:0;}
.topbar-nav-btn{
  font-size:0.95rem;font-weight:700;color:var(--accent);text-decoration:none;
  padding:0.05rem 0.5rem;border-radius:3px;
  border:1px solid rgba(var(--accent-rgb),0.3);line-height:1.8;
  background:rgba(var(--accent-rgb),0.06);
  transition:all 0.15s;
}
.topbar-nav-btn:hover{background:rgba(var(--accent-rgb),0.18);border-color:rgba(var(--accent-rgb),0.55);}
.topbar-nav-btn.disabled{opacity:0.18;pointer-events:none;cursor:default;color:var(--text-dim);border-color:var(--border);background:transparent;}
"""

def main():
    base = Path(r'C:\Users\scott\Code\aesop\ai-academy\modules\v2')
    updated = 0

    for module_file in sorted(base.rglob('m[0-9]*.html')):
        with open(module_file, 'r', encoding='utf-8') as f:
            content = f.read()

        if OLD_CSS in content:
            content = content.replace(OLD_CSS, NEW_CSS)
            with open(module_file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'[ok] {module_file.parent.name}/{module_file.name}')
            updated += 1
        elif 'topbar-nav-btn' in content and NEW_CSS not in content:
            print(f'[??] {module_file.parent.name}/{module_file.name} — has topbar-nav-btn but CSS did not match')

    print(f'\n{updated} files updated.')

if __name__ == '__main__':
    main()
