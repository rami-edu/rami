#!/usr/bin/env python3
"""
Generates high-resolution watercolor storybook Wonder Tree illustrations (Stages 1-4)
in the warm, hand-crafted Beatrix Potter / Studio Ghibli watercolor aesthetic.

Canvas Dimensions: 2800 x 3200 (1400w x 1600h logical units at 2X high-DPI supersampling).
Features:
- Majestic taller tree architecture with natural organic tapering trunk and fluted roots.
- Seamlessly curved catenary boughs cradling socket hollows with lush foliage pads.
- Natural crown finish with soaring central dome and airy sun-dappled crest tufts.
- Guaranteed top sky clearance (>= 260px buffer from y=0) so the crown is never clipped.
- Multi-layered depth: Back Foliage -> Fluted Bark Limbs -> Front Canopy Domes -> Socket Rims & Details.
"""

import os
import math
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SCALE = 2
W = 1400 * SCALE  # 2800
H = 1600 * SCALE  # 3200 (Taller tree with majestic crown)

# Color palette: Warm watercolor storybook (Ghibli / Beatrix Potter inspired)
BARK_BASE = (74, 52, 38)
BARK_MID = (112, 79, 56)
BARK_LIGHT = (156, 118, 86)
BARK_PENCIL = (48, 32, 22)

LEAF_SHADOW = (26, 58, 36)
LEAF_BASE = (38, 88, 54)
LEAF_MID = (65, 134, 82)
LEAF_LIGHT = (108, 175, 115)
LEAF_SUN = (160, 208, 128)
LEAF_HIGHLIGHT = (195, 230, 155)

LANTERN_GOLD = (255, 209, 102)
LANTERN_GLOW = (255, 183, 3)

def get_scallop_poly(cx, cy, rx, ry, f1=4, f2=7, p1=0.0, p2=0.0):
    """Generates smooth harmonic cloud/leaf scalloped contour points (64 points)."""
    n = 64
    pts = []
    for i in range(n):
        a = (i / n) * math.pi * 2
        dr = 1.0 + 0.075 * math.sin(a * f1 + p1) + 0.04 * math.sin(a * f2 + p2) + random.uniform(-0.02, 0.02)
        pts.append((cx + math.cos(a) * rx * dr, cy + math.sin(a) * ry * dr))
    return pts

def draw_foliage_dome(draw, cx, cy, rx, ry, is_top=False, is_side_pad=False):
    """Draws rich, layered watercolor foliage dome with solid undercoat to conceal branches."""
    f1, f2 = random.choice([3, 4, 5]), random.choice([6, 7, 8])
    p1, p2 = random.uniform(0, 6.28), random.uniform(0, 6.28)
    
    # 1. Solid opaque undercoat
    draw.polygon(get_scallop_poly(cx, cy + ry * 0.12, rx, ry * 0.88, f1, f2, p1, p2), fill=(*LEAF_SHADOW, 255))
    draw.polygon(get_scallop_poly(cx, cy, rx * 0.95, ry * 0.85, f1, f2, p1 + 0.5, p2 + 0.5), fill=(*LEAF_BASE, 255))
    draw.polygon(get_scallop_poly(cx - rx * 0.1, cy - ry * 0.1, rx * 0.82, ry * 0.72, f1, f2, p1 + 1.0, p2 + 1.0), fill=(*LEAF_MID, 255))
    draw.polygon(get_scallop_poly(cx - rx * 0.18, cy - ry * 0.18, rx * 0.6, ry * 0.5, f1, f2, p1 + 1.5, p2 + 1.5), fill=(*LEAF_LIGHT, 240))
    draw.polygon(get_scallop_poly(cx - rx * 0.25, cy - ry * 0.25, rx * 0.4, ry * 0.32, f1, f2, p1 + 2.0, p2 + 2.0), fill=(*LEAF_SUN, 220))
    
    if is_top:
        draw.polygon(get_scallop_poly(cx, cy - ry * 0.32, rx * 0.42, ry * 0.28, f1, f2, p1 + 2.5, p2 + 2.5), fill=(*LEAF_HIGHLIGHT, 210))
        
    n_twigs = 4 if is_side_pad else (8 if is_top else 6)
    for _ in range(n_twigs):
        ang = random.uniform(-math.pi * 0.85, -math.pi * 0.15) if is_top else random.uniform(0, math.pi * 2)
        d = random.uniform(rx * 0.35, rx * 0.85)
        tx = cx + math.cos(ang) * d
        ty = cy + math.sin(ang) * d * 0.8
        pts = [(tx + math.cos(ang + s * 0.3) * 10 * SCALE, ty + math.sin(ang + s * 0.3) * 7 * SCALE) for s in range(-2, 3)]
        draw.line(pts, fill=(*BARK_PENCIL, 150), width=int(1.8 * SCALE))

