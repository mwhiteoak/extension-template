"""
Generate 3 Chrome Web Store screenshots (1280x800) for
Proposal Template Manager.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
W, H = 1280, 800

# ---------------------------------------------------------------------------
# Font helpers
# ---------------------------------------------------------------------------
def font(size, bold=False):
    candidates = []
    if bold:
        candidates = [
            "C:/Windows/Fonts/segoeui_bold.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/verdanab.ttf",
        ]
    else:
        candidates = [
            "C:/Windows/Fonts/segoeui.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/verdana.ttf",
        ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def mono(size):
    candidates = [
        "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/cour.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

# ---------------------------------------------------------------------------
# Drawing helpers
# ---------------------------------------------------------------------------
def rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)

def centered_text(draw, y, text, fnt, fill, img_w=W):
    bb = fnt.getbbox(text)
    tw = bb[2] - bb[0]
    draw.text(((img_w - tw) // 2, y), text, font=fnt, fill=fill)

def draw_badge(draw, x, y, text, fnt, bg, fg="#ffffff"):
    bb = fnt.getbbox(text)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    px, py = 10, 5
    draw.rounded_rectangle([x, y, x+tw+px*2, y+th+py*2], radius=4, fill=bg)
    draw.text((x+px, y+py), text, font=fnt, fill=fg)
    return tw+px*2, th+py*2

def draw_variable_chip(draw, x, y, text, fnt):
    bb = fnt.getbbox(text)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    px, py = 8, 4
    draw.rounded_rectangle([x, y, x+tw+px*2, y+th+py*2], radius=3,
                           fill="#1a4a7a", outline="#2a7ae2", width=1)
    draw.text((x+px, y+py), text, font=fnt, fill="#6ab0ff")
    return tw+px*2, th+py*2

# ---------------------------------------------------------------------------
# Color palette — professional blue/green for Upwork/productivity feel
# ---------------------------------------------------------------------------
BG_DARK   = "#0d1117"
BG_PANEL  = "#161b22"
BG_CARD   = "#1c2128"
BG_INPUT  = "#21262d"
BORDER    = "#30363d"
ACCENT    = "#1d7a54"   # Upwork green
ACCENT2   = "#2a7ae2"   # blue
TEXT_WH   = "#e6edf3"
TEXT_GR   = "#8b949e"
TEXT_DIM  = "#484f58"
GREEN     = "#3fb950"
AMBER     = "#d29922"
RED       = "#f85149"
UPWORK_GR = "#14a800"

# ===========================================================================
# SCREENSHOT 1 — Extension Popup: Quick Stats Dashboard
# ===========================================================================
def make_screenshot_1():
    img = Image.new("RGB", (W, H), BG_DARK)
    draw = ImageDraw.Draw(img)

    # --- Background: Upwork-style job listing (blurred/dimmed) ---
    # Left column: job list
    for i in range(6):
        y = 60 + i * 110
        draw.rounded_rectangle([40, y, 600, y+95], radius=8,
                               fill=BG_PANEL, outline=BORDER, width=1)
        # Job title line
        draw.rounded_rectangle([60, y+15, 60+180+i*20, y+28], radius=3, fill=TEXT_DIM)
        # Skills chips
        for j in range(3):
            draw.rounded_rectangle([60+j*90, y+38, 60+j*90+75, y+52], radius=10, fill=BG_INPUT)
        # Budget line
        draw.rounded_rectangle([60, y+60, 160, y+72], radius=3, fill=TEXT_DIM)
        draw.rounded_rectangle([170, y+60, 250, y+72], radius=3, fill=BG_INPUT)

    # Right dim area
    draw.rectangle([640, 0, W, H], fill="#0a0e13")

    # --- Popup window centered ---
    px, py = (W - 320) // 2, (H - 480) // 2
    pw, ph = 320, 480

    # Drop shadow
    draw.rounded_rectangle([px+6, py+6, px+pw+6, py+ph+6], radius=12,
                           fill="#00000088")
    # Popup body
    draw.rounded_rectangle([px, py, px+pw, py+ph], radius=12,
                           fill=BG_PANEL, outline=BORDER, width=1)

    # Header bar
    draw.rounded_rectangle([px, py, px+pw, py+56], radius=12, fill=ACCENT)
    draw.rounded_rectangle([px, py+44, px+pw, py+56], radius=0, fill=ACCENT)

    # Extension icon (small green square with P)
    draw.rounded_rectangle([px+16, py+14, px+38, py+36], radius=5, fill="#0a6e3f")
    draw.text((px+22, py+16), "P", font=font(16, bold=True), fill="#ffffff")

    draw.text((px+50, py+16), "Proposal Template Manager", font=font(14, bold=True), fill="#ffffff")

    # Win-rate circle
    cx, cy, r = px+pw//2, py+130, 60
    # Background circle
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=BG_CARD, outline=BORDER, width=2)
    # Arc segments for win rate (34% win rate)
    import math
    # Draw arc for 34% (122 degrees)
    bbox = [cx-r+6, cy-r+6, cx+r-6, cy+r-6]
    draw.arc(bbox, start=-90, end=-90+360*0.34, fill=GREEN, width=8)
    draw.arc(bbox, start=-90+360*0.34, end=270, fill=BG_INPUT, width=8)
    draw.text((cx-28, cy-22), "34%", font=font(24, bold=True), fill=TEXT_WH)
    draw.text((cx-22, cy+6), "Win Rate", font=font(10), fill=TEXT_GR)

    # Label above circle
    draw.text((px+pw//2 - 40, py+68), "Your Performance", font=font(12, bold=True), fill=TEXT_GR)

    # Stat cards row
    stat_y = py+200
    stats = [("47", "Sent"), ("16", "Hired"), ("8", "Interview")]
    for i, (val, lbl) in enumerate(stats):
        sx = px+14 + i*99
        draw.rounded_rectangle([sx, stat_y, sx+88, stat_y+68], radius=8,
                               fill=BG_CARD, outline=BORDER, width=1)
        draw.text((sx+44 - font(22, bold=True).getbbox(val)[2]//2, stat_y+10),
                  val, font=font(22, bold=True), fill=TEXT_WH)
        draw.text((sx+44 - font(10).getbbox(lbl)[2]//2, stat_y+42),
                  lbl, font=font(10), fill=TEXT_GR)

    # Recent proposals label
    draw.text((px+14, py+286), "Recent Proposals", font=font(11, bold=True), fill=TEXT_GR)

    # Recent proposals list
    proposals = [
        ("Build a React Dashboard", "Hired", GREEN),
        ("WordPress Plugin Dev", "Interview", AMBER),
        ("REST API Integration", "Pending", TEXT_GR),
    ]
    for i, (title, status, color) in enumerate(proposals):
        ry = py+308 + i*46
        draw.rounded_rectangle([px+14, ry, px+pw-14, ry+38], radius=6,
                               fill=BG_CARD, outline=BORDER, width=1)
        draw.text((px+24, ry+8), title, font=font(11), fill=TEXT_WH)
        # Status dot
        dot_x = px+pw-60
        draw.ellipse([dot_x, ry+14, dot_x+8, ry+22], fill=color)
        draw.text((dot_x+12, ry+10), status, font=font(10), fill=color)

    # Bottom CTA button
    btn_y = py+ph-54
    draw.rounded_rectangle([px+14, btn_y, px+pw-14, btn_y+36], radius=8,
                           fill=ACCENT, outline="#0a6e3f", width=1)
    draw.text((px+pw//2 - 60, btn_y+10), "Open Template Library", font=font(12, bold=True), fill="#ffffff")

    # Caption overlay at bottom
    draw.rectangle([0, H-80, W, H], fill="#00000099")
    centered_text(draw, H-60, "Track win rates at a glance — see what's working, fix what's not", font(16), TEXT_WH)
    centered_text(draw, H-35, "Popup gives you instant proposal performance stats", font(12), TEXT_GR)

    img.save(os.path.join(OUT_DIR, "screenshot1_popup.png"))
    print("Saved screenshot1_popup.png")


# ===========================================================================
# SCREENSHOT 2 — Template Library Panel on Upwork Job Page
# ===========================================================================
def make_screenshot_2():
    img = Image.new("RGB", (W, H), BG_DARK)
    draw = ImageDraw.Draw(img)

    # --- Left: Upwork job listing page ---
    lw = 680  # left width

    # Upwork-style header bar
    draw.rectangle([0, 0, lw, 52], fill="#001e00")
    draw.text((20, 15), "U", font=font(22, bold=True), fill=UPWORK_GR)
    draw.text((46, 18), "pwork", font=font(18), fill=UPWORK_GR)
    # Nav items
    for i, nav in enumerate(["Find Work", "My Jobs", "Reports", "Messages"]):
        draw.text((160+i*110, 18), nav, font=font(12), fill="#8b949e")

    # Job title
    draw.text((40, 78), "Build a Full-Stack E-Commerce Dashboard", font=font(20, bold=True), fill=TEXT_WH)

    # Metadata chips
    meta = [("Posted 2 hours ago", "#2a2a2a"), ("$45–$80/hr", "#1a4a20"), ("React, Node.js", "#1a2a4a")]
    mx = 40
    for label, bg in meta:
        bb = font(12).getbbox(label)
        tw = bb[2]-bb[0]
        draw.rounded_rectangle([mx, 115, mx+tw+20, 138], radius=12, fill=bg)
        draw.text((mx+10, 118), label, font=font(12), fill=TEXT_WH)
        mx += tw + 32

    # Job description
    desc_lines = [
        "We are looking for an experienced full-stack developer to build a",
        "modern e-commerce dashboard. The ideal candidate has strong React",
        "and Node.js skills, experience with REST APIs, and can deliver",
        "clean, maintainable code. Budget is flexible for the right fit.",
        "",
        "Skills Required:",
    ]
    for i, line in enumerate(desc_lines):
        draw.text((40, 158+i*22), line, font=font(13), fill=TEXT_GR if line else TEXT_DIM)

    # Skills pills
    skills = ["React", "Node.js", "PostgreSQL", "REST API", "TypeScript"]
    sx = 40
    for skill in skills:
        bb = font(12).getbbox(skill)
        tw = bb[2]-bb[0]
        draw.rounded_rectangle([sx, 300, sx+tw+18, 322], radius=11,
                               fill=BG_CARD, outline=BORDER, width=1)
        draw.text((sx+9, 303), skill, font=font(12), fill=TEXT_WH)
        sx += tw + 26

    # Client info
    draw.text((40, 345), "About the Client", font=font(14, bold=True), fill=TEXT_WH)
    draw.text((40, 372), "★ 4.9  •  $12,450 spent  •  23 hires  •  United States", font=font(12), fill=TEXT_GR)

    # Faint separator
    draw.line([(lw, 0), (lw, H)], fill=BORDER, width=2)

    # --- Right: Template Panel ---
    rw = W - lw  # 600px wide
    draw.rectangle([lw, 0, W, H], fill=BG_PANEL)

    # Panel header
    draw.rectangle([lw, 0, W, 52], fill="#0d4a2e")
    draw.text((lw+16, 16), "Proposal Template Manager", font=font(14, bold=True), fill="#ffffff")
    # Close button
    draw.text((W-30, 16), "✕", font=font(14), fill=TEXT_GR)

    # Auto-detected variables section
    draw.text((lw+16, 68), "Auto-Detected Variables", font=font(12, bold=True), fill=TEXT_WH)
    draw.text((lw+16, 90), "Extracted from this job listing:", font=font(11), fill=TEXT_GR)

    vars_data = [
        ("{{job_title}}", "Build a Full-Stack E-Commerce Dashboard"),
        ("{{client_name}}", "TechVentures Inc."),
        ("{{budget}}", "$45–$80/hr"),
        ("{{key_skill}}", "React, Node.js"),
    ]
    for i, (var, val) in enumerate(vars_data):
        vy = 115 + i * 42
        draw.rounded_rectangle([lw+16, vy, W-16, vy+34], radius=6,
                               fill=BG_INPUT, outline=BORDER, width=1)
        vf = mono(10)
        bb = vf.getbbox(var)
        tw = bb[2]-bb[0]
        draw.text((lw+24, vy+9), var, font=vf, fill="#6ab0ff")
        draw.text((lw+24+tw+10, vy+9), "→", font=font(11), fill=TEXT_DIM)
        draw.text((lw+24+tw+28, vy+9), val[:32], font=font(11), fill=TEXT_WH)

    # Separator
    draw.line([(lw+16, 288), (W-16, 288)], fill=BORDER, width=1)

    # Template selector
    draw.text((lw+16, 300), "Choose Template", font=font(12, bold=True), fill=TEXT_WH)

    templates = [
        ("★ React/Node Expert Pitch", True),
        ("Full-Stack Dashboard Specialist", False),
        ("E-Commerce Pro Template", False),
    ]
    for i, (name, selected) in enumerate(templates):
        ty = 325 + i * 44
        bg = "#0d4a2e" if selected else BG_CARD
        border = "#14a800" if selected else BORDER
        draw.rounded_rectangle([lw+16, ty, W-16, ty+36], radius=6,
                               fill=bg, outline=border, width=1 if not selected else 2)
        draw.text((lw+28, ty+10), name, font=font(12, bold=True if selected else False),
                  fill=TEXT_WH if selected else TEXT_GR)
        if selected:
            draw.text((W-42, ty+10), "✓", font=font(13, bold=True), fill=GREEN)

    # Preview box
    draw.rounded_rectangle([lw+16, 462, W-16, 640], radius=8,
                           fill=BG_CARD, outline=BORDER, width=1)
    draw.text((lw+26, 472), "Preview (filled):", font=font(11, bold=True), fill=TEXT_GR)

    preview_lines = [
        "Hi TechVentures Inc.,",
        "",
        "I specialize in React and Node.js and have built",
        "several E-Commerce dashboards. Your Build a Full-",
        "Stack E-Commerce Dashboard project is a great fit.",
        "",
        "With your budget of $45–$80/hr, I can deliver...",
    ]
    for i, line in enumerate(preview_lines):
        draw.text((lw+26, 493+i*20), line, font=font(11), fill=TEXT_WH if line else TEXT_WH)

    # Insert button
    draw.rounded_rectangle([lw+16, 652, W-16, 690], radius=8, fill=ACCENT)
    centered_text(draw, 663, "Insert into Proposal", font(13, bold=True), "#ffffff", rw)
    # Fix center for right panel
    btn_text = "Insert into Proposal"
    bb = font(13, bold=True).getbbox(btn_text)
    tw = bb[2]-bb[0]
    draw.text((lw + (rw-tw)//2, 663), btn_text, font=font(13, bold=True), fill="#ffffff")

    # Caption
    draw.rectangle([0, H-80, W, H], fill="#00000099")
    centered_text(draw, H-60, "Auto-fills job variables from the page — send personalized proposals in seconds", font(16), TEXT_WH)
    centered_text(draw, H-35, "Works on Upwork job listings, proposal pages, and Fiverr requests", font(12), TEXT_GR)

    img.save(os.path.join(OUT_DIR, "screenshot2_panel.png"))
    print("Saved screenshot2_panel.png")


# ===========================================================================
# SCREENSHOT 3 — Options Page: Template Manager & Win-Rate Dashboard
# ===========================================================================
def make_screenshot_3():
    img = Image.new("RGB", (W, H), BG_DARK)
    draw = ImageDraw.Draw(img)

    # --- Left sidebar navigation ---
    sw = 220
    draw.rectangle([0, 0, sw, H], fill=BG_PANEL)

    # Logo area
    draw.rounded_rectangle([16, 20, 48, 52], radius=8, fill=ACCENT)
    draw.text((22, 26), "P", font=font(20, bold=True), fill="#ffffff")
    draw.text((58, 25), "Proposal", font=font(14, bold=True), fill=TEXT_WH)
    draw.text((58, 44), "Template Manager", font=font(10), fill=TEXT_GR)

    # Nav items
    nav_items = [
        ("📋", "Templates", True),
        ("📊", "Dashboard", False),
        ("📝", "Proposal Log", False),
        ("⚙", "Settings", False),
        ("⬆", "Upgrade to Pro", False),
    ]
    for i, (icon, label, active) in enumerate(nav_items):
        ny = 100 + i * 54
        if active:
            draw.rounded_rectangle([8, ny, sw-8, ny+42], radius=8, fill="#0d4a2e")
        draw.text((20, ny+12), icon, font=font(16), fill=TEXT_WH if active else TEXT_GR)
        draw.text((46, ny+14), label, font=font(13, bold=True if active else False),
                  fill=TEXT_WH if active else TEXT_GR)

    # Separator
    draw.line([(sw, 0), (sw, H)], fill=BORDER, width=1)

    # --- Main content area ---
    cx = sw + 24

    # Page title
    draw.text((cx, 28), "Template Library", font=font(22, bold=True), fill=TEXT_WH)
    draw.text((cx, 58), "Manage your proposal templates • 4 of 5 slots used (Free plan)",
              font=font(12), fill=TEXT_GR)

    # New template button
    btn_x = W - 200
    draw.rounded_rectangle([btn_x, 24, W-24, 56], radius=8, fill=ACCENT)
    draw.text((btn_x+20, 33), "+ New Template", font=font(13, bold=True), fill="#ffffff")

    # Stats row
    stats_y = 90
    stats = [
        ("47", "Total Sent", ACCENT2),
        ("34%", "Win Rate", GREEN),
        ("16", "Hired", GREEN),
        ("8", "Interviews", AMBER),
    ]
    stat_w = (W - sw - 48) // 4
    for i, (val, lbl, color) in enumerate(stats):
        sx = cx + i * (stat_w + 8)
        draw.rounded_rectangle([sx, stats_y, sx+stat_w, stats_y+72], radius=10,
                               fill=BG_CARD, outline=BORDER, width=1)
        draw.text((sx+16, stats_y+10), val, font=font(24, bold=True), fill=color)
        draw.text((sx+16, stats_y+44), lbl, font=font(11), fill=TEXT_GR)

    # Template cards grid
    template_data = [
        {
            "name": "★ React/Node Expert Pitch",
            "desc": "For full-stack JS roles. Auto-fills job_title, key_skill, budget.",
            "wins": "12W / 5L",
            "rate": "71%",
            "color": GREEN,
            "tags": ["React", "Node.js", "Full-Stack"],
        },
        {
            "name": "WordPress Developer",
            "desc": "For WP/PHP projects. Variables: client_name, budget, deadline.",
            "wins": "8W / 6L",
            "rate": "57%",
            "color": AMBER,
            "tags": ["WordPress", "PHP", "WooCommerce"],
        },
        {
            "name": "E-Commerce Specialist",
            "desc": "Shopify & WooCommerce focus. Highlights conversion expertise.",
            "wins": "6W / 4L",
            "rate": "60%",
            "color": AMBER,
            "tags": ["Shopify", "E-Commerce"],
        },
        {
            "name": "General Freelancer",
            "desc": "Catch-all template. Minimal variables, broad appeal.",
            "wins": "4W / 10L",
            "rate": "29%",
            "color": RED,
            "tags": ["General"],
        },
    ]

    card_y_start = 185
    card_h = 140
    cards_per_row = 2
    card_w = (W - sw - 48 - 16) // 2

    for i, t in enumerate(template_data):
        row = i // cards_per_row
        col = i % cards_per_row
        tx = cx + col * (card_w + 16)
        ty = card_y_start + row * (card_h + 14)

        draw.rounded_rectangle([tx, ty, tx+card_w, ty+card_h], radius=10,
                               fill=BG_CARD, outline=BORDER, width=1)

        # Color accent bar
        draw.rounded_rectangle([tx, ty, tx+4, ty+card_h], radius=2, fill=t["color"])

        # Name
        draw.text((tx+18, ty+14), t["name"], font=font(13, bold=True), fill=TEXT_WH)

        # Description
        desc_lines = [t["desc"][j:j+50] for j in range(0, len(t["desc"]), 50)]
        for dl, dline in enumerate(desc_lines[:2]):
            draw.text((tx+18, ty+36+dl*18), dline, font=font(10), fill=TEXT_GR)

        # Win rate badge
        draw.rounded_rectangle([tx+card_w-80, ty+12, tx+card_w-12, ty+34], radius=4,
                               fill=BG_INPUT)
        draw.text((tx+card_w-72, ty+16), t["wins"], font=font(10), fill=TEXT_GR)

        rate_x = tx+card_w-58
        rate_clr = t["color"]
        draw.text((tx+card_w-58, ty+38), f"{t['rate']} win", font=font(11, bold=True), fill=rate_clr)

        # Tags
        tag_x = tx+18
        for tag in t["tags"]:
            bb = font(10).getbbox(tag)
            tw_tag = bb[2]-bb[0]
            draw.rounded_rectangle([tag_x, ty+card_h-30, tag_x+tw_tag+12, ty+card_h-12],
                                   radius=8, fill=BG_INPUT, outline=BORDER, width=1)
            draw.text((tag_x+6, ty+card_h-28), tag, font=font(10), fill=TEXT_GR)
            tag_x += tw_tag + 20

        # Action buttons
        edit_x = tx+card_w-130
        draw.text((edit_x, ty+card_h-30), "Edit", font=font(11), fill=ACCENT2)
        draw.text((edit_x+40, ty+card_h-30), "Duplicate", font=font(11), fill=TEXT_GR)
        draw.text((edit_x+110, ty+card_h-30), "Delete", font=font(11), fill=RED)

    # Caption
    draw.rectangle([0, H-80, W, H], fill="#00000099")
    centered_text(draw, H-60, "See exactly which templates convert — refine your pitch with real win/loss data", font(16), TEXT_WH)
    centered_text(draw, H-35, "Manage templates, track outcomes, and optimize your proposal strategy", font(12), TEXT_GR)

    img.save(os.path.join(OUT_DIR, "screenshot3_options.png"))
    print("Saved screenshot3_options.png")


if __name__ == "__main__":
    make_screenshot_1()
    make_screenshot_2()
    make_screenshot_3()
    print("All 3 screenshots generated.")
