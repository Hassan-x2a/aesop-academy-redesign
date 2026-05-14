# AESOP AI Academy — Module Build Standards
> Single reference for building all module files across both systems.
> Version 2.0.0 | April 2026

---

## SYSTEM OVERVIEW

The academy runs two module systems. Know which one you are building for before writing a single line.

| System | Hub | File format | Sidebar | Navigation |
|--------|-----|-------------|---------|------------|
| **AI Foundations** (Modules 1–10) | `ai-academy/index.html` (nav) | Full standalone HTML page | Static HTML in file | Full-page navigation via `?lesson=` param |
| **Electives** (AI Governance, etc.) | `ai-academy/modules/electives-hub.html` | Content fragment (no `<head>`, no topbar) | Hub owns the chrome | Hub fetches and injects content |

**Never mix patterns between systems.** An Electives module built with a full `<head>` and topbar will render broken in the hub. A Foundations module built without a sidebar will 404 or load wrong in the nav.

---

## PART 1 — ELECTIVES MODULES
### (AI Governance, AI in Society, AI Creativity, AI Ethics, Building with AI, AI Careers)

---

### 1.1 How the Hub Works

The electives hub (`electives-hub.html`) fetches each module HTML file and extracts:

1. All `<style>` blocks → injected into hub `<head>` once per module
2. `.tab-strip` div → rendered as the lesson tab bar
3. `.content-area` div → rendered as the lesson content
4. The `<script>` block containing `COURSE_ID` → re-executed in global scope

The hub provides its own chrome: topbar, back button, font size slider, text color slider, dark mode toggle.

**What the module file must NOT include:**
- `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` wrapper (keep for standalone testing, hub ignores them)
- A topbar or nav bar (hub renders its own)
- `<link>` stylesheets — hub already loads `academy-theme.css` and `academy-dark-mode.css`
- Academy-wide fonts — already loaded by hub

**What the module file MUST include:**
- Module-specific `<style>` block
- `.tab-strip` div
- `.content-area` div with all lesson/quiz/lab/test pages
- One `<script>` block with `COURSE_ID` and all JS

**Hub overrides (change in hub, affects all modules):**
The hub stylesheet contains a `MODULE CONTENT OVERRIDES` section. Rules here win over module CSS via `!important`. Use tokens only — no hardcoded hex values.

```css
/* Examples already in hub */
.quiz-opt              { color: var(--ink-mid) !important; }
.tab-lesson            { color: var(--ink-muted) !important; }
.tab-lesson.active     { color: var(--gold) !important; }
```

---

### 1.2 File Naming

```
Local staging:   {course}-m{N}-v{X}_{Y}_{Z}.html
Server name:     {course}-m{N}.html
```

**Examples:**
```
ai-governance-m1-v1_0_0.html  →  ai-governance-m1.html
ai-governance-m3-v1_0_2.html  →  ai-governance-m3.html
```

**Server path:** `aesop-academy/ai-academy/modules/ai-governance/`

**Bump version on every delivery. No exceptions.**

---

### 1.3 COURSE_ID and MODULE_ID Reference

| Course | COURSE_ID | Module prefix | Example MODULE_ID |
|--------|-----------|---------------|-------------------|
| AI Governance | `governance` | `gov` | `gov-m1` |
| AI in Society | `society` | `soc` | `soc-m1` |
| AI & Creativity | `creativity` | `cre` | `cre-m1` |
| AI Ethics | `ethics` | `eth` | `eth-m1` |
| Building with AI | `building` | `bld` | `bld-m1` |
| AI Careers | `careers` | `car` | `car-m1` |

---

### 1.4 Required HTML Structure

```html
<!-- ai-governance-m1-v1.0.0 -->
<!-- AESOP AI Academy — Electives Module (content injection format) -->
<!-- Hub extracts: <style>, .tab-strip, .content-area, <script> -->
<style>
  /* Module-specific CSS only — see Section 1.6 */
</style>

<!-- TAB STRIP -->
<div class="tab-strip">
  <div class="tab-group">
    <div class="tab-lesson active" data-page="p-l1" onclick="goPage('p-l1')">L1</div>
    <div class="tab-subs">
      <span class="tab-sep">·</span>
      <div class="tab-sub" data-page="p-q1" onclick="goPage('p-q1')">Quiz</div>
      <span class="tab-sep">·</span>
      <div class="tab-sub" data-page="p-lab1" onclick="goPage('p-lab1')">Lab</div>
    </div>
  </div>
  <!-- Repeat for L2, L3, L4 -->
  <div class="tab-test" data-page="p-mt" onclick="goPage('p-mt')">Module Test</div>
</div>

<!-- CONTENT AREA -->
<div class="content-area">

  <!-- LESSON 1 -->
  <div class="page active" id="p-l1">
    <div class="lesson-hero">
      <div class="lesson-kicker">AI Governance · Module 1 · Lesson 1</div>
      <h1>Lesson Title</h1>
      <p class="tagline">One-sentence hook.</p>
    </div>
    <!-- Content blocks — see Section 1.5 -->
    <div class="page-nav">
      <button class="pnav-btn" onclick="goPage('p-q1')">Quiz →</button>
      <button class="pnav-btn primary" onclick="goPage('p-lab1')">Lab 1 →</button>
    </div>
  </div>

  <!-- QUIZ 1 -->
  <div class="page" id="p-q1">
    <div class="quiz-hero"><h1>Lesson 1 Quiz</h1><div class="tagline">Topic</div></div>
    <!-- quiz-box elements -->
    <div class="page-nav">
      <button class="pnav-btn" onclick="goPage('p-l1')">← Lesson</button>
      <button class="pnav-btn primary" onclick="goPage('p-lab1')">Lab →</button>
    </div>
  </div>

  <!-- LAB 1 -->
  <div class="page" id="p-lab1">
    <!-- lab-block — see Section 1.5 -->
    <div class="page-nav">
      <button class="pnav-btn" onclick="goPage('p-q1')">← Quiz</button>
      <button class="pnav-btn primary" onclick="goPage('p-l2')">Lesson 2 →</button>
    </div>
  </div>

  <!-- Repeat L2, Q2, Lab2 / L3, Q3, Lab3 / L4, Q4, Lab4 -->

  <!-- MODULE TEST -->
  <div class="page" id="p-mt">
    <!-- see Section 1.5 Module Test -->
  </div>

</div>

<script>
/* All JS — see Section 1.7 */
</script>
```

**Page ID naming:**

| Page | ID |
|------|----|
| Lesson N | `p-l{N}` |
| Quiz N | `p-q{N}` |
| Lab N | `p-lab{N}` |
| Module Test | `p-mt` |

---

### 1.5 Content Blocks

**Story Scene**
```html
<div class="story-scene" data-label="SCENE LABEL">
  <p class="story-text"><span class="char">Name</span> narrative text.</p>
  <p class="story-text">Continuation.</p>
</div>
```

**Lesson Section**
```html
<div class="lesson-section">
  <div class="section-heading">Section Title</div>
  <div class="section-body">
    <p>Body text.</p>
    <div class="callout">
      <p class="callout-label">Callout Title</p>
      <p>Callout content.</p>
    </div>
  </div>
</div>
<div class="section-divider"></div>
```

**Gold Callout**
```html
<div class="gold-callout">
  <p class="callout-label">Title</p>
  <p>Key takeaway.</p>
</div>
```

**Key Term**
```html
<div class="key-term">
  <span class="kt-term">Term</span>
  <span class="kt-def">Plain-language definition.</span>
</div>
```

**Quiz Block**
```html
<div class="quiz-box" id="q1-l1">
  <div class="quiz-q">Question text?</div>
  <div class="quiz-opts">
    <button class="quiz-opt" onclick="answer(this,'wrong','q1-l1')">Wrong A</button>
    <button class="quiz-opt" onclick="answer(this,'correct','q1-l1')">Correct</button>
    <button class="quiz-opt" onclick="answer(this,'wrong','q1-l1')">Wrong B</button>
    <button class="quiz-opt" onclick="answer(this,'wrong','q1-l1')">Wrong C</button>
  </div>
  <div class="quiz-feedback right">✓ Why this is correct.</div>
  <div class="quiz-feedback wrong">✗ Why this is wrong, and what the right answer is.</div>
</div>
```
- Quiz box ID format: `q{questionNum}-l{lessonNum}` — e.g. `q1-l1`, `q2-l1`, `q1-l2`
- Always 4 options, 1 correct
- Feedback: `.right` first, `.wrong` second — order matters
- Vary the correct answer position across questions

