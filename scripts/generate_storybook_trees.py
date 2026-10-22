import os
import math
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

W = 1400
H = 1200

# Color palette: Warm watercolor storybook (Ghibli / Beatrix Potter inspired)
BARK_BASE = (74, 52, 38)
BARK_MID = (102, 74, 52)
BARK_LIGHT = (142, 106, 75)
BARK_HIGHLIGHT = (182, 142, 105)
BARK_PENCIL = (38, 24, 18)

MOSS_DARK = (45, 80, 56)
MOSS_LIGHT = (82, 138, 92)

LEAF_SHADOW = (28, 54, 38)
LEAF_BASE = (42, 92, 58)
LEAF_MID = (72, 142, 90)
LEAF_LIGHT = (120, 185, 126)
LEAF_SUN = (175, 218, 140)

LANTERN_GOLD = (255, 209, 102)
LANTERN_GLOW = (255, 183, 3)

def create_noise_texture(width, height, scale=40):
    """Generates watercolor paper grain noise."""
    np.random.seed(42)
    grid_w, grid_h = width // scale + 2, height // scale + 2
    rand_grid = np.random.rand(grid_h, grid_w)
    
    # Bilinear upscale
    img = Image.fromarray((rand_grid * 255).astype(np.uint8))
    img = img.resize((width, height), Image.Resampling.BICUBIC)
    noise = np.array(img).astype(np.float32) / 255.0
    return noise

def add_jitter(pts, amount=2.5):
    """Adds natural hand-drawn pencil jitter to a line."""
    jittered = []
    for x, y in pts:
        jx = x + random.uniform(-amount, amount)
        jy = y + random.uniform(-amount, amount)
        jittered.append((jx, jy))
    return jittered

def draw_watercolor_blob(draw_layer, cx, cy, rx, ry, color, opacity=180, num_layers=4):
    """Draws a soft organic watercolor blotch with uneven edges."""
    for layer in range(num_layers):
        r_mult = 1.0 - (layer * 0.12)
        cur_rx = rx * r_mult * random.uniform(0.92, 1.08)
        cur_ry = ry * r_mult * random.uniform(0.92, 1.08)
        cur_alpha = int(opacity * (0.6 + layer * 0.15))
        
        # Build polygon with organic perturbation
        n_pts = 16
        pts = []
        for i in range(n_pts):
            angle = (i / n_pts) * math.pi * 2
            rad_var = random.uniform(0.85, 1.15)
            px = cx + math.cos(angle) * cur_rx * rad_var
            py = cy + math.sin(angle) * cur_ry * rad_var
            pts.append((px, py))
            
        fill_col = (*color, cur_alpha)
        draw_layer.polygon(pts, fill=fill_col)

def draw_storybook_bark_hollow(im, draw, hx, hy, r=44):
    """Draws a carved knot hollow into the tree trunk with inner depth & wood rim."""
    # Dark cavity depth
    for radius, alpha in [(r, 240), (r - 6, 255), (r - 12, 255)]:
        draw.ellipse(
            (hx - radius, hy - radius * 1.06, hx + radius, hy + radius * 1.06),
            fill=(18, 12, 8, alpha)
        )
    # Inner subtle warm amber backlight
    draw.ellipse(
        (hx - r * 0.5, hy - r * 0.5, hx + r * 0.5, hy + r * 0.5),
        fill=(55, 38, 22, 140)
    )
    # Gnarled bark rim around the hole
    rim_pts = []
    for i in range(24):
        a = (i / 24) * math.pi * 2
        var = random.uniform(0.94, 1.08)
        px = hx + math.cos(a) * (r + 8) * var
        py = hy + math.sin(a) * (r * 1.06 + 8) * var
        rim_pts.append((px, py))
    draw.line(rim_pts + [rim_pts[0]], fill=(*BARK_PENCIL, 220), width=3)
    draw.line(rim_pts + [rim_pts[0]], fill=(*BARK_LIGHT, 160), width=1)

