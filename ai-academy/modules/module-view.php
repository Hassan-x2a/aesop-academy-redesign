<?php
/**
 * AESOP AI Academy — Standalone Module Viewer
 * Serves elective module fragments as full crawlable HTML pages.
 *
 * Clean URL: /ai-academy/modules/{folder}/{folder}-m{N}.html
 * This file wraps the fragment with proper <html>, <head>, meta tags, CSS, JS.
 *
 * Query params:
 *   ?course={folder-name}&module={N}
 *
 * Rewrite rule (in .htaccess):
 *   /courses/{folder}/m{N}  ->  module-view.php?course={folder}&module={N}
 */

// ── No-cache headers — module content updates frequently ──
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// ── Parse request ──────────────────────────────────────────
$course = preg_replace('/[^a-z0-9_-]/i', '', $_GET['course'] ?? '');
$module = (int)($_GET['module'] ?? 0);

if (!$course || $module < 1) {
    http_response_code(404);
    echo '<!DOCTYPE html><html><head><title>Not Found — AESOP AI Academy</title></head><body><h1>404 — Module not found</h1><p><a href="/ai-academy/">Return to AI Academy</a></p></body></html>';
    exit;
}

// ── Resolve folder (handle underscore/hyphen mismatch) ─────
$base = __DIR__;
$folder = $course;
$fragmentDir = "$base/$folder";

if (!is_dir($fragmentDir)) {
    // Try swapping underscores to hyphens
    $alt = str_replace('_', '-', $folder);
    $altDir = "$base/$alt";
    if (is_dir($altDir)) {
        $folder = $alt;
        $fragmentDir = $altDir;
    } else {
        http_response_code(404);
        echo '<!DOCTYPE html><html><head><title>Not Found — AESOP AI Academy</title></head><body><h1>404 — Course not found</h1><p><a href="/ai-academy/">Return to AI Academy</a></p></body></html>';
        exit;
    }
}

// ── Load fragment ──────────────────────────────────────────
$fragmentFile = "$fragmentDir/{$folder}-m{$module}.html";

if (!file_exists($fragmentFile)) {
    http_response_code(404);
    echo '<!DOCTYPE html><html><head><title>Not Found — AESOP AI Academy</title></head><body><h1>404 — Module not found</h1><p><a href="/ai-academy/">Return to AI Academy</a></p></body></html>';
    exit;
}

$fragment = file_get_contents($fragmentFile);

// ── Load course registry for metadata ──────────────────────
$registryFile = "$base/course-registry.json";
$courseTitle = ucwords(str_replace(['-', '_'], ' ', $course));
$moduleTitle = "Module $module";
$courseDesc = '';

if (file_exists($registryFile)) {
    $registry = json_decode(file_get_contents($registryFile), true);
    // Try matching by course id or by URL folder name
    foreach ($registry as $cId => $c) {
        $regFolder = basename(rtrim($c['url'] ?? '', '/'));
        if ($regFolder === $folder || $regFolder === $course || $cId === $course) {
            $courseTitle = $c['title'] ?? $courseTitle;
            $courseDesc = $c['desc'] ?? '';
            // Find module title
            if (isset($c['modules'][$module - 1])) {
                $moduleTitle = $c['modules'][$module - 1]['title'] ?? $moduleTitle;
            }
            break;
        }
    }
}

$pageTitle = htmlspecialchars("$moduleTitle — $courseTitle — AESOP AI Academy");
$pageDesc = htmlspecialchars($courseDesc ?: "$courseTitle: $moduleTitle at AESOP AI Academy — Free AI education for everyone.");

// ── Extract fragment parts ─────────────────────────────────
// Separate <style>, <script>, and HTML content
$styles = '';
$scripts = '';
$html = $fragment;

// Extract all <style> blocks
if (preg_match_all('/<style[^>]*>(.*?)<\/style>/si', $fragment, $m)) {
    $styles = implode("\n", $m[0]);
    $html = preg_replace('/<style[^>]*>.*?<\/style>/si', '', $html);
}

// Extract all <script> blocks
if (preg_match_all('/<script[^>]*>(.*?)<\/script>/si', $fragment, $m)) {
    $scripts = implode("\n", array_map(function($s) { return $s; }, $m[1]));
    $html = preg_replace('/<script[^>]*>.*?<\/script>/si', '', $html);
}

