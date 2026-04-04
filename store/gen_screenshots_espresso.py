"""
Generate 3 Chrome Web Store screenshots (1280x800) for
Espresso Community Intelligence.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots_espresso")
os.makedirs(OUT_DIR, exist_ok=True)
W, H = 1280, 800

# ---------------------------------------------------------------------------
# Color palette — warm coffee/espresso tones
# ---------------------------------------------------------------------------
COFFEE_DARK   = "#2a1a0e"
COFFEE_DEEP   = "#4a2c17"
COFFEE_MID    = "#7a4a2a"
COFFEE_LIGHT  = "#c8956a"
CREAM         = "#f5ede4"
CREAM_LIGHT   = "#faf5f0"
CREAM_DARK    = "#e8ddd2"
REDDIT_ORANGE = "#ff4500"
REDDIT_DARK   = "#cc3700"
TEXT_WH       = "#ffffff"
TEXT_DK       = "#2a1a0e"
TEXT_GR       = "#888888"
TEXT_DIM      = "#aaaaaa"
TIER_BEGINNER    = "#4caf50"  # green
TIER_ENTHUSIAST  = "#2196f3"  # blue
TIER_PROSUMER    = "#ff9800"  # amber
TIER_COMMERCIAL  = "#9c27b0"  # purple

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

def mono(size):
    for path in ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/cour.ttf"]:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

# ---------------------------------------------------------------------------
# Drawing helpers
# ---------------------------------------------------------------------------
def centered_text(draw, y, text, fnt, fill, img_w=W):
    bb = fnt.getbbox(text)
    tw = bb[2] - bb[0]
    draw.text(((img_w - tw) // 2, y), text, font=fnt, fill=fill)

def shadow_text(draw, pos, text, fnt, fill, shadow_col="#00000066", offset=(2, 2)):
    draw.text((pos[0]+offset[0], pos[1]+offset[1]), text, font=fnt, fill=shadow_col)
    draw.text(pos, text, font=fnt, fill=fill)

def draw_badge(draw, x, y, text, fnt, bg, fg="#ffffff"):
    bb = fnt.getbbox(text)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    px, py = 10, 5
    draw.rounded_rectangle([x, y, x+tw+px*2, y+th+py*2], radius=4, fill=bg)
    draw.text((x+px, y+py), text, font=fnt, fill=fg)
    return tw + px*2, th + py*2

def draw_star_row(draw, x, y, filled=4, size=14):
    for i in range(5):
        col = REDDIT_ORANGE if i < filled else CREAM_DARK
        draw.text((x + i*18, y), "★", font=font(size), fill=col)

def browser_chrome(draw, img, bx, by, bw, bh, url_text="seattlecoffeegear.com/products/..."):
    """Draw a browser window frame and return inner content area y offset."""
    # Shadow
    shadow = Image.new("RGBA", (bw+16, bh+16), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle([8, 8, bw+8, bh+8], radius=10, fill=(0, 0, 0, 100))
    img_rgba = img.convert("RGBA")
    img_rgba.paste(shadow, (bx-8, by-8), shadow)
    img_converted = img_rgba.convert("RGB")
    # We need to work on the converted image
    draw2 = ImageDraw.Draw(img_converted)
    # Window
    draw2.rounded_rectangle([bx, by, bx+bw, by+bh], radius=10, fill="#f8f8f8", outline="#dddddd", width=1)
    # Title bar
    draw2.rounded_rectangle([bx, by, bx+bw, by+38], radius=10, fill="#eeeeee")
    draw2.rectangle([bx, by+28, bx+bw, by+38], fill="#eeeeee")
    # Traffic lights
    for i, col in enumerate(["#ff5f57", "#ffbd2e", "#28c840"]):
        draw2.ellipse([bx+12+i*22, by+12, bx+12+i*22+14, by+12+14], fill=col)
    # URL bar
    draw2.rounded_rectangle([bx+80, by+8, bx+bw-20, by+30], radius=4, fill="#ffffff", outline="#cccccc", width=1)
    f_url = font(11)
    draw2.text((bx+92, by+13), url_text, font=f_url, fill="#666666")
    return img_converted, draw2


# ===========================================================================
# SCREENSHOT 1 — Hero: Product Page with Community Panel
# ===========================================================================
def make_screenshot_1():
    img = Image.new("RGB", (W, H), CREAM)
    draw = ImageDraw.Draw(img)

    # Gradient background (warm cream)
    for y in range(H):
        t = y / H
        r = int(245 - t * 20)
        g = int(237 - t * 30)
        b = int(228 - t * 35)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Top headline
    f_hero = font(44, bold=True)
    f_sub  = font(20)
    shadow_text(draw, (120, 36), "Shop with community wisdom.", f_hero, COFFEE_DARK,
                shadow_col="#00000022", offset=(2, 2))
    centered_text(draw, 96, "r/espresso tier ratings appear right on your favorite retailer pages — no tab switching.", f_sub, COFFEE_MID)

    # Browser window mock
    bx, by, bw, bh = 60, 145, 780, 600
    img, draw = browser_chrome(draw, img, bx, by, bw, bh, "seattlecoffeegear.com/products/la-marzocco-linea-mini")

    # --- Retailer product page content (simplified) ---
    content_y = by + 45
    # Product image placeholder
    draw.rectangle([bx+20, content_y+10, bx+200, content_y+200], fill=CREAM_DARK, outline=CREAM_DARK)
    draw.text((bx+62, content_y+90), "☕", font=font(48), fill=COFFEE_LIGHT)

    # Product title and price
    f_prod_title = font(16, bold=True)
    f_prod_price = font(22, bold=True)
    f_prod_text  = font(12)
    draw.text((bx+220, content_y+14), "La Marzocco Linea Mini", font=f_prod_title, fill=COFFEE_DARK)
    draw.text((bx+220, content_y+38), "$3,699.00", font=f_prod_price, fill=COFFEE_DEEP)
    draw.text((bx+220, content_y+70), "The home espresso machine beloved by professionals.", font=f_prod_text, fill="#555555")
    draw.text((bx+220, content_y+88), "Dual boiler • PID temperature control • E61 group head", font=f_prod_text, fill="#888888")

    # Add to cart button
    draw.rounded_rectangle([bx+220, content_y+110, bx+440, content_y+140], radius=5, fill=COFFEE_DEEP)
    draw.text((bx+294, content_y+118), "Add to Cart", font=font(14, bold=True), fill=TEXT_WH)

    # --- Floating community intelligence panel ---
    px, py, pw, ph = bx+bw-310, content_y+5, 290, 380
    # Panel shadow
    shadow2 = Image.new("RGBA", (pw+12, ph+12), (0, 0, 0, 0))
    sdraw2 = ImageDraw.Draw(shadow2)
    sdraw2.rounded_rectangle([6, 6, pw+6, ph+6], radius=10, fill=(0, 0, 0, 80))
    img_rgba = img.convert("RGBA")
    img_rgba.paste(shadow2, (px-6, py-6), shadow2)
    img = img_rgba.convert("RGB")
    draw = ImageDraw.Draw(img)

    # Panel body
    draw.rounded_rectangle([px, py, px+pw, py+ph], radius=10, fill="#ffffff", outline="#e8ddd2", width=1)
    # Panel header
    draw.rounded_rectangle([px, py, px+pw, py+46], radius=10, fill=COFFEE_DEEP)
    draw.rectangle([px, py+36, px+pw, py+46], fill=COFFEE_DEEP)
    draw.text((px+14, py+10), "☕", font=font(18), fill=TEXT_WH)
    draw.text((px+40, py+10), "Espresso Community Intel", font=font(13, bold=True), fill=TEXT_WH)
    draw.text((px+40, py+28), "r/espresso", font=font(10), fill="#c8956a")
    # Close X
    draw.text((px+pw-24, py+12), "✕", font=font(14), fill="#c8956a")

    # Tier badge section
    ty = py + 60
    draw.text((px+14, ty), "Community Tier", font=font(11), fill=TEXT_GR)
    ty += 20
    # Prosumer tier badge (large)
    draw.rounded_rectangle([px+14, ty, px+pw-14, ty+38], radius=8, fill=TIER_PROSUMER)
    draw.text((px+86, ty+8), "PROSUMER", font=font(18, bold=True), fill=TEXT_WH)
    ty += 50

    # Stars
    draw.text((px+14, ty), "Community rating", font=font(11), fill=TEXT_GR)
    draw_star_row(draw, px+160, ty, filled=5, size=13)
    ty += 22

    # Sentiment summary
    draw.line([(px+10, ty), (px+pw-10, ty)], fill=CREAM_DARK)
    ty += 10
    draw.text((px+14, ty), "Community says", font=font(11, bold=True), fill=COFFEE_DARK)
    ty += 18
    sentiment = [
        "Widely considered the benchmark",
        "home espresso machine. Consistent",
        "shot quality, excellent build. Worth",
        "every penny for serious enthusiasts."
    ]
    for line in sentiment:
        draw.text((px+14, ty), line, font=font(11), fill="#444444")
        ty += 16
    ty += 6

    # Reddit link
    draw.line([(px+10, ty), (px+pw-10, ty)], fill=CREAM_DARK)
    ty += 10
    draw.rounded_rectangle([px+14, ty, px+pw-14, ty+30], radius=5, fill="#fff4f0", outline="#ffccbb", width=1)
    draw.text((px+24, ty+7), "🔗", font=font(13), fill=REDDIT_ORANGE)
    draw.text((px+46, ty+8), "Top r/espresso thread →", font=font(11), fill=REDDIT_ORANGE)
    ty += 42

    # Upgrade path teaser
    draw.rounded_rectangle([px+14, ty, px+pw-14, ty+54], radius=6, fill="#fff8e1", outline="#ffe082", width=1)
    draw.text((px+20, ty+8), "⭐ Pro: Upgrade path insight", font=font(11, bold=True), fill="#8d6e00")
    draw.text((px+20, ty+26), "Users of this machine often upgrade to", font=font(10), fill="#8d6e00")
    draw.text((px+20, ty+40), "the Slayer Single — within 2 yrs.  $6/mo", font=font(10), fill="#8d6e00")

    # Right-side callout labels
    label_x = bx + bw + 20
    labels = [
        (py + 68,   TIER_PROSUMER,  "Tier badge"),
        (py + 150,  COFFEE_DEEP,    "Sentiment"),
        (py + 220,  REDDIT_ORANGE,  "Reddit link"),
        (py + 285,  "#8d6e00",      "Pro preview"),
    ]
    for ly, lc, lt in labels:
        draw.line([(px+pw+2, ly+14), (label_x+10, ly+14)], fill=lc, width=2)
        draw.rounded_rectangle([label_x, ly+4, label_x+100, ly+28], radius=4, fill=lc)
        draw.text((label_x+8, ly+9), lt, font=font(11, bold=True), fill=TEXT_WH)

    # Bottom footer
    draw.rectangle([0, H-40, W, H], fill=COFFEE_DEEP)
    centered_text(draw, H-28, "Espresso Community Intelligence  ·  Free on Chrome Web Store", font(13), CREAM_LIGHT)

    img.save(os.path.join(OUT_DIR, "screenshot1_panel.png"))
    print("✓ screenshot1_panel.png")


# ===========================================================================
# SCREENSHOT 2 — Popup UI
# ===========================================================================
def make_screenshot_2():
    img = Image.new("RGB", (W, H), CREAM)
    draw = ImageDraw.Draw(img)

    # Gradient background
    for y in range(H):
        t = y / H
        r = int(240 - t * 30)
        g = int(225 - t * 40)
        b = int(210 - t * 45)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Headline
    shadow_text(draw, (W//2 - 280, 40), "Always one click away.", font(44, bold=True), COFFEE_DARK,
                shadow_col="#00000022", offset=(2, 2))
    centered_text(draw, 100, "The popup shows your active sites and plan — toggle the panel or jump to settings.", font(19), COFFEE_MID)

    # Central popup mockup
    pw, ph = 320, 380
    px = (W - pw) // 2
    py = 155

    # Drop shadow
    shadow = Image.new("RGBA", (pw+20, ph+20), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle([10, 10, pw+10, ph+10], radius=14, fill=(0, 0, 0, 90))
    img_rgba = img.convert("RGBA")
    img_rgba.paste(shadow, (px-10, py-10), shadow)
    img = img_rgba.convert("RGB")
    draw = ImageDraw.Draw(img)

    # Popup body
    draw.rounded_rectangle([px, py, px+pw, py+ph], radius=12, fill="#ffffff", outline=CREAM_DARK, width=1)

    # Header
    draw.rounded_rectangle([px, py, px+pw, py+60], radius=12, fill=COFFEE_DEEP)
    draw.rectangle([px, py+50, px+pw, py+60], fill=COFFEE_DEEP)
    draw.text((px+18, py+14), "☕", font=font(24), fill=TEXT_WH)
    draw.text((px+52, py+14), "Espresso Community Intel", font=font(14, bold=True), fill=TEXT_WH)
    draw.text((px+52, py+34), "r/espresso tier ratings while you shop", font=font(10), fill=COFFEE_LIGHT)

    # Status section
    sy = py + 76
    draw.rounded_rectangle([px+16, sy, px+pw-16, sy+90], radius=8, fill=CREAM_LIGHT, outline=CREAM_DARK, width=1)

    rows = [
        ("Status",       "Active ✓", TIER_BEGINNER),
        ("Active sites", "3",        COFFEE_DEEP),
        ("Plan",         "Free",     TEXT_GR),
    ]
    for i, (label, val, vcol) in enumerate(rows):
        ry = sy + 14 + i * 26
        draw.text((px+28, ry), label, font=font(12), fill=TEXT_GR)
        draw.text((px+pw-70, ry), val, font=font(12, bold=True), fill=vcol)

    # Supported sites
    sites_y = py + 186
    draw.text((px+18, sites_y), "Supported retailers:", font=font(11, bold=True), fill=COFFEE_DARK)
    sites_y += 20
    sites = ["seattlecoffeegear.com", "prima-coffee.com", "clivecoffee.com"]
    for site in sites:
        draw.text((px+22, sites_y), "•  " + site, font=font(11), fill=COFFEE_MID)
        sites_y += 18

    # Settings button
    btn_y = py + 278
    draw.rounded_rectangle([px+18, btn_y, px+pw-18, btn_y+38], radius=7, fill=CREAM_DARK, outline=CREAM_DARK)
    draw.text((px+pw//2-50, btn_y+10), "⚙  Settings", font=font(14, bold=True), fill=COFFEE_DEEP)

    # Pro upgrade bar
    pro_y = py + 326
    draw.rounded_rectangle([px+18, pro_y, px+pw-18, pro_y+40], radius=7, fill="#fff4f0", outline="#ffccbb", width=1)
    draw.text((px+26, pro_y+10), "Pro: saved comparisons & price alerts", font=font(11), fill=COFFEE_MID)
    draw.rounded_rectangle([px+pw-70, pro_y+8, px+pw-22, pro_y+32], radius=5, fill=REDDIT_ORANGE)
    draw.text((px+pw-64, pro_y+11), "$6/mo", font=font(11, bold=True), fill=TEXT_WH)

    # Annotation arrows
    annotations = [
        (px + pw + 30, py + 85,  COFFEE_DEEP,   "Live status"),
        (px + pw + 30, py + 230, COFFEE_MID,    "3 retailers"),
        (px - 180,     btn_y+8,  CREAM_DARK,    "Quick settings"),
        (px - 180,     pro_y+10, REDDIT_ORANGE, "Upgrade"),
    ]
    for ax, ay, ac, at in annotations:
        target_x = px + pw if ax > px + pw else px
        draw.line([(target_x, ay+8), (ax+4, ay+8)], fill=ac, width=2)
        bg_w = max(len(at) * 8 + 20, 100)
        if ax < px:
            draw.rounded_rectangle([ax - bg_w + 4, ay, ax + 4, ay + 24], radius=4, fill=ac)
            draw.text((ax - bg_w + 12, ay + 4), at, font=font(11, bold=True), fill=TEXT_WH)
        else:
            draw.rounded_rectangle([ax, ay, ax + bg_w, ay + 24], radius=4, fill=ac)
            draw.text((ax + 8, ay + 4), at, font=font(11, bold=True), fill=TEXT_WH)

    # Footer
    draw.rectangle([0, H-40, W, H], fill=COFFEE_DEEP)
    centered_text(draw, H-28, "One-click access  ·  Espresso Community Intelligence", font(13), CREAM_LIGHT)

    img.save(os.path.join(OUT_DIR, "screenshot2_popup.png"))
    print("✓ screenshot2_popup.png")


# ===========================================================================
# SCREENSHOT 3 — Settings / Options Page
# ===========================================================================
def make_screenshot_3():
    img = Image.new("RGB", (W, H), CREAM)
    draw = ImageDraw.Draw(img)

    # Gradient background
    for y in range(H):
        t = y / H
        r = int(242 - t * 25)
        g = int(230 - t * 35)
        b = int(218 - t * 40)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Headline
    shadow_text(draw, (W//2 - 340, 30), "Full control over your experience.", font(42, bold=True), COFFEE_DARK,
                shadow_col="#00000022", offset=(2, 2))
    centered_text(draw, 90, "Toggle per-site, manage your Pro plan, and configure panel behavior — all in settings.", font(18), COFFEE_MID)

    # Options page mockup (browser + full-width page)
    bx, by, bw, bh = 100, 130, W - 200, H - 160
    img, draw = browser_chrome(draw, img, bx, by, bw, bh, "chrome-extension://[id]/options/options.html")

    # Options page header
    hdr_y = by + 44
    draw.rectangle([bx, hdr_y, bx+bw, hdr_y+56], fill=COFFEE_DEEP)
    draw.text((bx+20, hdr_y+12), "Espresso Community Intelligence - Settings", font=font(16, bold=True), fill=TEXT_WH)
    draw.text((bx+20, hdr_y+34), "Version 1.0.0", font=font(10), fill=COFFEE_LIGHT)

    # Content area
    cx, cy = bx + 20, hdr_y + 72
    col_w = (bw - 60) // 2

    # Card 1: Enabled sites
    card_h1 = 180
    draw.rounded_rectangle([cx, cy, cx+col_w, cy+card_h1], radius=8, fill=TEXT_WH, outline=CREAM_DARK, width=1)
    draw.text((cx+16, cy+14), "Enabled Sites", font=font(13, bold=True), fill=COFFEE_DARK)
    draw.line([(cx+10, cy+32), (cx+col_w-10, cy+32)], fill=CREAM_DARK)

    site_entries = [
        ("seattlecoffeegear.com", True),
        ("prima-coffee.com",      True),
        ("clivecoffee.com",       True),
    ]
    ey = cy + 42
    for site, on in site_entries:
        draw.text((cx+16, ey+4), site, font=font(12), fill=COFFEE_MID)
        # Toggle
        tw, th = 44, 24
        tx = cx+col_w-tw-16
        bg = COFFEE_DEEP if on else "#c0c0c0"
        draw.rounded_rectangle([tx, ey, tx+tw, ey+th], radius=th//2, fill=bg)
        knob_d, pad = 18, 3
        kx = tx+tw-knob_d-pad if on else tx+pad
        draw.ellipse([kx, ey+pad, kx+knob_d, ey+pad+knob_d], fill=TEXT_WH)
        ey += 38

    # Card 2: Panel settings
    card2_x = cx + col_w + 20
    draw.rounded_rectangle([card2_x, cy, card2_x+col_w, cy+card_h1], radius=8, fill=TEXT_WH, outline=CREAM_DARK, width=1)
    draw.text((card2_x+16, cy+14), "Panel Behavior", font=font(13, bold=True), fill=COFFEE_DARK)
    draw.line([(card2_x+10, cy+32), (card2_x+col_w-10, cy+32)], fill=CREAM_DARK)

    panel_opts = [
        ("Auto-open on product pages", True),
        ("Show tier badge",             True),
        ("Show sentiment summary",      True),
        ("Show Reddit link",            True),
    ]
    py2 = cy + 42
    for opt, on in panel_opts:
        draw.text((card2_x+16, py2+4), opt, font=font(11), fill=COFFEE_MID)
        tw, th = 38, 20
        tx = card2_x+col_w-tw-16
        bg = COFFEE_DEEP if on else "#c0c0c0"
        draw.rounded_rectangle([tx, py2, tx+tw, py2+th], radius=th//2, fill=bg)
        kd = 14
        kx = tx+tw-kd-2 if on else tx+2
        draw.ellipse([kx, py2+3, kx+kd, py2+3+kd], fill=TEXT_WH)
        py2 += 30

    # Card 3: Tier legend
    cy2 = cy + card_h1 + 16
    card_h2 = 145
    draw.rounded_rectangle([cx, cy2, cx+col_w, cy2+card_h2], radius=8, fill=TEXT_WH, outline=CREAM_DARK, width=1)
    draw.text((cx+16, cy2+14), "r/espresso Tier Guide", font=font(13, bold=True), fill=COFFEE_DARK)
    draw.line([(cx+10, cy2+32), (cx+col_w-10, cy2+32)], fill=CREAM_DARK)

    tiers = [
        ("BEGINNER",    TIER_BEGINNER,   "Entry-level machines, great starting point"),
        ("ENTHUSIAST",  TIER_ENTHUSIAST, "Solid mid-range, step up in quality"),
        ("PROSUMER",    TIER_PROSUMER,   "Semi-professional, serious home baristas"),
        ("COMMERCIAL",  TIER_COMMERCIAL, "Professional grade equipment"),
    ]
    ty2 = cy2 + 42
    for tier_name, tier_col, tier_desc in tiers:
        draw.rounded_rectangle([cx+16, ty2, cx+96, ty2+18], radius=4, fill=tier_col)
        draw.text((cx+20, ty2+2), tier_name, font=font(9, bold=True), fill=TEXT_WH)
        draw.text((cx+104, ty2+2), tier_desc, font=font(10), fill="#555555")
        ty2 += 24

    # Card 4: Plan / Pro
    draw.rounded_rectangle([card2_x, cy2, card2_x+col_w, cy2+card_h2], radius=8, fill=TEXT_WH, outline=CREAM_DARK, width=1)
    draw.text((card2_x+16, cy2+14), "Your Plan", font=font(13, bold=True), fill=COFFEE_DARK)
    draw.line([(card2_x+10, cy2+32), (card2_x+col_w-10, cy2+32)], fill=CREAM_DARK)
    draw.text((card2_x+16, cy2+46), "Current plan:", font=font(11), fill=TEXT_GR)
    draw.rounded_rectangle([card2_x+col_w-70, cy2+40, card2_x+col_w-18, cy2+60], radius=4, fill=CREAM_DARK)
    draw.text((card2_x+col_w-62, cy2+44), "Free", font=font(11, bold=True), fill=COFFEE_DEEP)

    draw.text((card2_x+16, cy2+68), "Pro unlocks:", font=font(11, bold=True), fill=COFFEE_DARK)
    pro_features = ["Upgrade path recommendations", "Saved comparisons", "Price drop alerts"]
    pfy = cy2 + 86
    for feat in pro_features:
        draw.text((card2_x+20, pfy), "• " + feat, font=font(10), fill="#555555")
        pfy += 16

    draw.rounded_rectangle([card2_x+16, cy2+card_h2-30, card2_x+col_w-16, cy2+card_h2-10], radius=6, fill=REDDIT_ORANGE)
    draw.text((card2_x + (col_w-120)//2 + 16, cy2+card_h2-26), "Upgrade to Pro — $6/mo", font=font(11, bold=True), fill=TEXT_WH)

    # Footer
    draw.rectangle([0, H-40, W, H], fill=COFFEE_DEEP)
    centered_text(draw, H-28, "Full control in settings  ·  Espresso Community Intelligence", font(13), CREAM_LIGHT)

    img.save(os.path.join(OUT_DIR, "screenshot3_options.png"))
    print("✓ screenshot3_options.png")


# ===========================================================================
if __name__ == "__main__":
    make_screenshot_1()
    make_screenshot_2()
    make_screenshot_3()
    print(f"\nAll screenshots saved to: {OUT_DIR}")
