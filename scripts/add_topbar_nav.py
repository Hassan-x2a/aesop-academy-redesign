#!/usr/bin/env python3
"""Replace topbar-badge with prev/next module navigation in all v2 modules."""
import os
import re
from pathlib import Path

CSS_BLOCK = """.topbar-nav{display:flex;align-items:center;gap:0.3rem;flex-shrink:0;}
.topbar-nav-btn{
  font-size:0.75rem;color:var(--text-dim);text-decoration:none;
  padding:0.12rem 0.45rem;border-radius:3px;
  border:1px solid var(--border);line-height:1.6;
  transition:all 0.15s;
}
.topbar-nav-btn:hover{color:var(--gold);border-color:var(--gold-dim);}
.topbar-nav-btn.disabled{opacity:0.2;pointer-events:none;cursor:default;}
"""

def get_module_num(filename):
    m = re.search(r'm(\d+)\.html', filename)
    return int(m.group(1)) if m else None

def get_total_modules(course_dir):
    return len(list(Path(course_dir).glob('m[0-9]*.html')))

def course_slug(course_dir):
    return os.path.basename(course_dir)

def nav_html(course_dir, module_num, total):
    slug = course_slug(course_dir)
    prev_href = f'/ai-academy/modules/v2/{slug}/m{module_num - 1}.html'
    next_href = f'/ai-academy/modules/v2/{slug}/m{module_num + 1}.html'
    prev_cls = 'topbar-nav-btn disabled' if module_num == 1 else 'topbar-nav-btn'
    next_cls = 'topbar-nav-btn disabled' if module_num == total else 'topbar-nav-btn'
    prev_link = f'<a class="{prev_cls}" href="{prev_href}">&#8249;</a>' if module_num > 1 else f'<span class="{prev_cls}">&#8249;</span>'
    next_link = f'<a class="{next_cls}" href="{next_href}">&#8250;</a>' if module_num < total else f'<span class="{next_cls}">&#8250;</span>'
    return f'<div class="topbar-nav">{prev_link}<div class="topbar-badge">Module {module_num} of {total}</div>{next_link}</div>'

def process_standard_module(filepath, module_num, total, course_dir):
    """Process a standard v2 module (inline CSS, topbar-badge pattern)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already done
    if 'topbar-nav' in content:
        print(f'[skip] {os.path.basename(filepath)} - already has topbar-nav')
        return False

    # 1. Add CSS before closing </style>
    if '.topbar-nav{' not in content:
        if '/* ── LIGHT MODE ── */' in content:
            content = content.replace('/* ── LIGHT MODE ── */', CSS_BLOCK + '/* ── LIGHT MODE ── */')
        elif '/* ── RESPONSIVE ── */' in content:
            content = content.replace('/* ── RESPONSIVE ── */', CSS_BLOCK + '/* ── RESPONSIVE ── */')
        elif '</style>' in content:
            content = content.replace('</style>', CSS_BLOCK + '</style>', 1)
        else:
            print(f'  Warning: no CSS anchor found in {os.path.basename(filepath)}')
            return False

    # 2. Replace <div class="topbar-badge">Module N of 8</div> if present,
    #    otherwise insert topbar-nav before the theme button
    old_badge = re.search(r'<div class="topbar-badge">Module \d+ of \d+</div>', content)
    if old_badge:
        replacement = nav_html(course_dir, module_num, total)
        content = content[:old_badge.start()] + replacement + content[old_badge.end():]
    else:
        # Insert nav just before </div> closing the topbar (after last child)
        # Find theme button pattern and insert nav before it
        theme_btn = re.search(r'<button class="(?:topbar-theme|tb-theme)[^"]*"', content)
        if theme_btn:
            replacement = nav_html(course_dir, module_num, total) + '\n  '
            content = content[:theme_btn.start()] + replacement + content[theme_btn.start():]
        else:
            print(f'  Warning: no topbar-badge or theme button found in {os.path.basename(filepath)}')
            return False

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'[ok]   {os.path.basename(filepath)} - module {module_num}/{total}')
    return True

def process_legacy_module(filepath, module_num, total, course_dir):
    """Process modules with the older tab-content structure (building-ai-agents-use-cases)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'topbar-nav' in content:
        print(f'[skip] {os.path.basename(filepath)} - already has topbar-nav')
        return False

    # These modules use a shared modules.css — look for module-header or topbar equivalent
    # They typically have a <div class="module-nav"> or header section
    # Fall back to adding a nav bar just after <body>
    slug = course_slug(course_dir)
    prev_href = f'/ai-academy/modules/v2/{slug}/m{module_num - 1}.html'
    next_href = f'/ai-academy/modules/v2/{slug}/m{module_num + 1}.html'

    nav_bar = f'''<div style="background:#1a1a2e;border-bottom:1px solid #2a2a4e;padding:0.6rem 1.5rem;display:flex;align-items:center;gap:0.75rem;font-family:sans-serif;font-size:0.8rem;">
  <a href="/ai-academy/courses-v2.html" style="color:#888;text-decoration:none;">← Courses</a>
  <span style="color:#444;">|</span>
  {'<a href="' + prev_href + '" style="color:#888;text-decoration:none;">&#8249; Prev</a>' if module_num > 1 else '<span style="color:#333;">&#8249; Prev</span>'}
  <span style="color:#9a5fb0;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-size:0.65rem;padding:0.15rem 0.5rem;background:rgba(154,95,176,0.1);border:1px solid rgba(154,95,176,0.25);border-radius:3px;">Module {module_num} of {total}</span>
  {'<a href="' + next_href + '" style="color:#888;text-decoration:none;">Next &#8250;</a>' if module_num < total else '<span style="color:#333;">Next &#8250;</span>'}
</div>'''

    if '<body>' in content:
        content = content.replace('<body>', '<body>\n' + nav_bar, 1)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'[ok]   {os.path.basename(filepath)} - legacy module {module_num}/{total}')
        return True
    else:
        print(f'  Warning: no <body> found in {os.path.basename(filepath)}')
        return False

def is_legacy(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        head = f.read(500)
    return 'modules.css' in head

def main():
    base = Path(r'C:\Users\scott\Code\aesop\ai-academy\modules\v2')
    updated = 0

    for course_dir in sorted(base.glob('*')):
        if not course_dir.is_dir():
            continue
        modules = sorted(course_dir.glob('m[0-9]*.html'))
        total = len(modules)
        print(f'\n{course_dir.name} ({total} modules)')
        for module_file in modules:
            n = get_module_num(module_file.name)
            if n is None:
                continue
            if is_legacy(str(module_file)):
                ok = process_legacy_module(str(module_file), n, total, str(course_dir))
            else:
                ok = process_standard_module(str(module_file), n, total, str(course_dir))
            if ok:
                updated += 1

    print(f'\n[done] {updated} modules updated.')

if __name__ == '__main__':
    main()