**Lab Block**
```html
<div class="lab-block" id="lab-l1">
  <div class="lab-header">
    <span class="lab-tag">AI LAB</span>
    <span class="lab-title">Lab Title</span>
  </div>
  <div class="lab-prompt">
    <p>Instructions. What should the student explore?</p>
    <p>Suggested starting prompt in <strong>bold</strong>.</p>
  </div>
  <div class="lab-chat" id="chat-l1">
    <div class="lab-chat-header">
      <span>AI Lab Assistant</span>
      <span class="chat-badge">Context Label</span>
    </div>
    <div class="lab-chat-msgs" id="msgs-l1">
      <div class="chat-msg ai">Opening message from AI.</div>
    </div>
    <div class="lab-chat-input">
      <textarea id="inp-l1" placeholder="Type your response…"
        onkeydown="chatKeydown(event,'l1')"></textarea>
      <button class="chat-reset-btn" onclick="chatReset('l1')">Reset</button>
      <button class="chat-send-btn" id="send-l1" onclick="chatSend('l1')">Send</button>
    </div>
  </div>
</div>
```

**Module Test**
```html
<div class="page" id="p-mt">
  <div class="lesson-hero">
    <div class="lesson-kicker">Module Test</div>
    <h1>Module Title</h1>
    <p class="tagline">15 questions. Complete all to finish the module.</p>
  </div>
  <div class="mt-progress">
    <span id="mt-score">0</span> / <span id="mt-total">15</span> correct
  </div>
  <div id="mt-questions">
    <div class="mt-q" id="mtq-1">
      <div class="mt-q-text">1. Question?</div>
      <div class="mt-opts">
        <button class="mt-opt" onclick="mtAnswer(this,false,1)">Option A</button>
        <button class="mt-opt" onclick="mtAnswer(this,true,1)">Correct</button>
        <button class="mt-opt" onclick="mtAnswer(this,false,1)">Option C</button>
        <button class="mt-opt" onclick="mtAnswer(this,false,1)">Option D</button>
      </div>
    </div>
    <!-- Repeat for all 15 questions -->
  </div>
  <div class="mt-result" id="mt-result" style="display:none;">
    <div class="mt-result-score" id="mt-result-score"></div>
    <div class="mt-result-msg" id="mt-result-msg"></div>
    <button class="pnav-btn primary" onclick="goPage('p-l1')">Review Lessons</button>
  </div>
</div>
```

---

### 1.6 Required CSS (Tab Strip + Page Visibility)

Only include CSS the hub doesn't already provide. At minimum, every module needs:

```css
/* Tab strip */
.tab-strip{background:#060e18;border-bottom:1px solid #1a2738;padding:0 1.5rem;display:flex;gap:0;overflow-x:auto;flex-shrink:0;scrollbar-width:none;}
.tab-strip::-webkit-scrollbar{display:none;}
.tab-group{display:flex;align-items:stretch;flex-shrink:0;}
.tab-lesson{font-size:0.88rem;color:rgba(201,160,90,0.25);padding:0.65rem 1rem;cursor:pointer;border-bottom:2px solid transparent;transition:all 0.15s;white-space:nowrap;}
.tab-lesson.active{color:var(--gold);border-bottom-color:var(--gold);}
.tab-subs{display:flex;align-items:center;padding:0 0.25rem;}
.tab-sep{color:rgba(201,160,90,0.1);font-size:0.7rem;padding:0 0.1rem;}
.tab-sub{font-size:0.7rem;color:rgba(201,160,90,0.18);padding:0.65rem 0.45rem;cursor:pointer;transition:color 0.15s;white-space:nowrap;}
.tab-sub.active{color:var(--gold);}
.tab-test{font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(201,160,90,0.2);padding:0.65rem 1rem;margin-left:auto;cursor:pointer;border-bottom:2px solid transparent;transition:all 0.15s;}
.tab-test.active{color:var(--gold);border-bottom-color:var(--gold);}

/* Page visibility */
.content-area{flex:1;display:flex;flex-direction:column;}
.page{display:none;flex:1;flex-direction:column;padding:2rem;}
.page.active{display:flex;}
```

**Hub tokens available to all module CSS:**
```
var(--gold)         var(--gold-light)    var(--teal)
var(--ink)          var(--ink-light)     var(--ink-muted)
var(--cream)        var(--white)         var(--border)
var(--navy)         var(--green)         var(--red)
var(--amber)
```

---

### 1.7 Required JavaScript

One `<script>` block. The hub filters scripts by presence of `COURSE_ID` — this must be in the script.

**Required variables:**
```javascript
var COURSE_ID  = 'governance';  // Must match hub COURSES data id
var MODULE_ID  = 'gov-m1';      // Must match hub module id
var PROXY_URL  = '/aesop-api/proxy.php';
var currentPageId = 'p-l1';
var lessonSignaled = {}, quizSignaled = {}, labSignaled = {};
var PAGE_TO_LESSON = {
  'p-l1':'l1', 'p-l2':'l2', 'p-l3':'l3', 'p-l4':'l4'
};
```

**Required functions:**
```javascript
function goPage(id){
  var prev=document.getElementById(currentPageId);
  var next=document.getElementById(id);
  if(!next) return;
  var pl=PAGE_TO_LESSON[currentPageId];
  if(pl&&!lessonSignaled[pl]){
    lessonSignaled[pl]=true;
    window.parent.postMessage({type:'lessonComplete',courseId:COURSE_ID,moduleId:MODULE_ID,lessonId:pl},'*');
  }
  if(prev) prev.classList.remove('active');
  next.classList.add('active');
  currentPageId=id;
  updateTabs();
  window.scrollTo(0,0);
}

function updateTabs(){
  document.querySelectorAll('.tab-lesson,.tab-sub,.tab-test').forEach(function(el){
    el.classList.toggle('active',el.dataset.page===currentPageId);
  });
}

// Hub calls these from the topbar — must exist in module scope
function applySize(val){ document.querySelector('.content-area').style.fontSize=val+'px'; }
function adjustSize(delta){ var r=document.getElementById('sizerRange'); if(!r)return; r.value=Math.min(22,Math.max(12,parseInt(r.value)+delta)); applySize(r.value); }

function answer(btn,result,qId){
  var box=document.getElementById(qId);
  box.querySelectorAll('.quiz-opt').forEach(function(b){b.disabled=true;});
  btn.classList.add(result);
  box.querySelectorAll('.quiz-feedback').forEach(function(fb){fb.classList.remove('show');});
  box.querySelector('.quiz-feedback.'+(result==='correct'?'right':'wrong')).classList.add('show');
}

var mtTotal=15,mtCorrect=0,mtAnswered=0;
function mtAnswer(btn,correct,qNum){
  var box=document.getElementById('mtq-'+qNum);
  if(box.classList.contains('answered')) return;
  box.classList.add('answered');
  box.querySelectorAll('.mt-opt').forEach(function(b){b.disabled=true;});
  btn.classList.add(correct?'correct':'wrong');
  if(correct) mtCorrect++;
  mtAnswered++;
  document.getElementById('mt-score').textContent=mtCorrect;
  if(mtAnswered>=mtTotal){
    var pct=Math.round((mtCorrect/mtTotal)*100);
    var passed=pct>=70;
    document.getElementById('mt-result').style.display='block';
    document.getElementById('mt-result-score').textContent=pct+'%';
    document.getElementById('mt-result-msg').textContent=passed?'Module complete!':'Below 70% — review and retake.';
    if(passed) window.parent.postMessage({type:'modTestPassed',courseId:COURSE_ID,moduleId:MODULE_ID},'*');
  }
}
```

**Lab system prompts — define per module:**
```javascript
var LAB_SYSTEM_PROMPTS = {
  l1: 'You are a [role] for AESOP AI Academy, AI Governance Module 1. [Instructions]. Stay strictly on topic. 2-3 paragraphs per response.',
  l2: '...',
  l3: '...',
  l4: '...'
};
```

