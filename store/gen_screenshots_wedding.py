"""
Generate 3 Chrome Web Store screenshots (1280x800) for
Wedding Vendor Comparison Overlay v1.0.0.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots_wedding")
os.makedirs(OUT_DIR, exist_ok=True)
W, H = 1280, 800

# ---------------------------------------------------------------------------
# Color palette — elegant wedding tones
# ---------------------------------------------------------------------------
BLUSH_DEEP     = "#8b3a5c"   # deep rose / primary
BLUSH_MID      = "#c4748e"   # mid rose
BLUSH_LIGHT    = "#e8b4c4"   # light blush
BLUSH_PALE     = "#fce8ef"   # very pale blush background
IVORY          = "#fdf8f2"   # near-white ivory
IVORY_DARK     = "#f0e8de"   # slightly darker ivory
GOLD           = "#c8922a"   # gold accent
GOLD_LIGHT     = "#f0d080"   # light gold
SAGE           = "#7a9e7e"   # sage green
SAGE_DARK      = "#4a6e4e"
TEXT_WH        = "#ffffff"
TEXT_DK        = "#3a1f2e"   # very dark rose/almost black
TEXT_GR        = "#888888"
TEXT_DIM       = "#bbbbbb"

# Status badge colors
STATUS_CONTACTED = "#5b8fd4"   # blue
STATUS_QUOTED    = "#e09820"   # amber
STATUS_BOOKED    = "#4caf50"   # green
STATUS_REJECTED  = "#c0c0c0"   # grey

# ---------------------------------------------------------------------------
# Font helpers
# ---------------------------------------------------------------------------
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

def centered_text(draw, y, text, fnt, color, width=W):
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, y), text, font=fnt, fill=color)

def right_text(draw, y, text, fnt, color, right_x):
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw = bbox[2] - bbox[0]
    draw.text((right_x - tw, y), text, font=fnt, fill=color)


# ---------------------------------------------------------------------------
# Screenshot 1: Side panel showing vendor tracking on WeddingWire
# ---------------------------------------------------------------------------
def make_screenshot_1():
    img = Image.new("RGB", (W, H), IVORY)
    draw = ImageDraw.Draw(img)

    # Header bar
    draw.rectangle([0, 0, W, 52], fill=BLUSH_DEEP)
    draw.text((18, 14), "WeddingWire", font=font(22, bold=True), fill=TEXT_WH)
    draw.text((180, 18), "Find your perfect wedding vendors", font=font(14), fill=BLUSH_LIGHT)
    # Extension badge in header
    draw.rounded_rectangle([W-180, 10, W-10, 42], radius=6, fill=BLUSH_MID)
    draw.text((W-172, 18), "♥  Wedding Tracker  ON", font=font(13, bold=True), fill=TEXT_WH)

    # Nav bar
    draw.rectangle([0, 52, W, 86], fill=IVORY_DARK)
    nav_items = ["Photographers", "Venues", "Caterers", "Florists", "DJs", "Cakes"]
    nx = 18
    for item in nav_items:
        draw.text((nx, 62), item, font=font(14), fill=BLUSH_DEEP)
        bbox = draw.textbbox((0, 0), item, font=font(14))
        nx += bbox[2] - bbox[0] + 28

    # === Main content area ===
    PANEL_W = 340
    CONTENT_W = W - PANEL_W

    # WeddingWire listing page
    draw.rectangle([0, 86, CONTENT_W, H], fill="#f8f5f0")
    draw.text((18, 100), "Photographers in Seattle, WA", font=font(18, bold=True), fill=TEXT_DK)
    draw.text((18, 126), "142 vendors found", font=font(12), fill=TEXT_GR)

    # Vendor listing cards
    vendors_on_page = [
        ("Blossom & Light Photography", "★ 4.9  (128 reviews)", "$2,800 – $5,200", True),
        ("Golden Hour Studios",          "★ 4.7  (94 reviews)",  "$3,500 – $6,000", False),
        ("Ivory Moments Co.",            "★ 4.8  (211 reviews)", "$2,200 – $4,800", True),
    ]
    cy = 154
    for vname, rating, price, tracked in vendors_on_page:
        card_h = 115
        draw.rounded_rectangle([14, cy, CONTENT_W-14, cy+card_h], radius=10, fill=TEXT_WH,
                                outline=BLUSH_LIGHT if tracked else IVORY_DARK, width=2 if tracked else 1)

        # Photo placeholder
        draw.rounded_rectangle([26, cy+12, 26+120, cy+card_h-12], radius=6, fill=IVORY_DARK)
        draw.text((50, cy+48), "📷", font=font(28), fill=BLUSH_LIGHT)

        # Details
        draw.text((162, cy+14), vname, font=font(14, bold=True), fill=TEXT_DK)
        draw.text((162, cy+36), rating, font=font(12), fill=GOLD)
        draw.text((162, cy+56), price, font=font(12), fill=TEXT_GR)

        # Track button / Tracked badge
        if tracked:
            draw.rounded_rectangle([CONTENT_W-140, cy+card_h-36, CONTENT_W-24, cy+card_h-12],
                                    radius=6, fill=SAGE)
            draw.text((CONTENT_W-128, cy+card_h-32), "✓ Tracked", font=font(12, bold=True), fill=TEXT_WH)
        else:
            draw.rounded_rectangle([CONTENT_W-148, cy+card_h-36, CONTENT_W-24, cy+card_h-12],
                                    radius=6, fill=BLUSH_DEEP)
            draw.text((CONTENT_W-140, cy+card_h-32), "+ Track Vendor", font=font(12, bold=True), fill=TEXT_WH)

        cy += card_h + 12

    # === Side Panel ===
    panel_x = CONTENT_W
    draw.rectangle([panel_x, 86, W, H], fill=IVORY)
    draw.rectangle([panel_x, 86, panel_x+1, H], fill=BLUSH_LIGHT)

    # Panel header
    draw.rectangle([panel_x, 86, W, 126], fill=BLUSH_DEEP)
    draw.text((panel_x+14, 96), "♥  My Vendor List", font=font(16, bold=True), fill=TEXT_WH)
    draw.text((panel_x+14, 116), "6 vendors tracked", font=font(11), fill=BLUSH_LIGHT)

    # Filter bar
    draw.rectangle([panel_x, 126, W, 158], fill=BLUSH_PALE)
    draw.rounded_rectangle([panel_x+10, 133, panel_x+90, 153], radius=4, fill=BLUSH_DEEP)
    draw.text((panel_x+16, 137), "All", font=font(11, bold=True), fill=TEXT_WH)
    cats = ["Photographers", "Venues", "Florists"]
    fx = panel_x + 98
    for cat in cats:
        bbox = draw.textbbox((0, 0), cat, font=font(11))
        cw = bbox[2] - bbox[0]
        draw.rounded_rectangle([fx, 133, fx+cw+12, 153], radius=4, fill=IVORY_DARK)
        draw.text((fx+6, 137), cat, font=font(11), fill=TEXT_DK)
        fx += cw + 20

    # Vendor items in panel
    panel_vendors = [
        ("Blossom & Light Photo.", "Photographers", "CONTACTED", STATUS_CONTACTED),
        ("The Grand Ballroom",     "Venues",        "QUOTED",     STATUS_QUOTED),
        ("Ivory Moments Co.",      "Photographers", "CONTACTED", STATUS_CONTACTED),
        ("Seattle Blooms",         "Florists",      "BOOKED",    STATUS_BOOKED),
        ("Golden Hour Studios",    "Photographers", "REJECTED",  STATUS_REJECTED),
        ("Garden Ceremony Hall",   "Venues",        "QUOTED",     STATUS_QUOTED),
    ]
    py = 164
    for vname, cat, status, scol in panel_vendors:
        row_h = 62
        if py + row_h > H - 50:
            break
        draw.rectangle([panel_x, py, W, py+row_h-1], fill=TEXT_WH if panel_vendors.index((vname, cat, status, scol)) % 2 == 0 else BLUSH_PALE)
        draw.text((panel_x+12, py+8), vname, font=font(12, bold=True), fill=TEXT_DK)
        draw.text((panel_x+12, py+26), cat, font=font(10), fill=TEXT_GR)
        # Status badge
        bbox = draw.textbbox((0, 0), status, font=font(9, bold=True))
        sw = bbox[2] - bbox[0]
        draw.rounded_rectangle([panel_x+12, py+40, panel_x+sw+24, py+56], radius=3, fill=scol)
        draw.text((panel_x+18, py+42), status, font=font(9, bold=True), fill=TEXT_WH)
        py += row_h

    # Pro upgrade CTA at bottom of panel
    draw.rectangle([panel_x, H-58, W, H], fill=GOLD)
    draw.text((panel_x+14, H-50), "✦  Upgrade to Pro — Compare side-by-side", font=font(12, bold=True), fill=TEXT_DK)
    draw.text((panel_x+14, H-32), "$7/month · Cancel anytime", font=font(11), fill=TEXT_DK)

    # Footer
    draw.rectangle([0, H-58, CONTENT_W, H], fill=BLUSH_DEEP)
    centered_text(draw, H-42, "Track every vendor with one click  ·  Wedding Vendor Tracker", font(13), BLUSH_LIGHT, width=CONTENT_W)

    img.save(os.path.join(OUT_DIR, "screenshot1_panel.png"))
    print("✓ screenshot1_panel.png")


# ---------------------------------------------------------------------------
# Screenshot 2: Pro comparison table
# ---------------------------------------------------------------------------
def make_screenshot_2():
    img = Image.new("RGB", (W, H), IVORY)
    draw = ImageDraw.Draw(img)

    # Header
    draw.rectangle([0, 0, W, 56], fill=BLUSH_DEEP)
    draw.text((18, 10), "Wedding Vendor Tracker", font=font(22, bold=True), fill=TEXT_WH)
    draw.text((18, 36), "Pro · Vendor Comparison", font=font(13), fill=BLUSH_LIGHT)
    # Pro badge
    draw.rounded_rectangle([W-110, 14, W-14, 42], radius=6, fill=GOLD)
    draw.text((W-98, 20), "✦  PRO", font=font(16, bold=True), fill=TEXT_DK)

    # Sub-nav
    draw.rectangle([0, 56, W, 88], fill=IVORY_DARK)
    tabs = [("My Vendors", False), ("Compare (4)", True), ("Budget", False), ("Contact Log", False)]
    tx = 18
    for tab_name, active in tabs:
        bbox = draw.textbbox((0, 0), tab_name, font=font(13, bold=active))
        tw = bbox[2] - bbox[0]
        if active:
            draw.text((tx, 64), tab_name, font=font(13, bold=True), fill=BLUSH_DEEP)
            draw.rectangle([tx, 84, tx+tw, 88], fill=BLUSH_DEEP)
        else:
            draw.text((tx, 64), tab_name, font=font(13), fill=TEXT_GR)
        tx += tw + 32

    # Category filter
    draw.rectangle([0, 88, W, 122], fill=BLUSH_PALE)
    draw.text((18, 100), "Category:", font=font(13, bold=True), fill=TEXT_DK)
    cats = [("Photographers", True), ("Venues", False), ("Caterers", False), ("Florists", False)]
    cx = 110
    for cname, active in cats:
        bbox = draw.textbbox((0, 0), cname, font=font(12))
        cw = bbox[2] - bbox[0]
        fill = BLUSH_DEEP if active else IVORY_DARK
        text_col = TEXT_WH if active else TEXT_DK
        draw.rounded_rectangle([cx, 94, cx+cw+18, 118], radius=5, fill=fill)
        draw.text((cx+9, 99), cname, font=font(12), fill=text_col)
        cx += cw + 26

    # Comparison table
    TABLE_TOP = 130
    vendors = [
        "Blossom & Light",
        "Ivory Moments Co.",
        "Golden Hour Studios",
        "Willow & Fern Photo",
    ]
    col_w = (W - 200) // 4
    row_h = 54

    rows = [
        ("Price Range",    ["$2,800–$5,200", "$2,200–$4,800", "$3,500–$6,000", "$2,600–$4,400"]),
        ("Quoted Price",   ["$4,200",         "$3,800",         "$5,100",         "$3,950"]),
        ("Status",         ["CONTACTED",      "CONTACTED",      "REJECTED",       "QUOTED"]),
        ("Rating",         ["★ 4.9",          "★ 4.8",          "★ 4.7",          "★ 4.8"]),
        ("Availability",   ["Available ✓",    "Available ✓",    "Waitlisted",     "Available ✓"]),
        ("Contact Date",   ["Mar 28",         "Apr 1",          "Mar 15",         "Apr 3"]),
        ("Follow-up",      ["Apr 10",         "Apr 8",          "—",              "Apr 7"]),
        ("Notes",          ["Includes engagement", "2nd shooter incl.", "Over budget", "Eco-friendly"]),
    ]

    status_colors = {
        "CONTACTED": STATUS_CONTACTED,
        "QUOTED":    STATUS_QUOTED,
        "BOOKED":    STATUS_BOOKED,
        "REJECTED":  STATUS_REJECTED,
    }

    # Header row: vendor names
    draw.rectangle([0, TABLE_TOP, W, TABLE_TOP+48], fill=BLUSH_DEEP)
    draw.text((18, TABLE_TOP+14), "Attribute", font=font(12, bold=True), fill=BLUSH_LIGHT)
    for i, vname in enumerate(vendors):
        vx = 200 + i * col_w
        centered_text(draw, TABLE_TOP+14, vname, font(13, bold=True), TEXT_WH, width=col_w)
        # Shift for each column
        bbox = draw.textbbox((0, 0), vname, font=font(13, bold=True))
        tw = bbox[2] - bbox[0]
        draw.text((vx + (col_w - tw) // 2, TABLE_TOP + 14), vname, font=font(13, bold=True), fill=TEXT_WH)

    # Data rows
    for ri, (attr, values) in enumerate(rows):
        ry = TABLE_TOP + 48 + ri * row_h
        row_bg = TEXT_WH if ri % 2 == 0 else BLUSH_PALE

        draw.rectangle([0, ry, W, ry+row_h], fill=row_bg)
        draw.line([(0, ry+row_h), (W, ry+row_h)], fill=IVORY_DARK)

        # Attribute label
        draw.text((18, ry + row_h//2 - 8), attr, font=font(12, bold=True), fill=TEXT_DK)

        for i, val in enumerate(values):
            vx = 200 + i * col_w
            cell_cx = vx + col_w // 2

            if attr == "Status" and val in status_colors:
                scol = status_colors[val]
                bbox = draw.textbbox((0, 0), val, font=font(10, bold=True))
                sw = bbox[2] - bbox[0]
                sx = cell_cx - sw//2 - 8
                draw.rounded_rectangle([sx, ry+12, sx+sw+16, ry+32], radius=4, fill=scol)
                draw.text((sx+8, ry+14), val, font=font(10, bold=True), fill=TEXT_WH)
            elif attr == "Availability":
                col = SAGE if "Available" in val else STATUS_QUOTED
                draw.text((vx + 8, ry + row_h//2 - 8), val, font=font(11), fill=col)
            elif attr == "Quoted Price":
                draw.text((vx + 8, ry + row_h//2 - 8), val, font=font(12, bold=True), fill=BLUSH_DEEP)
            else:
                draw.text((vx + 8, ry + row_h//2 - 8), val, font=font(11), fill=TEXT_DK)

        # Vertical dividers
        for i in range(5):
            draw.line([(200 + i * col_w, TABLE_TOP), (200 + i * col_w, TABLE_TOP + 48 + len(rows)*row_h)],
                      fill=IVORY_DARK)

    # Footer
    draw.rectangle([0, H-44, W, H], fill=BLUSH_DEEP)
    centered_text(draw, H-34, "Compare up to 4 vendors side-by-side  ·  Pro feature  ·  Wedding Vendor Tracker", font(13), BLUSH_LIGHT)

    img.save(os.path.join(OUT_DIR, "screenshot2_compare.png"))
    print("✓ screenshot2_compare.png")


# ---------------------------------------------------------------------------
# Screenshot 3: Options / Settings page
# ---------------------------------------------------------------------------
def make_screenshot_3():
    img = Image.new("RGB", (W, H), IVORY)
    draw = ImageDraw.Draw(img)

    # Header
    draw.rectangle([0, 0, W, 56], fill=BLUSH_DEEP)
    draw.text((18, 10), "Wedding Vendor Tracker — Settings", font=font(22, bold=True), fill=TEXT_WH)
    draw.text((18, 36), "Customize your experience", font=font(13), fill=BLUSH_LIGHT)

    # Two-column layout
    COL_GAP = 24
    COL_W = (W - 3 * COL_GAP) // 2
    col1_x = COL_GAP
    col2_x = col1_x + COL_W + COL_GAP
    cy = 76

    # ---- Card: Enabled Sites ----
    card_h = 170
    draw.rounded_rectangle([col1_x, cy, col1_x+COL_W, cy+card_h], radius=10, fill=TEXT_WH, outline=BLUSH_LIGHT, width=1)
    draw.text((col1_x+16, cy+14), "Enabled Sites", font=font(14, bold=True), fill=TEXT_DK)
    draw.line([(col1_x+10, cy+34), (col1_x+COL_W-10, cy+34)], fill=IVORY_DARK)

    sites = [
        ("theknot.com", True),
        ("weddingwire.com", True),
        ("zola.com (coming soon)", False),
    ]
    sy = cy + 44
    for site, on in sites:
        draw.text((col1_x+16, sy+4), site, font=font(12), fill=TEXT_DK if on else TEXT_DIM)
        tw, th = 44, 24
        tx = col1_x + COL_W - tw - 16
        bg = BLUSH_DEEP if on else "#d0d0d0"
        draw.rounded_rectangle([tx, sy, tx+tw, sy+th], radius=th//2, fill=bg)
        kd, kp = 18, 3
        kx = tx+tw-kd-kp if on else tx+kp
        draw.ellipse([kx, sy+kp, kx+kd, sy+kp+kd], fill=TEXT_WH)
        sy += 38

    # ---- Card: Panel Behavior ----
    draw.rounded_rectangle([col2_x, cy, col2_x+COL_W, cy+card_h], radius=10, fill=TEXT_WH, outline=BLUSH_LIGHT, width=1)
    draw.text((col2_x+16, cy+14), "Panel Behavior", font=font(14, bold=True), fill=TEXT_DK)
    draw.line([(col2_x+10, cy+34), (col2_x+COL_W-10, cy+34)], fill=IVORY_DARK)

    panel_opts = [
        ("Show Track button on listings", True),
        ("Auto-open panel on first track", True),
        ("Show status badges",            True),
        ("Confirm before removing vendor", False),
    ]
    py = cy + 44
    for opt, on in panel_opts:
        draw.text((col2_x+16, py+2), opt, font=font(12), fill=TEXT_DK)
        tw, th = 40, 22
        tx = col2_x + COL_W - tw - 16
        bg = BLUSH_DEEP if on else "#d0d0d0"
        draw.rounded_rectangle([tx, py, tx+tw, py+th], radius=th//2, fill=bg)
        kd, kp = 16, 3
        kx = tx+tw-kd-kp if on else tx+kp
        draw.ellipse([kx, py+kp, kx+kd, py+kp+kd], fill=TEXT_WH)
        py += 32

    cy += card_h + COL_GAP

    # ---- Card: Status Labels ----
    card2_h = 160
    draw.rounded_rectangle([col1_x, cy, col1_x+COL_W, cy+card2_h], radius=10, fill=TEXT_WH, outline=BLUSH_LIGHT, width=1)
    draw.text((col1_x+16, cy+14), "Status Labels", font=font(14, bold=True), fill=TEXT_DK)
    draw.line([(col1_x+10, cy+34), (col1_x+COL_W-10, cy+34)], fill=IVORY_DARK)

    statuses = [
        ("Contacted",  STATUS_CONTACTED, "Initial outreach sent"),
        ("Quoted",     STATUS_QUOTED,    "Price quote received"),
        ("Booked",     STATUS_BOOKED,    "Vendor confirmed"),
        ("Rejected",   STATUS_REJECTED,  "Not proceeding"),
    ]
    sty = cy + 44
    for sname, scol, sdesc in statuses:
        draw.rounded_rectangle([col1_x+16, sty, col1_x+16+80, sty+20], radius=4, fill=scol)
        draw.text((col1_x+20, sty+2), sname, font=font(10, bold=True), fill=TEXT_WH)
        draw.text((col1_x+108, sty+3), sdesc, font=font(10), fill="#555555")
        sty += 26

    # ---- Card: Data & Export ----
    draw.rounded_rectangle([col2_x, cy, col2_x+COL_W, cy+card2_h], radius=10, fill=TEXT_WH, outline=BLUSH_LIGHT, width=1)
    draw.text((col2_x+16, cy+14), "Data & Export", font=font(14, bold=True), fill=TEXT_DK)
    draw.line([(col2_x+10, cy+34), (col2_x+COL_W-10, cy+34)], fill=IVORY_DARK)

    draw.text((col2_x+16, cy+46), "6 vendors tracked across 4 categories", font=font(12), fill=TEXT_DK)

    draw.rounded_rectangle([col2_x+16, cy+72, col2_x+COL_W//2-8, cy+98], radius=6, fill=SAGE)
    draw.text((col2_x+24, cy+78), "⬇ Export CSV", font=font(12, bold=True), fill=TEXT_WH)

    draw.rounded_rectangle([col2_x+COL_W//2+8, cy+72, col2_x+COL_W-16, cy+98], radius=6, fill=IVORY_DARK)
    draw.text((col2_x+COL_W//2+16, cy+78), "Clear All Data", font=font(12), fill="#cc3333")

    draw.text((col2_x+16, cy+112), "Storage:", font=font(11, bold=True), fill=TEXT_GR)
    draw.text((col2_x+90, cy+112), "Local (Chrome sync off)", font=font(11), fill=TEXT_DK)
    draw.text((col2_x+16, cy+130), "Version:", font=font(11, bold=True), fill=TEXT_GR)
    draw.text((col2_x+90, cy+130), "1.0.0", font=font(11), fill=TEXT_DK)

    cy += card2_h + COL_GAP

    # ---- Card: Pro Plan ----
    pro_h = 140
    draw.rounded_rectangle([col1_x, cy, W-COL_GAP, cy+pro_h], radius=10, fill=BLUSH_PALE, outline=GOLD, width=2)
    draw.text((col1_x+16, cy+14), "✦  Your Plan", font=font(14, bold=True), fill=TEXT_DK)
    draw.line([(col1_x+10, cy+34), (W-COL_GAP-10, cy+34)], fill=GOLD_LIGHT)

    draw.text((col1_x+16, cy+48), "Current plan:", font=font(12), fill=TEXT_GR)
    draw.rounded_rectangle([col1_x+110, cy+42, col1_x+170, cy+64], radius=4, fill=IVORY_DARK)
    draw.text((col1_x+118, cy+46), "Free", font=font(12, bold=True), fill=TEXT_DK)

    draw.text((col1_x+16, cy+72), "Pro unlocks:", font=font(12, bold=True), fill=TEXT_DK)
    pro_feats = [
        "Side-by-side comparison table (up to 4 vendors)",
        "Price quote entry & budget tracker per category",
        "Contact log + follow-up dates  ·  Email draft shortcut",
        "Cross-device sync via Chrome account",
    ]
    fy = cy + 90
    for feat in pro_feats:
        draw.text((col1_x+20, fy), "•  " + feat, font=font(11), fill="#555555")
        fy += 16

    btn_x = W - COL_GAP - 230
    draw.rounded_rectangle([btn_x, cy+42, btn_x+214, cy+72], radius=8, fill=GOLD)
    draw.text((btn_x+18, cy+50), "Upgrade to Pro — $7 / month", font=font(12, bold=True), fill=TEXT_DK)

    # Footer
    draw.rectangle([0, H-44, W, H], fill=BLUSH_DEEP)
    centered_text(draw, H-34, "Full control in settings  ·  Wedding Vendor Tracker", font(13), BLUSH_LIGHT)

    img.save(os.path.join(OUT_DIR, "screenshot3_settings.png"))
    print("✓ screenshot3_settings.png")


# ===========================================================================
if __name__ == "__main__":
    make_screenshot_1()
    make_screenshot_2()
    make_screenshot_3()
    print(f"\nAll screenshots saved to: {OUT_DIR}")
