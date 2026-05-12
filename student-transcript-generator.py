#!/usr/bin/env python3
"""
AESOP AI Academy Student Transcript Generator
Generates comprehensive student transcript HTML pages based on student profile data.

v1.3.0 — Adds --audience flag with three modes:
  - learner (default): full transcript, neutral student-facing tone
  - parent: plain-language explanation, drops jargon, adds context on
    what each skill means for what the student can now do
  - employer: workforce-language competency summary, emphasizes pathway
    affinity, drops education-standards alignment from the foreground

v1.2.0 — Adds Career Pathway Affinity section mapping a learner's skills
to the four role lanes (Builders, Integrators, Governors, Translators)
defined in `ai-academy/modules/pathway-mappings.json`.
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path


AUDIENCES = ('learner', 'parent', 'employer')


AUDIENCE_COPY = {
    'learner': {
        'hero_eyebrow_label': 'Official Academic Record',
        'hero_title': 'AI Literacy Transcript',
        'hero_intro': '',
        'standards_intro_label': 'Standards Framework',
        'pathway_intro': (
            'Career pathways are not predictions &mdash; they describe where current skills point. '
            'AESOP groups AI-era work into four lanes. Strong affinity in a lane suggests the learner '
            'is already building toward roles in that family; low affinity is information, not a verdict. '
            'Pathways shift as new skills are earned. Learn more at '
            '<a href="/pathways.html">aesopacademy.org/pathways</a>.'
        ),
        'footer_template': (
            'This is a student transcript for {name} showing their AI Literacy learning journey. '
            'The transcript includes all courses completed, certifications earned, and alignment with '
            'education and employment standards. Generated on {date}.'
        ),
    },
    'parent': {
        'hero_eyebrow_label': 'Family Summary',
        'hero_title': 'What Your Student Has Learned',
        'hero_intro': (
            'This is a plain-language summary of {name}\'s AI literacy progress. '
            'It explains what they\'ve studied, what they can now do with it, and where it points next &mdash; '
            'without the technical vocabulary the standard transcript uses.'
        ),
        'standards_intro_label': 'What this means for school',
        'pathway_intro': (
            'These four lanes describe different kinds of AI work in the real world. '
            'A high score in a lane means your student\'s current skills already point that way &mdash; '
            'it does not mean they have to choose it. Low scores are normal early on. '
            'What matters most is whether your student is curious about the work, '
            'not whether they\'re ready for it today. The full description of each lane lives at '
            '<a href="/pathways.html">aesopacademy.org/pathways</a>.'
        ),
        'footer_template': (
            'This is a family-friendly summary of {name}\'s AI literacy learning. '
            'The full academic transcript &mdash; with standards alignment and technical proficiency detail &mdash; '
            'is available on request from the learner. Summary generated on {date}.'
        ),
    },
    'employer': {
        'hero_eyebrow_label': 'Competency Summary',
        'hero_title': 'AI Capability Profile',
        'hero_intro': (
            'A competency summary describing what {name} can do with AI, '
            'where their current skill profile points in the AI-era workforce, '
            'and which categories of work they are already building toward.'
        ),
        'standards_intro_label': 'Education context',
        'pathway_intro': (
            'AESOP groups AI-era work into four role lanes &mdash; <strong>Builders</strong> (engineers who make AI systems), '
            '<strong>Integrators</strong> (bring AI into existing workflows), '
            '<strong>Governors</strong> (audit, secure, and constrain AI; undersupplied globally), '
            'and <strong>Translators</strong> (make AI legible to non-technical audiences). '
            'Affinity scores below describe where this candidate\'s current skill profile points, '
            'not where they will end up. Full lane definitions: '
            '<a href="/pathways.html">aesopacademy.org/pathways</a>.'
        ),
        'footer_template': (
            'This is an AI capability summary for {name} based on completed AESOP coursework and assessed competencies. '
            'Generated on {date}. AESOP transcripts are advisory and self-issued; they are not a credential, '
            'a degree, or a certification. They describe what was learned and what current skills suggest.'
        ),
    },
}


def get_audience_copy(audience):
    """Return the copy dict for the given audience; falls back to learner."""
    return AUDIENCE_COPY.get(audience, AUDIENCE_COPY['learner'])


PATHWAY_MAPPINGS_PATH = Path(__file__).parent / 'ai-academy' / 'modules' / 'pathway-mappings.json'


def load_student_profile(json_path):
    """Load student profile from JSON file."""
    with open(json_path, 'r') as f:
        return json.load(f)


def load_pathway_mappings():
    """Load the lane taxonomy and skill→lane mappings. Returns None if file missing."""
    try:
        with open(PATHWAY_MAPPINGS_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _slugify_skill_name(name):
    """Best-effort match from a display name to a skill-registry ID."""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug


def compute_lane_affinity(profile, mappings):
    """
    Compute 0–100 affinity per lane from the student's technical_skills.
    Each technical_skills entry may have an explicit skill_id; otherwise we
    fall back to slugifying the display name. Skills not in the mapping
    contribute zero. Returns {laneId: {score, contributingSkills}}.
    """
    if not mappings:
        return {}

    lanes = mappings.get('lanes', {})
    skill_to_lanes = mappings.get('skillToLanes', {})
    weights = mappings.get('weights', {})

    raw_scores = {lane_id: 0.0 for lane_id in lanes}
    max_possible = {lane_id: 0.0 for lane_id in lanes}
    contributors = {lane_id: [] for lane_id in lanes}

    # Max possible: every skill at 100% counted at full weight per lane it maps to.
    for skill_id, entry in skill_to_lanes.items():
        for lane_id, weight_key in entry.get('lanes', {}).items():
            if lane_id in max_possible:
                max_possible[lane_id] += weights.get(weight_key, 0)

    for tech_skill in profile.get('technical_skills', []):
        proficiency_pct = tech_skill.get('proficiency', 0)
        if proficiency_pct <= 0:
            continue
        skill_id = tech_skill.get('skill_id') or _slugify_skill_name(tech_skill.get('name', ''))
        mapping_entry = skill_to_lanes.get(skill_id)
        if not mapping_entry:
            continue
        for lane_id, weight_key in mapping_entry.get('lanes', {}).items():
            if lane_id not in raw_scores:
                continue
            contribution = (proficiency_pct / 100.0) * weights.get(weight_key, 0)
            raw_scores[lane_id] += contribution
            contributors[lane_id].append({
                'name': tech_skill.get('name', skill_id),
                'proficiency': proficiency_pct,
                'role': weight_key,
            })

    affinity = {}
    for lane_id in lanes:
        ceiling = max_possible[lane_id]
        score_pct = int(round((raw_scores[lane_id] / ceiling) * 100)) if ceiling > 0 else 0
        score_pct = max(0, min(100, score_pct))
        affinity[lane_id] = {
            'score': score_pct,
            'contributing_skills': contributors[lane_id],
        }
    return affinity


def generate_pathway_section(profile, audience='learner'):
    """Generate the Career Pathway Affinity section HTML."""
    mappings = load_pathway_mappings()
    if not mappings:
        return ''
    copy = get_audience_copy(audience)

    affinity = compute_lane_affinity(profile, mappings)
    if not affinity:
        return ''

    # Show lanes in order of affinity score (descending) so the strongest fit reads first.
    ordered = sorted(
        mappings.get('lanes', {}).items(),
        key=lambda item: affinity.get(item[0], {}).get('score', 0),
        reverse=True,
    )

    cards = ''
    for lane_id, lane in ordered:
        score = affinity.get(lane_id, {}).get('score', 0)
        contributors = affinity.get(lane_id, {}).get('contributing_skills', [])
        top_contributors = sorted(contributors, key=lambda s: s.get('proficiency', 0), reverse=True)[:3]
        contributors_text = ', '.join(c['name'] for c in top_contributors) if top_contributors else 'No qualifying skills yet'

        roles_list = ''.join(f'<li>{role}</li>' for role in lane.get('exampleRoles', [])[:4])

        cards += f'''    <div class="st-lane-card" data-lane="{lane_id}" style="border-top-color: {lane.get('color', 'var(--gold)')};">
      <div class="st-lane-header">
        <div class="st-lane-icon">{lane.get('icon', '✦')}</div>
        <div>
          <div class="st-lane-title">{lane.get('title', lane_id.title())}</div>
          <div class="st-lane-tagline">{lane.get('tagline', '')}</div>
        </div>
        <div class="st-lane-score">
          <div class="st-lane-score-num">{score}%</div>
          <div class="st-lane-score-label">Affinity</div>
        </div>
      </div>
      <div class="st-lane-bar">
        <div class="st-lane-fill" style="width: {score}%; background: {lane.get('color', 'var(--gold)')};"></div>
      </div>
      <div class="st-lane-desc">{lane.get('description', '')}</div>
      <div class="st-lane-meta">
        <div class="st-lane-meta-title">Top contributing skills</div>
        <div class="st-lane-meta-text">{contributors_text}</div>
      </div>
      <div class="st-lane-meta">
        <div class="st-lane-meta-title">Example roles</div>
        <ul class="st-lane-roles">{roles_list}</ul>
      </div>
    </div>
'''

    return f'''  <div class="st-section-label">Career Pathway Affinity</div>

  <div class="st-pathway-intro">
    {copy['pathway_intro']}
  </div>

  <div class="st-lanes">
{cards}  </div>

'''


def calculate_totals(profile):
    """Calculate totals from student profile."""
    courses = profile.get('courses', {})
    foundations = len(courses.get('foundations', []))
    electives = len(courses.get('electives', []))
    total_courses = foundations + electives

    total_modules = sum(c.get('modules_completed', 0) for c in courses.get('foundations', [])) + \
                    sum(c.get('modules_completed', 0) for c in courses.get('electives', []))

    total_points = sum(c.get('points', 0) for c in courses.get('foundations', [])) + \
                   sum(c.get('points', 0) for c in courses.get('electives', []))

    certifications = len(profile.get('certifications', []))

    return {
        'total_courses': total_courses,
        'total_modules': total_modules,
        'total_points': total_points,
        'certifications': certifications,
        'foundations': foundations,
        'electives': electives
    }


def generate_cert_cards(certifications):
    """Generate certification card HTML."""
    html = ""
    for cert in certifications:
        html += f'''    <div class="st-cert-card">
      <div class="st-cert-badge">{cert.get('emoji', '✨')}</div>
      <div class="st-cert-name">{cert.get('name', 'Certification')}</div>
      <div class="st-cert-level">{cert.get('level', 'Level X')}</div>
      <div class="st-cert-date">Earned {cert.get('earned_date', 'TBD')}</div>
      <div class="st-cert-description">{cert.get('course_value', 'N/A')}</div>
    </div>
'''
    return html


def generate_course_rows(courses, course_type='foundations'):
    """Generate course row HTML."""
    html = ""
    for course in courses:
        html += f'''        <div class="st-course-row" data-label="Course">
          <div>
            <div class="st-course-name">{course.get('name', 'Course')}</div>
            <div class="st-course-description">{course.get('employer_description', 'N/A')}</div>
          </div>
          <div class="st-course-meta">{course.get('modules_completed', 0)} / {course.get('modules_total', 0)}</div>
          <div class="st-course-meta">{course.get('points', 0)}</div>
        </div>
'''
    return html


def generate_standards_mappings(profile):
    """Generate education standards mapping HTML."""
    html = ""

    standards = profile.get('standards_mappings', {})

    # ISTE Standards
    html += '''    <div class="st-standard-section">
      <div class="st-standard-section-title">ISTE Standards for Students (2016)</div>
'''
    for standard in standards.get('iste', []):
        pct = standard.get('coverage', 0)
        html += f'''
      <div class="st-standard-item">
        <div class="st-standard-name">
          <span>{standard.get('name', 'Standard')}</span>
          <span class="st-standard-percentage">{pct}%</span>
        </div>
        <div class="st-standard-bar">
          <div class="st-standard-fill" style="width: {pct}%;"></div>
        </div>
        <div class="st-standard-examples">{standard.get('examples', 'N/A')}</div>
      </div>
'''
    html += '''    </div>
'''

    # AI4K12
    html += '''    <div class="st-standard-section">
      <div class="st-standard-section-title">AI4K12 Big Ideas in AI</div>
'''
    for standard in standards.get('ai4k12', []):
        pct = standard.get('coverage', 0)
        html += f'''
      <div class="st-standard-item">
        <div class="st-standard-name">
          <span>{standard.get('name', 'Big Idea')}</span>
          <span class="st-standard-percentage">{pct}%</span>
        </div>
        <div class="st-standard-bar">
          <div class="st-standard-fill" style="width: {pct}%;"></div>
        </div>
        <div class="st-standard-examples">{standard.get('examples', 'N/A')}</div>
      </div>
'''
    html += '''    </div>
'''

    return html


def generate_html(profile):
    """Generate complete student transcript HTML."""

    totals = calculate_totals(profile)
    student_name = profile.get('name', 'Student')
    credential_line = profile.get('credential_line', 'AI Literacy Track')
    issued_date = profile.get('issued_date', datetime.now().strftime('%B %d, %Y'))
    student_id = profile.get('student_id', 'AESOP-XXXX')

    cert_cards = generate_cert_cards(profile.get('certifications', []))
    foundations_courses = profile.get('courses', {}).get('foundations', [])
    electives_courses = profile.get('courses', {}).get('electives', [])
    foundation_rows = generate_course_rows(foundations_courses, 'foundations')
    elective_rows = generate_course_rows(electives_courses, 'electives')
    standards = generate_standards_mappings(profile)
    pathway_section = generate_pathway_section(profile)

    # Technical skills
    tech_skills_html = ""
    for skill in profile.get('technical_skills', []):
        pct = skill.get('proficiency', 0)
        tech_skills_html += f'''    <div class="st-skill-item">
      <div class="st-skill-name">{skill.get('name', 'Skill')}</div>
      <div class="st-skill-bar-wrap">
        <div class="st-skill-bar">
          <div class="st-skill-fill" style="width: {pct}%;"></div>
        </div>
        <div class="st-skill-pct">{pct}%</div>
      </div>
    </div>
'''

    # Employer overview
    employer_overview = profile.get('employer_overview', {})
    overview_html = f'''  <div style="background: var(--white); border: 1.5px solid var(--border); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 3.5rem;">
    <div style="font-family: var(--font-display); font-size: 1.35rem; font-weight: 700; color: var(--ink); margin-bottom: 1rem;">Employer Overview</div>
    <div style="font-size: 0.95rem; line-height: 1.7; color: var(--ink-muted);">
      <p style="margin-bottom: 0.75rem;"><strong>{employer_overview.get('summary', 'N/A')}</strong></p>
      <p style="margin-bottom: 0.75rem;">{employer_overview.get('context', 'N/A')}</p>
      <p><strong>Best-fit roles:</strong> {employer_overview.get('recommended_roles', 'N/A')}</p>
    </div>
  </div>
'''

    html = f'''<!DOCTYPE html>
<!-- v1.2.0 | Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} -->
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Student Transcript — AESOP AI Academy</title>
<meta name="description" content="Student transcript showing AI literacy learning journey with courses, certifications, and standards mappings.">
<meta name="robots" content="noindex, nofollow">

<link rel="icon" type="image/png" sizes="16x16" href="/favicon_16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon_32.png">
<link rel="apple-touch-icon" sizes="512x512" href="/favicon_512.png">

<link rel="stylesheet" href="/academy-theme.css">
<link rel="stylesheet" href="/academy-dark-mode.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&display=swap" rel="stylesheet">

<style>
body {{ overflow-x: hidden; padding-top: 118px; }}

.st-hero {{ background: var(--navy); color: var(--white); padding: 3.5rem 2rem; text-align: center; position: relative; overflow: hidden; }}
.st-hero::after {{ content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 600px 300px at 20% 80%, rgba(201,160,90,0.10) 0%, transparent 70%), radial-gradient(ellipse 400px 400px at 80% 20%, rgba(61,214,192,0.07) 0%, transparent 70%); pointer-events: none; }}
.st-hero-inner {{ position: relative; z-index: 1; max-width: 900px; margin: 0 auto; }}
.st-credential {{ display: inline-block; font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold-light); border: 1px solid rgba(201,160,90,0.35); background: rgba(201,160,90,0.10); padding: 0.35rem 1.1rem; border-radius: 100px; margin-bottom: 1rem; }}
.st-hero h1 {{ font-family: var(--font-display); font-size: 2.8rem; font-weight: 700; color: #fff; line-height: 1.15; margin-bottom: 0.5rem; }}
.st-hero-name {{ font-size: 2.8rem; font-weight: 700; background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(201,160,90,0.8)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1rem; }}
.st-hero-meta {{ font-size: 1rem; color: rgba(255,255,255,0.60); margin-bottom: 2rem; line-height: 1.6; }}
.st-stats {{ display: flex; justify-content: center; flex-wrap: wrap; gap: 2rem; margin-top: 2rem; }}
.st-stat {{ text-align: center; }}
.st-stat-num {{ font-family: var(--font-display); font-size: 2.2rem; font-weight: 700; color: var(--gold); display: block; }}
.st-stat-label {{ font-size: 0.8rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.50); margin-top: 0.3rem; }}

.st-body {{ margin: 3rem 0 5rem; padding: 0 12.5%; min-width: 900px; }}
.st-section-label {{ font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 1.5rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border); }}

.st-certs {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 4rem; }}
.st-cert-card {{ background: var(--white); border: 1.5px solid var(--border); border-radius: var(--radius-lg); padding: 1.75rem 1.5rem; text-align: center; transition: border-color 0.15s, box-shadow 0.15s; }}
.st-cert-card:hover {{ border-color: var(--gold); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }}
.st-cert-badge {{ font-size: 3.5rem; margin-bottom: 0.75rem; }}
.st-cert-name {{ font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; color: var(--ink); margin-bottom: 0.5rem; }}
.st-cert-level {{ font-size: 0.8rem; font-weight: 600; color: var(--ink-muted); margin-bottom: 0.75rem; }}
.st-cert-date {{ font-size: 0.85rem; color: var(--ink-muted); margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-light); }}
.st-cert-requirements {{ font-size: 0.75rem; color: var(--ink-muted); line-height: 1.5; }}
.st-cert-description {{ font-size: 0.8rem; color: var(--ink-muted); line-height: 1.5; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-light); font-style: italic; }}

.st-course-list {{ background: var(--white); border: 1.5px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }}
.st-course-row {{ display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1.25rem; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-light); align-items: center; }}
.st-course-row:last-child {{ border-bottom: none; }}
.st-course-row.header {{ background: var(--navy); color: #fff; font-weight: 600; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 1rem 1.5rem; }}
.st-course-name {{ font-weight: 600; color: var(--ink); }}
.st-course-description {{ font-size: 0.78rem; color: var(--ink-muted); line-height: 1.4; margin-top: 0.35rem; }}
.st-course-meta {{ font-size: 0.85rem; color: var(--ink-muted); text-align: center; }}

.st-standard-section {{ background: var(--white); border: 1.5px solid var(--border); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem; }}
.st-standard-section-title {{ font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; color: var(--ink); margin-bottom: 1.75rem; }}
.st-standard-item {{ margin-bottom: 1.75rem; }}
.st-standard-item:last-child {{ margin-bottom: 0; }}
.st-standard-name {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-weight: 600; color: var(--ink); font-size: 0.95rem; }}
.st-standard-percentage {{ font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: var(--gold); }}
.st-standard-bar {{ background: var(--border-light); height: 7px; border-radius: 99px; overflow: hidden; }}
.st-standard-fill {{ height: 100%; border-radius: 99px; transition: width 0.6s ease; background: linear-gradient(90deg, var(--gold), var(--teal)); }}
.st-standard-examples {{ font-size: 0.8rem; color: var(--ink-muted); margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-light); }}

.st-skills-section {{ background: var(--white); border: 1.5px solid var(--border); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem; }}
.st-skills-title {{ font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; color: var(--ink); margin-bottom: 1.75rem; }}
.st-skill-item {{ display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }}
.st-skill-item:last-child {{ margin-bottom: 0; }}
.st-skill-name {{ flex-shrink: 0; width: 200px; font-weight: 600; color: var(--ink); font-size: 0.95rem; }}
.st-skill-bar-wrap {{ flex: 1; display: flex; align-items: center; gap: 0.75rem; }}
.st-skill-bar {{ flex: 1; background: var(--border-light); height: 6px; border-radius: 99px; overflow: hidden; }}
.st-skill-fill {{ height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--teal), var(--green)); transition: width 0.6s ease; }}
.st-skill-pct {{ flex-shrink: 0; width: 40px; text-align: right; font-weight: 700; color: var(--gold); font-size: 0.9rem; }}

/* Career Pathway Affinity */
.st-pathway-intro {{ font-size: 0.95rem; line-height: 1.7; color: var(--ink-muted); margin-bottom: 1.75rem; }}
.st-pathway-intro a {{ color: var(--gold); text-decoration: none; border-bottom: 1px solid var(--gold-light); }}
.st-pathway-intro a:hover {{ color: var(--navy); }}
.st-lanes {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }}
.st-lane-card {{ background: var(--white); border: 1.5px solid var(--border); border-top: 5px solid var(--gold); border-radius: var(--radius-lg); padding: 1.5rem 1.4rem; display: flex; flex-direction: column; gap: 0.9rem; transition: border-color 0.15s, box-shadow 0.15s; }}
.st-lane-card:hover {{ box-shadow: 0 4px 16px rgba(0,0,0,0.06); }}
.st-lane-header {{ display: grid; grid-template-columns: auto 1fr auto; gap: 0.75rem; align-items: center; }}
.st-lane-icon {{ font-size: 1.85rem; line-height: 1; }}
.st-lane-title {{ font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; color: var(--ink); line-height: 1.1; }}
.st-lane-tagline {{ font-size: 0.78rem; color: var(--ink-muted); margin-top: 0.2rem; line-height: 1.3; }}
.st-lane-score {{ text-align: right; }}
.st-lane-score-num {{ font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--ink); line-height: 1; }}
.st-lane-score-label {{ font-size: 0.65rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-muted); margin-top: 0.2rem; }}
.st-lane-bar {{ background: var(--border-light); height: 6px; border-radius: 99px; overflow: hidden; }}
.st-lane-fill {{ height: 100%; border-radius: 99px; transition: width 0.6s ease; }}
.st-lane-desc {{ font-size: 0.85rem; line-height: 1.55; color: var(--ink-muted); }}
.st-lane-meta {{ font-size: 0.8rem; }}
.st-lane-meta-title {{ font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 0.3rem; }}
.st-lane-meta-text {{ color: var(--ink); font-size: 0.85rem; line-height: 1.5; }}
.st-lane-roles {{ list-style: none; padding: 0; margin: 0; font-size: 0.83rem; color: var(--ink); line-height: 1.65; }}
.st-lane-roles li::before {{ content: '· '; color: var(--gold); }}

.st-footer {{ background: var(--navy); color: #fff; padding: 3rem 2rem; text-align: center; margin-top: 5rem; }}
.st-footer-inner {{ max-width: 900px; margin: 0 auto; }}
.st-footer-actions {{ display: flex; justify-content: center; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 2rem; }}
.st-footer-btn {{ padding: 0.65rem 1.5rem; background: transparent; border: 1.5px solid rgba(255,255,255,0.3); color: #fff; border-radius: var(--radius-md); cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: border-color 0.2s, color 0.2s; }}
.st-footer-btn:hover {{ border-color: var(--gold); color: var(--gold); }}
.st-footer-disclaimer {{ font-size: 0.85rem; color: rgba(255,255,255,0.60); line-height: 1.6; }}

@media (max-width: 1024px) {{
  .st-course-row {{ grid-template-columns: 1fr 1fr; gap: 0.75rem; padding: 1rem 1.25rem; }}
  .st-course-row.header {{ display: none; }}
}}
</style>
</head>
<body>

<section class="st-hero">
  <div class="st-hero-inner">
    <div class="st-credential">Official Academic Record</div>
    <h1>AI Literacy Transcript</h1>
    <div class="st-hero-name">{student_name}</div>
    <div class="st-hero-meta">
      {credential_line} · Completed {issued_date}<br>
      Student ID: {student_id} · Issued: {issued_date}
    </div>
    <div class="st-stats">
      <div class="st-stat">
        <span class="st-stat-num">{totals['total_courses']}</span>
        <span class="st-stat-label">Courses Completed</span>
      </div>
      <div class="st-stat">
        <span class="st-stat-num">{totals['total_modules']}</span>
        <span class="st-stat-label">Modules Finished</span>
      </div>
      <div class="st-stat">
        <span class="st-stat-num">{totals['total_points']}</span>
        <span class="st-stat-label">Points Earned</span>
      </div>
      <div class="st-stat">
        <span class="st-stat-num">{totals['certifications']}</span>
        <span class="st-stat-label">Certifications</span>
      </div>
    </div>
  </div>
</section>

<div class="st-body">

  <!-- Standards Statement -->
  <div style="background: linear-gradient(135deg, rgba(13,27,42,0.04) 0%, rgba(201,160,90,0.04) 100%); border-left: 4px solid var(--gold); border-radius: var(--radius-md); padding: 1.75rem; margin-bottom: 3rem;">
    <div style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.75rem;">Standards Framework</div>
    <div style="font-size: 0.95rem; line-height: 1.7; color: var(--ink); font-style: italic;">
      {profile.get('standards_statement', '')}
    </div>
  </div>

  {overview_html}

  <div class="st-section-label">Certifications Earned</div>

  <div class="st-certs">
{cert_cards}  </div>

  <div class="st-section-label">Course Transcript</div>

  <div class="st-transcript">
    <div class="st-transcript-subsection">
      <div class="st-subsection-title">Foundations Course ({totals['foundations']} Completed)</div>
      <div class="st-course-list">
        <div class="st-course-row header">
          <div>Course</div>
          <div>Modules</div>
          <div>Points</div>
        </div>
{foundation_rows}      </div>
    </div>

    <div class="st-transcript-subsection">
      <div class="st-subsection-title">Elective Courses ({totals['electives']} Completed)</div>
      <div class="st-course-list">
        <div class="st-course-row header">
          <div>Course</div>
          <div>Modules</div>
          <div>Points</div>
        </div>
{elective_rows}      </div>
    </div>
  </div>

  <div class="st-section-label">Education Standards Alignment</div>

{standards}

  <div class="st-section-label">AI/ML Technical Skills Mastery</div>

  <div class="st-skills-section">
    <div class="st-skills-title">Technical Competencies Developed</div>
{tech_skills_html}  </div>

{pathway_section}
</div>

<section class="st-footer">
  <div class="st-footer-inner">
    <div class="st-footer-actions">
      <button class="st-footer-btn" onclick="window.print()">Print Transcript</button>
      <button class="st-footer-btn" onclick="navigator.clipboard.writeText(window.location.href); alert('Link copied!')">Share</button>
    </div>
    <div class="st-footer-disclaimer">
      This is a student transcript for {student_name} showing their AI Literacy learning journey. The transcript includes all courses completed, certifications earned, and alignment with education and employment standards. Generated on {issued_date}.
    </div>
  </div>
</section>

<script src="/assets/top-banner-v2.js?v=2"></script>
</body>
</html>
'''

    return html


def main():
    if len(sys.argv) < 2:
        print("Usage: python student-transcript-generator.py <student-profile.json> [output-path]")
        print("\nExample: python student-transcript-generator.py students/jordan-williams.json output/jordan-transcript.html")
        sys.exit(1)

    json_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else json_path.replace('.json', '.html')

    try:
        profile = load_student_profile(json_path)
        html = generate_html(profile)

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            f.write(html)

        print(f"✓ Transcript generated: {output_path}")
        return 0
    except FileNotFoundError:
        print(f"Error: Student profile not found: {json_path}")
        return 1
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in {json_path}")
        return 1
    except Exception as e:
        print(f"Error: {str(e)}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
