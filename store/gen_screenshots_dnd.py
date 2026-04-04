"""
Generate 3 Chrome Web Store screenshots (1280x800) for
D&D Beyond DM Prep Companion.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "output", "dnd_dm_companion_v1.0.0", "store", "screenshots"
)
os.makedirs(OUT_DIR, exist_ok=True)
W, H = 1280, 800

# ── Color palette — dark fantasy / D&D ──────────────────────────────────────
DARK_BG       = "#1a1a2e"
DEEP_BG       = "#0d0d1a"
PANEL_BG      = "#0f1a2e"
HEADER_BG     = "#0d0d1a"
ACCENT_RED    = "#e74c3c"
ACCENT_DARK   = "#c0392b"
GOLD          = "#f1c40f"
PRO_GOLD      = "#f39c12"
BLUE_PLAYER   = "#3498db"
GREEN_OK      = "#2ecc71"
ORANGE_HURT   = "#e67e22"
TEXT_WH       = "#e0e0e0"
TEXT_DIM      = "#999999"
TEXT_DARK     = "#333333"
BORDER        = "#333333"
INPUT_BG      = "#0f3460"

# ── Font helpers ─────────────────────────────────────────────────────────────
def font(size, bold=False):
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

def centered_text(draw, y, text, fnt, fill, img_w=W):
    bb = fnt.getbbox(text)
    tw = bb[2] - bb[0]
    draw.text(((img_w - tw) // 2, y), text, font=fnt, fill=fill)

def right_text(draw, y, text, fnt, fill, right_margin=40):
    bb = fnt.getbbox(text)
    tw = bb[2] - bb[0]
    draw.text((W - tw - right_margin, y), text, font=fnt, fill=fill)

def shadow_text(draw, pos, text, fnt, fill, shadow_col="#00000099", offset=(2, 3)):
    draw.text((pos[0]+offset[0], pos[1]+offset[1]), text, font=fnt, fill=shadow_col)
    draw.text(pos, text, font=fnt, fill=fill)

def draw_rounded_rect_fill(draw, x0, y0, x1, y1, r, fill, outline=None, width=1):
    draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=fill,
                            outline=outline or fill, width=width)

def add_shadow(img, x, y, w, h, r=10, opacity=100):
    shadow = Image.new("RGBA", (w + 16, h + 16), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([8, 8, w + 8, h + 8], radius=r, fill=(0, 0, 0, opacity))
    img_rgba = img.convert("RGBA")
    img_rgba.paste(shadow, (x - 8, y - 8), shadow)
    return img_rgba.convert("RGB")

def bg_gradient(w=W, h=H, top="#0d0d1a", bottom="#1a1a2e"):
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    tr, tg, tb = int(top[1:3], 16), int(top[3:5], 16), int(top[5:7], 16)
    br, bg_, bb = int(bottom[1:3], 16), int(bottom[3:5], 16), int(bottom[5:7], 16)
    for y in range(h):
        t = y / h
        r = int(tr + (br - tr) * t)
        g = int(tg + (bg_ - tg) * t)
        b = int(tb + (bb - tb) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    return img

def browser_frame(img, bx, by, bw, bh, url="dndbeyond.com/encounter-builder"):
    """Draw a browser window frame around a region."""
    img = add_shadow(img, bx, by, bw, bh, r=10, opacity=120)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([bx, by, bx+bw, by+bh], radius=10, fill="#1e1e2e", outline="#333", width=1)
    # Title bar
    draw.rounded_rectangle([bx, by, bx+bw, by+36], radius=10, fill="#12121f")
    draw.rectangle([bx, by+26, bx+bw, by+36], fill="#12121f")
    # Traffic lights
    for i, col in enumerate(["#ff5f57", "#ffbd2e", "#28c840"]):
        draw.ellipse([bx+12+i*20, by+11, bx+12+i*20+13, by+11+13], fill=col)
    # URL bar
    draw.rounded_rectangle([bx+75, by+7, bx+bw-15, by+28], radius=4, fill="#0f0f1a", outline="#333", width=1)
    draw.text((bx+84, by+11), url, font=font(11), fill="#666")
    return img, ImageDraw.Draw(img)


# ===========================================================================
# SCREENSHOT 1 — Initiative Tracker in Action
# ===========================================================================
def make_screenshot_1():
    img = bg_gradient(W, H, "#0a0a18", "#1a1a2e")
    draw = ImageDraw.Draw(img)

    # Background D&D Beyond page (left) + sidebar (right)
    # Left: faint D&D Beyond encounter page
    draw.rectangle([0, 0, W - 330, H], fill="#13131f")

    # D&D Beyond-style page content (simplified)
    draw.rectangle([0, 0, W - 330, 60], fill="#1e1e35")
    draw.text((30, 18), "D&D Beyond", font=font(18, bold=True), fill="#e74c3c")
    draw.text((180, 22), "Encounter Builder  ·  Goblin Ambush — Act II", font=font(14), fill="#888")

    # Page content area
    draw.text((40, 90), "Encounter: Goblin Ambush", font=font(20, bold=True), fill=TEXT_WH)
    draw.text((40, 118), "5 goblins • 1 goblin boss • 1 bugbear        CR 2  ·  Medium (450–899 XP)", font=font(13), fill="#888")
    draw.rectangle([40, 142, W-360, 143], fill="#333")

    # Faint monster entries
    for i, (name, cr, xp) in enumerate([
        ("Goblin", "1/4", "50 XP × 5"),
        ("Goblin Boss", "1", "200 XP × 1"),
        ("Bugbear", "1", "200 XP × 1"),
    ]):
        ey = 155 + i * 52
        draw.rectangle([40, ey, W-380, ey+46], fill="#0f0f1f")
        draw.rounded_rectangle([40, ey, W-380, ey+46], radius=5, fill="#0f0f1f", outline="#1e1e35", width=1)
        draw.text((60, ey+7), name, font=font(14, bold=True), fill=TEXT_WH)
        draw.text((60, ey+26), f"CR {cr}  ·  {xp}", font=font(11), fill=TEXT_DIM)

    # ── Sidebar ────────────────────────────────────────────────────────────
    sx = W - 328
    # Sidebar body
    draw.rectangle([sx, 0, W, H], fill=DARK_BG)
    draw.line([(sx, 0), (sx, H)], fill=ACCENT_DARK, width=2)

    # Header
    draw.rectangle([sx, 0, W, 42], fill=DEEP_BG)
    draw.line([(sx, 42), (W, 42)], fill=ACCENT_DARK, width=1)
    draw.text((sx + 12, 11), "⚔", font=font(18), fill=ACCENT_RED)
    draw.text((sx + 36, 13), "DM Companion", font=font(14, bold=True), fill=ACCENT_RED)
    draw.text((W - 28, 14), "✕", font=font(14), fill=TEXT_DIM)

    # Tabs
    tabs = ["Initiative", "Notes", "Encounter★", "Monsters★"]
    tab_w = 326 // 4
    for i, tab in enumerate(tabs):
        tx = sx + i * tab_w
        is_active = i == 0
        if is_active:
            draw.rectangle([tx, 43, tx + tab_w, 68], fill="#0f0f1a")
            draw.line([(tx, 66), (tx + tab_w, 66)], fill=ACCENT_RED, width=2)
            tcol = ACCENT_RED
        else:
            draw.rectangle([tx, 43, tx + tab_w, 68], fill=DEEP_BG)
            tcol = TEXT_DIM

        # Tab label
        bb = font(10, bold=True).getbbox(tab)
        tw = bb[2] - bb[0]
        draw.text((tx + (tab_w - tw) // 2, 52), tab, font=font(10, bold=True), fill=tcol)

    draw.line([(sx, 68), (W, 68)], fill=BORDER)

    # Round bar
    draw.rectangle([sx + 8, 76, W - 8, 104], fill=DEEP_BG)
    draw.rounded_rectangle([sx + 8, 76, W - 8, 104], radius=4, fill=DEEP_BG)
    draw.text((sx + 16, 83), "Round 2", font=font(13, bold=True), fill=ACCENT_RED)
    # Next button
    draw.rounded_rectangle([W - 100, 82, W - 16, 98], radius=4, fill=ACCENT_DARK)
    draw.text((W - 94, 84), "Next ▶", font=font(11, bold=True), fill=TEXT_WH)
    # Reset button
    draw.rounded_rectangle([W - 160, 82, W - 106, 98], radius=4, fill="#2c3e50")
    draw.text((W - 154, 84), "Reset", font=font(11), fill=TEXT_WH)

    # Combatants
    combatants = [
        ("Aria (Rogue)",       20, 28, 28, 14, True,  False),
        ("Goblin Boss",        18, 0,  21, 17, False, False),   # active turn
        ("Thorin (Fighter)",   16, 45, 45, 18, True,  False),
        ("Goblin 1",           14, 4,  7,  15, False, False),
        ("Goblin 2",           13, 7,  7,  15, False, False),
        ("Bugbear",            12, 22, 27, 16, False, False),
        ("Lira (Wizard)",      11, 14, 16, 12, True,  False),
        ("Goblin 3",            9, 0,  7,  15, False, True),  # dead
    ]

    cy = 110
    for i, (name, init, hp, maxhp, ac, is_player, is_dead) in enumerate(combatants):
        is_active = (i == 1)  # Goblin Boss is active
        row_bg = "#1a2a1a" if is_active else ("#0f1a2e" if not is_dead else "#0a0a0f")
        border_col = GOLD if is_active else (BLUE_PLAYER if is_player else "#333")

        draw.rounded_rectangle([sx + 6, cy, W - 6, cy + 38], radius=4, fill=row_bg)
        draw.line([(sx + 6, cy), (sx + 6, cy + 38)], fill=border_col, width=3)

        # Initiative
        draw.text((sx + 12, cy + 10), str(init), font=font(14, bold=True),
                  fill=GOLD if is_active else TEXT_DIM)

        # Name
        name_col = "#666" if is_dead else TEXT_WH
        draw.text((sx + 34, cy + 4), name, font=font(12, bold=True), fill=name_col)
        if is_dead:
            # strikethrough
            bb = font(12, bold=True).getbbox(name)
            mid_y = cy + 4 + (bb[3] - bb[1]) // 2
            draw.line([(sx + 34, mid_y), (sx + 34 + bb[2] - bb[0], mid_y)], fill="#666", width=1)

        # AC
        draw.text((sx + 34, cy + 22), f"🛡{ac}", font=font(10), fill=TEXT_DIM)

        # HP bar + display
        hp_pct = max(0, hp / maxhp) if maxhp > 0 else 0
        bar_x, bar_y, bar_w, bar_h = W - 110, cy + 10, 80, 8
        draw.rounded_rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h], radius=4, fill="#1a1a2e")
        if hp_pct > 0:
            bar_fill = GREEN_OK if hp_pct > 0.5 else (ORANGE_HURT if hp_pct > 0.25 else ACCENT_RED)
            draw.rounded_rectangle([bar_x, bar_y, bar_x + int(bar_w * hp_pct), bar_y + bar_h],
                                   radius=4, fill=bar_fill)
        hp_col = TEXT_DIM if is_dead else (ORANGE_HURT if hp_pct < 0.5 and hp > 0 else TEXT_WH)
        draw.text((bar_x, cy + 22), f"{hp}/{maxhp}", font=font(10), fill=hp_col)

        # Active indicator
        if is_active:
            draw.text((W - 22, cy + 12), "▶", font=font(12), fill=GOLD)

        cy += 43

    # ── Headlines (right side of browser area) ──
    # Top hero text overlay on dark background
    hero_x = 40
    shadow_text(draw, (hero_x, H - 140),
                "Run every fight with confidence.", font(32, bold=True),
                TEXT_WH, shadow_col="#00000099")
    draw.text((hero_x, H - 100),
              "Track initiative, HP, and turn order — all in one sidebar.", font=font(16), fill="#888")

    # Footer
    draw.rectangle([0, H - 44, W, H], fill=DEEP_BG)
    draw.line([(0, H - 44), (W, H - 44)], fill=ACCENT_DARK, width=1)
    centered_text(draw, H - 30, "D&D Beyond DM Prep Companion  ·  Free on Chrome Web Store",
                  font(13), TEXT_DIM)

    img.save(os.path.join(OUT_DIR, "screenshot1_initiative.png"))
    print("✓ screenshot1_initiative.png")


# ===========================================================================
# SCREENSHOT 2 — Encounter Difficulty Estimator
# ===========================================================================
def make_screenshot_2():
    img = bg_gradient(W, H, "#0a0a18", "#1e1020")
    draw = ImageDraw.Draw(img)

    # Left panel: hero text
    hero_x = 60
    shadow_text(draw, (hero_x, 56), "Know your encounter difficulty", font(34, bold=True),
                TEXT_WH, shadow_col="#00000099")
    shadow_text(draw, (hero_x, 100), "before the first dice roll.", font(34, bold=True),
                ACCENT_RED, shadow_col="#00000099")
    draw.text((hero_x, 148),
              "Add monsters to the encounter builder, set party size and level,", font=font(16), fill="#888")
    draw.text((hero_x, 170),
              "and instantly see Easy / Medium / Hard / Deadly thresholds.", font=font(16), fill="#888")

    # ── Sidebar panel mockup (right side) ─────────────────────────────────
    sx, sy = 740, 30
    pw, ph = 490, 720

    img = add_shadow(img, sx, sy, pw, ph, opacity=120)
    draw = ImageDraw.Draw(img)

    # Sidebar body
    draw.rounded_rectangle([sx, sy, sx+pw, sy+ph], radius=10, fill=DARK_BG, outline="#333", width=1)

    # Sidebar header
    draw.rounded_rectangle([sx, sy, sx+pw, sy+44], radius=10, fill=DEEP_BG)
    draw.rectangle([sx, sy+34, sx+pw, sy+44], fill=DEEP_BG)
    draw.line([(sx, sy+44), (sx+pw, sy+44)], fill=ACCENT_DARK, width=1)
    draw.text((sx+14, sy+12), "⚔", font=font(18), fill=ACCENT_RED)
    draw.text((sx+40, sy+14), "DM Companion", font=font(14, bold=True), fill=ACCENT_RED)

    # Tabs
    tabs = ["Initiative", "Notes", "Encounter ★", "Monsters ★"]
    tab_w = pw // 4
    for i, tab in enumerate(tabs):
        tx = sx + i * tab_w
        is_active = i == 2
        if is_active:
            draw.rectangle([tx, sy+44, tx+tab_w, sy+70], fill="#0f0f1a")
            draw.line([(tx, sy+68), (tx+tab_w, sy+68)], fill=ACCENT_RED, width=2)
            tcol = ACCENT_RED
        else:
            draw.rectangle([tx, sy+44, tx+tab_w, sy+70], fill=DEEP_BG)
            tcol = TEXT_DIM
        bb = font(10, bold=True).getbbox(tab)
        tw2 = bb[2] - bb[0]
        draw.text((tx + (tab_w - tw2) // 2, sy+55), tab, font=font(10, bold=True), fill=tcol)
    draw.line([(sx, sy+70), (sx+pw, sy+70)], fill=BORDER)

    content_x = sx + 12
    cy2 = sy + 80

    # Section: Party
    draw.text((content_x, cy2), "PARTY", font=font(10, bold=True), fill=ACCENT_RED)
    draw.line([(content_x, cy2+14), (sx+pw-12, cy2+14)], fill=BORDER)
    cy2 += 22

    # Party inputs row
    for label, val, ix in [("Size", "4", content_x+50), ("Avg Level", "8", content_x+170)]:
        draw.text((content_x if ix == content_x+50 else content_x+120, cy2+6), label, font=font(11), fill=TEXT_DIM)
        draw.rounded_rectangle([ix, cy2, ix+46, cy2+24], radius=4, fill=INPUT_BG, outline="#1e5080", width=1)
        draw.text((ix+14, cy2+4), str(val), font=font(13, bold=True), fill=TEXT_WH)

    draw.rounded_rectangle([content_x+220, cy2, content_x+298, cy2+24], radius=4, fill=ACCENT_DARK)
    draw.text((content_x+233, cy2+4), "Calculate", font=font(11, bold=True), fill=TEXT_WH)
    cy2 += 36

    # XP Thresholds for 4 players level 8 (each × 4)
    thresholds = [
        ("Easy",   "#2ecc71",  "1,800"),
        ("Medium", "#f1c40f",  "3,600"),
        ("Hard",   "#e67e22",  "5,600"),
        ("Deadly", "#e74c3c",  "8,400"),
    ]
    cell_w = (pw - 24) // 4
    for i, (label, col, val) in enumerate(thresholds):
        cx3 = content_x + i * cell_w
        draw.rounded_rectangle([cx3, cy2, cx3+cell_w-4, cy2+50], radius=5, fill=DEEP_BG)
        draw.text((cx3 + cell_w//2 - 16, cy2+6), label, font=font(10), fill=TEXT_DIM)
        bb = font(16, bold=True).getbbox(val)
        tw3 = bb[2] - bb[0]
        draw.text((cx3 + (cell_w - 4 - tw3) // 2, cy2+22), val, font=font(16, bold=True), fill=col)
    cy2 += 62

    # Section: Encounter Monsters
    draw.text((content_x, cy2), "ENCOUNTER MONSTERS", font=font(10, bold=True), fill=ACCENT_RED)
    draw.line([(content_x, cy2+14), (sx+pw-12, cy2+14)], fill=BORDER)
    cy2 += 22

    monsters_in_enc = [
        ("Goblin",      "1/4",  5, "250 XP"),
        ("Goblin Boss", "1",    1, "200 XP"),
        ("Bugbear",     "1",    1, "200 XP"),
    ]
    for name, cr, count, xp in monsters_in_enc:
        draw.rounded_rectangle([content_x, cy2, sx+pw-12, cy2+32], radius=4, fill=PANEL_BG)
        draw.text((content_x+8, cy2+8), name, font=font(12, bold=True), fill=TEXT_WH)
        draw.text((content_x+8, cy2+22 if False else cy2+8+14), f"CR {cr}  ·  {xp}", font=font(10), fill=TEXT_DIM)

        # Count controls
        cc_x = sx + pw - 110
        draw.rounded_rectangle([cc_x, cy2+6, cc_x+22, cy2+26], radius=3, fill="#2c3e50")
        draw.text((cc_x+6, cy2+7), "−", font=font(13, bold=True), fill=TEXT_WH)
        draw.text((cc_x+30, cy2+8), str(count), font=font(13, bold=True), fill=TEXT_WH)
        draw.rounded_rectangle([cc_x+48, cy2+6, cc_x+70, cy2+26], radius=3, fill="#2c3e50")
        draw.text((cc_x+54, cy2+7), "+", font=font(13, bold=True), fill=TEXT_WH)
        # Add to init button
        draw.rounded_rectangle([cc_x+78, cy2+6, cc_x+98, cy2+26], radius=3, fill="#2c3e50")
        draw.text((cc_x+82, cy2+8), "⚔", font=font(11), fill=ACCENT_RED)
        cy2 += 38

    cy2 += 6

    # Encounter result — HARD
    draw.rounded_rectangle([content_x, cy2, sx+pw-12, cy2+56], radius=6, fill=DEEP_BG)
    draw.line([(content_x, cy2), (sx+pw-12, cy2)], fill=BORDER)
    # Difficulty label
    result_text = "Hard"
    bb = font(26, bold=True).getbbox(result_text)
    tw4 = bb[2] - bb[0]
    draw.text((sx + pw//2 - tw4//2, cy2+8), result_text, font=font(26, bold=True), fill=ORANGE_HURT)
    draw.text((content_x+8, cy2+40), "650 XP × 2.0 = 1,300 adj. XP  (threshold: Hard 5,600)", font=font(10), fill=TEXT_DIM)
    cy2 += 68

    # Monster search
    draw.text((content_x, cy2), "ADD MONSTER", font=font(10, bold=True), fill=ACCENT_RED)
    draw.line([(content_x, cy2+14), (sx+pw-12, cy2+14)], fill=BORDER)
    cy2 += 22
    draw.rounded_rectangle([content_x, cy2, sx+pw-12, cy2+28], radius=4, fill=INPUT_BG, outline="#1e5080", width=1)
    draw.text((content_x+10, cy2+6), "Search monster to add…", font=font(12), fill="#444")
    cy2 += 36

    # Search results hint
    results = [("Troll", "CR 5"), ("Ogre", "CR 2"), ("Hobgoblin", "CR 1/2")]
    for rname, rcr in results:
        draw.rounded_rectangle([content_x, cy2, sx+pw-12, cy2+26], radius=3, fill="#2c3e50")
        draw.text((content_x+10, cy2+5), f"{rname} ({rcr})", font=font(12), fill=TEXT_WH)
        cy2 += 30

    # Left side annotations
    ann_y = 240
    annotations = [
        (250, ann_y,      PRO_GOLD,    "Adjusted XP"),
        (250, ann_y+80,   ORANGE_HURT, "Difficulty"),
        (250, ann_y+160,  ACCENT_RED,  "Encounter multiplier"),
        (250, ann_y+240,  "#3498db",   "Add to initiative"),
    ]
    for ax, ay, ac, at in annotations:
        draw.line([(ax, ay+8), (sx-8, ay+8)], fill=ac, width=1)
        bw2 = len(at) * 8 + 16
        draw.rounded_rectangle([ax-bw2, ay, ax, ay+22], radius=4, fill=ac)
        draw.text((ax-bw2+8, ay+3), at, font=font(10, bold=True), fill=TEXT_WH)

    # Footer
    draw.rectangle([0, H-44, W, H], fill=DEEP_BG)
    draw.line([(0, H-44), (W, H-44)], fill=ACCENT_DARK, width=1)
    centered_text(draw, H-30, "Pro Feature: Encounter Difficulty Estimator  ·  D&D Beyond DM Companion",
                  font(13), TEXT_DIM)

    img.save(os.path.join(OUT_DIR, "screenshot2_encounter.png"))
    print("✓ screenshot2_encounter.png")


# ===========================================================================
# SCREENSHOT 3 — Monster Quick-Reference
# ===========================================================================
def make_screenshot_3():
    img = bg_gradient(W, H, "#0a0a18", "#1a1030")
    draw = ImageDraw.Draw(img)

    # Hero text
    shadow_text(draw, (60, 50), "Every SRD monster, instantly.", font(36, bold=True),
                TEXT_WH, shadow_col="#00000099")
    draw.text((60, 98), "Search 80+ System Reference Document creatures without leaving D&D Beyond.", font=font(15), fill="#888")
    draw.text((60, 120), "AC, HP, ability scores, and key traits — one click to add to your initiative tracker.", font=font(15), fill="#888")

    # ── Sidebar mockup (center-right) ─────────────────────────────────────
    sx, sy = 380, 30
    pw, ph = 860, 720

    img = add_shadow(img, sx, sy, pw, ph, opacity=120)
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle([sx, sy, sx+pw, sy+ph], radius=10, fill=DARK_BG, outline="#333", width=1)

    # Header
    draw.rounded_rectangle([sx, sy, sx+pw, sy+44], radius=10, fill=DEEP_BG)
    draw.rectangle([sx, sy+34, sx+pw, sy+44], fill=DEEP_BG)
    draw.line([(sx, sy+44), (sx+pw, sy+44)], fill=ACCENT_DARK, width=1)
    draw.text((sx+14, sy+12), "⚔", font=font(18), fill=ACCENT_RED)
    draw.text((sx+40, sy+14), "DM Companion — Monster Quick-Reference (Pro)", font=font(14, bold=True), fill=ACCENT_RED)

    # Search bar
    draw.rounded_rectangle([sx+12, sy+56, sx+pw-12, sy+84], radius=5, fill=INPUT_BG, outline="#1e5080", width=1)
    draw.text((sx+24, sy+64), "dragon", font=font(14), fill=TEXT_WH)
    draw.text((sx+pw-70, sy+64), "Search ▸", font=font(11), fill=ACCENT_RED)
    draw.line([(sx, sy+86), (sx+pw, sy+86)], fill=BORDER)

    # Monster cards — 2 columns
    cards = [
        {
            "name": "Young Red Dragon", "cr": "10", "type": "dragon",
            "ac": 18, "hp": 178, "speed": "40 ft., climb 40 ft., fly 80 ft.",
            "str": 23, "dex": 10, "con": 21, "int": 16, "wis": 13, "cha": 20,
            "notes": "Multiattack, Fire Breath (Recharge 5–6); Immune to fire"
        },
        {
            "name": "Adult Red Dragon", "cr": "17", "type": "dragon",
            "ac": 19, "hp": 256, "speed": "40 ft., climb 40 ft., fly 80 ft.",
            "str": 27, "dex": 10, "con": 25, "int": 16, "wis": 13, "cha": 21,
            "notes": "Legendary Actions 3, Resistance 3/day, Fire Breath; Immune to fire"
        },
        {
            "name": "Ancient Red Dragon", "cr": "24", "type": "dragon",
            "ac": 22, "hp": 546, "speed": "40 ft., climb 40 ft., fly 80 ft.",
            "str": 30, "dex": 10, "con": 29, "int": 18, "wis": 15, "cha": 23,
            "notes": "Legendary Actions 3, Resistance 3/day, Fire Breath (26d6); Immune to fire"
        },
        {
            "name": "Wyvern", "cr": "6", "type": "dragon",
            "ac": 13, "hp": 110, "speed": "20 ft., fly 80 ft.",
            "str": 19, "dex": 10, "con": 16, "int": 5, "wis": 12, "cha": 6,
            "notes": "Multiattack (claws + tail stinger), Stinger (poison DC 15)"
        },
    ]

    col_w = (pw - 36) // 2
    for idx, card in enumerate(cards):
        col = idx % 2
        row = idx // 2
        cx3 = sx + 12 + col * (col_w + 12)
        cy3 = sy + 96 + row * 290

        # Card background
        draw.rounded_rectangle([cx3, cy3, cx3+col_w, cy3+275], radius=8, fill="#0d0d1a",
                               outline=ACCENT_DARK, width=1)

        # Card header
        draw.rounded_rectangle([cx3, cy3, cx3+col_w, cy3+44], radius=8, fill="#0f0f1f")
        draw.rectangle([cx3, cy3+34, cx3+col_w, cy3+44], fill="#0f0f1f")
        draw.text((cx3+12, cy3+6), card["name"], font=font(14, bold=True), fill=TEXT_WH)
        draw.text((cx3+12, cy3+26), f"CR {card['cr']}  ·  {card['type']}", font=font(10), fill=TEXT_DIM)

        # CR badge
        cr_badge_x = cx3+col_w-60
        badge_col = ACCENT_RED if float(card['cr']) >= 10 else (ORANGE_HURT if float(card['cr']) >= 5 else "#2ecc71") if card['cr'] not in ['1/4','1/8','1/2'] else "#2ecc71"
        draw.rounded_rectangle([cr_badge_x, cy3+8, cx3+col_w-10, cy3+32], radius=4, fill=badge_col)
        draw.text((cr_badge_x+8, cy3+12), f"CR {card['cr']}", font=font(11, bold=True), fill=TEXT_WH)

        # Stats row
        stats_y = cy3 + 52
        for s_label, s_val in [("AC", card["ac"]), ("HP", card["hp"]), ("Spd", card["speed"][:10])]:
            draw.rounded_rectangle([cx3+12, stats_y, cx3+col_w//3-2, stats_y+22], radius=3, fill=PANEL_BG)
            draw.text((cx3+18, stats_y+3), f"{s_label} {s_val}", font=font(10), fill=TEXT_WH)
            cx3 += col_w // 3
        cx3 -= col_w  # reset

        # Ability scores
        ab_y = stats_y + 30
        abilities = ["STR","DEX","CON","INT","WIS","CHA"]
        ab_scores = [card["str"], card["dex"], card["con"], card["int"], card["wis"], card["cha"]]
        ab_w = (col_w - 24) // 6
        for j, (ab, sc) in enumerate(zip(abilities, ab_scores)):
            ax2 = cx3 + 12 + j * ab_w
            draw.rounded_rectangle([ax2, ab_y, ax2+ab_w-2, ab_y+44], radius=3, fill=PANEL_BG)
            draw.text((ax2 + ab_w//2 - 8, ab_y+3), ab, font=font(8), fill=TEXT_DIM)
            draw.text((ax2 + ab_w//2 - 8, ab_y+15), str(sc), font=font(12, bold=True), fill=TEXT_WH)
            mod = (sc - 10) // 2
            mod_str = f"+{mod}" if mod >= 0 else str(mod)
            mod_col = GREEN_OK if mod > 0 else (ACCENT_RED if mod < 0 else TEXT_DIM)
            draw.text((ax2 + ab_w//2 - 8, ab_y+30), mod_str, font=font(9), fill=mod_col)

        # Notes
        notes_y = ab_y + 56
        draw.text((cx3+12, notes_y), card["notes"], font=font(9), fill="#aaa")

        # Action buttons
        btn_y = cy3 + 245
        draw.rounded_rectangle([cx3+12, btn_y, cx3+col_w//2-4, btn_y+22], radius=4, fill=ACCENT_DARK)
        draw.text((cx3+20, btn_y+4), "+ Initiative", font=font(10, bold=True), fill=TEXT_WH)
        draw.rounded_rectangle([cx3+col_w//2+2, btn_y, cx3+col_w-12, btn_y+22], radius=4, fill="#2c3e50")
        draw.text((cx3+col_w//2+10, btn_y+4), "+ Encounter", font=font(10, bold=True), fill=TEXT_WH)

    # Left hero footnote
    draw.text((60, H-180), "No server calls —", font=font(18, bold=True), fill=TEXT_WH)
    draw.text((60, H-154), "all SRD data is bundled", font=font(18, bold=True), fill=TEXT_WH)
    draw.text((60, H-128), "in the extension.", font=font(18, bold=True), fill=ACCENT_RED)

    # Pro badge on left
    draw.rounded_rectangle([60, H-96, 240, H-68], radius=5,
                           fill=PRO_GOLD)
    draw.text((76, H-90), "★ Pro Feature", font=font(15, bold=True), fill=TEXT_WH)

    # Footer
    draw.rectangle([0, H-44, W, H], fill=DEEP_BG)
    draw.line([(0, H-44), (W, H-44)], fill=ACCENT_DARK, width=1)
    centered_text(draw, H-30, "Monster Quick-Reference  ·  D&D Beyond DM Prep Companion  ·  Pro $6/mo",
                  font(13), TEXT_DIM)

    img.save(os.path.join(OUT_DIR, "screenshot3_monsters.png"))
    print("✓ screenshot3_monsters.png")


# ===========================================================================
if __name__ == "__main__":
    make_screenshot_1()
    make_screenshot_2()
    make_screenshot_3()
    print(f"\nAll screenshots saved to:\n  {OUT_DIR}")