def draw_canopy_cluster(layer, cx, cy, radius, is_celestial=False):
    """Draws lush Beatrix Potter / Ghibli watercolor foliage cluster."""
    draw = ImageDraw.Draw(layer)
    # Shadow layer
    draw_watercolor_blob(draw, cx, cy + radius * 0.2, radius, radius * 0.75, LEAF_SHADOW, 190)
    # Base watercolor wash
    draw_watercolor_blob(draw, cx, cy, radius * 0.95, radius * 0.72, LEAF_BASE, 210)
    # Mid-tone leaves
    draw_watercolor_blob(draw, cx - radius * 0.15, cy - radius * 0.15, radius * 0.8, radius * 0.65, LEAF_MID, 220)
    # Sunlight highlights
    draw_watercolor_blob(draw, cx - radius * 0.25, cy - radius * 0.25, radius * 0.55, radius * 0.45, LEAF_LIGHT, 200)
    draw_watercolor_blob(draw, cx - radius * 0.35, cy - radius * 0.35, radius * 0.35, radius * 0.28, LEAF_SUN, 180)
    
    # Hand-drawn sepia pencil leaf contour strokes
    n_twigs = 8
    for _ in range(n_twigs):
        a = random.uniform(0, math.pi * 2)
        d = random.uniform(radius * 0.4, radius * 0.95)
        lx = cx + math.cos(a) * d
        ly = cy + math.sin(a) * d * 0.8
        # Small scalloped leaf bundle
        scallop = []
        for s in range(5):
            sa = a + (s - 2) * 0.3
            scallop.append((lx + math.cos(sa) * 12, ly + math.sin(sa) * 8))
        draw.line(scallop, fill=(*BARK_PENCIL, 160), width=2)
        
    if is_celestial:
        # Golden blossoms & starry glitter
        for _ in range(7):
            bx = cx + random.uniform(-radius * 0.7, radius * 0.7)
            by = cy + random.uniform(-radius * 0.6, radius * 0.6)
            draw.ellipse((bx - 6, by - 6, bx + 6, by + 6), fill=(*LANTERN_GOLD, 230))
            draw.ellipse((bx - 3, by - 3, bx + 3, by + 3), fill=(255, 255, 255, 255))