**Lab chat functions:**
```javascript
var chatHistories={l1:[],l2:[],l3:[],l4:[]};
var chatExchanges={l1:0,l2:0,l3:0,l4:0};
var LAB_COMPLETE_THRESHOLD=3;
var ACADEMY_GUARDRAIL='You are operating within the AESOP AI Academy. Stay strictly on the lab topic. If asked about anything else, redirect warmly.';

/* ── Offline fallback system ──────────────────────────────────────── */
var _offlineMode={};
var _fallbackIdx={};
var LAB_FALLBACK=[
  "That's a thoughtful response. Can you build on that? What specific examples or evidence come to mind that support your thinking?",
  "Good point. Now let's look at it from another angle — what challenges or counterarguments might someone raise? How would you address them?",
  "You're doing well with this. Think about the bigger picture: what are the practical, real-world implications of what you've described?",
  "Great work engaging with this topic. As a final reflection: what's your key takeaway from this conversation, and how does it connect to the lesson material?"
];
function _fallbackReply(labId){var i=_fallbackIdx[labId]||0;var r=LAB_FALLBACK[Math.min(i,LAB_FALLBACK.length-1)];_fallbackIdx[labId]=i+1;return r;}
/* ── End fallback system ──────────────────────────────────────────── */

async function chatSend(labId){
  var inp=document.getElementById('inp-'+labId);
  if(!inp) return;
  var text=inp.value.trim();
  if(!text) return;
  inp.value='';
  chatHistories[labId].push({role:'user',content:text});
  chatAppend(labId,'user',text);
  /* Offline mode — use fallback immediately */
  if(_offlineMode[labId]){
    var reply=_fallbackReply(labId);
    chatHistories[labId].push({role:'assistant',content:reply});
    chatAppend(labId,'ai',reply);
    chatExchanges[labId]=(chatExchanges[labId]||0)+1;
    if(chatExchanges[labId]>=LAB_COMPLETE_THRESHOLD&&!labSignaled[labId]){
      labSignaled[labId]=true;
      window.parent.postMessage({type:'labComplete',courseId:COURSE_ID,moduleId:MODULE_ID,lessonId:labId,exchangeCount:chatExchanges[labId]},'*');
    }
    return;
  }
  chatSetLoading(labId,true);
  for(var _attempt=0;_attempt<2;_attempt++){
    try{
      var res=await fetch(PROXY_URL,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:chatHistories[labId],system_prompt:ACADEMY_GUARDRAIL+(LAB_SYSTEM_PROMPTS[labId]||''),max_tokens:1024})});
      if(!res.ok) throw new Error('Server error '+res.status);
      var data=await res.json();
      var reply=(data.content&&data.content[0]&&data.content[0].text)||data.reply||'(No response)';
      chatHistories[labId].push({role:'assistant',content:reply});
      chatAppend(labId,'ai',reply);
      chatExchanges[labId]=(chatExchanges[labId]||0)+1;
      if(chatExchanges[labId]>=LAB_COMPLETE_THRESHOLD&&!labSignaled[labId]){
        labSignaled[labId]=true;
        window.parent.postMessage({type:'labComplete',courseId:COURSE_ID,moduleId:MODULE_ID,lessonId:labId,exchangeCount:chatExchanges[labId]},'*');
      }
      chatSetLoading(labId,false);
      return;
    }catch(err){
      if(_attempt<1){await new Promise(function(r){setTimeout(r,1500);});continue;}
      _offlineMode[labId]=true;_fallbackIdx[labId]=0;
      chatAppend(labId,'error','\u26a0 AI is temporarily unavailable. Switching to practice mode \u2014 you can still complete this lab.');
      var fb=_fallbackReply(labId);
      chatHistories[labId].push({role:'assistant',content:fb});
      chatAppend(labId,'ai',fb);
      chatExchanges[labId]=(chatExchanges[labId]||0)+1;
      if(chatExchanges[labId]>=LAB_COMPLETE_THRESHOLD&&!labSignaled[labId]){
        labSignaled[labId]=true;
        window.parent.postMessage({type:'labComplete',courseId:COURSE_ID,moduleId:MODULE_ID,lessonId:labId,exchangeCount:chatExchanges[labId]},'*');
      }
    }
  }
  chatSetLoading(labId,false);
}

function chatKeydown(e,labId){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();chatSend(labId);}}
function chatReset(labId){chatHistories[labId]=[];chatExchanges[labId]=0;_offlineMode[labId]=false;_fallbackIdx[labId]=0;document.getElementById('msgs-'+labId).innerHTML='';}
function chatAppend(labId,role,text){var el=document.createElement('div');el.className='chat-msg '+role;el.textContent=text;var msgs=document.getElementById('msgs-'+labId);msgs.appendChild(el);msgs.scrollTop=msgs.scrollHeight;}
function chatSetLoading(labId,on){var btn=document.getElementById('send-'+labId);if(btn)btn.disabled=on;}
```

**Fallback behavior:**
- On first API failure, retries once after 1.5s
- If both attempts fail, switches lab to **practice mode** with generic Socratic responses
- Student sees: "⚠ AI is temporarily unavailable. Switching to practice mode — you can still complete this lab."
- Practice mode responses guide the student through reflection/analysis regardless of topic
- Lab completion still fires at `LAB_COMPLETE_THRESHOLD` exchanges — no student is blocked
- `chatReset()` clears offline mode, allowing a fresh API attempt

---

### 1.8 PostMessage Events

| Event | When | Payload |
|-------|------|---------|
| `lessonComplete` | On navigating away from a lesson page | `{type, courseId, moduleId, lessonId}` |
| `quizComplete` | On correct quiz answer | `{type, courseId, moduleId, lessonId}` |
| `labComplete` | After LAB_COMPLETE_THRESHOLD exchanges | `{type, courseId, moduleId, lessonId, exchangeCount}` |
| `modTestPassed` | Module test score ≥ 70% | `{type, courseId, moduleId}` |

---

### 1.9 Electives QA Checklist

- [ ] `COURSE_ID` matches hub COURSES data id exactly
- [ ] `MODULE_ID` matches hub module id exactly
- [ ] All page IDs present: `p-l1` through `p-l4`, `p-q1` through `p-q4`, `p-lab1` through `p-lab4`, `p-mt`
- [ ] First page has `class="page active"`
- [ ] `PAGE_TO_LESSON` maps all lesson page IDs
- [ ] All `data-page` attributes on tabs match a page `id`
- [ ] Quiz IDs follow format `q{N}-l{N}`
- [ ] Lab IDs follow format `l{N}` for `inp-`, `chat-`, `msgs-`, `send-`
- [ ] `LAB_SYSTEM_PROMPTS` defined for all 4 lab IDs
- [ ] Module test has 15 questions, `mtTotal=15`
- [ ] `mtAnswer()` fires `modTestPassed` postMessage on ≥70%
- [ ] No external `<link>` stylesheets
- [ ] No topbar HTML
- [ ] Server filename: `{course}-m{N}.html`

---

## PART 2 — AI FOUNDATIONS MODULES
### (Modules 1–10, three tiers: Intro / Basic / Advanced)

---

### 2.1 How the Nav Works

The AI Foundations nav (`ai-academy/index.html`) opens module files as **full-page navigation** via `window.location.href`. The URL includes a `?lesson=` parameter:

```
/ai-academy/modules/module-4/intro.html?lesson=m4-l1
```

The lesson file must parse this parameter and jump to the correct page on load. The nav's sidebar is in the nav file — lesson files have their own standalone sidebar.

---

### 2.2 File Naming

```
Local staging:   {tier}-m{N}-v{X}.html
Server name:     {tier}.html  (in /module-N/ directory)
```

| Tier | Local name | Server name |
|------|-----------|-------------|
| Introduction | `intro-m4-v1.html` | `intro.html` |
| Basic | `basic-m4-v1.html` | `basic.html` |
| Advanced | `advanced-m4-v1.html` | `advanced.html` |

**Server path:** `aesop-academy/ai-academy/modules/module-N/`

**Bump version on every delivery. No exceptions.**

---

### 2.3 Tier Configuration

| Tier | Chip | Accent | RGB | GROUP_ID | Modules | Lessons |
|------|------|--------|-----|----------|---------|---------|
| Introduction | ⭐ Introduction | `#fbbf24` | 251,191,36 | 1 | 6 (M1–M6 only) | 4/module |
| Basic | 🔬 Basic | `#c084fc` | 192,132,252 | 2 | 10 | 6/module |
| Advanced | 🎯 Advanced | `#f43f5e` | 244,63,94 | 3 | 10 | 8/module |

Universal values (all tiers):
- Gold: `#f0c040`
- Panel BG: `#0e0e1a`
- Border: `#1e1e2e`
- Text: `#f0eef5`
- Muted: `#6a6a80`
- Page BG: `#080810`

---

### 2.4 Required HTML Structure

