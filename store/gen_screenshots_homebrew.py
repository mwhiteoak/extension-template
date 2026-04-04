"""
Generate 3 Chrome Web Store screenshots (1280x800) for
Homebrew Recipe Sidekick.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots_homebrew")
os.makedirs(OUT_DIR, exist_ok=True)
W, H = 1280, 800

# ---------------------------------------------------------------------------
# Color palette — warm homebrew/craft beer tones
# ---------------------------------------------------------------------------
BREW_DARK     = "#2a1a0e"   # dark brown
BREW_DEEP     = "#5a2e0a"   # deep amber-brown
BREW_MID      = "#8a4a1a"   # medium brown
BREW_ORANGE   = "#e8620d"   # brand orange
BREW_AMBER    = "#c8860a"   # beer amber
CREAM         = "#f7f3ee"   # warm cream background
CREAM_LIGHT   = "#fdfaf6"
CREAM_DARK    = "#e8ddd2"
HOP_GREEN     = "#4a7c30"   # hop green
HOP_LIGHT     = "#6aa84f"   # lighter green
TEXT_WH       = "#ffffff"
TEXT_DK       = "#1a1a1a"
TEXT_GR       = "#888888"
TEXT_DIM      = "#aaaaaa"
GRAIN_TAN     = "#d4a847"   # grain color

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

def shadow_text(draw, pos, text, fnt, fill, shadow_col="#00000044", offset=(2, 2)):
    draw.text((pos[0]+offset[0], pos[1]+offset[1]), text, font=fnt, fill=shadow_col)
    draw.text(pos, text, font=fnt, fill=fill)

def draw_badge(draw, x, y, text, fnt, bg, fg="#ffffff"):
    bb = fnt.getbbox(text)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    px, py = 10, 5
    draw.rounded_rectangle([x, y, x+tw+px*2, y+th+py*2], radius=4, fill=bg)
    draw.text((x+px, y+py), text, font=fnt, fill=fg)
    return tw + px*2, th + py*2

def warm_gradient(draw, top_color, bot_color, width=W, height=H):
    tr, tg, tb = int(top_color[1:3],16), int(top_color[3:5],16), int(top_color[5:7],16)
    br, bg, bb = int(bot_color[1:3],16), int(bot_color[3:5],16), int(bot_color[5:7],16)
    for y in range(height):
        t = y / height
        r = int(tr + (br-tr)*t)
        g = int(tg + (bg-tg)*t)
        b = int(tb + (bb-tb)*t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

def drop_shadow(img, bx, by, bw, bh, radius=10, alpha=90):
    shadow = Image.new("RGBA", (bw+16, bh+16), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle([8, 8, bw+8, bh+8], radius=radius, fill=(0, 0, 0, alpha))
    img_rgba = img.convert("RGBA")
    img_rgba.paste(shadow, (bx-8, by-8), shadow)
    return img_rgba.convert("RGB")

def browser_chrome(img, bx, by, bw, bh, url_text="homebrewtalk.com/forum/..."):
    img = drop_shadow(img, bx, by, bw, bh, radius=10, alpha=80)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([bx, by, bx+bw, by+bh], radius=10, fill="#f8f8f8", outline="#dddddd", width=1)
    draw.rounded_rectangle([bx, by, bx+bw, by+38], radius=10, fill="#eeeeee")
    draw.rectangle([bx, by+28, bx+bw, by+38], fill="#eeeeee")
    for i, col in enumerate(["#ff5f57", "#ffbd2e", "#28c840"]):
        draw.ellipse([bx+12+i*22, by+12, bx+12+i*22+14, by+12+14], fill=col)
    draw.rounded_rectangle([bx+80, by+8, bx+bw-20, by+30], radius=4, fill="#ffffff", outline="#cccccc", width=1)
    draw.text((bx+92, by+13), url_text, font=font(11), fill="#666666")
    return img, ImageDraw.Draw(img)


# ===========================================================================
# SCREENSHOT 1 — Hero: Recipe page with Brew Sidebar
# ===========================================================================
def make_screenshot_1():
    img = Image.new("RGB", (W, H), CREAM)
    draw = ImageDraw.Draw(img)
    warm_gradient(draw, "#f7f3ee", "#ede5d8")

    # Top headline
    f_hero = font(40, bold=True)
    f_sub  = font(19)
    shadow_text(draw, (80, 38), "Recipe intel, right on the page.", f_hero, BREW_DARK,
                shadow_col="#00000022", offset=(2,2))
    centered_text(draw, 92, "Hop profiles, ABV/IBU calculations, and batch tools — inline on homebrewtalk.com & brewersfriend.com.", f_sub, BREW_MID)

    # Browser window
    bx, by, bw, bh = 55, 145, 760, 595
    img, draw = browser_chrome(img, bx, by, bw, bh, "homebrewtalk.com/forum/threads/my-ipa-recipe")

    # --- Simulated forum page ---
    cy = by + 46
    # Page header bar (forum nav)
    draw.rectangle([bx, cy, bx+bw, cy+32], fill="#3a5a8a")
    draw.text((bx+14, cy+8), "HomeBrewTalk.com", font=font(13, bold=True), fill="#ffffff")
    draw.text((bx+200, cy+10), "Recipes  |  Forums  |  Wiki  |  Shop", font=font(11), fill="#c0d0e8")
    cy += 32

    # Thread title
    draw.rectangle([bx, cy, bx+bw, cy+44], fill="#ffffff")
    draw.text((bx+16, cy+10), "My Pacific Northwest IPA Recipe - help me refine!", font=font(14, bold=True), fill=BREW_DARK)
    draw.text((bx+16, cy+28), "by HopHead_Dave  ·  47 replies  ·  Ale / Pale Ale", font=font(11), fill=TEXT_GR)
    cy += 44

    # Post area
    draw.rectangle([bx, cy, bx+bw, cy+480], fill=CREAM_LIGHT)

    # Recipe block in post
    draw.rectangle([bx+16, cy+14, bx+bw-16, cy+340], fill="#ffffff", outline=CREAM_DARK)
    post_y = cy + 24

    draw.text((bx+28, post_y), "Batch Size: 5 gal   |   OG: 1.065   |   FG: 1.012   |   ABV: 6.9%   |   IBU: 58", font=font(12, bold=True), fill=BREW_DARK)
    post_y += 24

    draw.line([(bx+28, post_y), (bx+bw-28, post_y)], fill=CREAM_DARK)
    post_y += 10

    draw.text((bx+28, post_y), "Grain Bill:", font=font(12, bold=True), fill=BREW_DARK)
    post_y += 18
    grains = [
        ("Pale Malt 2-Row",    "9 lb"),
        ("Crystal 40L",        "1 lb"),
        ("White Wheat Malt",   "0.5 lb"),
    ]
    for grain, amt in grains:
        draw.ellipse([bx+34, post_y+4, bx+42, post_y+12], fill=GRAIN_TAN)
        draw.text((bx+50, post_y), f"{grain}  —  {amt}", font=font(12), fill="#333333")
        post_y += 18
    post_y += 6

    draw.text((bx+28, post_y), "Hops:", font=font(12, bold=True), fill=BREW_DARK)
    post_y += 18
    hops_data = [
        ("Centennial  14%AA", "1.0 oz", "60 min", "43 IBU"),
        ("Cascade  5.5%AA",   "0.5 oz", "15 min",  "8 IBU"),
        ("Citra  13%AA",      "1.0 oz",  "0 min",   "dry hop"),
    ]
    for hop, oz, time, ibu in hops_data:
        draw.ellipse([bx+34, post_y+4, bx+42, post_y+12], fill=HOP_GREEN)
        draw.text((bx+50, post_y), f"{hop}   {oz}  @  {time}  → {ibu}", font=font(12), fill="#333333")
        post_y += 18

    draw.text((bx+28, post_y + 12), "Yeast: Wyeast 1056 American Ale", font=font(12), fill="#333333")

    # --- Brew Sidebar panel ---
    sx, sy, sw, sh = bx+bw-295, by+44, 280, 595-44
    img = drop_shadow(img, sx, sy, sw, sh, radius=10, alpha=100)
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle([sx, sy, sx+sw, sy+sh], radius=10, fill="#ffffff", outline=CREAM_DARK, width=1)

    # Sidebar header
    draw.rounded_rectangle([sx, sy, sx+sw, sy+48], radius=10, fill=BREW_ORANGE)
    draw.rectangle([sx, sy+38, sx+sw, sy+48], fill=BREW_ORANGE)
    draw.text((sx+12, sy+10), "Homebrew Recipe Sidekick", font=font(13, bold=True), fill=TEXT_WH)
    draw.text((sx+12, sy+28), "homebrewtalk.com", font=font(10), fill="#ffd0a8")
    draw.text((sx+sw-24, sy+14), "✕", font=font(14), fill="#ffd0a8")

    ry = sy + 58

    # Recipe detected badge
    draw.rounded_rectangle([sx+10, ry, sx+sw-10, ry+26], radius=5, fill="#e8f5e9", outline="#a5d6a7", width=1)
    draw.text((sx+18, ry+6), "Recipe detected — 5 gal IPA", font=font(11, bold=True), fill=HOP_GREEN)
    ry += 36

    # Calculated stats
    draw.text((sx+12, ry), "Calculated Stats", font=font(12, bold=True), fill=BREW_DARK)
    ry += 18
    stats = [
        ("ABV",  "6.9%",  BREW_ORANGE),
        ("IBU",  "51",    BREW_AMBER),
        ("SRM",  "9",     GRAIN_TAN),
    ]
    sx_stat = sx + 12
    for label, val, col in stats:
        draw.rounded_rectangle([sx_stat, ry, sx_stat+70, ry+40], radius=6, fill=col)
        lbb = font(10).getbbox(label)
        draw.text((sx_stat + (70-(lbb[2]-lbb[0]))//2, ry+5), label, font=font(10), fill=TEXT_WH)
        vbb = font(16, bold=True).getbbox(val)
        draw.text((sx_stat + (70-(vbb[2]-vbb[0]))//2, ry+20), val, font=font(16, bold=True), fill=TEXT_WH)
        sx_stat += 80
    ry += 52

    draw.line([(sx+10, ry), (sx+sw-10, ry)], fill=CREAM_DARK)
    ry += 10

    # Hop lookup
    draw.text((sx+12, ry), "Hop Lookup", font=font(12, bold=True), fill=BREW_DARK)
    ry += 18
    hops_info = [
        ("Centennial", "14.0% AA", "Citrus, Floral"),
        ("Cascade",     "5.5% AA",  "Grapefruit, Floral"),
        ("Citra",      "13.0% AA", "Tropical, Citrus"),
    ]
    for hop, aa, desc in hops_info:
        draw.ellipse([sx+14, ry+5, sx+22, ry+13], fill=HOP_GREEN)
        draw.text((sx+28, ry), hop, font=font(11, bold=True), fill=BREW_DARK)
        draw.text((sx+28, ry+14), f"{aa}  ·  {desc}", font=font(10), fill=TEXT_GR)
        ry += 34

    draw.line([(sx+10, ry), (sx+sw-10, ry)], fill=CREAM_DARK)
    ry += 10

    # Unit converter teaser
    draw.text((sx+12, ry), "Batch Converter", font=font(12, bold=True), fill=BREW_DARK)
    ry += 18
    draw.rounded_rectangle([sx+12, ry, sx+sw-12, ry+28], radius=5, fill="#fff8f0", outline="#ffd0a0", width=1)
    draw.text((sx+20, ry+7), "5.0 gal  =  18.9 L  |  OG 1.065  =  15.8° P", font=font(11), fill=BREW_MID)
    ry += 40

    # Pro upsell
    draw.rounded_rectangle([sx+10, ry, sx+sw-10, ry+56], radius=6, fill="#fff8e1", outline="#ffe082", width=1)
    draw.text((sx+18, ry+8), "Pro: Water chemistry & yeast tools", font=font(11, bold=True), fill="#8d6e00")
    draw.text((sx+18, ry+26), "Strike water temp, mash pH, yeast pitch", font=font(10), fill="#8d6e00")
    draw.text((sx+18, ry+41), "rate, fermentation schedule & more.  $5/mo", font=font(10), fill="#8d6e00")

    # Right-side callout labels
    lx = sx + sw + 16
    labels = [
        (sy + 58,   HOP_GREEN,   "Auto-detect"),
        (sy + 116,  BREW_ORANGE, "Live stats"),
        (sy + 218,  HOP_GREEN,   "Hop lookup"),
        (sy + 362,  "#8d6e00",   "Pro preview"),
    ]
    for ly, lc, lt in labels:
        draw.line([(sx+sw+2, ly+10), (lx+8, ly+10)], fill=lc, width=2)
        draw.rounded_rectangle([lx, ly, lx+96, ly+24], radius=4, fill=lc)
        lbb = font(11, bold=True).getbbox(lt)
        draw.text((lx+(96-(lbb[2]-lbb[0]))//2, ly+5), lt, font=font(11, bold=True), fill=TEXT_WH)

    # Footer
    draw.rectangle([0, H-40, W, H], fill=BREW_DEEP)
    centered_text(draw, H-28, "Homebrew Recipe Sidekick  ·  Free on Chrome Web Store", font(13), CREAM_LIGHT)

    img.save(os.path.join(OUT_DIR, "screenshot1_sidebar.png"))
    print("screenshot1_sidebar.png")


# ===========================================================================
# SCREENSHOT 2 — Popup UI
# ===========================================================================
def make_screenshot_2():
    img = Image.new("RGB", (W, H), CREAM)
    draw = ImageDraw.Draw(img)
    warm_gradient(draw, "#f7f3ee", "#ede5d8")

    # Headline
    shadow_text(draw, (W//2 - 290, 38), "Brewing tools, one click away.", font(40, bold=True), BREW_DARK,
                shadow_col="#00000022", offset=(2,2))
    centered_text(draw, 96, "See your plan status, active sites, and jump straight to settings — all from the extension popup.", font(18), BREW_MID)

    # Central popup mockup
    pw, ph = 310, 390
    px = (W - pw) // 2
    py = 148

    img = drop_shadow(img, px, py, pw, ph, radius=12, alpha=90)
    draw = ImageDraw.Draw(img)

    # Popup body
    draw.rounded_rectangle([px, py, px+pw, py+ph], radius=12, fill="#ffffff", outline=CREAM_DARK, width=1)

    # Header
    draw.rounded_rectangle([px, py, px+pw, py+58], radius=12, fill=BREW_ORANGE)
    draw.rectangle([px, py+48, px+pw, py+58], fill=BREW_ORANGE)
    # Hop icon
    draw.text((px+18, py+10), "🍺", font=font(26), fill=TEXT_WH)
    draw.text((px+58, py+10), "Homebrew Recipe Sidekick", font=font(13, bold=True), fill=TEXT_WH)
    draw.text((px+58, py+30), "Brewing Tools — Inline & Instant", font=font(10), fill="#ffd0a8")

    body_y = py + 68

    # Status rows
    status_rows = [
        ("Status",         "Active",     BREW_ORANGE),
        ("Units",          "Imperial",   BREW_MID),
        ("Default Batch",  "5 gal",      BREW_MID),
        ("Plan",           "Free",       TEXT_GR),
    ]
    for label, val, vc in status_rows:
        draw.text((px+18, body_y), label, font=font(12), fill=TEXT_GR)
        vbb = font(12, bold=True).getbbox(val)
        draw.text((px+pw-18-(vbb[2]-vbb[0]), body_y), val, font=font(12, bold=True), fill=vc)
        body_y += 22
        draw.line([(px+12, body_y), (px+pw-12, body_y)], fill=CREAM_DARK)
        body_y += 8

    body_y += 4

    # Sites active notice
    draw.rounded_rectangle([px+14, body_y, px+pw-14, body_y+34], radius=6, fill="#f0f8f0", outline="#c8e6c9", width=1)
    draw.text((px+22, body_y+6), "Active on:", font=font(11, bold=True), fill=HOP_GREEN)
    draw.text((px+22, body_y+20), "homebrewtalk.com  ·  brewersfriend.com", font=font(10), fill=HOP_GREEN)
    body_y += 46

    # Settings button
    draw.rounded_rectangle([px+14, body_y, px+pw-14, body_y+36], radius=6, fill="#f7f3ee", outline=CREAM_DARK, width=1)
    btn_lbl = "Settings & Preferences"
    bbb = font(13, bold=True).getbbox(btn_lbl)
    draw.text((px + (pw-(bbb[2]-bbb[0]))//2, body_y+10), btn_lbl, font=font(13, bold=True), fill=BREW_MID)
    body_y += 48

    # Pro upsell bar
    draw.rounded_rectangle([px+14, body_y, px+pw-14, body_y+46], radius=6, fill=BREW_ORANGE)
    draw.text((px+22, body_y+6), "Pro: water chemistry, yeast tools,", font=font(11), fill=TEXT_WH)
    draw.text((px+22, body_y+22), "recipe saving & fermentation planner", font=font(11), fill=TEXT_WH)
    # Upgrade button
    draw.rounded_rectangle([px+pw-80, body_y+10, px+pw-20, body_y+36], radius=5, fill="#ffffff")
    ub_lbl = "$5/mo"
    ubbb = font(11, bold=True).getbbox(ub_lbl)
    draw.text((px+pw-80+(60-(ubbb[2]-ubbb[0]))//2, body_y+16), ub_lbl, font=font(11, bold=True), fill=BREW_ORANGE)

    # Callout arrows with labels
    callouts = [
        (py+68,   BREW_ORANGE, "Status at a glance", "right"),
        (py+200,  HOP_GREEN,   "Active sites",       "right"),
        (py+296,  BREW_ORANGE, "Pro upgrade",        "right"),
    ]
    for cy2, cc, ct, side in callouts:
        ax = px + pw + 16
        draw.line([(px+pw+2, cy2+10), (ax+8, cy2+10)], fill=cc, width=2)
        cb = font(11, bold=True).getbbox(ct)
        cw = cb[2]-cb[0]
        draw.rounded_rectangle([ax, cy2, ax+cw+20, cy2+24], radius=4, fill=cc)
        draw.text((ax+10, cy2+5), ct, font=font(11, bold=True), fill=TEXT_WH)

    # Footer
    draw.rectangle([0, H-40, W, H], fill=BREW_DEEP)
    centered_text(draw, H-28, "Homebrew Recipe Sidekick  ·  Free on Chrome Web Store", font(13), CREAM_LIGHT)

    img.save(os.path.join(OUT_DIR, "screenshot2_popup.png"))
    print("screenshot2_popup.png")


# ===========================================================================
# SCREENSHOT 3 — Options / Settings Page
# ===========================================================================
def make_screenshot_3():
    img = Image.new("RGB", (W, H), CREAM)
    draw = ImageDraw.Draw(img)
    warm_gradient(draw, "#f0ebe4", "#e8ddd2")

    # Headline
    shadow_text(draw, (W//2 - 310, 38), "Dial in your brew settings.", font(40, bold=True), BREW_DARK,
                shadow_col="#00000022", offset=(2,2))
    centered_text(draw, 96, "Choose units, default batch size, and pro features — all in one clean settings page.", font(18), BREW_MID)

    # Browser window for options page
    bx, by, bw, bh = 120, 145, 1040, 600
    img, draw = browser_chrome(img, bx, by, bw, bh, "chrome-extension://homebrew-recipe-sidekick/options/options.html")

    # Options page header
    oy = by + 38
    draw.rectangle([bx, oy, bx+bw, oy+56], fill=BREW_ORANGE)
    draw.text((bx+26, oy+10), "Homebrew Recipe Sidekick — Settings", font=font(18, bold=True), fill=TEXT_WH)
    draw.text((bx+26, oy+34), "Customize your brewing companion", font=font(12), fill="#ffd0a8")
    oy += 56

    # Main content area
    draw.rectangle([bx, oy, bx+bw, by+bh], fill=CREAM)

    # Two-column cards layout
    card_y = oy + 18
    left_x = bx + 26
    right_x = bx + bw//2 + 10
    card_w = bw//2 - 36

    def draw_card(draw, cx, cy, cw, title, rows, highlight=False):
        ch = 36 + len(rows) * 44 + 14
        bg = "#ffffff"
        draw.rounded_rectangle([cx, cy, cx+cw, cy+ch], radius=8, fill=bg, outline=CREAM_DARK, width=1)
        # Card title
        tbb = font(12, bold=True).getbbox(title)
        draw.text((cx+16, cy+12), title, font=font(12, bold=True), fill=BREW_ORANGE)
        draw.line([(cx+10, cy+34), (cx+cw-10, cy+34)], fill=CREAM_DARK)
        fy = cy + 44
        for label, ctrl_type, val in rows:
            draw.text((cx+16, fy+4), label, font=font(12), fill="#555555")
            if ctrl_type == "select":
                draw.rounded_rectangle([cx+cw-150, fy, cx+cw-14, fy+28], radius=5, fill="#f7f7f7", outline="#cccccc", width=1)
                draw.text((cx+cw-144, fy+7), val, font=font(12), fill=BREW_DARK)
                # Dropdown arrow
                draw.text((cx+cw-26, fy+6), "▾", font=font(13), fill=TEXT_GR)
            elif ctrl_type == "toggle":
                tw, th = 42, 22
                tx = cx + cw - 60
                ty2 = fy + 3
                is_on = val == "on"
                draw.rounded_rectangle([tx, ty2, tx+tw, ty2+th], radius=th//2, fill=BREW_ORANGE if is_on else "#cccccc")
                kd = 16
                kp = 3
                kx = tx + tw - kd - kp if is_on else tx + kp
                ky = ty2 + kp
                draw.ellipse([kx, ky, kx+kd, ky+kd], fill="#ffffff")
            elif ctrl_type == "number":
                draw.rounded_rectangle([cx+cw-90, fy, cx+cw-14, fy+28], radius=5, fill="#f7f7f7", outline="#cccccc", width=1)
                draw.text((cx+cw-80, fy+7), val, font=font(12), fill=BREW_DARK)
            fy += 44
        return ch

    # Card: General
    ch1 = draw_card(draw, left_x, card_y, card_w, "General", [
        ("Unit System",     "select", "Imperial (gal, oz, °F)"),
        ("Default Batch",   "number", "5 gal"),
        ("Show Sidebar",    "toggle", "on"),
        ("Dark Sidebar",    "toggle", "off"),
    ])

    # Card: Calculations
    ch2 = draw_card(draw, right_x, card_y, card_w, "Calculation Defaults", [
        ("Hop Utilization",  "select", "Tinseth Formula"),
        ("Yeast Attenuation","number", "75%"),
        ("Evaporation Rate", "number", "1.0 gal/hr"),
    ])

    card_y2 = card_y + max(ch1, ch2) + 14

    # Card: Pro Features
    ch3 = draw_card(draw, left_x, card_y2, card_w, "Pro Features", [
        ("Water Chemistry",      "toggle", "off"),
        ("Recipe Save (20 max)", "toggle", "off"),
        ("Fermentation Planner", "toggle", "off"),
    ])

    # Card: Data & Privacy
    ch4 = draw_card(draw, right_x, card_y2, card_w, "Data & Privacy", [
        ("Storage",   "select", "Local only"),
        ("Analytics", "toggle", "off"),
    ])

    # Save button row (bottom of page)
    save_y = card_y2 + max(ch3, ch4) + 16
    if save_y < by + bh - 50:
        btn_w = 140
        btn_x = bx + (bw - btn_w)//2
        draw.rounded_rectangle([btn_x, save_y, btn_x+btn_w, save_y+34], radius=6, fill=BREW_ORANGE)
        slbl = "Save Settings"
        sbb = font(13, bold=True).getbbox(slbl)
        draw.text((btn_x+(btn_w-(sbb[2]-sbb[0]))//2, save_y+9), slbl, font=font(13, bold=True), fill=TEXT_WH)

    # Footer
    draw.rectangle([0, H-40, W, H], fill=BREW_DEEP)
    centered_text(draw, H-28, "Homebrew Recipe Sidekick  ·  Free on Chrome Web Store", font(13), CREAM_LIGHT)

    img.save(os.path.join(OUT_DIR, "screenshot3_options.png"))
    print("screenshot3_options.png")


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    make_screenshot_1()
    make_screenshot_2()
    make_screenshot_3()
    print(f"Done — see {OUT_DIR}/")