def bezier_pts(p0, p1, p2, p3=None, n=24):
    """Interpolates quadratic or cubic Bezier curve points."""
    pts = []
    for t in np.linspace(0, 1, n):
        if p3 is None:
            x = (1 - t)**2 * p0[0] + 2 * (1 - t) * t * p1[0] + t**2 * p2[0]
            y = (1 - t)**2 * p0[1] + 2 * (1 - t) * t * p1[1] + t**2 * p2[1]
        else:
            x = (1 - t)**3 * p0[0] + 3 * (1 - t)**2 * t * p1[0] + 3 * (1 - t) * t**2 * p2[0] + t**3 * p3[0]
            y = (1 - t)**3 * p0[1] + 3 * (1 - t)**2 * t * p1[1] + 3 * (1 - t) * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts

def draw_tapering_bough(b_draw, control_pts, start_w, end_w):
    """Draws an organically curving and tapering limb with watercolor bark tones."""
    curve = bezier_pts(*control_pts, n=28)
    n = len(curve)
    for i in range(n - 1):
        t = i / (n - 1)
        w = int(start_w * (1 - t) + end_w * t)
        p_a = curve[i]
        p_b = curve[i + 1]
        b_draw.line([p_a, p_b], fill=(*BARK_MID, 255), width=w)
        b_draw.line([(p_a[0], p_a[1] - w * 0.2), (p_b[0], p_b[1] - w * 0.2)], fill=(*BARK_LIGHT, 170), width=max(1, int(w * 0.45)))
        b_draw.line([(p_a[0], p_a[1] + w * 0.2), (p_b[0], p_b[1] + w * 0.2)], fill=(*BARK_BASE, 180), width=max(1, int(w * 0.45)))
        b_draw.line([p_a, p_b], fill=(*BARK_PENCIL, 210), width=max(1, int(1.8 * SCALE)))

def draw_storybook_bark_hollow(im, draw, hx, hy, r=42):
    """Draws a deep carved hollow knot into the wood with dark depth and gnarled bark rim."""
    r_scaled = int(r * SCALE)
    for step in range(6):
        cur_r = r_scaled - int(step * 4 * SCALE)
        if cur_r <= 0: break
        draw.ellipse((hx - cur_r, hy - int(cur_r * 1.06), hx + cur_r, hy + int(cur_r * 1.06)), fill=(18, 12, 8, 255))
    draw.ellipse((hx - r_scaled * 0.5, hy - r_scaled * 0.5, hx + r_scaled * 0.5, hy + r_scaled * 0.5), fill=(55, 38, 22, 140))
    rim_pts = []
    for i in range(24):
        a = (i / 24) * math.pi * 2
        var = random.uniform(0.94, 1.08)
        px = hx + math.cos(a) * (r_scaled + 7 * SCALE) * var
        py = hy + math.sin(a) * (r_scaled * 1.05 + 7 * SCALE) * var
        rim_pts.append((px, py))
    draw.line(rim_pts + [rim_pts[0]], fill=(*BARK_PENCIL, 220), width=int(3 * SCALE))
    draw.line(rim_pts + [rim_pts[0]], fill=(*BARK_LIGHT, 160), width=max(1, int(1 * SCALE)))