```html
<!DOCTYPE html>
<!-- v1.0.0 -->
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{Module Title} — {Tier Label} | AESOP AI Academy Module {N}</title>
<meta name="description" content="{Tier}: {One-sentence description}. Module {N} of the AESOP AI Academy." />
<link rel="canonical" href="https://aesopacademy.org/ai-academy/modules/module-{N}/{tier}.html" />
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Nunito:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  /* Full CSS — see Section 2.6 */
</style>
</head>
<body>
<div class="site-layout">

  <!-- SIDEBAR — use <nav>, not <aside> -->
  <nav class="sidebar">
    <div class="sb-header">
      <a class="sb-back" href="/ai-academy/">← Academy</a>
      <div class="sb-mod-num">Module {N}</div>
      <div class="sb-mod-title">{Module Title}</div>
      <div class="sb-tier-chip">{Emoji} {Tier Label}</div>
    </div>
    <div class="sb-lessons" id="sb-lessons">
      <button class="sb-btn  active" data-page="p-l1" onclick="goPage('p-l1')">
        <span class="sb-icon">📖</span>L1: Lesson Title
      </button>
      <button class="sb-btn sb-sub" data-page="p-l1-quiz" onclick="goPage('p-l1-quiz')">
        <span class="sb-icon">📝</span>Quiz
      </button>
      <button class="sb-btn sb-sub" data-page="p-l1-lab" onclick="goPage('p-l1-lab')">
        <span class="sb-icon">🧪</span>Lab
      </button>
      <div class="sb-div"></div>
      <!-- Repeat for L2, L3, L4 (+ L5/L6 for Basic, + L7/L8 for Advanced) -->
    </div>
    <button class="sb-test" id="sbi-mt" onclick="goPage('p-mt')">📋 Module Test</button>
  </nav>

  <!-- MAIN — use <div>, not <main> -->
  <div class="main">

    <!-- LESSON 1 -->
    <div class="page active" id="p-l1">
      <div class="lesson-hero">
        <div class="age-chip">{Emoji} {Tier Label}</div>
        <h1>Lesson 1: {Title}</h1>
        <p class="tagline">One-sentence framing.</p>
        <p class="lesson-question">{Short reflection question, under 15 words}</p>
      </div>
      <!-- story-scene or case-study -->
      <!-- lesson-section blocks -->
      <!-- section-dividers between sections -->
      <div class="page-nav">
        <a class="pnav-btn primary" href="javascript:void(0)" onclick="goPage('p-l1-quiz')">
          <span class="pnav-arrow">→</span><span class="pnav-label">Take Quiz</span>
        </a>
      </div>
    </div>

    <!-- QUIZ 1 -->
    <div class="page" id="p-l1-quiz">
      <div class="lesson-hero">
        <div class="age-chip">{Emoji} {Tier Label}</div>
        <h1>Quiz 1: {Lesson Title}</h1>
        <p class="tagline">N questions — free, untracked, retake anytime.</p>
      </div>
      <!-- quiz-box elements -->
      <div class="page-nav">
        <a class="pnav-btn" href="javascript:void(0)" onclick="goPage('p-l1')">
          <span class="pnav-arrow">←</span><span class="pnav-label">Back to Lesson</span>
        </a>
        <a class="pnav-btn primary" href="javascript:void(0)" onclick="goPage('p-l1-lab')">
          <span class="pnav-arrow">→</span><span class="pnav-label">Start Lab 1</span>
        </a>
      </div>
    </div>

    <!-- LAB 1 -->
    <div class="page" id="p-l1-lab">
      <div class="lesson-hero">
        <div class="age-chip">{Emoji} {Tier Label}</div>
        <h1>Lab 1: {Lab Title}</h1>
        <p class="tagline">Brief description of lab activity.</p>
      </div>
      <div class="lab-intro">
        <h4>Lab 1 — {Lab Title}</h4>
        <p>Framing paragraph.</p>
        <ol><li>Step 1</li><li>Step 2</li><li>Step 3</li></ol>
        <div class="lab-prompt">{Core prompt or question.}</div>
      </div>
      <div class="lab-chat" id="chat-l1">
        <div class="lab-chat-header">
          <span>{Emoji} AI Guide</span>
          <span class="chat-badge">Lab 1</span>
        </div>
        <div class="chat-msgs" id="msgs-l1"></div>
        <div class="chat-input-row">
          <textarea class="chat-input" id="inp-l1" rows="2" placeholder="Type your response..."
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();chatSend('l1');}"></textarea>
          <button class="chat-send-btn" id="send-l1" onclick="chatSend('l1')">Send</button>
        </div>
      </div>
      <div class="page-nav">
        <a class="pnav-btn" href="javascript:void(0)" onclick="goPage('p-l1-quiz')">
          <span class="pnav-arrow">←</span><span class="pnav-label">Back to Quiz</span>
        </a>
        <a class="pnav-btn primary" href="javascript:void(0)" onclick="goPage('p-l2')">
          <span class="pnav-arrow">→</span><span class="pnav-label">Next: Lesson 2</span>
        </a>
      </div>
    </div>

    <!-- Repeat for L2, Q2, Lab2 etc. -->

    <!-- MODULE TEST — uses .mt-hero, not .lesson-hero -->
    <div class="page" id="p-mt">
      <div class="mt-hero">
        <div class="age-chip">{Emoji} {Tier Label}</div>
        <h1>Module {N} Test</h1>
        <p>N questions covering all lessons. Free, untracked, retake anytime.</p>
      </div>
      <!-- quiz-box elements with ids: mt-q0, mt-q1, mt-q2... -->
      <div class="page-nav">
        <a class="pnav-btn primary" href="/ai-academy/">
          <span class="pnav-arrow">🏠</span><span class="pnav-label">Academy Home</span>
        </a>
      </div>
    </div>

  </div><!-- /.main -->
</div><!-- /.site-layout -->

<script>
/* All JS — see Section 2.7 */
</script>
</body>
</html>
```

**Hard rules:**
- Sidebar: `<nav class="sidebar">` — never `<aside>`
- Main area: `<div class="main">` — never `<main>`
- Sidebar is static HTML — no `buildSidebar()` function
- No starfield / `.stars` elements
- Module test uses `.mt-hero` — not `.lesson-hero`

---

### 2.5 Content Blocks

**Story Scene** (Introduction/Basic)
```html
<div class="story-scene" data-label="STORY">
  <p class="story-text">Narrative text.</p>
</div>
```

**Case Study** (Advanced only)
```html
<div class="story-scene" data-label="CASE STUDY">
  <p class="story-text">Real documented case — no fictional protagonists.</p>
</div>
```

**Lesson Section**
```html
<div class="lesson-section">
  <div class="section-heading">Section Title</div>
  <div class="section-body">
    <p>Body text. <strong>Key term</strong> in bold.</p>
    <ul class="ul-body">
      <li>List item</li>
    </ul>
    <div class="callout-box">
      <div class="callout-label">Label</div>
      <p>Callout content.</p>
    </div>
  </div>
</div>
<div class="section-divider"></div>
```

**Quiz Box**
```html
<div class="quiz-box" id="q0-l1">
  <p class="quiz-q">Question text?</p>
  <div class="quiz-opts">
    <button class="quiz-opt" onclick="answer(this,'wrong','q0-l1')">Option A</button>
    <button class="quiz-opt" onclick="answer(this,'correct','q0-l1')">Correct option</button>
    <button class="quiz-opt" onclick="answer(this,'wrong','q0-l1')">Option C</button>
  </div>
  <div class="quiz-feedback right">✅ Correct feedback.</div>
  <div class="quiz-feedback wrong">❌ Wrong feedback — explain the right answer.</div>
</div>
```

- Lesson quiz IDs: `q0-l1`, `q1-l1` (zero-indexed, lesson-number suffix)
- Module test IDs: `mt-q0`, `mt-q1` (zero-indexed, `mt-` prefix)
- 3–4 options per question
- Feedback order: `.right` first, `.wrong` second — always
- Quiz tagline: `"N questions — free, untracked, retake anytime."` — exact phrasing

---

### 2.6 Complete CSS Block

Replace `{ACCENT_HEX}` and `{ACCENT_RGB}` with values from Section 2.3.