// Strip fragment comment headers
$html = preg_replace('/<!--\s*AESOP-FRAGMENT.*?-->/i', '', $html);
$html = preg_replace('/<!--\s*v\d+\.\d+\.\d+.*?-->/i', '', $html);

// ── Canonical URL ──────────────────────────────────────────
$canonical = "https://aesopacademy.org/courses/" . urlencode($folder) . "/m$module";

// ── Render full HTML page ──────────────────────────────────
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= $pageTitle ?></title>
<meta name="description" content="<?= $pageDesc ?>">
<link rel="canonical" href="<?= $canonical ?>">

<!-- Open Graph -->
<meta property="og:title" content="<?= $pageTitle ?>">
<meta property="og:description" content="<?= $pageDesc ?>">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $canonical ?>">
<meta property="og:site_name" content="AESOP AI Academy">
<meta property="og:image" content="https://aesopacademy.org/og-image.jpg">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<?= $pageTitle ?>">
<meta name="twitter:description" content="<?= $pageDesc ?>">

<!-- Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "<?= htmlspecialchars($courseTitle) ?>",
  "description": "<?= $pageDesc ?>",
  "provider": {
    "@type": "Organization",
    "name": "AESOP AI Academy",
    "url": "https://aesopacademy.org"
  },
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "online",
    "name": "<?= htmlspecialchars($moduleTitle) ?>"
  },
  "isAccessibleForFree": true,
  "educationalLevel": "Beginner to Intermediate"
}
</script>

<!-- Stylesheets -->
<link rel="stylesheet" href="/academy-theme.css">
<link rel="stylesheet" href="/academy-dark-mode.css">
<link rel="stylesheet" href="/ai-academy/modules/elective-module.css">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Nunito:wght@300;400;600;700;800;900&family=Nunito+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">

<!-- Dark mode restore -->
<script>(function(){var p=localStorage.getItem('aesop-theme');if(p==='dark')document.documentElement.setAttribute('data-theme','dark');})()</script>

<!-- Module-scoped styles -->
<?= $styles ?>