def generate_stage_image(stage_num, sockets):
    """Renders one of the 4 hand-drawn growth stages with transparent background at 4X resolution (2800x3200)."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    
    back_foliage = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bark_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    front_foliage = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    detail_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    
    b_draw = ImageDraw.Draw(bark_layer)
    d_draw = ImageDraw.Draw(detail_layer)
    bf_draw = ImageDraw.Draw(back_foliage)
    ff_draw = ImageDraw.Draw(front_foliage)
    
    base_x = W // 2
    base_y = H - int(70 * SCALE)
    
    # Configure stage scale, trunk thickness & crown height
    if stage_num == 1:
        crown_y = int(720 * SCALE)  # Trunk splits at y=1440
        trunk_half_bottom = int(140 * SCALE)
        trunk_half_top = int(60 * SCALE)
    elif stage_num == 2:
        crown_y = int(640 * SCALE)  # Trunk splits at y=1280
        trunk_half_bottom = int(180 * SCALE)
        trunk_half_top = int(80 * SCALE)
    else:  # Stages 3 & 4
        crown_y = int(580 * SCALE)  # Trunk splits at y=1160
        trunk_half_bottom = int(220 * SCALE)
        trunk_half_top = int(95 * SCALE)
        
    # --- 1. Draw Massive Fluted Trunk & Roots ---
    trunk_pts_left = [
        (base_x - trunk_half_bottom - int(120 * SCALE), base_y + int(45 * SCALE)),
        (base_x - trunk_half_bottom - int(40 * SCALE), base_y - int(35 * SCALE)),
        (base_x - trunk_half_bottom + int(10 * SCALE), base_y - int(240 * SCALE)),
        (base_x - trunk_half_bottom + int(30 * SCALE), base_y - int(540 * SCALE)),
        (base_x - trunk_half_top - int(20 * SCALE), crown_y + int(240 * SCALE)),
        (base_x - trunk_half_top, crown_y)
    ]
    trunk_top_crotch = [
        (base_x - int(trunk_half_top * 0.45), crown_y + int(20 * SCALE)),
        (base_x, crown_y + int(30 * SCALE)),
        (base_x + int(trunk_half_top * 0.45), crown_y + int(20 * SCALE))
    ]
    trunk_pts_right = [
        (base_x + trunk_half_top, crown_y),
        (base_x + trunk_half_top + int(20 * SCALE), crown_y + int(240 * SCALE)),
        (base_x + trunk_half_bottom - int(30 * SCALE), base_y - int(540 * SCALE)),
        (base_x + trunk_half_bottom - int(10 * SCALE), base_y - int(240 * SCALE)),
        (base_x + trunk_half_bottom + int(40 * SCALE), base_y - int(35 * SCALE)),
        (base_x + trunk_half_bottom + int(120 * SCALE), base_y + int(45 * SCALE))
    ]
    full_trunk = trunk_pts_left + trunk_top_crotch + trunk_pts_right
    b_draw.polygon(full_trunk, fill=(*BARK_BASE, 255))
    
    # Bark vertical grain lines & watercolor wash strips
    for gx in np.linspace(-int(trunk_half_bottom * 0.8), int(trunk_half_bottom * 0.8), 24):
        grain_pts = []
        for t in np.linspace(0, 1, 14):
            tx = (1 - t) * (base_x + gx) + t * (base_x + gx * 0.42)
            ty = (1 - t) * (base_y + 25 * SCALE) + t * (crown_y + 20 * SCALE)
            grain_pts.append((tx + random.uniform(-4 * SCALE, 4 * SCALE), ty))
        col = BARK_LIGHT if random.random() > 0.4 else BARK_MID
        b_draw.line(grain_pts, fill=(*col, 180), width=random.randint(int(4 * SCALE), int(7 * SCALE)))
        b_draw.line(grain_pts, fill=(*BARK_PENCIL, 140), width=random.randint(int(1 * SCALE), int(2 * SCALE)))

    # --- 2. Draw Branch Structures for Sockets (Organic Curving Boughs & Leaf Pads) ---
    for sock in sockets:
        sx = int(sock['x'] * W)
        sy = int(sock['y'] * H)
        dx = sx - base_x
        
        t_y = max(0.0, min(1.0, (base_y - sy) / (base_y - crown_y)))
        curr_trunk_half = int(trunk_half_bottom * (1 - t_y) + trunk_half_top * t_y)
        
        if abs(dx) > curr_trunk_half + int(18 * SCALE):
            side_dir = 1 if dx > 0 else -1
            b_start_x = base_x + side_dir * (curr_trunk_half - int(8 * SCALE))
            b_start_y = sy + int(45 * SCALE)
            ctrl_x = b_start_x + (sx - b_start_x) * 0.45
            ctrl_y = sy + int(40 * SCALE)
            draw_tapering_bough(
                b_draw,
                [(b_start_x, b_start_y), (ctrl_x, ctrl_y), (sx, sy + int(24 * SCALE))],
                int(28 * SCALE),
                int(16 * SCALE)
            )
            
            # Lush foliage pad around the socket
            draw_foliage_dome(
                bf_draw,
                (b_start_x + sx) * 0.5,
                sy + int(32 * SCALE),
                int(125 * SCALE),
                int(80 * SCALE),
                is_side_pad=True
            )
        else:
            # On-trunk knobby bark swelling
            b_draw.ellipse(
                (sx - int(38 * SCALE), sy + int(18 * SCALE), sx + int(38 * SCALE), sy + int(36 * SCALE)),
                fill=(*BARK_MID, 255)
            )
            b_draw.ellipse(
                (sx - int(35 * SCALE), sy + int(20 * SCALE), sx + int(35 * SCALE), sy + int(34 * SCALE)),
                fill=(*BARK_LIGHT, 180)
            )

        # Hanging ropes & ivy for portal signboards
        hang_type = sock.get('signHang', 'rope-left')
        rope_col = (139, 90, 43, 230)
        ivy_col = (82, 183, 136, 240)
        
        rx1, rx2 = sx - int(24 * SCALE), sx + int(24 * SCALE)
        ry1, ry2 = sy - int(52 * SCALE), sy - int(20 * SCALE)
        if 'left' in hang_type:
            d_draw.line([(rx1, ry1), (sx - int(20 * SCALE), ry2)], fill=rope_col, width=int(2 * SCALE))
            d_draw.line([(rx2, ry1), (sx + int(20 * SCALE), ry2)], fill=rope_col, width=int(2 * SCALE))
            d_draw.ellipse((sx - int(24 * SCALE), sy - int(38 * SCALE), sx - int(18 * SCALE), sy - int(32 * SCALE)), fill=ivy_col)
            d_draw.ellipse((sx + int(20 * SCALE), sy - int(44 * SCALE), sx + int(26 * SCALE), sy - int(38 * SCALE)), fill=ivy_col)
        elif 'right' in hang_type:
            d_draw.line([(rx1, ry1), (sx - int(22 * SCALE), ry2)], fill=rope_col, width=int(2 * SCALE))
            d_draw.line([(rx2, ry1), (sx + int(22 * SCALE), ry2)], fill=rope_col, width=int(2 * SCALE))
            d_draw.ellipse((sx + int(20 * SCALE), sy - int(36 * SCALE), sx + int(26 * SCALE), sy - int(30 * SCALE)), fill=ivy_col)
        else: # center
            d_draw.line([(sx - int(22 * SCALE), sy - int(54 * SCALE)), (sx - int(18 * SCALE), ry2)], fill=rope_col, width=int(2 * SCALE))
            d_draw.line([(sx + int(22 * SCALE), sy - int(54 * SCALE)), (sx + int(18 * SCALE), ry2)], fill=rope_col, width=int(2 * SCALE))

    # --- 3. Upper Canopy Limbs (Emerging from trunk and reaching upward into crown) ---
    if stage_num == 1:
        upper_limbs = [
            [(base_x - int(30 * SCALE), crown_y + int(20 * SCALE)),
             (base_x - int(100 * SCALE), crown_y - int(70 * SCALE)),
             (base_x - int(160 * SCALE), crown_y - int(150 * SCALE))],
            [(base_x + int(30 * SCALE), crown_y + int(20 * SCALE)),
             (base_x + int(100 * SCALE), crown_y - int(70 * SCALE)),
             (base_x + int(160 * SCALE), crown_y - int(150 * SCALE))],
            [(base_x, crown_y + int(25 * SCALE)),
             (base_x - int(10 * SCALE), crown_y - int(100 * SCALE)),
             (base_x, crown_y - int(210 * SCALE))]
        ]
    elif stage_num == 2:
        upper_limbs = [
            [(base_x - int(45 * SCALE), crown_y + int(20 * SCALE)),
             (base_x - int(130 * SCALE), crown_y - int(80 * SCALE)),
             (base_x - int(220 * SCALE), crown_y - int(170 * SCALE))],
            [(base_x + int(45 * SCALE), crown_y + int(20 * SCALE)),
             (base_x + int(130 * SCALE), crown_y - int(80 * SCALE)),
             (base_x + int(220 * SCALE), crown_y - int(170 * SCALE))],
            [(base_x, crown_y + int(25 * SCALE)),
             (base_x - int(10 * SCALE), crown_y - int(110 * SCALE)),
             (base_x, crown_y - int(230 * SCALE))]
        ]
    else:  # Stages 3 & 4
        upper_limbs = [
            [(base_x - int(60 * SCALE), crown_y + int(20 * SCALE)),
             (base_x - int(170 * SCALE), crown_y - int(80 * SCALE)),
             (base_x - int(270 * SCALE), crown_y - int(170 * SCALE))],
            [(base_x + int(60 * SCALE), crown_y + int(20 * SCALE)),
             (base_x + int(170 * SCALE), crown_y - int(80 * SCALE)),
             (base_x + int(270 * SCALE), crown_y - int(170 * SCALE))],
            [(base_x - int(25 * SCALE), crown_y + int(15 * SCALE)),
             (base_x - int(85 * SCALE), crown_y - int(110 * SCALE)),
             (base_x - int(110 * SCALE), crown_y - int(230 * SCALE))],
            [(base_x + int(25 * SCALE), crown_y + int(15 * SCALE)),
             (base_x + int(85 * SCALE), crown_y - int(110 * SCALE)),
             (base_x + int(110 * SCALE), crown_y - int(230 * SCALE))],
            [(base_x, crown_y + int(25 * SCALE)),
             (base_x - int(10 * SCALE), crown_y - int(120 * SCALE)),
             (base_x, crown_y - int(260 * SCALE))]
        ]
        
    for limb in upper_limbs:
        draw_tapering_bough(b_draw, limb, int(24 * SCALE), int(10 * SCALE))

    # --- 4. Rich Watercolor Foliage Canopy (Back, Front, Crowning Summit) ---
    is_celestial = (stage_num == 4)
    if stage_num == 1:
        back_clusters = [
            (base_x - int(200 * SCALE), crown_y + int(20 * SCALE), int(160 * SCALE), int(130 * SCALE)),
            (base_x + int(200 * SCALE), crown_y + int(15 * SCALE), int(160 * SCALE), int(130 * SCALE)),
            (base_x, crown_y - int(60 * SCALE), int(200 * SCALE), int(160 * SCALE)),
        ]
        front_clusters = [
            (base_x - int(140 * SCALE), crown_y - int(80 * SCALE), int(170 * SCALE), int(130 * SCALE), False),
            (base_x + int(140 * SCALE), crown_y - int(75 * SCALE), int(170 * SCALE), int(130 * SCALE), False),
            (base_x, crown_y - int(140 * SCALE), int(190 * SCALE), int(150 * SCALE), True),
            (base_x, crown_y - int(230 * SCALE), int(150 * SCALE), int(120 * SCALE), True)  # Summit dome
        ]
        crest_center_y = crown_y - int(270 * SCALE)
        crest_span_x = int(140 * SCALE)
        crest_span_y = int(45 * SCALE)
        
    elif stage_num == 2:
        back_clusters = [
            (base_x - int(290 * SCALE), crown_y + int(30 * SCALE), int(180 * SCALE), int(140 * SCALE)),
            (base_x + int(290 * SCALE), crown_y + int(25 * SCALE), int(180 * SCALE), int(140 * SCALE)),
            (base_x - int(180 * SCALE), crown_y - int(40 * SCALE), int(210 * SCALE), int(160 * SCALE)),
            (base_x + int(180 * SCALE), crown_y - int(45 * SCALE), int(210 * SCALE), int(160 * SCALE)),
            (base_x, crown_y - int(70 * SCALE), int(230 * SCALE), int(175 * SCALE)),
        ]
        front_clusters = [
            (base_x - int(230 * SCALE), crown_y - int(10 * SCALE), int(170 * SCALE), int(130 * SCALE), False),
            (base_x + int(230 * SCALE), crown_y - int(15 * SCALE), int(170 * SCALE), int(130 * SCALE), False),
            (base_x - int(130 * SCALE), crown_y - int(120 * SCALE), int(190 * SCALE), int(145 * SCALE), True),
            (base_x + int(135 * SCALE), crown_y - int(115 * SCALE), int(190 * SCALE), int(145 * SCALE), True),
            (base_x, crown_y - int(180 * SCALE), int(210 * SCALE), int(160 * SCALE), True),
            (base_x, crown_y - int(270 * SCALE), int(155 * SCALE), int(125 * SCALE), True)  # Summit dome
        ]
        crest_center_y = crown_y - int(310 * SCALE)
        crest_span_x = int(160 * SCALE)
        crest_span_y = int(50 * SCALE)
        
    else:  # Stages 3 & 4 (Grand Ancient Wonder Tree)
        back_clusters = [
            (base_x - int(380 * SCALE), crown_y + int(40 * SCALE), int(190 * SCALE), int(150 * SCALE)),
            (base_x + int(380 * SCALE), crown_y + int(35 * SCALE), int(190 * SCALE), int(150 * SCALE)),
            (base_x - int(250 * SCALE), crown_y - int(20 * SCALE), int(220 * SCALE), int(170 * SCALE)),
            (base_x + int(250 * SCALE), crown_y - int(25 * SCALE), int(220 * SCALE), int(170 * SCALE)),
            (base_x, crown_y - int(70 * SCALE), int(250 * SCALE), int(190 * SCALE)),
            (base_x - int(150 * SCALE), crown_y - int(160 * SCALE), int(210 * SCALE), int(160 * SCALE)),
            (base_x + int(150 * SCALE), crown_y - int(155 * SCALE), int(210 * SCALE), int(160 * SCALE))
        ]
        front_clusters = [
            (base_x - int(310 * SCALE), crown_y + int(15 * SCALE), int(180 * SCALE), int(140 * SCALE), False),
            (base_x + int(310 * SCALE), crown_y + int(10 * SCALE), int(180 * SCALE), int(140 * SCALE), False),
            (base_x - int(160 * SCALE), crown_y - int(80 * SCALE), int(210 * SCALE), int(160 * SCALE), False),
            (base_x + int(160 * SCALE), crown_y - int(75 * SCALE), int(210 * SCALE), int(160 * SCALE), False),
            (base_x, crown_y - int(130 * SCALE), int(230 * SCALE), int(175 * SCALE), False),
            (base_x - int(115 * SCALE), crown_y - int(200 * SCALE), int(190 * SCALE), int(145 * SCALE), True),
            (base_x + int(120 * SCALE), crown_y - int(195 * SCALE), int(190 * SCALE), int(145 * SCALE), True),
            (base_x, crown_y - int(260 * SCALE), int(200 * SCALE), int(155 * SCALE), True),
            (base_x, crown_y - int(330 * SCALE), int(150 * SCALE), int(120 * SCALE), True)
        ]
        crest_center_y = crown_y - int(370 * SCALE)
        crest_span_x = int(180 * SCALE)
        crest_span_y = int(55 * SCALE)

    # 4a. Draw back foliage layer
    for cx, cy, rx, ry in back_clusters:
        draw_foliage_dome(bf_draw, cx, cy, rx, ry, is_top=False)
        
    # 4b. Draw front foliage layer
    for cx, cy, rx, ry, is_top in front_clusters:
        draw_foliage_dome(ff_draw, cx, cy, rx, ry, is_top=is_top)
        
    # 4c. Feathering leafy crown crests that taper realistically into the open sky (never clipped!)
    for _ in range(28):
        ox = random.gauss(0, crest_span_x * 0.48)
        ox = max(-crest_span_x, min(crest_span_x, ox))
        arch = ((ox / crest_span_x) ** 2) * crest_span_y * 0.8
        tx = base_x + ox
        ty = crest_center_y + arch + random.uniform(-int(10 * SCALE), int(10 * SCALE))
        r = random.uniform(15 * SCALE, 26 * SCALE)
        ff_draw.polygon(get_scallop_poly(tx, ty, r, r * 0.8), fill=(*LEAF_MID, 255))
        ff_draw.polygon(get_scallop_poly(tx - r * 0.1, ty - r * 0.15, r * 0.75, r * 0.6), fill=(*LEAF_LIGHT, 240))
        ff_draw.polygon(get_scallop_poly(tx - r * 0.15, ty - r * 0.25, r * 0.5, r * 0.4), fill=(*LEAF_SUN, 220))
        twig_ang = random.uniform(-math.pi * 0.72, -math.pi * 0.28)
        twig_len = random.uniform(14 * SCALE, 26 * SCALE)
        ex = tx + math.cos(twig_ang) * twig_len
        ey = ty + math.sin(twig_ang) * twig_len
        ff_draw.line([(tx, ty), (ex, ey)], fill=(*BARK_PENCIL, 150), width=max(1, int(1.5 * SCALE)))
        for step in [0.5, 0.8, 1.0]:
            mx = tx + (ex - tx) * step
            my = ty + (ey - ty) * step
            ff_draw.ellipse((mx - 3 * SCALE, my - 3 * SCALE, mx + 3 * SCALE, my + 3 * SCALE), fill=(*LEAF_LIGHT, 230))

    # --- 5. Draw Bark Hollows at each Socket (On detail layer so they are never obscured) ---
    for sock in sockets:
        sx = int(sock['x'] * W)
        sy = int(sock['y'] * H)
        draw_storybook_bark_hollow(detail_layer, d_draw, sx, sy, r=42)

    # --- 6. Stage 4 Fairy Lanterns & Celestial Glow ---
    if is_celestial:
        for lx, ly in [(base_x - int(240 * SCALE), crown_y + int(40 * SCALE)), 
                       (base_x + int(240 * SCALE), crown_y + int(35 * SCALE)), 
                       (base_x - int(120 * SCALE), crown_y - int(50 * SCALE)),
                       (base_x + int(120 * SCALE), crown_y - int(55 * SCALE)),
                       (base_x, crown_y - int(150 * SCALE))]:
            d_draw.line([(lx, ly - int(50 * SCALE)), (lx, ly)], fill=(*BARK_PENCIL, 220), width=int(2 * SCALE))
            for r_glow, a_glow in [(int(32 * SCALE), 45), (int(20 * SCALE), 85), (int(10 * SCALE), 180)]:
                d_draw.ellipse((lx - r_glow, ly - r_glow, lx + r_glow, ly + r_glow), fill=(*LANTERN_GLOW, a_glow))
            d_draw.polygon([
                (lx - int(10 * SCALE), ly - int(12 * SCALE)), (lx + int(10 * SCALE), ly - int(12 * SCALE)),
                (lx + int(8 * SCALE), ly + int(14 * SCALE)), (lx - int(8 * SCALE), ly + int(14 * SCALE))
            ], fill=(212, 163, 115, 255), outline=BARK_PENCIL)
            c_r = int(5 * SCALE)
            d_draw.ellipse((lx - c_r, ly - c_r, lx + c_r, ly + c_r), fill=(255, 255, 255, 255))
            
        # Starlight glitter in canopy
        for _ in range(24):
            gx = base_x + random.uniform(-int(320 * SCALE), int(320 * SCALE))
            gy = crown_y + random.uniform(-int(280 * SCALE), int(60 * SCALE))
            r_s = random.uniform(3 * SCALE, 6 * SCALE)
            d_draw.ellipse((gx - r_s, gy - r_s, gx + r_s, gy + r_s), fill=(*LANTERN_GOLD, 230))
            d_draw.ellipse((gx - r_s * 0.4, gy - r_s * 0.4, gx + r_s * 0.4, gy + r_s * 0.4), fill=(255, 255, 255, 255))

    # --- 7. Composite Layers with Storybook Contour Wash ---
    img = Image.alpha_composite(img, back_foliage)
    img = Image.alpha_composite(img, bark_layer)
    img = Image.alpha_composite(img, front_foliage)
    img = Image.alpha_composite(img, detail_layer)
    
    contour = img.filter(ImageFilter.FIND_EDGES)
    contour_alpha = contour.split()[-1].point(lambda p: 70 if p > 32 else 0)
    pencil_wash = Image.new('RGBA', (W, H), (*BARK_PENCIL, 0))
    pencil_wash.putalpha(contour_alpha)
    img = Image.alpha_composite(img, pencil_wash)
    
    return img

# Normalized percentage socket coordinates (0.0 to 1.0) along the 1400w x 1600h logical tree
STAGES_CONFIG = {
    1: [
        {'id': 'portal_geom_shapes', 'minigame': 'Shape Nest (Geometry)', 'x': 0.38, 'y': 0.74, 'signHang': 'rope-left'},
        {'id': 'portal_color_bloom', 'minigame': 'Color Bloom (Colors)', 'x': 0.62, 'y': 0.70, 'signHang': 'rope-right'},
        {'id': 'portal_phonics_pond', 'minigame': 'Phonics Pond (Language)', 'x': 0.50, 'y': 0.54, 'signHang': 'center'},
    ],
    2: [
        {'id': 'portal_geom_shapes', 'minigame': 'Shape Nest (Geometry)', 'x': 0.28, 'y': 0.78, 'signHang': 'rope-left'},
        {'id': 'portal_color_bloom', 'minigame': 'Color Bloom (Colors)', 'x': 0.72, 'y': 0.74, 'signHang': 'rope-right'},
        {'id': 'portal_phonics_pond', 'minigame': 'Phonics Pond (Language)', 'x': 0.38, 'y': 0.58, 'signHang': 'rope-left'},
        {'id': 'portal_creature_ladder', 'minigame': 'Creature Ladder (Sizes)', 'x': 0.64, 'y': 0.54, 'signHang': 'rope-right'},
        {'id': 'portal_pattern_path', 'minigame': 'Pattern Path (Patterns)', 'x': 0.50, 'y': 0.42, 'signHang': 'center'},
    ],
    3: [
        {'id': 'portal_geom_shapes', 'minigame': 'Shape Nest (Geometry)', 'x': 0.24, 'y': 0.82, 'signHang': 'rope-left'},
        {'id': 'portal_color_bloom', 'minigame': 'Color Bloom (Colors)', 'x': 0.76, 'y': 0.78, 'signHang': 'rope-right'},
        {'id': 'portal_phonics_pond', 'minigame': 'Phonics Pond (Language)', 'x': 0.35, 'y': 0.64, 'signHang': 'rope-left'},
        {'id': 'portal_creature_ladder', 'minigame': 'Creature Ladder (Sizes)', 'x': 0.66, 'y': 0.60, 'signHang': 'rope-right'},
        {'id': 'portal_pattern_path', 'minigame': 'Pattern Path (Patterns)', 'x': 0.48, 'y': 0.50, 'signHang': 'center'},
        {'id': 'portal_shadow_match', 'minigame': 'Shadow Match (Observation)', 'x': 0.22, 'y': 0.44, 'signHang': 'rope-left'},
        {'id': 'portal_nature_sorting', 'minigame': 'Nature Sorting (Science)', 'x': 0.78, 'y': 0.42, 'signHang': 'rope-right'},
        {'id': 'portal_symmetry_wings', 'minigame': 'Symmetry Wings (Art)', 'x': 0.50, 'y': 0.30, 'signHang': 'center'},
    ],
    4: [
        {'id': 'portal_geom_shapes', 'minigame': 'Shape Nest (Geometry)', 'x': 0.24, 'y': 0.82, 'signHang': 'rope-left'},
        {'id': 'portal_color_bloom', 'minigame': 'Color Bloom (Colors)', 'x': 0.76, 'y': 0.78, 'signHang': 'rope-right'},
        {'id': 'portal_phonics_pond', 'minigame': 'Phonics Pond (Language)', 'x': 0.35, 'y': 0.64, 'signHang': 'rope-left'},
        {'id': 'portal_creature_ladder', 'minigame': 'Creature Ladder (Sizes)', 'x': 0.66, 'y': 0.60, 'signHang': 'rope-right'},
        {'id': 'portal_pattern_path', 'minigame': 'Pattern Path (Patterns)', 'x': 0.48, 'y': 0.50, 'signHang': 'center'},
        {'id': 'portal_shadow_match', 'minigame': 'Shadow Match (Observation)', 'x': 0.22, 'y': 0.44, 'signHang': 'rope-left'},
        {'id': 'portal_nature_sorting', 'minigame': 'Nature Sorting (Science)', 'x': 0.78, 'y': 0.42, 'signHang': 'rope-right'},
        {'id': 'portal_symmetry_wings', 'minigame': 'Symmetry Wings (Art)', 'x': 0.50, 'y': 0.30, 'signHang': 'center'},
    ]
}

if __name__ == '__main__':
    os.makedirs('public', exist_ok=True)
    for stage in [1, 2, 3, 4]:
        print(f'Generating Stage {stage} Wonder Tree illustration...')
        random.seed(100 + stage * 7)
        tree_img = generate_stage_image(stage, STAGES_CONFIG[stage])
        out_path = f'public/tree-stage-{stage}.png'
        tree_img.save(out_path, optimize=True)
        print(f'Successfully saved {out_path} ({tree_img.size})')