```css
:root{--bg:#080810;--panel:#0e0e1a;--border:#1e1e2e;--accent:{ACCENT_HEX};--gold:#f0c040;--text:#f0eef5;--muted:#6a6a80;}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--text);font-family:'Nunito',sans-serif;min-height:100vh;}
.site-layout{display:flex;flex-direction:row;min-height:100vh;}
.sidebar{background:#0a0a14;border-right:1px solid var(--border);position:sticky;top:0;height:100vh;overflow-y:auto;display:flex;flex-direction:column;width:260px;flex-shrink:0;}
.sidebar::-webkit-scrollbar{width:4px;}
.sidebar::-webkit-scrollbar-thumb{background:rgba({ACCENT_RGB},0.2);border-radius:2px;}
.sb-header{padding:14px 16px 10px;border-bottom:1px solid var(--border);}
.sb-back{display:flex;align-items:center;gap:6px;color:var(--accent);font-size:1.2rem;font-weight:700;text-decoration:none;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px;}
.sb-back:hover{opacity:0.8;}
.sb-mod-num{font-family:'Cinzel',serif;font-size:1.05rem;color:var(--muted);letter-spacing:0.12em;margin-bottom:2px;}
.sb-mod-title{font-family:'Cinzel',serif;font-size:1.35rem;font-weight:700;color:var(--gold);margin-bottom:6px;}
.sb-tier-chip{display:inline-flex;align-items:center;gap:5px;font-size:1.05rem;font-weight:700;color:var(--accent);background:rgba({ACCENT_RGB},0.1);border:1px solid rgba({ACCENT_RGB},0.25);border-radius:20px;padding:3px 10px;}
.sb-lessons{flex:1;padding:10px 8px;}
.sb-btn{display:flex;align-items:center;gap:8px;width:100%;background:transparent;border:none;padding:8px 10px;border-radius:8px;cursor:pointer;text-align:left;font-family:'Nunito',sans-serif;font-size:1.2rem;font-weight:700;color:var(--muted);transition:all 0.15s;margin-bottom:2px;}
.sb-btn:hover{background:rgba({ACCENT_RGB},0.07);color:var(--text);}
.sb-btn.active{background:rgba({ACCENT_RGB},0.13);color:var(--accent);}
.sb-icon{font-size:1.2rem;flex-shrink:0;}
.sb-sub{padding-left:28px;font-size:1.08rem;font-weight:600;}
.sb-div{height:1px;background:var(--border);margin:6px 8px;}
.sb-test{margin:8px;padding:10px 14px;background:rgba(240,192,64,0.07);border:1px solid rgba(240,192,64,0.2);border-radius:10px;font-family:'Cinzel',serif;font-size:1.1rem;font-weight:700;color:var(--gold);cursor:pointer;text-align:left;transition:all 0.15s;}
.sb-test:hover{background:rgba(240,192,64,0.13);}
.sb-test.active{background:rgba(240,192,64,0.18);}
.main{flex:1;overflow-y:auto;}
.page{display:none;}
.page.active{display:block;animation:fadeIn 0.25s ease;}
@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.lesson-hero{padding:40px 40px 28px;border-bottom:1px solid var(--border);}
.age-chip{display:inline-flex;align-items:center;gap:6px;font-size:1.1rem;font-weight:800;color:var(--accent);background:rgba({ACCENT_RGB},0.1);border:1px solid rgba({ACCENT_RGB},0.25);border-radius:20px;padding:4px 12px;margin-bottom:14px;}
.lesson-hero h1{font-family:'Cinzel',serif;font-size:2.8rem;font-weight:900;color:var(--text);line-height:1.2;margin-bottom:10px;}
.lesson-hero .tagline{font-size:1.45rem;color:var(--muted);line-height:1.7;max-width:680px;}
.sb-question{padding:10px 16px 8px;font-size:1.05rem;font-style:italic;color:var(--gold);line-height:1.5;border-top:1px solid var(--border);margin-top:6px;}
.lesson-question{font-size:1.25rem;font-weight:700;font-style:italic;color:var(--gold);margin-top:12px;line-height:1.6;max-width:680px;}
.mt-hero{padding:40px 40px 24px;border-bottom:1px solid var(--border);}
.mt-hero h1{font-family:'Cinzel',serif;font-size:2.6rem;font-weight:900;color:var(--gold);margin-bottom:10px;}
.mt-hero p{font-size:1.4rem;color:var(--muted);}
.story-scene{background:rgba({ACCENT_RGB},0.04);border-left:3px solid var(--accent);border-radius:0 12px 12px 0;padding:24px 36px;margin:36px 40px;position:relative;}
.story-scene[data-label]::before{content:attr(data-label);position:absolute;top:-12px;left:24px;background:var(--panel);padding:0 12px;font-size:1.02rem;font-weight:800;letter-spacing:0.2em;color:var(--accent);border:1px solid var(--accent);border-radius:10px;}
.story-text{font-size:1.53rem;line-height:1.95;color:var(--text);}
.story-text+.story-text{margin-top:16px;}
.lesson-section{margin:0 0 48px;padding:0 40px;}
.section-heading{font-family:'Cinzel',serif;font-size:1.8rem;font-weight:700;color:var(--accent);margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid var(--border);}
.section-body{font-size:1.5rem;line-height:1.95;color:var(--text);}
.section-body p+p{margin-top:22px;}
.section-divider{height:1px;background:var(--border);margin:0 40px 48px;}
.callout-box{background:rgba({ACCENT_RGB},0.06);border:1px solid rgba({ACCENT_RGB},0.2);border-radius:12px;padding:20px 24px;margin:20px 0;}
.callout-label{font-family:'Cinzel',serif;font-size:1.05rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--accent);margin-bottom:8px;}
.callout-box p{font-size:1.38rem;line-height:1.8;color:var(--text);}
.ul-body{list-style:none;padding:0;margin:16px 0;}
.ul-body li{font-size:1.45rem;line-height:1.85;color:var(--text);padding:6px 0 6px 20px;position:relative;}
.ul-body li::before{content:"\25B8";position:absolute;left:0;color:var(--accent);}
.page-nav{display:flex;justify-content:space-between;align-items:center;padding:28px 40px 40px;border-top:1px solid var(--border);margin-top:40px;gap:16px;}
.pnav-btn{display:flex;flex-direction:column;align-items:center;gap:3px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:12px 24px;cursor:pointer;text-decoration:none;color:var(--muted);transition:all 0.15s;font-family:'Nunito',sans-serif;}
.pnav-btn:hover{border-color:var(--accent);color:var(--accent);}
.pnav-btn.primary{background:rgba({ACCENT_RGB},0.1);border-color:var(--accent);color:var(--accent);}
.pnav-arrow{font-size:2.1rem;line-height:1;}
.pnav-label{font-size:1.08rem;opacity:0.7;}
.quiz-box{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:24px 28px;margin:24px 40px;}
.quiz-q{font-size:1.5rem;font-weight:700;line-height:1.6;margin-bottom:18px;color:var(--text);}
.quiz-opts{display:flex;flex-direction:column;gap:10px;}
.quiz-opt{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:12px 18px;font-size:1.38rem;font-family:'Nunito',sans-serif;color:var(--text);cursor:pointer;text-align:left;transition:all 0.15s;}
.quiz-opt:hover{border-color:var(--accent);background:rgba({ACCENT_RGB},0.07);}
.quiz-opt:disabled{cursor:default;}
.quiz-feedback{display:none;margin-top:12px;padding:12px 16px;border-radius:10px;font-size:1.3rem;line-height:1.6;}
.quiz-feedback.right{display:block;background:rgba(110,231,183,0.1);border:1px solid rgba(110,231,183,0.3);color:#6ee7b7;}
.quiz-feedback.wrong{display:block;background:rgba(244,114,182,0.1);border:1px solid rgba(244,114,182,0.3);color:#f472b6;}
.lab-intro{padding:24px 40px 0;}
.lab-intro h4{font-family:'Cinzel',serif;font-size:1.65rem;color:white;margin-bottom:14px;}
.lab-intro p{font-size:1.425rem;line-height:1.8;margin-bottom:12px;}
.lab-intro ol{padding-left:1.6rem;margin:12px 0;}
.lab-intro ol li{font-size:1.425rem;line-height:1.8;margin-bottom:12px;}
.lab-prompt{background:rgba({ACCENT_RGB},0.08);border:1px solid rgba({ACCENT_RGB},0.2);border-radius:10px;padding:16px 20px;margin:16px 0 24px;font-size:1.35rem;font-style:italic;color:var(--accent);line-height:1.7;}
.lab-chat{background:rgba({ACCENT_RGB},0.03);border:1.5px solid rgba({ACCENT_RGB},0.15);border-radius:14px;margin:0 40px 24px;overflow:hidden;}
.lab-chat-header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:rgba({ACCENT_RGB},0.07);border-bottom:1px solid rgba({ACCENT_RGB},0.15);font-size:1.2rem;font-weight:700;}
.chat-badge{font-size:1.02rem;background:rgba({ACCENT_RGB},0.15);padding:3px 10px;border-radius:20px;color:var(--accent);}
.chat-msgs{height:240px;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;}
.chat-bubble{max-width:85%;padding:10px 15px;border-radius:10px;font-size:1.3rem;line-height:1.65;}
.chat-bubble.ai{background:rgba({ACCENT_RGB},0.09);border:1px solid rgba({ACCENT_RGB},0.18);align-self:flex-start;}
.chat-bubble.user{background:rgba(96,165,250,0.09);border:1px solid rgba(96,165,250,0.2);align-self:flex-end;}
.chat-bubble.thinking{color:var(--muted);font-style:italic;align-self:flex-start;}
.chat-input-row{display:flex;gap:10px;padding:12px 16px;border-top:1px solid rgba({ACCENT_RGB},0.1);}
.chat-input{flex:1;background:rgba(10,10,20,0.8);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:1.3rem;color:var(--text);font-family:'Nunito',sans-serif;resize:none;}
.chat-input:focus{outline:none;border-color:var(--accent);}
.chat-send-btn{background:var(--accent);color:#0a0a14;border:none;border-radius:8px;padding:10px 20px;font-size:1.2rem;font-weight:800;font-family:'Nunito',sans-serif;cursor:pointer;}
.chat-send-btn:hover{opacity:0.85;}
.chat-send-btn:disabled{opacity:0.4;cursor:not-allowed;}
```

