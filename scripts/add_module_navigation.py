#!/usr/bin/env python3
import os
import re
from pathlib import Path

def get_module_number(filename):
    """Extract module number from filename (m1.html -> 1, m10.html -> 10)"""
    match = re.search(r'm(\d+)\.html', filename)
    return int(match.group(1)) if match else None

def get_next_module_link(course_dir, current_module_num):
    """Generate next module link if it exists"""
    next_module_num = current_module_num + 1
    next_file = f"m{next_module_num}.html"
    next_path = os.path.join(course_dir, next_file)

    if os.path.exists(next_path):
        return f"/ai-academy/modules/v2/{os.path.basename(course_dir)}/m{next_module_num}.html"
    return None

def has_completion_section(content):
    """Check if file already has the completion section"""
    return 'lab-complete' in content

def get_course_name(course_dir):
    """Extract course name from directory path"""
    return os.path.basename(course_dir)

def add_css(content):
    """Add completion CSS if not present"""
    if '.lab-complete{' in content:
        return content

    css_insert = """.lab-complete{
  display:none;padding:1.5rem;background:rgba(201,160,90,0.08);
  border:1px solid rgba(201,160,90,0.25);border-radius:6px;
  text-align:center;flex-direction:column;gap:1rem;align-items:center;
}
.lab-complete.show{display:flex;}
.lab-complete-title{font-size:1.1rem;font-weight:600;color:var(--gold);}
.lab-complete-text{font-size:0.9rem;color:var(--text-mid);line-height:1.6;max-width:320px;}
.next-module-btn{
  background:rgba(var(--accent-rgb),0.12);
  border:1px solid rgba(var(--accent-rgb),0.3);
  color:var(--accent);border-radius:6px;
  padding:0.65rem 1.5rem;
  font-size:0.75rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
  cursor:pointer;font-family:'Nunito Sans',sans-serif;
  text-decoration:none;display:inline-flex;align-items:center;gap:0.5rem;
  transition:all 0.15s;
}
.next-module-btn:hover{background:rgba(var(--accent-rgb),0.2);border-color:rgba(var(--accent-rgb),0.45);}

"""

    # Insert before "/* ── LIGHT MODE ── */"
    return content.replace('/* ── LIGHT MODE ── */', css_insert + '/* ── LIGHT MODE ── */')

def add_html_section(content, next_module_link, module_num, total_modules):
    """Add completion HTML section"""
    # Build the completion message
    if next_module_link:
        next_btn = f'<a href="{next_module_link}" class="next-module-btn">Next Module →</a>'
    else:
        next_btn = '<a href="/ai-academy/courses-v2.html" class="next-module-btn">Back to Courses →</a>'

    # Find the compose-ta textarea and replace the entire lab-compose div structure
    marker = '<div class="lab-compose">'
    if marker not in content:
        print(f"  Warning: Could not find compose marker")
        return content

    # Find the end of lab-compose div
    start = content.find(marker)
    # Count opening and closing divs to find matching close
    div_count = 1
    pos = start + len(marker)
    while div_count > 0 and pos < len(content):
        if content[pos:pos+5] == '<div ':
            div_count += 1
            pos += 5
        elif content[pos:pos+6] == '</div>':
            div_count -= 1
            if div_count == 0:
                end = pos + 6
                break
            pos += 6
        else:
            pos += 1

    if div_count != 0:
        print(f"  Warning: Could not find matching closing div")
        return content

    completion_html = f"""<div class="lab-compose">
          <div id="lab-compose-active">
            <div class="compose-row">
              <textarea
                class="compose-ta"
                id="lab-inp"
                placeholder="State your position and reasoning…"
                onkeydown="if(event.key==='Enter'&&!event.shiftKey){{event.preventDefault();labSend();}}"
              ></textarea>
              <button class="compose-send" id="lab-btn" onclick="labSend()">Send</button>
            </div>
            <div class="compose-hint">Shift + Enter for a new line</div>
          </div>
          <div class="lab-complete" id="lab-complete">
            <div class="lab-complete-title">✓ Module Complete</div>
            <div class="lab-complete-text">You've completed Module {module_num} of {total_modules}.</div>
            {next_btn}
          </div>
        </div>"""

    content = content[:start] + completion_html + content[end:]
    return content

def update_checkComplete(content):
    """Update the checkComplete function"""
    if 'document.getElementById(\'lab-compose-active\')' in content:
        return content  # Already updated

    # Find checkComplete function and replace it
    func_start = content.find('function checkComplete(){')
    if func_start == -1:
        print(f"  Warning: Could not find checkComplete function")
        return content

    # Find the closing brace of the function
    brace_count = 0
    pos = func_start + len('function checkComplete(){')
    started = False
    while pos < len(content):
        if content[pos] == '{':
            brace_count += 1
            started = True
        elif content[pos] == '}':
            if started:
                brace_count -= 1
                if brace_count < 0:
                    func_end = pos + 1
                    break
        pos += 1

    if brace_count != -1:
        print(f"  Warning: Could not find matching closing brace for checkComplete")
        return content

    new_function = """function checkComplete(){
  if(chatExchanges>=LAB_COMPLETE_THRESHOLD&&!labSignaled){
    labSignaled=true;
    document.getElementById('lab-compose-active').style.display='none';
    document.getElementById('lab-complete').classList.add('show');
    window.parent.postMessage({type:'labComplete',courseId:COURSE_ID,moduleId:MODULE_ID,labId:'lab',exchangeCount:chatExchanges},'*');
  }
}"""

    content = content[:func_start] + new_function + content[func_end:]
    return content

def process_module(filepath):
    """Process a single module file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if has_completion_section(content):
        print(f"[OK] {filepath} - already has completion section")
        return False

    # Extract info from file
    course_dir = os.path.dirname(filepath)
    module_num = get_module_number(os.path.basename(filepath))
    course_name = get_course_name(course_dir)
    next_module_link = get_next_module_link(course_dir, module_num)

    # Count total modules in course
    total_modules = len([f for f in os.listdir(course_dir) if re.match(r'm\d+\.html', f)])

    # Apply fixes
    content = add_css(content)
    content = add_html_section(content, next_module_link, module_num, total_modules)
    content = update_checkComplete(content)

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"[OK] {filepath} - added navigation to {next_module_link or 'courses page'}")
    return True

def main():
    base_path = Path(r'C:\Users\scott\Code\aesop\ai-academy\modules\v2')

    updated = 0
    for course_dir in sorted(base_path.glob('*')):
        if not course_dir.is_dir():
            continue

        for module_file in sorted(course_dir.glob('m[0-9]*.html')):
            if process_module(str(module_file)):
                updated += 1

    print(f"\n[OK] Updated {updated} module files")

if __name__ == '__main__':
    main()
