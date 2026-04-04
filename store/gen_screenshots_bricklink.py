"""
Generate 3 Chrome Web Store screenshots (1280x800) for
BrickLink Price History & Set Completion Tracker v1.0.0.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots_bricklink")
os.makedirs(OUT_DIR, exist_ok=True)
W, H = 1280, 800

# ---------------------------------------------------------------------------
# Color palette — LEGO/BrickLink inspired (bold yellow, dark grey, red)
# ---------------------------------------------------------------------------
BL_YELLOW      = "#f7c800"   # LEGO yellow
BL_YELLOW_DARK = "#d4a900"   # darker yellow
BL_RED         = "#c0392b"   # BrickLink red accent
BL_ORANGE      = "#e67e22"   # warm orange highlight
BL_DARK        = "#1a1a2e"   # very dark navy background
BL_NAVY        = "#16213e"   # panel background
BL_PANEL       = "#0f3460"   # secondary panel
BL_BLUE        = "#533483"   # pro purple/blue
BL_BLUE_LIGHT  = "#7b52ab"
BL_GREEN       = "#27ae60"   # positive / up trend
BL_GREEN_LIGHT = "#2ecc71"
BL_GREY        = "#2c3e50"   # card background
BL_GREY_MID    = "#566573"
BL_GREY_LIGHT  = "#7f8c8d"
TEXT_WH        = "#ffffff"
TEXT_YEL       = "#f7c800"
TEXT_DIM       = "#95a5a6"
TEXT_DK        = "#1a1a2e"

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

def rounded_rect(draw, xy, radius=8, fill=None, outline=None, width=1):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)

def badge(draw, x, y, text, bg, fg=TEXT_WH, fnt=None, pad_x=12, pad_y=5, radius=6):
    if fnt is None:
        fnt = font(13, bold=True)
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    rx0, ry0 = x, y
    rx1, ry1 = x + tw + pad_x * 2, y + th + pad_y * 2
    rounded_rect(draw, [rx0, ry0, rx1, ry1], radius=radius, fill=bg)
    draw.text((rx0 + pad_x, ry0 + pad_y), text, font=fnt, fill=fg)
    return rx1 - rx0  # width of badge

def sparkline_path(draw, points, x0, y0, chart_w, chart_h, color, line_w=3):
    """Draw a sparkline from a list of (normalized 0-1) values."""
    if len(points) < 2:
        return
    step = chart_w / (len(points) - 1)
    coords = []
    for i, v in enumerate(points):
        px = x0 + int(i * step)
        py = y0 + chart_h - int(v * chart_h)
        coords.append((px, py))
    for i in range(len(coords) - 1):
        draw.line([coords[i], coords[i+1]], fill=color, width=line_w)

# ---------------------------------------------------------------------------
# Screenshot 1: Price History Sparkline Panel — injected on a BrickLink
#               catalog item page (part listing for 3001 2x4 Brick)
# ---------------------------------------------------------------------------
def screenshot1_sparkline():
    img = Image.new("RGB", (W, H), BL_DARK)
    draw = ImageDraw.Draw(img)

    # ── Browser chrome bar ──────────────────────────────────────────────────
    draw.rectangle([0, 0, W, 40], fill="#2d2d2d")
    # URL bar
    draw.rounded_rectangle([80, 8, 900, 32], radius=4, fill="#3c3c3c")
    draw.text((92, 11), "🔒 www.bricklink.com/v2/catalog/catalogitem.page?P=3001", font=font(12), fill="#cccccc")
    # Browser dots
    for i, c in enumerate(["#ff5f57", "#febc2e", "#28c840"]):
        draw.ellipse([12 + i*22, 13, 24 + i*22, 25], fill=c)

    # ── BrickLink page background ────────────────────────────────────────────
    draw.rectangle([0, 40, W, H], fill="#f5f5f5")

    # BrickLink top nav bar
    draw.rectangle([0, 40, W, 80], fill="#e77600")
    draw.text((20, 52), "BrickLink", font=font(20, bold=True), fill=TEXT_WH)
    draw.text((160, 54), "Catalog  Shop  Forum  My BL  Help", font=font(14), fill="#ffe0b2")

    # Page title area
    draw.rectangle([0, 80, W, 130], fill="#ffffff")
    draw.text((20, 88), "Part #3001 — Brick 2 x 4", font=font(22, bold=True), fill="#1a1a1a")
    draw.text((20, 115), "Category: Brick    Condition: New & Used    Appears in: 14,203 sets", font=font(13), fill="#555555")

    # ── INJECTED: Price History Panel ──────────────────────────────────────
    PX, PY = 20, 140
    PW, PH = 760, 290

    # Panel shadow
    draw.rectangle([PX+4, PY+4, PX+PW+4, PY+PH+4], fill="#cccccc")
    # Panel background
    rounded_rect(draw, [PX, PY, PX+PW, PY+PH], radius=10, fill=BL_NAVY)

    # Panel header
    draw.rounded_rectangle([PX, PY, PX+PW, PY+48], radius=10, fill=BL_PANEL)
    draw.text((PX+14, PY+12), "📈", font=font(20), fill=TEXT_WH)
    draw.text((PX+44, PY+13), "Price History", font=font(18, bold=True), fill=BL_YELLOW)

    # Tab buttons: 30d | 90d | 180d
    for i, (lbl, active) in enumerate([("30d", True), ("90d", False), ("180d", False)]):
        tx = PX+PW-180 + i*56
        ty = PY+10
        if active:
            draw.rounded_rectangle([tx, ty, tx+48, ty+26], radius=5, fill=BL_YELLOW)
            draw.text((tx+8, ty+5), lbl, font=font(13, bold=True), fill=TEXT_DK)
        else:
            draw.rounded_rectangle([tx, ty, tx+48, ty+26], radius=5, outline="#555555", width=1, fill=BL_GREY)
            draw.text((tx+8, ty+5), lbl, font=font(13), fill=TEXT_DIM)

    # Sparkline chart area
    CX, CY, CW, CH = PX+16, PY+64, PW-32, 120

    # Chart background
    rounded_rect(draw, [CX, CY, CX+CW, CY+CH], radius=6, fill="#0a1628")

    # Grid lines
    for i in range(1, 4):
        gy = CY + int(i * CH / 4)
        draw.line([CX+8, gy, CX+CW-8, gy], fill="#1e3a5f", width=1)

    # Price sparkline data (normalized) — realistic price trend with slight dip then recovery
    prices = [0.42, 0.45, 0.44, 0.38, 0.35, 0.33, 0.36, 0.41, 0.47, 0.52, 0.55, 0.53,
              0.50, 0.48, 0.52, 0.58, 0.62, 0.65, 0.61, 0.63, 0.68, 0.72, 0.70, 0.74,
              0.76, 0.71, 0.69, 0.73, 0.78, 0.82]
    sparkline_path(draw, prices, CX+8, CY+8, CW-16, CH-16, BL_GREEN_LIGHT, line_w=3)

    # Current price dot
    last_x = CX + 8 + CW - 16
    last_v = prices[-1]
    last_y = CY + 8 + (CH-16) - int(last_v * (CH-16))
    draw.ellipse([last_x-5, last_y-5, last_x+5, last_y+5], fill=BL_YELLOW)

    # Y-axis labels
    for i, lbl in enumerate(["$0.08", "$0.06", "$0.04", "$0.02"]):
        ly = CY + int(i * CH / 4) + 2
        draw.text((CX+CW-44, ly), lbl, font=font(10), fill=TEXT_DIM)

    # X-axis dates
    for i, lbl in enumerate(["Mar 6", "Mar 13", "Mar 20", "Mar 27", "Apr 5"]):
        lx = CX + 8 + int(i * (CW-16) / 4)
        draw.text((lx-12, CY+CH+4), lbl, font=font(10), fill=TEXT_DIM)

    # Stats row below sparkline
    SR_Y = PY+200
    stats = [
        ("Avg (30d)", "$0.065"),
        ("Min",       "$0.028"),
        ("Max",       "$0.082"),
        ("Last sold", "$0.071"),
        ("# sales",   "847"),
    ]
    col_w = (PW - 32) // len(stats)
    for i, (label, val) in enumerate(stats):
        sx = PX + 16 + i * col_w
        draw.text((sx, SR_Y), label, font=font(11), fill=TEXT_DIM)
        draw.text((sx, SR_Y+18), val, font=font(15, bold=True), fill=TEXT_WH)

    # Color availability section
    CA_Y = PY + 248
    draw.text((PX+16, CA_Y), "Cheapest alternative colors:", font=font(12), fill=TEXT_DIM)
    colors_info = [
        ("White",   "$0.038", "#f0f0f0", "#333333"),
        ("Lt. Gray","$0.041", "#aaaaaa", TEXT_WH),
        ("Black",   "$0.044", "#1a1a1a", TEXT_WH),
        ("Red",     "$0.052", "#cc2222", TEXT_WH),
    ]
    cx_off = PX + 220
    for clr, price, bg, fg in colors_info:
        badge_w = badge(draw, cx_off, CA_Y-2, f"{clr}  {price}", bg=bg, fg=fg,
                        fnt=font(12), pad_x=8, pad_y=4)
        cx_off += badge_w + 10

    # Injected marker label
    draw.rounded_rectangle([PX+PW-140, PY+PH-28, PX+PW-10, PY+PH-8],
                            radius=4, fill=BL_YELLOW)
    draw.text((PX+PW-136, PY+PH-25), "BrickLink Price History", font=font(11, bold=True), fill=TEXT_DK)

    # ── Right panel: native BrickLink price guide (unchanged) ───────────────
    RPX, RPY, RPW, RPH = 800, 140, 460, 290
    rounded_rect(draw, [RPX, RPY, RPX+RPW, RPY+RPH], radius=6, fill="#ffffff")
    draw.text((RPX+12, RPY+12), "Price Guide", font=font(15, bold=True), fill="#1a1a1a")
    draw.text((RPX+12, RPY+35), "New   Used", font=font(13), fill="#555555")
    draw.line([RPX, RPY+56, RPX+RPW, RPY+56], fill="#e0e0e0", width=1)
    headers = ["Qty", "Min", "Avg", "Max"]
    col_positions = [RPX+12, RPX+80, RPX+170, RPX+270]
    for lbl, xp in zip(headers, col_positions):
        draw.text((xp, RPY+62), lbl, font=font(12, bold=True), fill="#1a1a1a")
    rows = [
        ("Used", "For Sale", "1,247", "$0.01", "$0.065", "$0.82"),
        ("New",  "For Sale",   "389", "$0.02", "$0.078", "$0.95"),
        ("Used", "Sold",       "847", "$0.01", "$0.071", "$0.80"),
    ]
    for ri, row in enumerate(rows):
        ry = RPY + 82 + ri*36
        bg = "#f9f9f9" if ri % 2 == 0 else "#ffffff"
        draw.rectangle([RPX, ry, RPX+RPW, ry+35], fill=bg)
        draw.text((col_positions[0], ry+10), row[1], font=font(12), fill="#555555")
        draw.text((col_positions[1], ry+10), row[3], font=font(12), fill="#1a1a1a")
        draw.text((col_positions[2], ry+10), row[4], font=font(12, bold=True), fill="#1a1a1a")
        draw.text((col_positions[3], ry+10), row[5], font=font(12), fill="#1a1a1a")

    # ── Caption at bottom ────────────────────────────────────────────────────
    draw.rectangle([0, H-60, W, H], fill=BL_DARK)
    centered_text(draw, H-50, "Price history sparkline injected directly on BrickLink catalog pages", font(15, bold=True), BL_YELLOW)
    centered_text(draw, H-28, "30 / 90 / 180-day trends, part stats, cheapest color alternatives — all inline", font(13), TEXT_DIM)

    img.save(os.path.join(OUT_DIR, "screenshot1_sparkline.png"))
    print("screenshot1_sparkline.png saved")


# ---------------------------------------------------------------------------
# Screenshot 2: Wanted List Coverage Bar + Seller Stats Badge
#               Injected on a BrickLink store page
# ---------------------------------------------------------------------------
def screenshot2_store_overlay():
    img = Image.new("RGB", (W, H), BL_DARK)
    draw = ImageDraw.Draw(img)

    # ── Browser chrome ──────────────────────────────────────────────────────
    draw.rectangle([0, 0, W, 40], fill="#2d2d2d")
    draw.rounded_rectangle([80, 8, 900, 32], radius=4, fill="#3c3c3c")
    draw.text((92, 11), "🔒 www.bricklink.com/store.asp?p=BricksMaster", font=font(12), fill="#cccccc")
    for i, c in enumerate(["#ff5f57", "#febc2e", "#28c840"]):
        draw.ellipse([12 + i*22, 13, 24 + i*22, 25], fill=c)

    # ── BrickLink page background ────────────────────────────────────────────
    draw.rectangle([0, 40, W, H], fill="#f5f5f5")
    draw.rectangle([0, 40, W, 80], fill="#e77600")
    draw.text((20, 52), "BrickLink", font=font(20, bold=True), fill=TEXT_WH)
    draw.text((160, 54), "Catalog  Shop  Forum  My BL  Help", font=font(14), fill="#ffe0b2")

    # Store header
    draw.rectangle([0, 80, W, 145], fill="#ffffff")
    draw.text((20, 88), "BricksMaster Store", font=font(22, bold=True), fill="#1a1a1a")
    draw.text((20, 116), "Location: Germany  ·  Member since: 2009  ·  12,847 feedback", font=font(13), fill="#555555")

    # ── INJECTED: Seller Stats Badge ────────────────────────────────────────
    SBX, SBY = 20, 155
    SBW, SBH = 580, 90
    draw.rectangle([SBX+3, SBY+3, SBX+SBW+3, SBY+SBH+3], fill="#cccccc")
    rounded_rect(draw, [SBX, SBY, SBX+SBW, SBY+SBH], radius=8, fill=BL_NAVY)

    draw.text((SBX+12, SBY+10), "🏆  Seller Stats", font=font(14, bold=True), fill=BL_YELLOW)

    seller_stats = [
        ("Feedback",      "12,847"),
        ("Positive",      "99.7%"),
        ("Avg Completion","98.2%"),
        ("Avg Reply",     "< 2 hrs"),
        ("On-time Ship",  "99.1%"),
    ]
    stat_col_w = (SBW - 24) // len(seller_stats)
    for i, (label, val) in enumerate(seller_stats):
        sx = SBX + 12 + i * stat_col_w
        draw.text((sx, SBY + 34), label, font=font(11), fill=TEXT_DIM)
        color = BL_GREEN if "%" in val and float(val.replace("%","")) > 95 else TEXT_WH
        draw.text((sx, SBY + 52), val, font=font(15, bold=True), fill=color)

    # Injected marker
    draw.rounded_rectangle([SBX+SBW-140, SBY+SBH-22, SBX+SBW-4, SBY+SBH-4],
                            radius=4, fill=BL_YELLOW)
    draw.text((SBX+SBW-136, SBY+SBH-20), "BrickLink Price History", font=font(10, bold=True), fill=TEXT_DK)

    # ── INJECTED: Wanted List Coverage Bar ──────────────────────────────────
    WBX, WBY = 20, 260
    WBW, WBH = 580, 130

    draw.rectangle([WBX+3, WBY+3, WBX+WBW+3, WBY+WBH+3], fill="#cccccc")
    rounded_rect(draw, [WBX, WBY, WBX+WBW, WBY+WBH], radius=8, fill=BL_NAVY)

    # Header
    draw.text((WBX+12, WBY+10), "📋  Wanted List Coverage", font=font(14, bold=True), fill=BL_YELLOW)

    # Progress bar
    total_parts, covered = 120, 67
    pct = covered / total_parts
    BAR_X, BAR_Y, BAR_W, BAR_H = WBX+12, WBY+44, WBW-24, 22
    rounded_rect(draw, [BAR_X, BAR_Y, BAR_X+BAR_W, BAR_Y+BAR_H], radius=5, fill="#0a1628")
    fill_w = int(pct * BAR_W)
    # Gradient-like fill using layered rects
    rounded_rect(draw, [BAR_X, BAR_Y, BAR_X+fill_w, BAR_Y+BAR_H], radius=5, fill=BL_GREEN)

    # Percentage text in bar
    draw.text((BAR_X + fill_w//2 - 18, BAR_Y+3), f"{pct*100:.0f}%", font=font(13, bold=True), fill=TEXT_WH)

    # Coverage detail text
    draw.text((WBX+12, WBY+74), f"This store has  ", font=font(14), fill=TEXT_DIM)
    draw.text((WBX+120, WBY+74), f"{covered}", font=font(16, bold=True), fill=BL_GREEN)
    draw.text((WBX+152, WBY+74), f"  of your  ", font=font(14), fill=TEXT_DIM)
    draw.text((WBX+228, WBY+74), f"{total_parts}", font=font(16, bold=True), fill=TEXT_WH)
    draw.text((WBX+262, WBY+74), f"  wanted parts", font=font(14), fill=TEXT_DIM)

    draw.text((WBX+12, WBY+99), "Estimated order total for wanted parts:  $23.40",
              font=font(13), fill=TEXT_DIM)

    # Injected marker
    draw.rounded_rectangle([WBX+WBW-140, WBY+WBH-22, WBX+WBW-4, WBY+WBH-4],
                            radius=4, fill=BL_YELLOW)
    draw.text((WBX+WBW-136, WBY+WBH-20), "BrickLink Price History", font=font(10, bold=True), fill=TEXT_DK)

    # ── Store item grid (native BrickLink content) ───────────────────────────
    draw.rectangle([0, 400, W, H-60], fill="#ffffff")
    draw.text((20, 408), "Items For Sale (8,234 lots)", font=font(14, bold=True), fill="#1a1a1a")
    draw.line([0, 430, W, 430], fill="#e0e0e0", width=1)

    items = [
        ("3001", "Brick 2x4",          "New", "$0.07",  "2,400 avail"),
        ("3003", "Brick 2x2",          "New", "$0.05",  "5,100 avail"),
        ("3004", "Brick 1x2",          "New", "$0.04",  "8,200 avail"),
        ("3010", "Brick 1x4",          "New", "$0.06",  "3,800 avail"),
        ("3020", "Plate 2x4",          "New", "$0.04",  "4,700 avail"),
        ("3068b","Tile 2x2",           "New", "$0.09",  "1,200 avail"),
    ]
    cols = [20, 80, 400, 500, 620, 780]
    headers2 = ["#", "Part name", "Cond", "Price", "Qty", "Wanted?"]
    for lbl, xp in zip(headers2, cols):
        draw.text((xp, 438), lbl, font=font(11, bold=True), fill="#888888")

    for ri, item in enumerate(items):
        ry = 458 + ri * 38
        bg = "#f9f9f9" if ri % 2 == 0 else "#ffffff"
        draw.rectangle([0, ry, W, ry+37], fill=bg)
        for ci, (val, xp) in enumerate(zip(item, cols)):
            draw.text((xp, ry+10), val, font=font(12), fill="#1a1a1a")
        # Wanted indicator on some rows
        if ri in [0, 2, 3]:
            draw.rounded_rectangle([cols[5], ry+8, cols[5]+64, ry+28], radius=4, fill="#27ae60")
            draw.text((cols[5]+8, ry+11), "✓ Wanted", font=font(11, bold=True), fill=TEXT_WH)

    # Right panel — Pro upgrade CTA
    RPX, RPY = 620, 155
    RPW, RPH = 640, 235
    rounded_rect(draw, [RPX, RPY, RPX+RPW, RPY+RPH], radius=10, fill=BL_BLUE)
    draw.text((RPX+16, RPY+14), "⚡  Pro: Multi-Store Optimizer", font=font(15, bold=True), fill=TEXT_WH)
    draw.text((RPX+16, RPY+42), "Complete your wanted list across", font=font(13), fill="#c8b8e8")
    draw.text((RPX+16, RPY+62), "multiple stores — automatically.", font=font(13), fill="#c8b8e8")
    draw.line([RPX+16, RPY+88, RPX+RPW-16, RPY+88], fill="#6a4aaa", width=1)

    optimizer_stores = [
        ("BricksMaster",  "67 parts", "$23.40"),
        ("Tiler's World", "31 parts", "$14.20"),
        ("BrickDepot",    "22 parts", " $9.80"),
    ]
    for si, (store, parts, price) in enumerate(optimizer_stores):
        sy = RPY + 100 + si * 36
        draw.rounded_rectangle([RPX+12, sy, RPX+RPW-12, sy+30], radius=5, fill="#3d2472")
        draw.text((RPX+20, sy+7), store, font=font(13, bold=True), fill=TEXT_WH)
        draw.text((RPX+180, sy+7), parts, font=font(12), fill=BL_YELLOW)
        draw.text((RPX+290, sy+7), price, font=font(12, bold=True), fill=BL_GREEN)

    draw.text((RPX+16, RPY+212), "Buy from 3 stores → complete 120/120 parts for $47.40",
              font=font(12, bold=True), fill=BL_GREEN)

    draw.rounded_rectangle([RPX+RPW-140, RPY+RPH-44, RPX+RPW-12, RPY+RPH-12],
                            radius=6, fill=BL_YELLOW)
    draw.text((RPX+RPW-128, RPY+RPH-38), "Upgrade → $7/mo", font=font(13, bold=True), fill=TEXT_DK)

    # ── Caption ──────────────────────────────────────────────────────────────
    draw.rectangle([0, H-60, W, H], fill=BL_DARK)
    centered_text(draw, H-50, "Wanted List coverage bar and seller stats badge — live on every store page", font(15, bold=True), BL_YELLOW)
    centered_text(draw, H-28, "See exactly which stores cover your wanted parts before you click 'Buy'", font(13), TEXT_DIM)

    img.save(os.path.join(OUT_DIR, "screenshot2_store_overlay.png"))
    print("screenshot2_store_overlay.png saved")


# ---------------------------------------------------------------------------
# Screenshot 3: Options / Settings Page — BrickLink OAuth credentials,
#               Pro tier features, price alerts list
# ---------------------------------------------------------------------------
def screenshot3_settings():
    img = Image.new("RGB", (W, H), "#f0f0f0")
    draw = ImageDraw.Draw(img)

    # ── Header ───────────────────────────────────────────────────────────────
    draw.rectangle([0, 0, W, 70], fill=BL_NAVY)
    draw.text((28, 14), "🧱", font=font(32), fill=TEXT_WH)
    draw.text((76, 16), "BrickLink Price History & Set Completion Tracker", font=font(20, bold=True), fill=BL_YELLOW)
    draw.text((76, 44), "Settings  ·  v1.0.0", font=font(13), fill=TEXT_DIM)

    # ── Left panel: nav tabs ─────────────────────────────────────────────────
    draw.rectangle([0, 70, 220, H], fill="#1e2a38")
    nav_items = [
        ("🔑  BrickLink Auth", True),
        ("🔔  Price Alerts",   False),
        ("📦  Set Tracker",    False),
        ("⚙️   Preferences",   False),
        ("⭐  Pro Plan",       False),
    ]
    for ni, (lbl, active) in enumerate(nav_items):
        ny = 100 + ni * 52
        if active:
            draw.rectangle([0, ny, 220, ny+44], fill=BL_PANEL)
            draw.line([0, ny, 0, ny+44], fill=BL_YELLOW, width=4)
        draw.text((18, ny+12), lbl, font=font(14, bold=active), fill=BL_YELLOW if active else TEXT_DIM)

    # ── Main content: BrickLink Auth ─────────────────────────────────────────
    MX, MY = 240, 90
    MW = W - MX - 20

    draw.text((MX, MY), "BrickLink API Credentials", font=font(20, bold=True), fill="#1a1a1a")
    draw.text((MX, MY+30), "Enter your BrickLink OAuth 1.0a credentials to enable Wanted List and Price History features.",
              font=font(13), fill="#555555")

    # Auth status badge
    badge(draw, MX+620, MY+8, "✓  Connected", bg=BL_GREEN, fnt=font(13, bold=True), pad_x=12, pad_y=6)

    # Form fields
    fields = [
        ("Consumer Key",    "aBcD3f7G9hIjK2mNoPqR4sTuVwXyZa1b"),
        ("Consumer Secret", "••••••••••••••••••••••••••••••••"),
        ("Token",           "XyZa1bCdEf2gHiJkLm3nOpQrSt4uVwXy"),
        ("Token Secret",    "••••••••••••••••••••••••••••••••"),
    ]
    for fi, (label, placeholder) in enumerate(fields):
        fy = MY + 80 + fi * 72
        draw.text((MX, fy), label, font=font(13, bold=True), fill="#333333")
        rounded_rect(draw, [MX, fy+22, MX+MW-40, fy+52], radius=5,
                     fill="#ffffff", outline="#cccccc", width=1)
        draw.text((MX+12, fy+32), placeholder, font=font(13), fill="#888888")

    # Save button
    BY = MY + 80 + 4 * 72 + 10
    rounded_rect(draw, [MX, BY, MX+160, BY+40], radius=6, fill=BL_ORANGE)
    draw.text((MX+30, BY+10), "Save & Test", font=font(15, bold=True), fill=TEXT_WH)

    rounded_rect(draw, [MX+180, BY, MX+340, BY+40], radius=6, fill="#e0e0e0")
    draw.text((MX+210, BY+10), "Disconnect", font=font(15), fill="#555555")

    draw.text((MX, BY+50), "✓  BrickLink API connection verified — last synced 2 min ago",
              font=font(13), fill=BL_GREEN)

    # ── Right panel: Price Alerts summary ────────────────────────────────────
    APX, APY = 720, MY
    APW = W - APX - 20
    rounded_rect(draw, [APX, APY, APX+APW, APY+340], radius=8, fill=BL_NAVY)

    draw.text((APX+14, APY+12), "🔔  Active Price Alerts (3)", font=font(14, bold=True), fill=BL_YELLOW)
    draw.line([APX, APY+40, APX+APW, APY+40], fill="#1e3a5f", width=1)

    alerts = [
        ("3001",  "Brick 2x4 Red",     "< $0.05", "$0.071", "Watching"),
        ("21325", "Medieval Blacksmith","< $140",  "$152.00","Near!"),
        ("75192", "Millennium Falcon",  "< $750",  "$789.00","Watching"),
    ]
    for ai, (num, name, target, current, status) in enumerate(alerts):
        ay = APY + 52 + ai * 78
        bg = "#0f3460" if ai % 2 == 0 else "#0a2a4a"
        draw.rounded_rectangle([APX+8, ay, APX+APW-8, ay+68], radius=6, fill=bg)
        draw.text((APX+16, ay+8), f"#{num}", font=font(12, bold=True), fill=BL_YELLOW)
        draw.text((APX+60, ay+8), name, font=font(13, bold=True), fill=TEXT_WH)
        status_color = BL_ORANGE if status == "Near!" else TEXT_DIM
        badge(draw, APX+APW-90, ay+8, status, bg=status_color if status=="Near!" else BL_GREY,
              fnt=font(11, bold=True), pad_x=8, pad_y=4)
        draw.text((APX+16, ay+34), f"Target: {target}", font=font(12), fill=TEXT_DIM)
        draw.text((APX+140, ay+34), f"Current: {current}", font=font(12), fill=TEXT_WH)

    draw.text((APX+14, APY+290), "+ Add new price alert", font=font(13), fill="#5b8fd4")
    draw.text((APX+14, APY+314), "Pro feature — upgrade to set unlimited alerts",
              font=font(12), fill=TEXT_DIM)

    # ── Caption ──────────────────────────────────────────────────────────────
    draw.rectangle([0, H-60, W, H], fill=BL_DARK)
    centered_text(draw, H-50, "Secure OAuth 1.0a setup — connect your BrickLink account in 60 seconds", font(15, bold=True), BL_YELLOW)
    centered_text(draw, H-28, "Enable Wanted List sync, price alerts, and set value tracking with your own API credentials", font(13), TEXT_DIM)

    img.save(os.path.join(OUT_DIR, "screenshot3_settings.png"))
    print("screenshot3_settings.png saved")


if __name__ == "__main__":
    screenshot1_sparkline()
    screenshot2_store_overlay()
    screenshot3_settings()
    print(f"\nAll screenshots saved to: {OUT_DIR}")