---

### 2.7 JavaScript Block

One `<script>` block at the bottom of the file.

```javascript
// v1.0.0
const GROUP_ID = 1;  // 1=intro  2=basic  3=advanced

const ACADEMY_GUARDRAIL = `You are operating within the AESOP AI Academy. Your role is strictly scoped to the topic of this lab. If the student asks about anything outside this topic, warmly redirect.`;

const LAB_PROMPTS = {
  l1: `${ACADEMY_GUARDRAIL}\n\nIntro-tier, Module {N} Lab 1: {Title}. [Full prompt. Open immediately with: "{Opening question}"]`,
  l2: `${ACADEMY_GUARDRAIL}\n\n...`,
  // one per lab in this file
};

let currentPage = 'p-l1';
const lessonSignaled = {}, quizSignaled = {}, labSignaled = {};

function goPage(id) {
  document.getElementById(currentPage).classList.remove('active');
  const next = document.getElementById(id);
  if (!next) return;
  next.classList.add('active');
  currentPage = id;
  updateSidebar();
  // Lab auto-open
  const labMatch = id.match(/^p-(l\d+)-lab$/);
  if (labMatch) initLab(labMatch[1]);
  // Lesson complete signal
  const lessonMatch = id.match(/^p-(l\d+)$/);
  if (lessonMatch) {
    const lid = 'm{N}-' + lessonMatch[1];
    if (!lessonSignaled[lid]) {
      lessonSignaled[lid] = true;
      window.parent.postMessage({ type: 'lessonComplete', lessonId: lid, groupId: GROUP_ID }, '*');
    }
  }
  window.scrollTo(0, 0);
}

function updateSidebar() {
  document.querySelectorAll('#sb-lessons .sb-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.page === currentPage)
  );
  document.getElementById('sbi-mt').classList.toggle('active', currentPage === 'p-mt');
}

function answer(btn, result, qId) {
  const box = document.getElementById(qId);
  if (!box) return;
  box.querySelectorAll('.quiz-opt').forEach(b => { b.disabled = true; });
  btn.style.background = result === 'correct' ? 'rgba(110,231,183,0.2)' : 'rgba(244,114,182,0.2)';
  btn.style.borderColor = result === 'correct' ? '#6ee7b7' : '#f472b6';
  btn.style.color = result === 'correct' ? '#6ee7b7' : '#f472b6';
  const fb = box.querySelectorAll('.quiz-feedback');
  fb[0].style.display = result === 'correct' ? 'block' : 'none';
  fb[1].style.display = result === 'wrong' ? 'block' : 'none';
  if (result === 'correct') {
    const lNum = qId.match(/-(l\d+|mt)/)?.[1];
    window.parent.postMessage({ type: 'quizComplete', lessonId: 'm{N}-' + (lNum||'mt'), groupId: GROUP_ID, score: 1, total: 1 }, '*');
  }
}

let chatHistories = {}, chatExchanges = {};
const LAB_THRESHOLD = 3;

/* ── Offline fallback system ──────────────────────────────────────── */
var _offlineMode={};
var _fallbackIdx={};
var LAB_FALLBACK=[
  "That's a thoughtful response. Can you build on that? What specific examples or evidence come to mind that support your thinking?",
  "Good point. Now let's look at it from another angle — what challenges or counterarguments might someone raise? How would you address them?",
  "You're doing well with this. Think about the bigger picture: what are the practical, real-world implications of what you've described?",
  "Great work engaging with this topic. As a final reflection: what's your key takeaway from this conversation, and how does it connect to the lesson material?"
];
function _fallbackReply(labId){var i=_fallbackIdx[labId]||0;var r=LAB_FALLBACK[Math.min(i,LAB_FALLBACK.length-1)];_fallbackIdx[labId]=i+1;return r;}
/* ── End fallback system ──────────────────────────────────────────── */

function initLab(labId) {
  if (chatHistories[labId]) return;
  chatHistories[labId] = [];
  chatExchanges[labId] = 0;
  sendOpener(labId);
}

async function sendOpener(labId) {
  const btn = document.getElementById('send-' + labId);
  if (btn) btn.disabled = true;
  for (var _attempt = 0; _attempt < 2; _attempt++) {
    try {
      const res = await fetch('https://playagame.ai/claude-proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: LAB_PROMPTS[labId],
          messages: [{ role: 'user', content: '[Begin immediately with your opening question.]' }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || 'Connection error.';
      chatHistories[labId].push({ role: 'assistant', content: text });
      addMsg(labId, 'ai', text);
      if (btn) btn.disabled = false;
      return;
    } catch(e) {
      if (_attempt < 1) { await new Promise(r => setTimeout(r, 1500)); continue; }
      _offlineMode[labId] = true; _fallbackIdx[labId] = 0;
      addMsg(labId, 'error', '\u26a0 AI is temporarily unavailable. Switching to practice mode \u2014 you can still complete this lab.');
      var fb = "Welcome to practice mode! Share your thoughts on this topic, and I'll guide you through the key questions for this lab.";
      chatHistories[labId].push({ role: 'assistant', content: fb });
      addMsg(labId, 'ai', fb);
    }
  }
  if (btn) btn.disabled = false;
}

async function chatSend(labId) {
  const inp = document.getElementById('inp-' + labId);
  const btn = document.getElementById('send-' + labId);
  if (!inp || !btn) return;
  const txt = inp.value.trim();
  if (!txt) return;
  inp.value = '';
  btn.disabled = true;
  if (!chatHistories[labId]) { chatHistories[labId] = []; chatExchanges[labId] = 0; }
  chatHistories[labId].push({ role: 'user', content: txt });
  addMsg(labId, 'user', txt);
  /* Offline mode — use fallback immediately */
  if (_offlineMode[labId]) {
    var reply = _fallbackReply(labId);
    chatHistories[labId].push({ role: 'assistant', content: reply });
    addMsg(labId, 'ai', reply);
    chatExchanges[labId]++;
    if (chatExchanges[labId] >= LAB_THRESHOLD && !labSignaled[labId]) {
      labSignaled[labId] = true;
      window.parent.postMessage({ type: 'labComplete', lessonId: 'm{N}-' + labId, groupId: GROUP_ID, exchangeCount: chatExchanges[labId] }, '*');
    }
    btn.disabled = false; inp.focus();
    return;
  }
  const thinking = addMsg(labId, 'thinking', 'Thinking...');
  for (var _attempt = 0; _attempt < 2; _attempt++) {
    try {
      const res = await fetch('https://playagame.ai/claude-proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: LAB_PROMPTS[labId],
          messages: chatHistories[labId]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || 'Error.';
      chatHistories[labId].push({ role: 'assistant', content: text });
      thinking.remove();
      addMsg(labId, 'ai', text);
      chatExchanges[labId]++;
      if (chatExchanges[labId] >= LAB_THRESHOLD && !labSignaled[labId]) {
        labSignaled[labId] = true;
        window.parent.postMessage({ type: 'labComplete', lessonId: 'm{N}-' + labId, groupId: GROUP_ID, exchangeCount: chatExchanges[labId] }, '*');
      }
      btn.disabled = false; inp.focus();
      return;
    } catch(e) {
      if (_attempt < 1) { await new Promise(r => setTimeout(r, 1500)); continue; }
      thinking.remove();
      _offlineMode[labId] = true; _fallbackIdx[labId] = 0;
      addMsg(labId, 'error', '\u26a0 AI is temporarily unavailable. Switching to practice mode \u2014 you can still complete this lab.');
      var fb = _fallbackReply(labId);
      chatHistories[labId].push({ role: 'assistant', content: fb });
      addMsg(labId, 'ai', fb);
      chatExchanges[labId]++;
      if (chatExchanges[labId] >= LAB_THRESHOLD && !labSignaled[labId]) {
        labSignaled[labId] = true;
        window.parent.postMessage({ type: 'labComplete', lessonId: 'm{N}-' + labId, groupId: GROUP_ID, exchangeCount: chatExchanges[labId] }, '*');
      }
    }
  }
  btn.disabled = false; inp.focus();
}

function addMsg(labId, role, text) {
  const msgs = document.getElementById('msgs-' + labId);
  if (!msgs) return null;
  const el = document.createElement('div');
  el.className = 'chat-bubble ' + role;
  el.textContent = text;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
  return el;
}

// REQUIRED: Parse ?lesson= URL param and deep-link to correct page on load
(function() {
  var params = new URLSearchParams(window.location.search);
  var lp = params.get('lesson') || window.location.hash.replace('#', '');
  if (lp) {
    var map = {
      'm{N}-l1': 'p-l1', 'm{N}-l2': 'p-l2', 'm{N}-l3': 'p-l3', 'm{N}-l4': 'p-l4',
      // Add m{N}-l5 through m{N}-l8 for Basic/Advanced
      'm{N}-test': 'p-mt'
    };
    if (map[lp]) goPage(map[lp]);
  }
})();
```