<style>
/* Standalone page layout */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;font-size:clamp(15px,1.1vw+0.4rem,20px);}
body{
  font-family:'Nunito Sans','Nunito',system-ui,sans-serif;
  background:var(--cream,#faf8f4);
  color:var(--ink,#1a1a2e);
  line-height:1.7;
  min-height:100vh;
}
[data-theme="dark"] body{background:#0d1520;color:#e8e3db;}

/* Standalone topbar */
.sv-topbar{
  display:flex;align-items:center;gap:0.75rem;
  padding:0.6rem 1.5rem;
  background:var(--navy,#0a1220);
  color:#fff;font-size:0.82rem;
  position:sticky;top:0;z-index:100;
  border-bottom:1px solid rgba(201,160,90,0.15);
}
.sv-topbar a{color:var(--gold,#c9a05a);text-decoration:none;font-weight:700;}
.sv-topbar a:hover{text-decoration:underline;}
.sv-topbar-title{color:rgba(255,255,255,0.7);font-weight:400;}
.sv-topbar-sep{width:1px;height:1rem;background:rgba(255,255,255,0.15);}
.sv-sizer{margin-left:auto;display:flex;align-items:center;gap:0.4rem;font-size:0.72rem;}
.sv-listen{background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(201,160,90,0.65);border-radius:3px;padding:0.2rem 0.55rem;font-size:0.7rem;font-weight:700;letter-spacing:0.04em;cursor:pointer;font-family:inherit;transition:all 0.15s;}
.sv-listen:hover{border-color:var(--gold,#c9a05a);color:var(--gold,#c9a05a);}
.sv-listen.playing{border-color:#ff6b6b;color:#ff6b6b;}
.sv-gear{background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.45);border-radius:3px;padding:0.2rem 0.45rem;font-size:0.72rem;cursor:pointer;font-family:inherit;transition:all 0.15s;}
.sv-gear:hover{border-color:var(--gold,#c9a05a);color:var(--gold,#c9a05a);}
.sv-sizer{position:relative;}
.sv-listen-panel{position:absolute;top:36px;right:0;background:rgba(6,14,24,0.98);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:0.9rem 1rem;display:none;flex-direction:column;gap:0.65rem;z-index:300;min-width:260px;box-shadow:0 8px 24px rgba(0,0,0,0.5);}
.sv-listen-panel.open{display:flex;}
.sv-listen-panel-row{display:flex;flex-direction:column;gap:0.25rem;}
.sv-listen-panel-lbl{font-size:0.62rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.4);display:flex;justify-content:space-between;align-items:center;}
.sv-listen-panel-lbl span.val{color:var(--gold,#c9a05a);font-weight:600;letter-spacing:0.02em;text-transform:none;}
.sv-listen-panel select{background:#0a141f;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.85);font-size:0.74rem;padding:0.3rem 0.4rem;border-radius:3px;cursor:pointer;max-width:100%;font-family:inherit;}
.sv-listen-panel input[type="range"]{-webkit-appearance:none;appearance:none;width:100%;height:3px;background:rgba(255,255,255,0.12);border-radius:99px;outline:none;cursor:pointer;}
.sv-listen-panel input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:var(--gold,#c9a05a);cursor:pointer;}
.sv-sizer button{
  background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
  color:#fff;border-radius:4px;padding:0.15rem 0.4rem;cursor:pointer;font-size:0.7rem;
}
.sv-sizer input[type="range"]{width:80px;accent-color:var(--gold);}

/* Module content container */
.sv-content{max-width:960px;margin:0 auto;padding:1.5rem;}

/* Back-to-hub banner */
.sv-banner{
  text-align:center;padding:1rem;margin-top:2rem;
  background:rgba(201,160,90,0.08);border:1px solid rgba(201,160,90,0.2);
  border-radius:8px;font-size:0.85rem;
}
.sv-banner a{color:var(--gold);font-weight:700;}

/* Footer */
.sv-footer{
  text-align:center;padding:2rem 1rem;margin-top:3rem;
  border-top:1px solid var(--border,#e2d9cc);
  font-size:0.75rem;color:var(--ink-light,#6a6a7e);
}
</style>
</head>
<body>

<!-- Top navigation bar -->
<div class="sv-topbar">
  <a href="/ai-academy/">← AI Academy</a>
  <div class="sv-topbar-sep"></div>
  <span class="sv-topbar-title"><?= htmlspecialchars($courseTitle) ?> · <?= htmlspecialchars($moduleTitle) ?></span>
  <div class="sv-sizer">
    <span>Size</span>
    <button onclick="adjustSize(-1)">A−</button>
    <input type="range" min="12" max="22" value="16" oninput="applySize(this.value)">
    <button onclick="adjustSize(1)">A+</button>
    <button class="sv-listen" id="svListenBtn" onclick="svToggleListen()" title="Read this lesson aloud using your browser's built-in voice">🔊 Listen</button>
    <button class="sv-gear" id="svListenGear" onclick="svToggleListenPanel()" title="Voice, pace, and volume settings">⚙</button>
    <div class="sv-listen-panel" id="svListenPanel">
      <div class="sv-listen-panel-row">
        <label class="sv-listen-panel-lbl" for="svVoiceSel">Voice</label>
        <select id="svVoiceSel" onchange="svSaveSpeech('voice', this.value)"></select>
      </div>
      <div class="sv-listen-panel-row">
        <label class="sv-listen-panel-lbl" for="svRateRange">Pace <span class="val" id="svRateVal">1.0×</span></label>
        <input type="range" id="svRateRange" min="0.5" max="2" step="0.1" value="1" oninput="svSaveSpeech('rate', this.value); document.getElementById('svRateVal').textContent = parseFloat(this.value).toFixed(1) + '×';">
      </div>
      <div class="sv-listen-panel-row">
        <label class="sv-listen-panel-lbl" for="svVolRange">Volume <span class="val" id="svVolVal">100%</span></label>
        <input type="range" id="svVolRange" min="0" max="1" step="0.05" value="1" oninput="svSaveSpeech('volume', this.value); document.getElementById('svVolVal').textContent = Math.round(parseFloat(this.value)*100) + '%';">
      </div>
      <div class="sv-listen-panel-row">
        <label class="sv-listen-panel-lbl" for="svPitchRange">Pitch <span class="val" id="svPitchVal">1.0</span></label>
        <input type="range" id="svPitchRange" min="0.5" max="2" step="0.1" value="1" oninput="svSaveSpeech('pitch', this.value); document.getElementById('svPitchVal').textContent = parseFloat(this.value).toFixed(1);">
      </div>
    </div>
  </div>
</div>

<!-- Module content -->
<div class="sv-content" id="moduleContent">
<?= $html ?>
</div>

<!-- Hub banner -->
<div class="sv-content">
  <div class="sv-banner">
    Want the full interactive experience with AI labs, progress tracking, and exams?<br>
    <a href="/ai-academy/modules/electives-hub.html">Open in the AI Academy Hub →</a>
  </div>
</div>

<!-- Footer -->
<div class="sv-footer">
  © <?= date('Y') ?> AESOP AI Academy · Free AI education for everyone<br>
  <a href="/privacy-v1.0.html" style="color:inherit;">Privacy</a> · <a href="/policies/ai-policy.html" style="color:inherit;">AI Policy</a>
</div>

<script>
// ═══════════════════════════════════════════════════════════
// CORE MODULE FUNCTIONS (standalone versions)
// ═══════════════════════════════════════════════════════════

var currentPageId = 'p-l1';

// Page navigation
function goPage(pageId) {
  var container = document.getElementById('moduleContent');
  var pages = container.querySelectorAll('.page');
  pages.forEach(function(p) {
    p.classList.remove('active');
  });
  var target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
  }
  currentPageId = pageId;
  updateTabs();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Tab highlighting
function updateTabs() {
  var tabs = document.querySelectorAll('.tab-strip [data-page]');
  tabs.forEach(function(t) {
    t.classList.remove('active');
    if (t.getAttribute('data-page') === currentPageId) {
      t.classList.add('active');
    }
  });
}

// Quiz answer handler
function answer(btn, result, qId) {
  var box = document.getElementById(qId);
  if (!box) return;
  var opts = box.querySelectorAll('.quiz-opt');
  opts.forEach(function(o) { o.disabled = true; o.style.pointerEvents = 'none'; });

  if (result === 'correct') {
    btn.classList.add('correct');
    var fb = box.querySelector('.quiz-feedback.right');
    if (fb) fb.classList.add('show');
  } else {
    btn.classList.add('wrong');
    var fb = box.querySelector('.quiz-feedback.wrong');
    if (fb) fb.classList.add('show');
    // Highlight correct answer
    opts.forEach(function(o) {
      if (o.getAttribute('onclick') && o.getAttribute('onclick').indexOf("'correct'") > -1) {
        o.classList.add('correct');
      }
    });
  }
}

// Module test variables
var mtScore = 0;
var mtAnswered = 0;
var mtTotal = 0;

// Module test answer handler
function mtAnswer(btn, correct, qNum) {
  var qBox = document.getElementById('mtq-' + qNum);
  if (!qBox || qBox.classList.contains('answered')) return;
  qBox.classList.add('answered');

  var opts = qBox.querySelectorAll('.mt-opt');
  opts.forEach(function(o) { o.disabled = true; o.style.pointerEvents = 'none'; });

  if (correct) {
    btn.classList.add('correct');
    mtScore++;
  } else {
    btn.classList.add('wrong');
    opts.forEach(function(o) {
      if (o.getAttribute('onclick') && o.getAttribute('onclick').indexOf('true') > -1) {
        o.classList.add('correct');
      }
    });
  }

  mtAnswered++;
  var scoreEl = document.getElementById('mt-score');
  if (scoreEl) scoreEl.textContent = mtScore;

  // Count total if not set
  if (mtTotal === 0) {
    mtTotal = document.querySelectorAll('.mt-q').length;
    var totalEl = document.getElementById('mt-total');
    if (totalEl) totalEl.textContent = mtTotal;
  }

  // Check completion
  if (mtAnswered >= mtTotal) {
    var pct = Math.round((mtScore / mtTotal) * 100);
    var passed = pct >= 70;
    var resultEl = document.getElementById('mt-result');
    var scoreDisp = document.getElementById('mt-result-score');
    var msgDisp = document.getElementById('mt-result-msg');
    if (resultEl) {
      resultEl.style.display = 'block';
      if (scoreDisp) scoreDisp.textContent = mtScore + '/' + mtTotal + ' (' + pct + '%)';
      if (msgDisp) msgDisp.textContent = passed ? 'Congratulations! You passed the module test.' : 'You did not reach the 70% passing threshold. Review the lessons and try again.';
      resultEl.className = 'mt-result ' + (passed ? 'pass' : 'fail');
    }
  }
}

// Text size controls
function applySize(val) {
  document.getElementById('moduleContent').style.fontSize = val + 'px';
}
function adjustSize(delta) {
  var range = document.querySelector('.sv-sizer input[type="range"]');
  if (range) {
    var v = parseInt(range.value) + delta;
    v = Math.max(12, Math.min(22, v));
    range.value = v;
    applySize(v);
  }
}

// Lab chat (simplified standalone — no API, fallback mode)
function chatSend(labId) {
  var inp = document.getElementById('inp-' + labId);
  if (!inp || !inp.value.trim()) return;
  var msgs = document.getElementById('msgs-' + labId);
  if (!msgs) return;

  // Add user message
  var userMsg = document.createElement('div');
  userMsg.className = 'chat-msg user';
  userMsg.textContent = inp.value.trim();
  msgs.appendChild(userMsg);

  var userText = inp.value.trim();
  inp.value = '';

  // Add AI response (fallback)
  setTimeout(function() {
    var aiMsg = document.createElement('div');
    aiMsg.className = 'chat-msg ai';
    aiMsg.textContent = 'For the full interactive AI lab experience, please use the AI Academy Hub. This standalone view provides the lesson content and quizzes.';
    msgs.appendChild(aiMsg);
    msgs.scrollTop = msgs.scrollHeight;
  }, 500);
}

function chatReset(labId) {
  var msgs = document.getElementById('msgs-' + labId);
  if (msgs) {
    var firstMsg = msgs.querySelector('.chat-msg.ai');
    msgs.innerHTML = '';
    if (firstMsg) msgs.appendChild(firstMsg);
  }
}

function chatKeydown(e, labId) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatSend(labId);
  }
}

// Initialize: show first page
document.addEventListener('DOMContentLoaded', function() {
  var pages = document.querySelectorAll('#moduleContent .page');
  pages.forEach(function(p, i) {
    if (i === 0) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });
  updateTabs();
});

// ── Read Aloud (Web Speech API) ─────────────────────────────────
// Same accessibility feature as the hub — reads the visible lesson page
// aloud using the browser's built-in TTS. No API keys, no cost.
var svSpeechState = 'stopped'; // 'stopped' | 'playing' | 'paused'
var svSpeechChunks = [];

function svGetSpeech(key, def) {
  var v = localStorage.getItem('aesop-sv-speech-' + key);
  return v === null ? def : v;
}
function svSaveSpeech(key, val) {
  localStorage.setItem('aesop-sv-speech-' + key, String(val));
}

function svToggleListenPanel() {
  var panel = document.getElementById('svListenPanel');
  if (!panel) return;
  var opening = !panel.classList.contains('open');
  panel.classList.toggle('open');
  if (opening) {
    svPopulateVoiceList();
    var rate = parseFloat(svGetSpeech('rate',   '1.0'));
    var vol  = parseFloat(svGetSpeech('volume', '1.0'));
    var pit  = parseFloat(svGetSpeech('pitch',  '1.0'));
    var rEl = document.getElementById('svRateRange');
    var vEl = document.getElementById('svVolRange');
    var pEl = document.getElementById('svPitchRange');
    if (rEl) { rEl.value = rate; document.getElementById('svRateVal').textContent = rate.toFixed(1) + '×'; }
    if (vEl) { vEl.value = vol;  document.getElementById('svVolVal').textContent  = Math.round(vol*100) + '%'; }
    if (pEl) { pEl.value = pit;  document.getElementById('svPitchVal').textContent = pit.toFixed(1); }
  }
}

function svPopulateVoiceList() {
  var sel = document.getElementById('svVoiceSel');
  if (!sel || !('speechSynthesis' in window)) return;
  var voices = speechSynthesis.getVoices();
  if (!voices.length) return;
  sel.innerHTML = '';
  var en = voices.filter(function(v){ return (v.lang||'').toLowerCase().indexOf('en') === 0; }).sort(function(a,b){ return a.name.localeCompare(b.name); });
  var other = voices.filter(function(v){ return (v.lang||'').toLowerCase().indexOf('en') !== 0; }).sort(function(a,b){ return a.name.localeCompare(b.name); });
  function addGroup(label, list) {
    if (!list.length) return;
    var g = document.createElement('optgroup');
    g.label = label;
    list.forEach(function(v){
      var o = document.createElement('option');
      o.value = v.name;
      o.textContent = v.name + ' (' + v.lang + ')';
      g.appendChild(o);
    });
    sel.appendChild(g);
  }
  addGroup('English', en);
  addGroup('Other languages', other);
  var saved = svGetSpeech('voice', '');
  if (saved && voices.find(function(v){ return v.name === saved; })) {
    sel.value = saved;
  } else {
    var picked = svPickVoice();
    if (picked) sel.value = picked.name;
  }
}

document.addEventListener('click', function(e){
  var panel = document.getElementById('svListenPanel');
  var gear  = document.getElementById('svListenGear');
  if (!panel || !panel.classList.contains('open')) return;
  if (panel.contains(e.target) || (gear && gear.contains(e.target))) return;
  panel.classList.remove('open');
});

function svExtractReadableText() {
  var root = document.getElementById('moduleContent') || document.body;
  var active = root.querySelector('.page.active') || root.querySelector('.page') || root;
  if (!active) return '';
  var clone = active.cloneNode(true);
  var drop = clone.querySelectorAll('button, input, select, textarea, script, style, .tab-strip, .quiz-feedback, .quiz-result, [aria-hidden="true"]');
  drop.forEach(function(n){ n.remove(); });
  return (clone.innerText || clone.textContent || '').replace(/\s+/g,' ').trim();
}

function svChunkText(text) {
  var max = 220;
  var parts = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [text];
  var out = []; var cur = '';
  for (var i=0; i<parts.length; i++) {
    var s = parts[i].trim();
    if (!s) continue;
    if ((cur + ' ' + s).length > max && cur) { out.push(cur.trim()); cur = s; }
    else { cur = cur ? cur + ' ' + s : s; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function svPickVoice() {
  if (!('speechSynthesis' in window)) return null;
  var voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  var saved = svGetSpeech('voice', '');
  if (saved) {
    var match = voices.find(function(v){ return v.name === saved; });
    if (match) return match;
  }
  function rank(v) {
    var n = (v.name||'').toLowerCase();
    var s = 0;
    if ((v.lang||'').toLowerCase().indexOf('en') === 0) s += 100;
    if (/natural|neural|enhanced|premium|google|samantha|aria|jenny/.test(n)) s += 30;
    if (v.default) s += 5;
    return s;
  }
  return voices.slice().sort(function(a,b){ return rank(b)-rank(a); })[0];
}

function svSetListenBtn(state) {
  var btn = document.getElementById('svListenBtn');
  if (!btn) return;
  btn.classList.toggle('playing', state === 'playing' || state === 'paused');
  if (state === 'playing')      btn.textContent = '⏸ Pause';
  else if (state === 'paused')  btn.textContent = '▶ Resume';
  else                          btn.textContent = '🔊 Listen';
}

function svStopListen() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  svSpeechState = 'stopped';
  svSpeechChunks = [];
  svSetListenBtn('stopped');
}

function svToggleListen() {
  if (!('speechSynthesis' in window)) {
    alert('Sorry — your browser doesn\'t support text-to-speech.');
    return;
  }
  if (svSpeechState === 'playing') {
    speechSynthesis.pause(); svSpeechState = 'paused'; svSetListenBtn('paused'); return;
  }
  if (svSpeechState === 'paused') {
    speechSynthesis.resume(); svSpeechState = 'playing'; svSetListenBtn('playing'); return;
  }
  speechSynthesis.cancel();
  var text = svExtractReadableText();
  if (!text) { alert('No readable text found on this page.'); return; }
  svSpeechChunks = svChunkText(text);
  var voice  = svPickVoice();
  var rate   = parseFloat(svGetSpeech('rate',   '1.0'));
  var volume = parseFloat(svGetSpeech('volume', '1.0'));
  var pitch  = parseFloat(svGetSpeech('pitch',  '1.0'));
  svSpeechChunks.forEach(function(chunk, i){
    var u = new SpeechSynthesisUtterance(chunk);
    if (voice) u.voice = voice;
    u.rate   = rate;
    u.volume = volume;
    u.pitch  = pitch;
    u.lang   = (voice && voice.lang) || 'en-US';
    u.onend = function(){ if (i === svSpeechChunks.length - 1) svStopListen(); };
    u.onerror = function(){ if (i === svSpeechChunks.length - 1) svStopListen(); };
    speechSynthesis.speak(u);
  });
  svSpeechState = 'playing';
  svSetListenBtn('playing');
}

if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = function(){
    try { svPopulateVoiceList(); } catch(_) {}
  };
}

// Stop speech when user switches lessons
document.addEventListener('click', function(e){
  if (svSpeechState === 'stopped') return;
  var t = e.target;
  if (t.closest && (t.closest('[onclick*="goPage"]') || t.closest('.tab-strip'))) svStopListen();
}, true);
window.addEventListener('beforeunload', svStopListen);
</script>

<!-- Module-specific scripts -->
<script>
<?= $scripts ?>
</script>

<script src="/assets/save-progress-prompt.js" defer></script>
</body>
</html>
