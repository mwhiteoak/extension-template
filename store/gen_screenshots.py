"""
Generate 3 Chrome Web Store screenshots (1280x800) for
Lightroom Web Keyboard Enhancer.
"""
from PIL import Image, ImageDraw, ImageFont
import os, math

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
W, H = 1280, 800

# ---------------------------------------------------------------------------
# Font helpers – fall back to default if system fonts aren't found
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

def draw_toggle(draw, x, y, on=True, scale=1.0):
    tw = int(44 * scale)
    th = int(24 * scale)
    bg = "#1a73e8" if on else "#c0c0c0"
    draw.rounded_rectangle([x, y, x+tw, y+th], radius=th//2, fill=bg)
    knob_d = int(18 * scale)
    pad = int(3 * scale)
    kx = x + tw - knob_d - pad if on else x + pad
    ky = y + pad
    draw.ellipse([kx, ky, kx+knob_d, ky+knob_d], fill="#ffffff")

def shadow_text(draw, pos, text, fnt, fill, shadow_col="#00000055", offset=(2,2)):
    draw.text((pos[0]+offset[0], pos[1]+offset[1]), text, font=fnt, fill=shadow_col)
    draw.text(pos, text, font=fnt, fill=fill)

def centered_text(draw, y, text, fnt, fill, img_w=W):
    bb = fnt.getbbox(text)
    tw = bb[2] - bb[0]
    draw.text(((img_w - tw) // 2, y), text, font=fnt, fill=fill)

def kbd_badge(draw, x, y, text, fnt):
    bb = fnt.getbbox(text)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    pad_x, pad_y = 12, 6
    bw, bh = tw + pad_x*2, th + pad_y*2
    draw.rounded_rectangle([x, y, x+bw, y+bh], radius=5,
                           fill="#2a2a2a", outline="#555555", width=1)
    draw.text((x+pad_x, y+pad_y), text, font=fnt, fill="#e0e0e0")
    return bw, bh

# ---------------------------------------------------------------------------
# Color palette
# ---------------------------------------------------------------------------
BG_DARK   = "#1a1a1a"
BG_DARKER = "#111111"
BG_PANEL  = "#242424"
ACCENT    = "#1a73e8"
ACCENT_LIGHT = "#4a93f8"
AMBER     = "#ff9800"
TEXT_WH   = "#f0f0f0"
TEXT_GR   = "#999999"
TEXT_DIM  = "#666666"
GREEN     = "#4caf50"
RED_FLAG  = "#e53935"

# ===========================================================================
# SCREENSHOT 1 — Popup / Cheat Sheet
# ===========================================================================
def make_screenshot_1():
    img = Image.new("RGB", (W, H), BG_DARKER)
    draw = ImageDraw.Draw(img)

    # ── Photo background simulation ──────────────────────────────────────
    # Simulate a dark landscape photo with gradient bands
    for y in range(H):
        t = y / H
        r = int(20 + 30 * t)
        g = int(18 + 20 * t)
        b = int(25 + 45 * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Subtle photo-like shapes (mountains/horizon)
    for i in range(6):
        cx = 100 + i * 200
        pts = [(cx-180, H), (cx, 260+i*15), (cx+180, H)]
        draw.polygon(pts, fill=(15+i*3, 20+i*2, 30+i*5))

    # Stars overlay
    import random
    random.seed(42)
    for _ in range(150):
        sx = random.randint(0, W)
        sy = random.randint(0, int(H*0.45))
        br = random.randint(140, 255)
        r2 = random.randint(0, 1)
        draw.ellipse([sx-r2, sy-r2, sx+r2, sy+r2], fill=(br, br, br))

    # ── Headline text ────────────────────────────────────────────────────
    f_hero = font(52, bold=True)
    f_sub  = font(24)
    shadow_text(draw, (W//2 - 350, 48), "Cull Faster. No Mouse Required.", f_hero, TEXT_WH,
                shadow_col="#00000088", offset=(3, 3))
    centered_text(draw, 120, "Keyboard shortcuts for Lightroom Web — pick, rate, and navigate at full speed", f_sub, TEXT_GR)

    # ── Browser chrome mock ──────────────────────────────────────────────
    bc_x, bc_y = 380, 170
    bc_w, bc_h = 520, 420
    # Window shadow
    shadow = Image.new("RGBA", (bc_w+20, bc_h+20), (0,0,0,0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle([10, 10, bc_w+10, bc_h+10], radius=12, fill=(0,0,0,120))
    img_rgba = img.convert("RGBA")
    img_rgba.paste(shadow, (bc_x-10, bc_y-10), shadow)
    img = img_rgba.convert("RGB")
    draw = ImageDraw.Draw(img)

    # Browser window
    draw.rounded_rectangle([bc_x, bc_y, bc_x+bc_w, bc_y+bc_h], radius=10,
                           fill="#2d2d2d", outline="#444444", width=1)
    # Title bar
    draw.rounded_rectangle([bc_x, bc_y, bc_x+bc_w, bc_y+36], radius=10, fill="#383838")
    draw.rectangle([bc_x, bc_y+26, bc_x+bc_w, bc_y+36], fill="#383838")
    # Traffic lights
    for i, col in enumerate(["#ff5f57", "#ffbd2e", "#28c840"]):
        draw.ellipse([bc_x+12+i*22, bc_y+11, bc_x+12+i*22+13, bc_y+11+13], fill=col)
    # URL bar
    draw.rounded_rectangle([bc_x+80, bc_y+8, bc_x+bc_w-20, bc_y+28], radius=4, fill="#1e1e1e")
    f_url = font(11)
    draw.text((bc_x+90, bc_y+12), "lightroom.adobe.com/library", font=f_url, fill="#888888")

    # ── Extension popup inside browser ───────────────────────────────────
    pop_x = bc_x + bc_w - 310  # right-aligned
    pop_y = bc_y + 36
    pop_w, pop_h = 300, 340
    draw.rectangle([pop_x, pop_y, pop_x+pop_w, pop_y+pop_h], fill="#ffffff")

    # Popup header
    draw.rectangle([pop_x, pop_y, pop_x+pop_w, pop_y+38], fill="#f8f8f8")
    draw.line([(pop_x, pop_y+38), (pop_x+pop_w, pop_y+38)], fill="#e0e0e0")
    f_title = font(14, bold=True)
    draw.text((pop_x+14, pop_y+12), "LR Keyboard Shortcuts", font=f_title, fill="#1a1a1a")
    draw.text((pop_x+pop_w-24, pop_y+12), "⚙", font=font(16), fill="#888888")

    # Enable toggle row
    draw.rectangle([pop_x+10, pop_y+46, pop_x+pop_w-10, pop_y+72], fill="#f5f5f5")
    draw.rounded_rectangle([pop_x+10, pop_y+46, pop_x+pop_w-10, pop_y+72], radius=6, fill="#f5f5f5")
    draw.text((pop_x+20, pop_y+55), "Shortcuts active", font=font(12, bold=True), fill="#333333")
    draw_toggle(draw, pop_x+pop_w-62, pop_y+52, on=True, scale=0.9)

    # Cheat sheet table
    shortcuts = [
        ("P",              "Pick (flag)",       True),
        ("X",              "Reject",            True),
        ("U",              "Unflag",            True),
        ("1 – 5",          "Star rating",       True),
        ("←  →",           "Navigate",          True),
        ("Shift+P",        "Pick + advance",    True),
    ]
    f_key  = mono(12)
    f_act  = font(12)
    f_chip = font(10, bold=True)
    f_hdr  = font(10)

    ty = pop_y + 82
    draw.line([(pop_x+10, ty), (pop_x+pop_w-10, ty)], fill="#e0e0e0")
    draw.text((pop_x+14, ty-14), "KEY", font=f_hdr, fill="#aaaaaa")
    draw.text((pop_x+90, ty-14), "ACTION", font=f_hdr, fill="#aaaaaa")
    draw.text((pop_x+pop_w-70, ty-14), "STATUS", font=f_hdr, fill="#aaaaaa")
    ty += 4

    for key, action, enabled in shortcuts:
        row_h = 30
        # Key badge
        draw.rounded_rectangle([pop_x+14, ty+5, pop_x+14+52, ty+24], radius=3,
                               fill="#f0f0f0", outline="#cccccc", width=1)
        draw.text((pop_x+18, ty+8), key, font=f_key, fill="#333333")
        draw.text((pop_x+90, ty+8), action, font=f_act, fill="#333333" if enabled else "#bbbbbb")
        # Status chip
        chip_text = "ON" if enabled else "OFF"
        chip_fill = "#e8f5e9" if enabled else "#fafafa"
        chip_text_col = "#2e7d32" if enabled else "#bbbbbb"
        chip_x = pop_x + pop_w - 50
        draw.rounded_rectangle([chip_x, ty+7, chip_x+36, ty+22], radius=3, fill=chip_fill)
        draw.text((chip_x+6, ty+9), chip_text, font=f_chip, fill=chip_text_col)
        ty += row_h
        draw.line([(pop_x+10, ty), (pop_x+pop_w-10, ty)], fill="#f5f5f5")

    # Auto-advance row
    draw.text((pop_x+14, ty+8), "Auto-advance after flag/rating", font=font(10), fill="#666666")
    draw.rounded_rectangle([pop_x+pop_w-52, ty+6, pop_x+pop_w-16, ty+20], radius=3, fill="#e8f5e9")
    draw.text((pop_x+pop_w-48, ty+8), "ON", font=f_chip, fill="#2e7d32")
    ty += 28

    # Upgrade banner
    draw.rounded_rectangle([pop_x+10, ty, pop_x+pop_w-10, ty+34], radius=5,
                           fill="#fff8e1", outline="#ffe082", width=1)
    draw.text((pop_x+16, ty+8), "⭐ Upgrade to Pro for cloud backup", font=font(10), fill="#5d4037")
    draw.rounded_rectangle([pop_x+pop_w-56, ty+7, pop_x+pop_w-14, ty+26], radius=3, fill="#ff9800")
    draw.text((pop_x+pop_w-50, ty+10), "$7/mo", font=font(10, bold=True), fill="#ffffff")

    # ── LR web photo strip (left side of browser) ────────────────────────
    strip_x = bc_x + 10
    strip_y = bc_y + 36
    strip_w = pop_x - bc_x - 20
    strip_h = pop_h
    # Photo grid (2 cols x 4 rows)
    photo_colors = [
        ("#3d2b1f","#5a3d2b"),("#1f2d3d","#2b3d5a"),
        ("#2b3d1f","#3d5a2b"),("#3d1f2b","#5a2b3d"),
        ("#2b1f3d","#3d2b5a"),("#1f3d2b","#2b5a3d"),
        ("#3d3d1f","#5a5a2b"),("#1f1f3d","#2b2b5a"),
    ]
    ph_w = (strip_w - 8) // 2
    ph_h = (strip_h - 8) // 4 - 2
    for row in range(4):
        for col in range(2):
            px = strip_x + col*(ph_w+4)
            py = strip_y + row*(ph_h+4)
            c1, c2 = photo_colors[row*2+col]
            # Simple 2-color gradient via bands
            for band in range(ph_h):
                t = band / ph_h
                r1,g1,b1 = tuple(int(c1[i:i+2],16) for i in (1,3,5))
                r2,g2,b2 = tuple(int(c2[i:i+2],16) for i in (1,3,5))
                bc_col = (int(r1+t*(r2-r1)), int(g1+t*(g2-g1)), int(b1+t*(b2-b1)))
                draw.line([(px, py+band), (px+ph_w, py+band)], fill=bc_col)
            # Pick flag on first photo
            if row == 0 and col == 0:
                draw.rectangle([px, py, px+ph_w, py+ph_h], outline="#4caf50", width=2)
                draw.text((px+4, py+4), "P ✓", font=font(11, bold=True), fill="#4caf50")
            # Star rating on second
            if row == 0 and col == 1:
                draw.text((px+4, py+ph_h-20), "★★★★☆", font=font(10), fill="#ffcc00")

    # ── Call-to-action label ─────────────────────────────────────────────
    f_cta = font(18, bold=True)
    draw.rounded_rectangle([80, 630, 560, 690], radius=8, fill="#1a73e888")
    draw.text((100, 643), "Click the puzzle icon  →  Open popup  →  Start culling", font=f_cta, fill=TEXT_WH)

    img.save(os.path.join(OUT_DIR, "screenshot1_popup.png"))
    print("OK screenshot1_popup.png")


# ===========================================================================
# SCREENSHOT 2 — Options Page
# ===========================================================================
def make_screenshot_2():
    img = Image.new("RGB", (W, H), "#f0f0f0")
    draw = ImageDraw.Draw(img)

    # Light grey background gradient
    for y in range(H):
        t = y / H
        shade = int(245 - 10 * t)
        draw.line([(0, y), (W, y)], fill=(shade, shade, shade))

    # ── Page header ──────────────────────────────────────────────────────
    draw.rectangle([0, 0, W, 70], fill="#ffffff")
    draw.line([(0, 70), (W, 70)], fill="#e0e0e0", width=1)
    f_h1 = font(28, bold=True)
    draw.text((60, 18), "Lightroom Web Keyboard Enhancer", font=f_h1, fill="#1a1a1a")
    # Small extension icon area
    draw.rounded_rectangle([18, 14, 50, 46], radius=6, fill="#1a73e8")
    draw.text((24, 18), "LR", font=font(16, bold=True), fill="#ffffff")

    # ── Two-column layout ────────────────────────────────────────────────
    # Left column: Global Settings + Save
    col1_x = 60
    col2_x = 680
    card_w1 = 560
    card_w2 = 500

    # ── Card: Global Settings ────────────────────────────────────────────
    cy = 100
    draw.rounded_rectangle([col1_x, cy, col1_x+card_w1, cy+140], radius=8,
                           fill="#ffffff", outline="#e8e8e8", width=1)
    draw.text((col1_x+20, cy+16), "Global Settings", font=font(16, bold=True), fill="#1a1a1a")

    # Toggle rows
    settings = [
        ("Enable keyboard shortcuts", "Master switch — disables all shortcuts when off", True),
        ("Auto-advance after flag or rating", "Moves to next photo after P / X / U / 1–5", True),
    ]
    ty = cy + 48
    for label, hint, on in settings:
        draw.line([(col1_x+16, ty-1), (col1_x+card_w1-16, ty-1)], fill="#f0f0f0")
        draw.text((col1_x+20, ty+6), label, font=font(13, bold=True), fill="#1a1a1a")
        draw.text((col1_x+20, ty+24), hint, font=font(11), fill="#888888")
        draw_toggle(draw, col1_x+card_w1-64, ty+10, on=on, scale=1.1)
        ty += 46

    # ── Card: Shortcut Key Mapping ───────────────────────────────────────
    cy2 = 260
    card_h2 = 430
    draw.rounded_rectangle([col1_x, cy2, col1_x+card_w1, cy2+card_h2], radius=8,
                           fill="#ffffff", outline="#e8e8e8", width=1)
    draw.text((col1_x+20, cy2+16), "Shortcut Key Mapping", font=font(16, bold=True), fill="#1a1a1a")
    draw.text((col1_x+20, cy2+42), "Click any key field and press a key to remap.",
              font=font(11), fill="#888888")

    # Table header
    th_y = cy2 + 66
    draw.line([(col1_x+16, th_y+20), (col1_x+card_w1-16, th_y+20)], fill="#eeeeee", width=2)
    for txt, tx in [("ACTION", col1_x+20), ("KEY", col1_x+240), ("ENABLED", col1_x+360)]:
        draw.text((tx, th_y+4), txt, font=font(11, bold=True), fill="#888888")

    shortcuts = [
        ("Pick (flag ▶)",    "P",           True),
        ("Reject",           "X",           True),
        ("Unflag",           "U",           True),
        ("Star: 1",          "1",           True),
        ("Star: 2",          "2",           True),
        ("Star: 3",          "3",           True),
        ("Star: 4",          "4",           True),
        ("Star: 5",          "5",           True),
        ("Navigate ←",       "ArrowLeft",   True),
        ("Navigate →",       "ArrowRight",  True),
    ]
    row_y = th_y + 26
    for action, key, enabled in shortcuts:
        draw.text((col1_x+20, row_y+8), action, font=font(13), fill="#222222")
        # Key input box
        kx = col1_x + 236
        draw.rounded_rectangle([kx, row_y+4, kx+90, row_y+26], radius=4,
                               fill="#f8f8f8", outline="#cccccc", width=1)
        draw.text((kx+6, row_y+8), key, font=mono(12), fill="#333333")
        # Toggle
        draw_toggle(draw, col1_x+360, row_y+5, on=enabled, scale=0.85)
        row_y += 34
        draw.line([(col1_x+16, row_y), (col1_x+card_w1-16, row_y)], fill="#f5f5f5")

    # Reset button
    rb_y = cy2 + card_h2 - 52
    draw.rounded_rectangle([col1_x+20, rb_y, col1_x+160, rb_y+34], radius=4,
                           fill="#ffffff", outline="#1a73e8", width=1)
    draw.text((col1_x+42, rb_y+9), "Reset to Defaults", font=font(13), fill="#1a73e8")

    # ── Save button ──────────────────────────────────────────────────────
    sv_y = cy2 + card_h2 + 20
    draw.rounded_rectangle([col1_x, sv_y, col1_x+160, sv_y+40], radius=5, fill="#1a73e8")
    draw.text((col1_x+30, sv_y+11), "Save Settings", font=font(14, bold=True), fill="#ffffff")
    draw.text((col1_x+176, sv_y+12), "✓  Saved!", font=font(13), fill="#4caf50")

    # ── Right column ─────────────────────────────────────────────────────
    # Pro upgrade card (right side, top)
    pu_y = 100
    draw.rounded_rectangle([col2_x, pu_y, col2_x+card_w2, pu_y+180], radius=10,
                           fill="#1565c0")
    # Gradient-like effect
    for i in range(180):
        t = i / 180
        r = int(21 + t*30)
        g = int(101 + t*(-20))
        b = int(192 + t*(-50))
        draw.line([(col2_x, pu_y+i), (col2_x+card_w2, pu_y+i)], fill=(r,g,b))
    draw.rounded_rectangle([col2_x, pu_y, col2_x+card_w2, pu_y+180], radius=10,
                           fill=None, outline="#1976d2", width=1)

    draw.text((col2_x+20, pu_y+18), "⭐  Upgrade to Pro — $7/month",
              font=font(20, bold=True), fill="#ffffff")
    draw.text((col2_x+20, pu_y+56), "• Cloud backup of your shortcut config",
              font=font(14), fill="#bbdefb")
    draw.text((col2_x+20, pu_y+80), "• Team config sharing",
              font=font(14), fill="#bbdefb")
    draw.text((col2_x+20, pu_y+104), "• Priority support",
              font=font(14), fill="#bbdefb")
    draw.rounded_rectangle([col2_x+20, pu_y+130, col2_x+160, pu_y+160], radius=6, fill="#ffffff")
    draw.text((col2_x+44, pu_y+140), "Get Pro", font=font(14, bold=True), fill="#1565c0")

    # Right panel: feature highlights
    feat_y = 300
    feats = [
        ("⌨", "Works on lightroom.adobe.com", "Automatically activates on Lightroom Web"),
        ("🔄", "Auto-advance culling", "Moves to the next photo after every action"),
        ("🎯", "Fully remappable keys", "Assign any key to any action"),
        ("💾", "Settings synced", "Your config persists across sessions"),
    ]
    for icon, title, desc in feats:
        draw.rounded_rectangle([col2_x, feat_y, col2_x+card_w2, feat_y+72], radius=8,
                               fill="#ffffff", outline="#e8e8e8", width=1)
        draw.text((col2_x+16, feat_y+10), icon, font=font(28), fill="#1a1a1a")
        draw.text((col2_x+68, feat_y+12), title, font=font(14, bold=True), fill="#1a1a1a")
        draw.text((col2_x+68, feat_y+34), desc, font=font(12), fill="#666666")
        feat_y += 84

    img.save(os.path.join(OUT_DIR, "screenshot2_options.png"))
    print("OK screenshot2_options.png")


# ===========================================================================
# SCREENSHOT 3 — Hero Shot
# ===========================================================================
def make_screenshot_3():
    img = Image.new("RGB", (W, H), BG_DARKER)
    draw = ImageDraw.Draw(img)

    # ── Dark Lightroom-style background ─────────────────────────────────
    for y in range(H):
        t = y / H
        r = int(18 + 5*t)
        g = int(18 + 5*t)
        b = int(18 + 5*t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # ── Simulated Lightroom Web header ───────────────────────────────────
    draw.rectangle([0, 0, W, 52], fill="#1f1f1f")
    draw.line([(0, 52), (W, 52)], fill="#333333")

    # Adobe logo placeholder
    draw.rounded_rectangle([14, 12, 42, 40], radius=3, fill="#fa0f00")
    draw.text((18, 16), "Ai", font=font(16, bold=True), fill="#ffffff")
    draw.text((52, 16), "Lightroom", font=font(18, bold=True), fill="#e0e0e0")

    # Nav items
    nav_items = ["Library", "Edit", "Info", "Activity"]
    nx = 200
    for i, nav in enumerate(nav_items):
        col = "#ffffff" if i == 0 else "#888888"
        draw.text((nx, 17), nav, font=font(14, bold=True if i==0 else False), fill=col)
        if i == 0:
            draw.rectangle([nx, 48, nx+60, 52], fill="#1a73e8")
        nx += 100

    # Search / profile icons (right)
    draw.text((W-80, 16), "⚙  👤", font=font(16), fill="#888888")

    # ── Photo grid ──────────────────────────────────────────────────────
    # Left sidebar
    draw.rectangle([0, 52, 56, H], fill="#1a1a1a")
    sidebar_icons = ["☰", "★", "⚑", "🔍"]
    for i, ic in enumerate(sidebar_icons):
        draw.text((14, 80+i*52), ic, font=font(18), fill="#666666")

    # Grid area
    grid_x0 = 60
    grid_y0 = 60
    cols_n = 5
    rows_n = 3
    gap = 4
    ph_w = (W - grid_x0 - 10 - gap*(cols_n-1)) // cols_n
    ph_h = int(ph_w * 0.67)

    # Photo color palette – varied tones
    photo_themes = [
        ("#2a1a0a", "#5a3a18", "#8a5c28"),  # warm golden
        ("#0a1a2a", "#183050", "#2a4878"),  # blue cool
        ("#1a2a0a", "#304818", "#4a6a28"),  # forest green
        ("#2a0a1a", "#501830", "#783050"),  # wine/rose
        ("#0a2a1a", "#185030", "#288050"),  # teal
        ("#2a2a0a", "#484818", "#686828"),  # olive
        ("#1a0a2a", "#301848", "#503080"),  # purple
        ("#2a1a1a", "#503030", "#785040"),  # rust
        ("#0a1a1a", "#183030", "#285050"),  # dark teal
        ("#1a1a2a", "#303050", "#485078"),  # slate
        ("#2a0a0a", "#501818", "#783030"),  # dark red
        ("#0a2a2a", "#185050", "#288080"),  # cyan
        ("#2a2a1a", "#504818", "#787028"),  # khaki
        ("#1a0a0a", "#381818", "#582828"),  # deep brown
        ("#0a0a2a", "#181838", "#282858"),  # navy
    ]

    # Which cells have which state
    flags = {
        0: "pick",   # green border
        2: "pick",
        5: "reject", # red border
        7: "star4",
        9: "star5",
        11: "active", # currently focused (blue border + shortcut overlay)
        12: "pick",
        14: "star3",
    }

    all_cells = []
    for row in range(rows_n):
        for col in range(cols_n):
            idx = row * cols_n + col
            cx = grid_x0 + col * (ph_w + gap)
            cy = grid_y0 + row * (ph_h + gap)
            all_cells.append((idx, cx, cy, ph_w, ph_h))

            theme = photo_themes[idx % len(photo_themes)]
            c1 = theme[0]; c2 = theme[1]; c3 = theme[2]
            # Three-band gradient
            for band in range(ph_h):
                t = band / ph_h
                if t < 0.4:
                    s = t / 0.4
                    r1,g1,b1 = tuple(int(c1[i:i+2],16) for i in (1,3,5))
                    r2,g2,b2 = tuple(int(c2[i:i+2],16) for i in (1,3,5))
                else:
                    s = (t - 0.4) / 0.6
                    r1,g1,b1 = tuple(int(c2[i:i+2],16) for i in (1,3,5))
                    r2,g2,b2 = tuple(int(c3[i:i+2],16) for i in (1,3,5))
                bc = (int(r1+s*(r2-r1)), int(g1+s*(g2-g1)), int(b1+s*(b2-b1)))
                draw.line([(cx, cy+band), (cx+ph_w, cy+band)], fill=bc)

            # Add photographic detail (horizon line)
            hz = cy + int(ph_h * 0.45)
            draw.line([(cx, hz), (cx+ph_w, hz)], fill=(0,0,0,80))

            state = flags.get(idx, "normal")
            border_col = None
            if state == "pick":
                border_col = "#4caf50"
                # Green flag
                draw.rounded_rectangle([cx+4, cy+4, cx+30, cy+20], radius=2, fill="#4caf5099")
                draw.text((cx+6, cy+4), "P", font=font(12, bold=True), fill="#4caf50")
            elif state == "reject":
                border_col = "#e53935"
                draw.rounded_rectangle([cx+4, cy+4, cx+30, cy+20], radius=2, fill="#e5393599")
                draw.text((cx+6, cy+4), "X", font=font(12, bold=True), fill="#e53935")
            elif state == "star4":
                draw.text((cx+4, cy+ph_h-22), "★★★★☆", font=font(11), fill="#ffcc00")
            elif state == "star5":
                draw.text((cx+4, cy+ph_h-22), "★★★★★", font=font(11), fill="#ffcc00")
            elif state == "star3":
                draw.text((cx+4, cy+ph_h-22), "★★★☆☆", font=font(11), fill="#ffcc00")
            elif state == "active":
                border_col = "#1a73e8"
                # Highlight overlay
                overlay = Image.new("RGBA", (ph_w, ph_h), (26, 115, 232, 30))
                img_tmp = img.convert("RGBA")
                img_tmp.paste(overlay, (cx, cy), overlay)
                img = img_tmp.convert("RGB")
                draw = ImageDraw.Draw(img)

            if border_col:
                draw.rectangle([cx, cy, cx+ph_w, cy+ph_h], outline=border_col, width=2)

    # ── Keyboard shortcut overlay panel ─────────────────────────────────
    ov_x, ov_y = 800, 500
    ov_w, ov_h = 450, 260
    # Semi-transparent dark panel
    overlay_bg = Image.new("RGBA", (ov_w, ov_h), (15, 15, 15, 210))
    img_tmp2 = img.convert("RGBA")
    img_tmp2.paste(overlay_bg, (ov_x, ov_y), overlay_bg)
    img = img_tmp2.convert("RGB")
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([ov_x, ov_y, ov_x+ov_w, ov_y+ov_h], radius=12,
                           fill=None, outline="#1a73e8", width=2)

    draw.text((ov_x+20, ov_y+16), "⌨  Keyboard Shortcuts Active", font=font(15, bold=True), fill="#ffffff")
    draw.line([(ov_x+16, ov_y+42), (ov_x+ov_w-16, ov_y+42)], fill="#2a2a2a")

    key_items = [
        ("P",          "Pick / Flag",         "#4caf50"),
        ("X",          "Reject",              "#e53935"),
        ("U",          "Unflag",              "#888888"),
        ("1 – 5",      "Set star rating",     "#ffcc00"),
        ("← →",        "Navigate photos",     "#1a73e8"),
        ("Shift+P",    "Pick & advance",      "#4caf50"),
    ]
    ki_y = ov_y + 54
    ki_col = ov_x + 20
    for i, (key, action, ac) in enumerate(key_items):
        col_off = 0 if i < 3 else (ov_w // 2)
        row_off = i % 3
        kx = ov_x + 20 + col_off
        ky = ki_y + row_off * 60

        # Key badge
        draw.rounded_rectangle([kx, ky, kx+72, ky+28], radius=5,
                               fill="#1e1e1e", outline=ac, width=1)
        draw.text((kx+8, ky+6), key, font=mono(13), fill=ac)
        draw.text((kx+2, ky+32), action, font=font(11), fill="#aaaaaa")

    # ── Big headline overlay ─────────────────────────────────────────────
    hl_y = 550
    # Gradient banner behind headline
    for band in range(80):
        t = band / 80
        alpha = int(200 * (1 - t))
        shade = int(10 + 5*t)
        draw.line([(0, hl_y+band), (W, hl_y+band)], fill=(shade, shade, shade))

    f_big = font(44, bold=True)
    f_med = font(22)
    shadow_text(draw, (60, hl_y+4),
                "Cull your entire shoot with just a keyboard.", f_big, "#ffffff",
                shadow_col="#00000099", offset=(3,3))
    shadow_text(draw, (60, hl_y+60),
                "Pick · Reject · Rate · Navigate — never touch the mouse.", f_med, "#aaaaaa",
                shadow_col="#00000066", offset=(2,2))

    # Extension badge (bottom right)
    eb_x, eb_y = W-280, hl_y-10
    draw.rounded_rectangle([eb_x, eb_y, eb_x+260, eb_y+46], radius=8, fill="#1a73e8")
    draw.rounded_rectangle([eb_x+6, eb_y+5, eb_x+38, eb_y+37], radius=5, fill="#0d47a1")
    draw.text((eb_x+12, eb_y+10), "LR", font=font(18, bold=True), fill="#ffffff")
    draw.text((eb_x+48, eb_y+8), "LR Keyboard Enhancer", font=font(14, bold=True), fill="#ffffff")
    draw.text((eb_x+48, eb_y+26), "Free on Chrome Web Store", font=font(11), fill="#bbdefb")

    img.save(os.path.join(OUT_DIR, "screenshot3_hero.png"))
    print("OK screenshot3_hero.png")


if __name__ == "__main__":
    make_screenshot_1()
    make_screenshot_2()
    make_screenshot_3()
    print("All screenshots generated.")