**Non-negotiable constants:**
- Proxy: `https://playagame.ai/claude-proxy.php` — never change, never variablize
- Model: `claude-sonnet-4-20250514` — never change
- max_tokens: `400` for lab responses

---

### 2.8 Narrative Density (Mandatory)

| Tier | Density | Pattern |
|------|---------|---------|
| Introduction | ~80% narrative | Story scenes introduce every concept. Named characters (Jordan + LIBREX or module cast). Story must create the problem before the concept is named. |
| Basic | ~50% narrative | Story frames each concept as a question the protagonist is wrestling with. Technical sections tied back to story situation. |
| Advanced | ~20% narrative | Real documented case opens each lesson. No fictional protagonist. Case referenced throughout. History = decisions and consequences, not timelines. |

**Rules:**
1. Story must create the problem the concept solves — never explain then illustrate
2. Protagonist lands insights themselves — teacher doesn't explain everything
3. Advanced must use real, documented events — no hypotheticals
4. Story closes each lesson as well as opens it (Basic/Advanced)

**Anti-patterns:**
- ❌ Opening with a definition, then illustrating with a story
- ❌ Protagonist who passively receives information
- ❌ History section that lists years without connecting to present decisions
- ❌ Advanced scenarios that are invented

---

### 2.9 Lab Prompt Rules

- AI opens immediately with a question — never a greeting (`sendOpener()` fires before student types)
- `ACADEMY_GUARDRAIL` defined once as a constant, prepended via template literal in `LAB_PROMPTS` — never duplicated inside individual entries
- Introduction: warm, open questions, 3 exchanges, celebrate progress
- Basic: analytical, lead toward synthesis, push for precision
- Advanced: rigorous peer-level, no simplification, real stakes

**Lab prompt structure:**
```
${ACADEMY_GUARDRAIL}\n\n
{Tier}-tier, Module {N} Lab {N}: {Title}.
Open immediately: "{Exact opening question}"
[3-exchange arc instructions.]
```

---

### 2.9b Guiding Questions (Mandatory for Non-English Modules)

Every non-English module must include two types of guiding questions:

**Module-level question (sidebar):**
Place a `<div class="sb-question">` after the `sb-tier-chip` in the sidebar header. This is a single overarching question that frames the entire module's theme. Keep it under 15 words.

```html
<div class="sb-tier-chip">🎯 Advanced</div>
<div class="sb-question">What can AI do and what can't it do?</div>
```

**Lesson-level question (lesson hero):**
Place a `<p class="lesson-question">` after the tagline in each lesson-hero. One short, focused reflection question per lesson — under 15 words, one concept only.

```html
<p class="tagline">One-sentence framing.</p>
<p class="lesson-question">Is an AI assistant really intelligent?</p>
```

**Question design rules:**
- Under 15 words
- One single concept per question
- Direct and immediately understandable
- Provokes thought without being compound or convoluted
- BAD: "Why do you think it's fundamental that people understand AI works the same way in both cases but we must treat it differently?"
- GOOD: "Can a machine learn just by seeing examples?"

---

### 2.10 Foundations QA Checklist

- [ ] Version comment at top updated: `<!-- v{X}.{Y}.{Z} -->`
- [ ] File named correctly: `{tier}-m{N}-v{X}.html`
- [ ] `<title>` includes module title, tier label, module number
- [ ] `<meta name="description">` present
- [ ] `<link rel="canonical">` points to correct live URL
- [ ] `GROUP_ID` correct: 1=intro, 2=basic, 3=advanced
- [ ] Accent colors correct for this tier (both hex and RGB)
- [ ] Sidebar is static HTML — no `buildSidebar()`
- [ ] Every sidebar button has `data-page="{id}"`
- [ ] `<div class="sb-div">` dividers between each lesson group
- [ ] `sb-test` button outside `sb-lessons`, `id="sbi-mt"`
- [ ] Module test uses `.mt-hero` not `.lesson-hero`
- [ ] Module test quiz IDs: `mt-q0`, `mt-q1`...
- [ ] Lesson quiz IDs: `q0-l1`, `q1-l1`... (zero-indexed)
- [ ] Quiz feedback order: `.right` first, `.wrong` second — every quiz-box
- [ ] No `max-width` on `.lesson-section`, `.story-scene`, `.quiz-box`, `.lab-chat`
- [ ] Single `<script>` block only
- [ ] `ACADEMY_GUARDRAIL` defined once as a constant
- [ ] `LAB_PROMPTS` keys are `l1`, `l2`... (not `m4-l1`)
- [ ] Each `LAB_PROMPTS` entry begins with `${ACADEMY_GUARDRAIL}\n\n`
- [ ] `initLab()` called via regex match in `goPage()` — not manually
- [ ] `sendOpener()` exists and fires on `initLab()`
- [ ] `lessonComplete` fires on ARRIVAL at lesson page (not departure)
- [ ] `labComplete` fires at threshold 3, `labSignaled` key is short `labId`
- [ ] **`?lesson=` startup handler present** — bottom of script block
- [ ] `LESSON_MAP` covers all lesson IDs plus `m{N}-test`
- [ ] Proxy URL is `https://playagame.ai/claude-proxy.php`
- [ ] Model is `claude-sonnet-4-20250514`
- [ ] (Non-English) `sb-question` div present in sidebar header after `sb-tier-chip`
- [ ] (Non-English) `lesson-question` paragraph present in every lesson-hero after tagline
- [ ] All guiding questions are under 15 words and focus on a single concept
- [ ] Back link points to `/ai-academy/`
- [ ] `<nav class="sidebar">` — not `<aside>`
- [ ] `<div class="main">` — not `<main>`
- [ ] No starfield / `.stars` elements
- [ ] Writing voice correct for tier
- [ ] `data-label="STORY"` (intro/basic) or `data-label="CASE STUDY"` (advanced)
- [ ] Narrative density matches tier standard

---

## PART 3 — SHARED RULES (BOTH SYSTEMS)

### Content rules — what every lesson page must have
- At least one story scene or case study opening
- At least 2 lesson sections with headings
- At least 1 callout box
- Section divider between every section (not after the last)
- Page-nav with correct targets

### Content rules — what every quiz page must have
- Lesson hero / quiz hero with tier chip
- At least 2 quiz boxes (more for Basic/Advanced)
- Each question: 3–4 options, one correct, feedback in right/wrong order
- Tagline: `"N questions — free, untracked, retake anytime."`

### Content rules — what every lab page must have
- Lab intro with instructions and a prompt
- Lab chat panel with all required IDs
- Page-nav to next destination

### Course registration — DO NOT run reconcile_all.py locally

**Never run `.github/scripts/reconcile_all.py` (or `--apply`) from a local Claude Code session.** The `register-courses.yml` GitHub Actions workflow runs it automatically on every push that touches `ai-academy/modules/**/*.html`. Running it locally creates uncommitted changes to `courses.html`, `course-registry.json`, `dashboard.html`, and `stats.json` that race with the GitHub Actions commit, causing recurring merge conflicts in GitHub Desktop.

**The correct workflow:** write the module file → commit → push → GitHub Actions handles all registry/surface updates automatically.

---

### Universal don'ts
- No `max-width` on content sections, story scenes, quiz boxes, or lab chats
- No standalone textarea write-in fields (all student writing through AI chat)
- No `ACADEMY_GUARDRAIL` duplicated inside individual `LAB_PROMPTS` entries
- No multiple `<script>` blocks
- No starfield elements in either system

### Link paths
| Destination | Path |
|-------------|------|
| Back to AI Foundations | `/ai-academy/` |
| Back to All Courses (Electives) | `/ai-academy/courses.html` |
| Module N lessons | `/ai-academy/modules/module-N/` |
| AI Governance modules | `/ai-academy/modules/ai-governance/` |

### Cross-domain rule
`aesopacademy.org` and `playagame.ai` are separate deployments on the same host. Always use full `https://` URLs when linking between them. Never relative paths across domains.

### Copyright
`© [year] AESOP AI Academy — All rights reserved.`
No PlayAGame.ai references visible anywhere on aesopacademy.org.

---

---

## PART 4 — V2.0 MODULES
### (ai-ethics-decision-making, building-with-ai, building-ai-agents-use-cases, and all future v2 courses)