def generate_stage_image(stage_num, sockets):
    """Renders one of the 4 hand-drawn growth stages with transparent background."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    foliage_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bark_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    detail_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    
    b_draw = ImageDraw.Draw(bark_layer)
    d_draw = ImageDraw.Draw(detail_layer)
    
    base_x = W // 2
    base_y = H - 60
    
    # Configure stage scale & trunk thickness
    if stage_num == 1:
        trunk_half_bottom = 90
        trunk_half_top = 48
        crown_y = 380
    elif stage_num == 2:
        trunk_half_bottom = 145
        trunk_half_top = 75
        crown_y = 300
    else:  # Stages 3 & 4
        trunk_half_bottom = 210
        trunk_half_top = 110
        crown_y = 220
        
    # --- 1. Draw Massive Fluted Trunk & Roots ---
    trunk_pts_left = [
        (base_x - trunk_half_bottom - 110, base_y + 40),
        (base_x - trunk_half_bottom - 40, base_y - 20),
        (base_x - trunk_half_bottom + 10, base_y - 120),
        (base_x - trunk_half_bottom + 25, base_y - 280),
        (base_x - trunk_half_top - 20, crown_y + 180),
        (base_x - trunk_half_top, crown_y)
    ]
    trunk_pts_right = [
        (base_x + trunk_half_top, crown_y),
        (base_x + trunk_half_top + 25, crown_y + 180),
        (base_x + trunk_half_bottom - 20, base_y - 280),
        (base_x + trunk_half_bottom - 10, base_y - 120),
        (base_x + trunk_half_bottom + 45, base_y - 20),
        (base_x + trunk_half_bottom + 120, base_y + 40)
    ]
    
    full_trunk = trunk_pts_left + trunk_pts_right
    b_draw.polygon(full_trunk, fill=(*BARK_BASE, 255))
    
    # Bark vertical grain lines & watercolor wash strips
    for gx in np.linspace(-trunk_half_bottom + 10, trunk_half_bottom - 10, 18):
        grain_pts = []
        for t in np.linspace(0, 1, 10):
            tx = (1 - t) * (base_x + gx) + t * (base_x + gx * 0.45)
            ty = (1 - t) * (base_y + 20) + t * crown_y
            grain_pts.append((tx + random.uniform(-4, 4), ty))
        col = BARK_LIGHT if random.random() > 0.4 else BARK_MID
        b_draw.line(grain_pts, fill=(*col, 180), width=random.randint(4, 9))
        b_draw.line(grain_pts, fill=(*BARK_PENCIL, 140), width=random.randint(1, 2))

    # --- 2. Draw Branch Structures for Sockets ---
    for sock in sockets:
        sx = int(sock['x'] * W)
        sy = int(sock['y'] * H)
        
        # Connect trunk to hollow socket with curving natural bough
        b_start_x = base_x + (sx - base_x) * 0.25
        b_start_y = sy + random.randint(30, 80)
        
        bough_pts = [
            (b_start_x, b_start_y),
            (base_x + (sx - base_x) * 0.6, sy + 35),
            (sx, sy + 25)
        ]
        b_draw.line(bough_pts, fill=(*BARK_MID, 255), width=random.randint(24, 38))
        b_draw.line(bough_pts, fill=(*BARK_PENCIL, 220), width=random.randint(2, 3))
        
        # Draw wooden hanging rope / ivy tendril for the sign
        hang_type = sock.get('signHang', 'rope-left')
        rope_col = (139, 90, 43, 230)
        ivy_col = (82, 183, 136, 240)
        
        if 'left' in hang_type:
            d_draw.line([(sx - 24, sy - 52), (sx - 20, sy - 20)], fill=rope_col, width=2)
            d_draw.line([(sx + 24, sy - 52), (sx + 20, sy - 20)], fill=rope_col, width=2)
            # Little ivy leaves clinging to rope
            d_draw.ellipse((sx - 24, sy - 38, sx - 18, sy - 32), fill=ivy_col)
            d_draw.ellipse((sx + 20, sy - 44, sx + 26, sy - 38), fill=ivy_col)
        elif 'right' in hang_type:
            d_draw.line([(sx - 24, sy - 52), (sx - 22, sy - 20)], fill=rope_col, width=2)
            d_draw.line([(sx + 24, sy - 52), (sx + 22, sy - 20)], fill=rope_col, width=2)
            d_draw.ellipse((sx + 20, sy - 36, sx + 26, sy - 30), fill=ivy_col)
        else: # center
            d_draw.line([(sx - 22, sy - 54), (sx - 18, sy - 20)], fill=rope_col, width=2)
            d_draw.line([(sx + 22, sy - 54), (sx + 18, sy - 20)], fill=rope_col, width=2)

    # --- 3. Draw Bark Hollows at each Socket ---
    for sock in sockets:
        sx = int(sock['x'] * W)
        sy = int(sock['y'] * H)
        draw_storybook_bark_hollow(bark_layer, b_draw, sx, sy, r=42)

    # --- 4. Draw Rich Watercolor Foliage Canopy ---
    is_celestial = (stage_num == 4)
    if stage_num == 1:
        canopy_centers = [
            (base_x - 160, crown_y + 40, 150),
            (base_x + 160, crown_y + 30, 150),
            (base_x, crown_y - 60, 190),
            (base_x - 80, crown_y - 140, 140),
            (base_x + 90, crown_y - 130, 140)
        ]
    elif stage_num == 2:
        canopy_centers = [
            (base_x - 320, crown_y + 80, 170),
            (base_x + 320, crown_y + 70, 170),
            (base_x - 180, crown_y - 40, 200),
            (base_x + 190, crown_y - 30, 200),
            (base_x, crown_y - 120, 230),
            (base_x - 120, crown_y - 200, 180),
            (base_x + 130, crown_y - 190, 180)
        ]
    else:  # Stages 3 & 4
        canopy_centers = [
            (base_x - 460, crown_y + 120, 190),
            (base_x + 460, crown_y + 110, 190),
            (base_x - 300, crown_y, 220),
            (base_x + 310, crown_y - 10, 220),
            (base_x - 140, crown_y - 120, 240),
            (base_x + 150, crown_y - 110, 240),
            (base_x, crown_y - 180, 260),
            (base_x - 240, crown_y - 220, 200),
            (base_x + 240, crown_y - 210, 200),
            (base_x, crown_y - 280, 210)
        ]
        
    for cx, cy, rad in canopy_centers:
        draw_canopy_cluster(foliage_layer, cx, cy, rad, is_celestial=is_celestial)

    # --- 5. Stage 4 Fairy Lanterns & Celestial Glow ---
    if is_celestial:
        # Hanging brass lanterns from boughs
        for lx, ly in [(base_x - 220, crown_y + 90), (base_x + 230, crown_y + 80), (base_x, crown_y - 30)]:
            # Twine string
            d_draw.line([(lx, ly - 45), (lx, ly)], fill=(*BARK_PENCIL, 220), width=2)
            # Lantern glow aura
            for r_glow, a_glow in [(32, 45), (20, 85), (10, 180)]:
                d_draw.ellipse((lx - r_glow, ly - r_glow, lx + r_glow, ly + r_glow), fill=(*LANTERN_GLOW, a_glow))
            # Brass housing
            d_draw.polygon([
                (lx - 10, ly - 12), (lx + 10, ly - 12),
                (lx + 8, ly + 14), (lx - 8, ly + 14)
            ], fill=(212, 163, 115, 255), outline=BARK_PENCIL)
            # Golden candle center
            d_draw.ellipse((lx - 5, ly - 5, lx + 5, ly + 5), fill=(255, 255, 255, 255))

    # --- 6. Composite Layers with Paper Texture ---
    # Merge foliage -> bark -> details
    img = Image.alpha_composite(img, foliage_layer)
    img = Image.alpha_composite(img, bark_layer)
    img = Image.alpha_composite(img, detail_layer)
    
    # Add subtle sepia outline pass for Beatrix Potter storybook feel
    contour = img.filter(ImageFilter.FIND_EDGES)
    contour_alpha = contour.split()[-1].point(lambda p: 75 if p > 30 else 0)
    pencil_wash = Image.new('RGBA', (W, H), (*BARK_PENCIL, 0))
    pencil_wash.putalpha(contour_alpha)
    img = Image.alpha_composite(img, pencil_wash)
    
    return img

# Sockets definition following the user's blueprint
STAGES_CONFIG = {
    1: [
        {'id': 'portal_geom_shapes', 'minigame': 'Shape Nest (Geometry)', 'x': 0.38, 'y': 0.70, 'signHang': 'rope-left'},
        {'id': 'portal_color_bloom', 'minigame': 'Color Bloom (Colors)', 'x': 0.62, 'y': 0.66, 'signHang': 'rope-right'},
        {'id': 'portal_phonics_pond', 'minigame': 'Phonics Pond (Language)', 'x': 0.50, 'y': 0.45, 'signHang': 'center'},
    ],
    2: [
        {'id': 'portal_geom_shapes', 'minigame': 'Shape Nest (Geometry)', 'x': 0.28, 'y': 0.74, 'signHang': 'rope-left'},
        {'id': 'portal_color_bloom', 'minigame': 'Color Bloom (Colors)', 'x': 0.72, 'y': 0.70, 'signHang': 'rope-right'},
        {'id': 'portal_phonics_pond', 'minigame': 'Phonics Pond (Language)', 'x': 0.38, 'y': 0.50, 'signHang': 'rope-left'},
        {'id': 'portal_creature_ladder', 'minigame': 'Creature Ladder (Sizes)', 'x': 0.64, 'y': 0.46, 'signHang': 'rope-right'},
        {'id': 'portal_pattern_path', 'minigame': 'Pattern Path (Patterns)', 'x': 0.50, 'y': 0.32, 'signHang': 'center'},
    ],
    3: [
        {'id': 'portal_geom_shapes', 'minigame': 'Shape Nest (Geometry)', 'x': 0.24, 'y': 0.78, 'signHang': 'rope-left'},
        {'id': 'portal_color_bloom', 'minigame': 'Color Bloom (Colors)', 'x': 0.76, 'y': 0.74, 'signHang': 'rope-right'},
        {'id': 'portal_phonics_pond', 'minigame': 'Phonics Pond (Language)', 'x': 0.35, 'y': 0.56, 'signHang': 'rope-left'},
        {'id': 'portal_creature_ladder', 'minigame': 'Creature Ladder (Sizes)', 'x': 0.66, 'y': 0.52, 'signHang': 'rope-right'},
        {'id': 'portal_pattern_path', 'minigame': 'Pattern Path (Patterns)', 'x': 0.48, 'y': 0.42, 'signHang': 'center'},
        {'id': 'portal_shadow_match', 'minigame': 'Shadow Match (Observation)', 'x': 0.22, 'y': 0.36, 'signHang': 'rope-left'},
        {'id': 'portal_nature_sorting', 'minigame': 'Nature Sorting (Science)', 'x': 0.78, 'y': 0.34, 'signHang': 'rope-right'},
        {'id': 'portal_symmetry_wings', 'minigame': 'Symmetry Wings (Art)', 'x': 0.50, 'y': 0.22, 'signHang': 'center'},
    ],
    4: [
        {'id': 'portal_geom_shapes', 'minigame': 'Shape Nest (Geometry)', 'x': 0.24, 'y': 0.78, 'signHang': 'rope-left'},
        {'id': 'portal_color_bloom', 'minigame': 'Color Bloom (Colors)', 'x': 0.76, 'y': 0.74, 'signHang': 'rope-right'},
        {'id': 'portal_phonics_pond', 'minigame': 'Phonics Pond (Language)', 'x': 0.35, 'y': 0.56, 'signHang': 'rope-left'},
        {'id': 'portal_creature_ladder', 'minigame': 'Creature Ladder (Sizes)', 'x': 0.66, 'y': 0.52, 'signHang': 'rope-right'},
        {'id': 'portal_pattern_path', 'minigame': 'Pattern Path (Patterns)', 'x': 0.48, 'y': 0.42, 'signHang': 'center'},
        {'id': 'portal_shadow_match', 'minigame': 'Shadow Match (Observation)', 'x': 0.22, 'y': 0.36, 'signHang': 'rope-left'},
        {'id': 'portal_nature_sorting', 'minigame': 'Nature Sorting (Science)', 'x': 0.78, 'y': 0.34, 'signHang': 'rope-right'},
        {'id': 'portal_symmetry_wings', 'minigame': 'Symmetry Wings (Art)', 'x': 0.50, 'y': 0.22, 'signHang': 'center'},
    ]
}

os.makedirs('public', exist_ok=True)
for stage in [1, 2, 3, 4]:
    print(f'Generating Stage {stage} Wonder Tree illustration...')
    random.seed(100 + stage * 7)
    tree_img = generate_stage_image(stage, STAGES_CONFIG[stage])
    out_path = f'public/tree-stage-{stage}.png'
    tree_img.save(out_path, optimize=True)
    print(f'Successfully saved {out_path} ({tree_img.size})')
