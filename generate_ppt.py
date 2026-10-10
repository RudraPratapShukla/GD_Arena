"""
Generate high-fidelity PowerPoint presentation for GD Arena AI.
Creates GD_Arena_Presentation.pptx (7 slides, widescreen 16:9, modern dark theme).
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Color Palette
    BG_DARK = RGBColor(11, 15, 25)       # #0B0F19
    CARD_BG = RGBColor(22, 30, 49)       # #161E31
    BORDER_COLOR = RGBColor(38, 52, 82)  # #263452
    CYAN = RGBColor(6, 182, 212)         # #06B6D4
    EMERALD = RGBColor(16, 185, 129)     # #10B981
    PURPLE = RGBColor(139, 92, 246)      # #8B5CF6
    TEXT_LIGHT = RGBColor(248, 250, 252) # #F8FAFC
    TEXT_MUTED = RGBColor(148, 163, 184) # #94A3B8
    TEXT_DIM = RGBColor(100, 116, 139)   # #64748B
    ACCENT_AMBER = RGBColor(245, 158, 11)# #F59E0B

    blank_layout = prs.slide_layouts[6]

    def add_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background()
        return bg

    def add_header(slide, title_text, category_text="GD ARENA AI // HACKATHON ROUND 1"):
        # Category / breadcrumb
        cat_box = slide.shapes.add_textbox(Inches(0.9), Inches(0.4), Inches(11.5), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        tf_cat.margin_left = tf_cat.margin_right = tf_cat.margin_top = tf_cat.margin_bottom = 0
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = CYAN
        p_cat.font.name = "Segoe UI"

        # Main Title
        title_box = slide.shapes.add_textbox(Inches(0.9), Inches(0.75), Inches(11.5), Inches(0.7))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        tf_title.margin_left = tf_title.margin_right = tf_title.margin_top = tf_title.margin_bottom = 0
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(26)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_LIGHT
        p_title.font.name = "Segoe UI"

    def add_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=BORDER_COLOR):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)
        card.adjustments[0] = 0.04
        return card

    # ==========================================
    # SLIDE 1: TITLE SLIDE
    # ==========================================
    slide1 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide1)

    # Glow card for title
    add_card(slide1, Inches(1.0), Inches(1.2), Inches(11.333), Inches(5.1), bg_color=RGBColor(16, 23, 38))

    # Badge Pill
    badge = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.6), Inches(3.6), Inches(0.42))
    badge.fill.solid()
    badge.fill.fore_color.rgb = RGBColor(8, 47, 73)
    badge.line.color.rgb = CYAN
    badge.line.width = Pt(1)
    badge.text = "PROBLEM STATEMENT #2 • AI IN EDUCATION"
    for p in badge.text_frame.paragraphs:
        p.alignment = PP_ALIGN.CENTER
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = CYAN
        p.font.name = "Segoe UI"

    # Main Heading
    tb_title = slide1.shapes.add_textbox(Inches(1.5), Inches(2.2), Inches(10.3), Inches(1.3))
    tf1 = tb_title.text_frame
    tf1.word_wrap = True
    p1 = tf1.paragraphs[0]
    p1.text = "GD ARENA AI"
    p1.font.size = Pt(44)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_LIGHT
    p1.font.name = "Segoe UI"

    p1_sub = tf1.add_paragraph()
    p1_sub.text = "Multi-Persona AI Group Discussion Practice & Fair Opportunity Assessment"
    p1_sub.font.size = Pt(18)
    p1_sub.font.color.rgb = CYAN
    p1_sub.font.name = "Segoe UI"

    # Pitch description
    tb_desc = slide1.shapes.add_textbox(Inches(1.5), Inches(3.6), Inches(10.0), Inches(0.9))
    tf_desc = tb_desc.text_frame
    tf_desc.word_wrap = True
    p_desc = tf_desc.paragraphs[0]
    p_desc.text = "An intelligent, real-time group discussion simulation platform that pits students against diverse AI personas with speech collision handling, smart participation balancing, and timestamp-verified analytics."
    p_desc.font.size = Pt(13)
    p_desc.font.color.rgb = TEXT_MUTED
    p_desc.font.name = "Segoe UI"

    # Team Box
    team_card = add_card(slide1, Inches(1.5), Inches(4.7), Inches(10.3), Inches(1.2), bg_color=RGBColor(24, 34, 53))
    tb_team = slide1.shapes.add_textbox(Inches(1.8), Inches(4.8), Inches(9.8), Inches(1.0))
    tf_t = tb_team.text_frame
    p_t_head = tf_t.paragraphs[0]
    p_t_head.text = "PROJECT TEAM MEMBERS"
    p_t_head.font.size = Pt(10)
    p_t_head.font.bold = True
    p_t_head.font.color.rgb = EMERALD
    p_t_head.font.name = "Segoe UI"

    p_members = tf_t.add_paragraph()
    p_members.text = "• Nakul Gupta   |   • Rudra Pratap Shukla"
    p_members.font.size = Pt(16)
    p_members.font.bold = True
    p_members.font.color.rgb = TEXT_LIGHT
    p_members.font.name = "Segoe UI"

    p_inst = tf_t.add_paragraph()
    p_inst.text = "AI-Driven Communication & Real-Time Performance Analytics"
    p_inst.font.size = Pt(11)
    p_inst.font.color.rgb = TEXT_MUTED
    p_inst.font.name = "Segoe UI"

    # ==========================================
    # SLIDE 2: THE PROBLEM & MARKET REALITY
    # ==========================================
    slide2 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide2)
    add_header(slide2, "The Real Challenge in Group Discussions")

    # 3 Problem Cards
    col_w = Inches(3.64)
    gap = Inches(0.2)
    start_x = Inches(0.9)
    top_y = Inches(1.7)
    card_h = Inches(5.1)

    cards_data = [
        {
            "num": "01",
            "title": "Unprepared For Reality",
            "sub": "Single-Speaker Mirage",
            "accent": CYAN,
            "bullets": [
                "Students practice alone or before a mirror, where there is no interruption or cross-questioning.",
                "Real placements throw 6-8 candidates into a chaotic, time-constrained group.",
                "Students freeze when interrupted or fail to find an opening entry."
            ]
        },
        {
            "num": "02",
            "title": "Imbalanced Dynamics",
            "sub": "Loudest Voices Monopolize",
            "accent": ACCENT_AMBER,
            "bullets": [
                "1 or 2 aggressive speakers typically claim 65%+ of the discussion time.",
                "Quieter candidates with insightful perspectives get completely sidelined.",
                "College peer groups lack trained moderators to balance opportunities fairly."
            ]
        },
        {
            "num": "03",
            "title": "Subjective Feedback",
            "sub": "Vague & Unactionable",
            "accent": PURPLE,
            "bullets": [
                "Feedback is usually generic: 'speak more confidently' or 'improve grammar'.",
                "No metric on speaking pace (WPM), talk time balance, or filler-word density.",
                "No objective audit of argument logic versus factual errors."
            ]
        }
    ]

    for i, c in enumerate(cards_data):
        x = start_x + i * (col_w + gap)
        add_card(slide2, x, top_y, col_w, card_h)
        
        # Pill inside
        tb = slide2.shapes.add_textbox(x + Inches(0.3), top_y + Inches(0.3), col_w - Inches(0.6), card_h - Inches(0.6))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p_num = tf.paragraphs[0]
        p_num.text = f"PROBLEM {c['num']}"
        p_num.font.size = Pt(11)
        p_num.font.bold = True
        p_num.font.color.rgb = c['accent']
        p_num.font.name = "Segoe UI"
        
        p_title = tf.add_paragraph()
        p_title.text = c['title']
        p_title.font.size = Pt(20)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_LIGHT
        p_title.font.name = "Segoe UI"

        p_sub = tf.add_paragraph()
        p_sub.text = c['sub']
        p_sub.font.size = Pt(12)
        p_sub.font.color.rgb = c['accent']
        p_sub.font.name = "Segoe UI"
        
        tf.add_paragraph().text = "" # spacer

        for b in c['bullets']:
            p_b = tf.add_paragraph()
            p_b.text = f"•  {b}"
            p_b.font.size = Pt(12)
            p_b.font.color.rgb = TEXT_MUTED
            p_b.font.name = "Segoe UI"

    # ==========================================
    # SLIDE 3: THE SOLUTION - GD ARENA AI
    # ==========================================
    slide3 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide3)
    add_header(slide3, "The Solution: Realistic Multi-Persona GD Simulation")

    # Left Card: Multi-Persona System (Width 6.0)
    add_card(slide3, Inches(0.9), Inches(1.7), Inches(5.6), Inches(5.1))
    tb_sol_l = slide3.shapes.add_textbox(Inches(1.2), Inches(1.9), Inches(5.0), Inches(4.7))
    tf_l = tb_sol_l.text_frame
    tf_l.word_wrap = True
    
    p_l1 = tf_l.paragraphs[0]
    p_l1.text = "REALISTIC ARENA DYNAMICS"
    p_l1.font.size = Pt(11)
    p_l1.font.bold = True
    p_l1.font.color.rgb = CYAN
    p_l1.font.name = "Segoe UI"

    p_l2 = tf_l.add_paragraph()
    p_l2.text = "Simulating Real GD Personas"
    p_l2.font.size = Pt(20)
    p_l2.font.bold = True
    p_l2.font.color.rgb = TEXT_LIGHT
    p_l2.font.name = "Segoe UI"

    items_l = [
        ("AI Moderator (Rahul / Priya)", "Guides stages, enforces decorum, intervenes neutrally when participants collide or talk time becomes unfair.", CYAN),
        ("Supportive Peer (Ananya)", "Reinforces productive arguments, introduces statistics, builds upon student ideas with nuanced agreement.", EMERALD),
        ("Skeptical Challenger (Vikram)", "Interrogates unproven claims, counters weak logic, and tests the student's composure under pressure.", ACCENT_AMBER)
    ]
    for title, desc, color in items_l:
        tf_l.add_paragraph().text = ""
        p_t = tf_l.add_paragraph()
        p_t.text = f"●  {title}"
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = color
        p_t.font.name = "Segoe UI"

        p_d = tf_l.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = TEXT_MUTED
        p_d.font.name = "Segoe UI"

    # Right Card: Core Features (Width 5.6)
    add_card(slide3, Inches(6.8), Inches(1.7), Inches(5.6), Inches(5.1))
    tb_sol_r = slide3.shapes.add_textbox(Inches(7.1), Inches(1.9), Inches(5.0), Inches(4.7))
    tf_r = tb_sol_r.text_frame
    tf_r.word_wrap = True

    p_r1 = tf_r.paragraphs[0]
    p_r1.text = "ENGINEERED FOR NATURAL PRACTICE"
    p_r1.font.size = Pt(11)
    p_r1.font.bold = True
    p_r1.font.color.rgb = PURPLE
    p_r1.font.name = "Segoe UI"

    p_r2 = tf_r.add_paragraph()
    p_r2.text = "Full Audio & Structured Flow"
    p_r2.font.size = Pt(20)
    p_r2.font.bold = True
    p_r2.font.color.rgb = TEXT_LIGHT
    p_r2.font.name = "Segoe UI"

    items_r = [
        ("Speech-to-Speech Flow", "Web Speech API speech recognition (STT) + real-time neural synthesis (TTS) for natural conversational turn-taking."),
        ("Bilingual Intelligence (English & Hinglish)", "Native Indian GD context: supports code-switching, colloquial transitions, and Indian student vocabulary."),
        ("Structured GD Progression", "Phased lifecycle: Opening Stances -> Cross-Examination & Active Debate -> Synthesis & Final Summary."),
        ("One-Click Rebuttal Interventions", "Students can push-to-speak or interrupt when ready, teaching real-world conversation entry timing.")
    ]
    for title, desc in items_r:
        tf_r.add_paragraph().text = ""
        p_t = tf_r.add_paragraph()
        p_t.text = f"✔  {title}"
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = TEXT_LIGHT
        p_t.font.name = "Segoe UI"

        p_d = tf_r.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = TEXT_MUTED
        p_d.font.name = "Segoe UI"

    # ==========================================
    # SLIDE 4: SMART PARTICIPATION BALANCER (UNIQUE INNOVATION)
    # ==========================================
    slide4 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide4)
    add_header(slide4, "Key Innovation: Smart Participation Balancer", "EXCLUSIVE ALGORITHMIC FEATURE")

    # 4 Quadrants / Cards
    w4 = Inches(5.6)
    h4 = Inches(2.4)
    quads = [
        (Inches(0.9), Inches(1.7), "01. Fair Opportunity Index (FOI)", "Live equity calculation tracking turn share and word count distribution across all participants in real time.", CYAN),
        (Inches(6.8), Inches(1.7), "02. Dominance Detection & Warnings", "Automated flags trigger if any speaker crosses >40% of discussion time, displaying visual warning badges to prevent monopolization.", ACCENT_AMBER),
        (Inches(0.9), Inches(4.4), "03. Diplomatic AI Moderator Interventions", "The AI Moderator detects quiet participants and politely creates entry openings: 'Rudra, what is your perspective on this?'", EMERALD),
        (Inches(6.8), Inches(4.4), "04. Dynamic Entry Prompts for Quiet Speakers", "Displays interactive suggested prompts on student screen ('Building on that point...', 'A differing viewpoint is...') with 1-click execution.", PURPLE),
    ]

    for left, top, title, desc, color in quads:
        add_card(slide4, left, top, w4, h4)
        tb = slide4.shapes.add_textbox(left + Inches(0.3), top + Inches(0.3), w4 - Inches(0.6), h4 - Inches(0.6))
        tf = tb.text_frame
        tf.word_wrap = True

        p1 = tf.paragraphs[0]
        p1.text = title
        p1.font.size = Pt(16)
        p1.font.bold = True
        p1.font.color.rgb = color
        p1.font.name = "Segoe UI"

        tf.add_paragraph().text = ""

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(12)
        p2.font.color.rgb = TEXT_MUTED
        p2.font.name = "Segoe UI"

    # ==========================================
    # SLIDE 5: DETERMINISTIC EVALUATION & REPORTING
    # ==========================================
    slide5 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide5)
    add_header(slide5, "Ground-Truth Evaluation: Zero-Hallucination Analytics")

    # Left Column: Mathematical Engine
    add_card(slide5, Inches(0.9), Inches(1.7), Inches(5.6), Inches(5.1))
    tb_det = slide5.shapes.add_textbox(Inches(1.2), Inches(1.9), Inches(5.0), Inches(4.7))
    tf_det = tb_det.text_frame
    tf_det.word_wrap = True

    p_d1 = tf_det.paragraphs[0]
    p_d1.text = "HARD DATA VS AI OPINION"
    p_d1.font.size = Pt(11)
    p_d1.font.bold = True
    p_d1.font.color.rgb = CYAN
    p_d1.font.name = "Segoe UI"

    p_d2 = tf_det.add_paragraph()
    p_d2.text = "Deterministic Python Metrics"
    p_d2.font.size = Pt(20)
    p_d2.font.bold = True
    p_d2.font.color.rgb = TEXT_LIGHT
    p_d2.font.name = "Segoe UI"

    det_bullets = [
        ("Talk Time Distribution", "Exact milliseconds tracked per speaker; calculates true conversational share % without estimation."),
        ("Speaking Rate (WPM)", "Computed directly from transcript word tokens / speaking duration. Pinpoints rushed vs sluggish delivery."),
        ("Filler-Word Audit", "Regex detection of crutch words ('basically', 'like', 'um', 'actually') with exact sentence context snippets."),
        ("Interruption & Entry Timing", "Records latency between turns to identify conversational hesitation or aggressive cutting-in.")
    ]
    for t, d in det_bullets:
        tf_det.add_paragraph().text = ""
        pt = tf_det.add_paragraph()
        pt.text = f"📊  {t}"
        pt.font.size = Pt(12)
        pt.font.bold = True
        pt.font.color.rgb = CYAN
        pt.font.name = "Segoe UI"

        pd = tf_det.add_paragraph()
        pd.text = d
        pd.font.size = Pt(11)
        pd.font.color.rgb = TEXT_MUTED
        pd.font.name = "Segoe UI"

    # Right Column: Qualitative & Playbook
    add_card(slide5, Inches(6.8), Inches(1.7), Inches(5.6), Inches(5.1))
    tb_qual = slide5.shapes.add_textbox(Inches(7.1), Inches(1.9), Inches(5.0), Inches(4.7))
    tf_qual = tb_qual.text_frame
    tf_qual.word_wrap = True

    p_q1 = tf_qual.paragraphs[0]
    p_q1.text = "ACTIONABLE COACHING"
    p_q1.font.size = Pt(11)
    p_q1.font.bold = True
    p_q1.font.color.rgb = EMERALD
    p_q1.font.name = "Segoe UI"

    p_q2 = tf_qual.add_paragraph()
    p_q2.text = "Qualitative AI Assessment"
    p_q2.font.size = Pt(20)
    p_q2.font.bold = True
    p_q2.font.color.rgb = TEXT_LIGHT
    p_q2.font.name = "Segoe UI"

    qual_bullets = [
        ("Transcript Quote Verification", "Every piece of criticism cites an exact verified excerpt from the student's speech. Zero hallucinated claims."),
        ("Core Competency Breakdown", "Structured 1-10 scoring on Argument Logic, Counter-Question Handling, Listening, and Structure."),
        ("Comparative Peer Benchmarking", "Student scores placed alongside AI peer ratings so candidates see how they performed vs the group."),
        ("3-Step Next GD Playbook", "Concrete, high-yield actionable exercises to implement immediately in their next session.")
    ]
    for t, d in qual_bullets:
        tf_qual.add_paragraph().text = ""
        pt = tf_qual.add_paragraph()
        pt.text = f"🎯  {t}"
        pt.font.size = Pt(12)
        pt.font.bold = True
        pt.font.color.rgb = EMERALD
        pt.font.name = "Segoe UI"

        pd = tf_qual.add_paragraph()
        pd.text = d
        pd.font.size = Pt(11)
        pd.font.color.rgb = TEXT_MUTED
        pd.font.name = "Segoe UI"

    # ==========================================
    # SLIDE 6: TECHNICAL ARCHITECTURE & STACK
    # ==========================================
    slide6 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide6)
    add_header(slide6, "System Architecture & Engineering Choices")

    # 3 Layers Stack
    col_w6 = Inches(3.64)
    layers = [
        {
            "layer": "FRONTEND CLIENT",
            "tech": "React 19 + Vite + Tailwind",
            "color": CYAN,
            "points": [
                "Zero-dependency audio pipeline using native Web Speech STT and TTS synthesis.",
                "Sub-100ms UI reactive state machine for live turn indicators & live timers.",
                "Real-time participation balancer tracking Fair Opportunity Index & dominance flags.",
                "Responsive dark cyber-arena layout optimized for desktop and mobile."
            ]
        },
        {
            "layer": "BACKEND API",
            "tech": "FastAPI + Python 3.12",
            "color": PURPLE,
            "points": [
                "Stateless REST architecture (/turn, /report, /health) with async non-blocking execution.",
                "Speaker selection engine (turn.py) balances turns based on silence & dominance.",
                "Zero audio bandwidth on server — all speech synthesized client-side.",
                "Fast, cost-efficient deployment on Vercel Serverless Functions."
            ]
        },
        {
            "layer": "AI REASONING CORE",
            "tech": "Google Gemini 2.5 Flash",
            "color": EMERALD,
            "points": [
                "State-of-the-art context window and low time-to-first-token (<800ms).",
                "Few-shot prompt engineering per persona (Moderator, Supportive, Challenger).",
                "Strict quote validation enforcement preventing hallucinated critiques.",
                "Bilingual code-switching capability for natural English & Hinglish."
            ]
        }
    ]

    for i, l in enumerate(layers):
        x = start_x + i * (col_w6 + gap)
        add_card(slide6, x, top_y, col_w6, card_h)
        tb = slide6.shapes.add_textbox(x + Inches(0.3), top_y + Inches(0.3), col_w6 - Inches(0.6), card_h - Inches(0.6))
        tf = tb.text_frame
        tf.word_wrap = True

        p1 = tf.paragraphs[0]
        p1.text = l['layer']
        p1.font.size = Pt(11)
        p1.font.bold = True
        p1.font.color.rgb = l['color']
        p1.font.name = "Segoe UI"

        p2 = tf.add_paragraph()
        p2.text = l['tech']
        p2.font.size = Pt(17)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_LIGHT
        p2.font.name = "Segoe UI"

        tf.add_paragraph().text = ""

        for pt in l['points']:
            p = tf.add_paragraph()
            p.text = f"•  {pt}"
            p.font.size = Pt(12)
            p.font.color.rgb = TEXT_MUTED
            p.font.name = "Segoe UI"

    # ==========================================
    # SLIDE 7: ROADMAP, IMPACT & SUMMARY
    # ==========================================
    slide7 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide7)
    add_header(slide7, "Roadmap, Next 16 Hours & Vision", "ROUND 1 SNAPSHOT & FUTURE MILESTONES")

    # Left: What Works vs What's Next
    add_card(slide7, Inches(0.9), Inches(1.7), Inches(5.6), Inches(5.1))
    tb_stat = slide7.shapes.add_textbox(Inches(1.2), Inches(1.9), Inches(5.0), Inches(4.7))
    tf_stat = tb_stat.text_frame
    tf_stat.word_wrap = True

    p_s1 = tf_stat.paragraphs[0]
    p_s1.text = "MILESTONES & EXECUTION PLAN"
    p_s1.font.size = Pt(11)
    p_s1.font.bold = True
    p_s1.font.color.rgb = CYAN
    p_s1.font.name = "Segoe UI"

    p_s2 = tf_stat.add_paragraph()
    p_s2.text = "Delivered vs Next 16 Hours"
    p_s2.font.size = Pt(20)
    p_s2.font.bold = True
    p_s2.font.color.rgb = TEXT_LIGHT
    p_s2.font.name = "Segoe UI"

    milestones = [
        ("Delivered (Round 1 Snapshot)", [
            "Full 3-AI Persona discussion engine with speech collision handling",
            "Bilingual English & Hinglish audio turn-taking with Web Speech",
            "Smart Participation Balancer & Fair Opportunity Index",
            "Ground-truth metrics (WPM, Talk Time %, Filler audit, Quote validation)",
            "Production deployment on Vercel"
        ], EMERALD),
        ("Next 16 Hours (Round 2 Roadmap)", [
            "Multi-Human Room Mode: Real students + AI bots in shared rooms",
            "Voice Pitch & Acoustic Confidence analysis via Web Audio API",
            "Exportable PDF Report Cards for campus training placement cells"
        ], CYAN)
    ]

    for m_title, m_items, m_color in milestones:
        tf_stat.add_paragraph().text = ""
        pm = tf_stat.add_paragraph()
        pm.text = f"●  {m_title}"
        pm.font.size = Pt(12)
        pm.font.bold = True
        pm.font.color.rgb = m_color
        pm.font.name = "Segoe UI"

        for it in m_items:
            pi = tf_stat.add_paragraph()
            pi.text = f"   • {it}"
            pi.font.size = Pt(11)
            pi.font.color.rgb = TEXT_MUTED
            pi.font.name = "Segoe UI"

    # Right: Impact & Team Closing
    add_card(slide7, Inches(6.8), Inches(1.7), Inches(5.6), Inches(5.1))
    tb_imp = slide7.shapes.add_textbox(Inches(7.1), Inches(1.9), Inches(5.0), Inches(4.7))
    tf_imp = tb_imp.text_frame
    tf_imp.word_wrap = True

    p_i1 = tf_imp.paragraphs[0]
    p_i1.text = "THE LARGER MISSION"
    p_i1.font.size = Pt(11)
    p_i1.font.bold = True
    p_i1.font.color.rgb = PURPLE
    p_i1.font.name = "Segoe UI"

    p_i2 = tf_imp.add_paragraph()
    p_i2.text = "Democratizing GD Preparation"
    p_i2.font.size = Pt(20)
    p_i2.font.bold = True
    p_i2.font.color.rgb = TEXT_LIGHT
    p_i2.font.name = "Segoe UI"

    tf_imp.add_paragraph().text = ""
    p_impact_text = tf_imp.add_paragraph()
    p_impact_text.text = "In India, over 1.5 million engineering and MBA graduates face high-stakes corporate group discussions annually, yet quality coaching is expensive, inaccessible, and anxiety-inducing.\n\nGD Arena AI levels the playing field: giving every student an on-demand, intelligent practice room that coaches not just for aggression, but for structured reasoning, active listening, and balanced collaboration."
    p_impact_text.font.size = Pt(12)
    p_impact_text.font.color.rgb = TEXT_MUTED
    p_impact_text.font.name = "Segoe UI"

    tf_imp.add_paragraph().text = ""
    # Closing card
    p_close = tf_imp.add_paragraph()
    p_close.text = "THANK YOU!"
    p_close.font.size = Pt(22)
    p_close.font.bold = True
    p_close.font.color.rgb = CYAN
    p_close.font.name = "Segoe UI"

    p_by = tf_imp.add_paragraph()
    p_by.text = "Presented by Nakul Gupta & Rudra Pratap Shukla"
    p_by.font.size = Pt(13)
    p_by.font.bold = True
    p_by.font.color.rgb = TEXT_LIGHT
    p_by.font.name = "Segoe UI"

    p_repo = tf_imp.add_paragraph()
    p_repo.text = "Repository: github.com/RudraPratapShukla/GD_Arena"
    p_repo.font.size = Pt(11)
    p_repo.font.color.rgb = TEXT_DIM
    p_repo.font.name = "Segoe UI"

    # Save presentation
    output_path = os.path.abspath("GD_Arena_Presentation.pptx")
    prs.save(output_path)
    print(f"Presentation successfully created at: {output_path}")

if __name__ == "__main__":
    create_presentation()