> V2.0 is a structural overhaul. These modules are standalone full HTML pages — not hub fragments. They live in `ai-academy/modules/v2/{course-slug}/`. The v1 systems (Parts 1–2) remain unchanged for existing courses.

---

### 4.1 V2 Philosophy

V2 exists because v1 built how education used to be delivered. V2 builds how it needs to be delivered now.

| Dimension | V1 | V2 |
|-----------|----|----|
| Structure | 4 lessons + quizzes + labs per module | Intro → Scenario → Lesson → Context → Lab |
| Assessment | Module test (quiz) | Lab IS the assessment — no quiz |
| Lab role | Practice exercise at the end | Destination the whole module builds toward |
| Text volume | Long-form narrative | 60% reduction — reading earns its place |
| Learner outcome | Completion record | Portfolio artifact — something produced and owned |
| Lab duration | Short (3–5 exchanges) | 15–30 minutes, substantive |

**The core promise:** Learners don't leave with a certificate. They leave with a portfolio of decisions made and defended, skills built and used, and content and tools they developed.

---

### 4.2 Course Structure

Every v2 course has **8 modules**:

| Lab Type | Count | Purpose |
|----------|-------|---------|
| Debate | 2 | Argue and defend a position under challenge |
| Skill | 3 | Learn and apply one discrete, repeatable capability |
| Build | 3 | Use the skills to produce a real artifact with ethics/governance pressure |

**Total course time:** ~3.5–5 hours (5–8 min reading + 15–30 min lab × 8 modules)

---

### 4.3 Module Structure

Every module follows this exact tab order:

```
Intro → Scenario → Lesson → Context → Lab
```

| Section | Purpose | Target Length |
|---------|---------|---------------|
| **Intro** | Narrative opening + learning outcomes + portfolio artifact named | ~200 words |
| **Scenario** | Real-world situation that creates the problem the lesson solves | ~350 words |
| **Lesson** | The one thing the learner is learning — stated plainly | ~300 words |
| **Context** | Just enough background to not be lost in the lab | ~250 words |
| **Lab** | 15–30 min hands-on work producing a named artifact | — |
| **Total reading** | | ~1,100 words / 5–6 min |

**No quiz. No module test.** The lab is the assessment.

---

### 4.4 Intro Page Requirements

The Intro must contain three elements in order:

1. **Narrative opening** — 2–3 paragraphs in AESOP voice. Sets up why this module matters. Does NOT explain what the lesson is — that's the Scenario's job.

2. **Learning outcomes** — `<ul class="outcomes-list">` with 4–6 bullets. Each bullet is a capability the learner will have by the end, written as "You will [verb] [specific thing]." Not vague. Testable.

3. **Portfolio artifact statement** — One sentence naming what the learner will add to their portfolio. Format:
   ```html
   <div class="portfolio-artifact">
     <span class="pa-label">Portfolio artifact</span>
     <span class="pa-type">[Debate / Skill / Build]</span>
     <span class="pa-desc">[Specific thing the learner will produce]</span>
   </div>
   ```

**Example portfolio artifact statements by type:**
- **Debate:** "A written defense of your deployment position across three AI scenarios, showing how your reasoning held or evolved under pressure."
- **Skill:** "A completed bias audit checklist applied to a real AI decision output, with a one-paragraph recommendation."
- **Build:** "A one-page AI Ethics Policy with each clause specific enough to enforce."

---

### 4.5 Scenario Page Requirements

- Opens with a real or plausible situation — not a definition, not an abstract concept
- The situation must create the problem that the Lesson resolves
- Written in narrative present tense, AESOP voice
- No fictional named protagonists (use "a hospital," "a manager," "an engineer")
- Ends with the Continue button: "Continue to Lesson →"

---

### 4.6 Lesson Page Requirements

- Leads with the ONE thing the learner is learning — stated in the first paragraph
- No more than two or three key sub-points
- Uses real documented examples, not hypotheticals
- Dividers (`<div class="read-divider">`) between sub-sections
- Ends with: "Continue to Context →"

---

### 4.7 Context Page Requirements

- Three questions, three frameworks, or three distinctions — never more
- Each point is immediately applicable to the lab
- Closes with a sentence that explicitly hands off to the lab: "You'll apply all three in the lab."
- Ends with: "Enter the Lab →"

---

### 4.8 Lab Page Requirements

**Layout:** Two-pane. Left brief (38%), right chat workspace (62%).

**Lab Brief (left pane) must contain:**
- Lab type badge: `DEBATE`, `SKILL`, or `BUILD` with distinct color per type
- Duration estimate
- Role cards: learner's role + AI's role, both specific
- Scenario/round tracker (pips or numbered list)
- Framework reminder from Context — the 2–3 key questions they'll apply
- "How to complete" — what counts as done

**Chat workspace (right pane) must contain:**
- Message area (fills viewport height — `flex:1`, `overflow-y:auto`)
- Compose textarea: `min-height: 72px` — a real compose box, not a search field
- Send button at right of compose row
- "Shift + Enter for new line" hint

**Lab opening:** The AI sends the first message automatically when the lab tab is clicked (`labStarted` flag pattern). Never wait for the learner to type first.

**Lab completion:**
- `LAB_COMPLETE_THRESHOLD` = 6 for debate labs, 5 for skill labs, 4 for build labs
- `labComplete` postMessage must include `artifactType` and `artifactDesc`:
  ```javascript
  window.parent.postMessage({
    type: 'labComplete',
    courseId: COURSE_ID,
    moduleId: MODULE_ID,
    labId: 'lab',
    exchangeCount: chatExchanges,
    artifactType: 'debate',   // 'debate' | 'skill' | 'build'
    artifactDesc: 'Written defense of deployment position across 3 AI scenarios'
  }, '*');
  ```

**Lab type colors:**
| Type | Color | RGB |
|------|-------|-----|
| Debate | `#f43f5e` | 244,63,94 |
| Skill | `#2ba898` | 43,168,152 |
| Build | `#9a5fb0` | 154,95,176 |

---

### 4.9 File Structure

```
ai-academy/modules/v2/
  {course-slug}/
    m1.html
    m2.html
    ...
    m8.html
```

**Course slugs:**
| Course | Slug | COURSE_ID |
|--------|------|-----------|
| AI Ethics & Decision Making | `ai-ethics-decision-making` | `ai-ethics-decision-making-v2` |
| Building with AI | `building-with-ai` | `building-with-ai-v2` |
| Building AI Agents: Use Cases | `building-ai-agents-use-cases` | `building-ai-agents-use-cases-v2` |

**File naming:** `m{N}.html` on server. No versioned filenames for v2 — version tracked in HTML comment only.

---

### 4.10 Required Script Variables

```javascript
var COURSE_ID = '{course-id}-v2';
var MODULE_ID = 'm{N}';
var MODULE_NUM = {N};          // integer
var LAB_TYPE = 'debate';       // 'debate' | 'skill' | 'build'
var ARTIFACT_DESC = '...';     // one sentence describing what the learner produced
var PROXY_URL = '/aesop-api/proxy.php';
var LAB_COMPLETE_THRESHOLD = 6; // 6=debate, 5=skill, 4=build
```

**Model for v2 labs:** `claude-haiku-4-5-20251001` (cost-efficient for frequent interactive exchanges)

---

### 4.11 V2 QA Checklist

- [ ] Tab order: Intro → Scenario → Lesson → Context → Lab
- [ ] Intro contains: narrative, outcomes list, portfolio artifact statement
- [ ] Portfolio artifact statement includes type and specific description
- [ ] Scenario opens with a situation, not a definition
- [ ] Lesson leads with the one key insight in the first paragraph
- [ ] Context closes with explicit handoff to lab
- [ ] Lab brief: type badge, duration, role cards, tracker, framework reminder
- [ ] Chat compose textarea `min-height: 72px`
- [ ] Lab opening message fires automatically on tab click (`labStarted` flag)
- [ ] `labComplete` postMessage includes `artifactType` and `artifactDesc`
- [ ] `LAB_COMPLETE_THRESHOLD` matches lab type (6/5/4)
- [ ] Model: `claude-haiku-4-5-20251001`
- [ ] Total reading ~1,100 words (Intro+Scenario+Lesson+Context combined)
- [ ] No quiz, no module test
- [ ] Light mode CSS overrides present (`[data-theme="light"]`)
- [ ] Mobile responsive: lab panes stack vertically at ≤820px
- [ ] Version comment updated: `<!-- v2.X.X | YYYY-MM-DD -->`
- [ ] `COURSE_ID` ends in `-v2`
- [ ] Back link points to `/ai-academy/courses-v2.html`

---

*AESOP-MODULE-BUILD-STANDARDS.md v3.0.0 — Added Part 4: V2.0 Module Standards. May 2026.*
