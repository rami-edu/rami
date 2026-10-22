import os
import math
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

SCALE = 2
W = 1400 * SCALE  # 2800 (4X resolution / 4X pixel count)
H = 1200 * SCALE  # 2400

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
        jx = x + random.uniform(-amount * SCALE, amount * SCALE)
        jy = y + random.uniform(-amount * SCALE, amount * SCALE)
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
    r_scaled = int(r * SCALE)
    # Dark cavity depth
    for radius, alpha in [(r_scaled, 240), (r_scaled - int(6 * SCALE), 255), (r_scaled - int(12 * SCALE), 255)]:
        draw.ellipse(
            (hx - radius, hy - radius * 1.06, hx + radius, hy + radius * 1.06),
            fill=(18, 12, 8, alpha)
        )
    # Inner subtle warm amber backlight
    draw.ellipse(
        (hx - r_scaled * 0.5, hy - r_scaled * 0.5, hx + r_scaled * 0.5, hy + r_scaled * 0.5),
        fill=(55, 38, 22, 140)
    )
    # Gnarled bark rim around the hole
    rim_pts = []
    for i in range(24):
        a = (i / 24) * math.pi * 2
        var = random.uniform(0.94, 1.08)
        px = hx + math.cos(a) * (r_scaled + 8 * SCALE) * var
        py = hy + math.sin(a) * (r_scaled * 1.06 + 8 * SCALE) * var
        rim_pts.append((px, py))
    draw.line(rim_pts + [rim_pts[0]], fill=(*BARK_PENCIL, 220), width=int(3 * SCALE))
    draw.line(rim_pts + [rim_pts[0]], fill=(*BARK_LIGHT, 160), width=max(1, int(1 * SCALE)))

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
            scallop.append((lx + math.cos(sa) * 12 * SCALE, ly + math.sin(sa) * 8 * SCALE))
        draw.line(scallop, fill=(*BARK_PENCIL, 160), width=int(2 * SCALE))
        
    if is_celestial:
        # Golden blossoms & starry glitter
        for _ in range(7):
            bx = cx + random.uniform(-radius * 0.7, radius * 0.7)
            by = cy + random.uniform(-radius * 0.6, radius * 0.6)
            b_r = 6 * SCALE
            draw.ellipse((bx - b_r, by - b_r, bx + b_r, by + b_r), fill=(*LANTERN_GOLD, 230))
            draw.ellipse((bx - b_r*0.5, by - b_r*0.5, bx + b_r*0.5, by + b_r*0.5), fill=(255, 255, 255, 255))

def generate_stage_image(stage_num, sockets):
    """Renders one of the 4 hand-drawn growth stages with transparent background at 4X resolution."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    foliage_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bark_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    detail_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    
    b_draw = ImageDraw.Draw(bark_layer)
    d_draw = ImageDraw.Draw(detail_layer)
    
    base_x = W // 2
    base_y = H - int(60 * SCALE)
    
    # Configure stage scale & trunk thickness
    if stage_num == 1:
        trunk_half_bottom = int(90 * SCALE)
        trunk_half_top = int(48 * SCALE)
        crown_y = int(380 * SCALE)
    elif stage_num == 2:
        trunk_half_bottom = int(145 * SCALE)
        trunk_half_top = int(75 * SCALE)
        crown_y = int(300 * SCALE)
    else:  # Stages 3 & 4
        trunk_half_bottom = int(210 * SCALE)
        trunk_half_top = int(110 * SCALE)
        crown_y = int(220 * SCALE)
        
    # --- 1. Draw Massive Fluted Trunk & Roots ---
    trunk_pts_left = [
        (base_x - trunk_half_bottom - int(110 * SCALE), base_y + int(40 * SCALE)),
        (base_x - trunk_half_bottom - int(40 * SCALE), base_y - int(20 * SCALE)),
        (base_x - trunk_half_bottom + int(10 * SCALE), base_y - int(120 * SCALE)),
        (base_x - trunk_half_bottom + int(25 * SCALE), base_y - int(280 * SCALE)),
        (base_x - trunk_half_top - int(20 * SCALE), crown_y + int(180 * SCALE)),
        (base_x - trunk_half_top, crown_y)
    ]
    trunk_pts_right = [
        (base_x + trunk_half_top, crown_y),
        (base_x + trunk_half_top + int(25 * SCALE), crown_y + int(180 * SCALE)),
        (base_x + trunk_half_bottom - int(20 * SCALE), base_y - int(280 * SCALE)),
        (base_x + trunk_half_bottom - int(10 * SCALE), base_y - int(120 * SCALE)),
        (base_x + trunk_half_bottom + int(45 * SCALE), base_y - int(20 * SCALE)),
        (base_x + trunk_half_bottom + int(120 * SCALE), base_y + int(40 * SCALE))
    ]
    
    full_trunk = trunk_pts_left + trunk_pts_right
    b_draw.polygon(full_trunk, fill=(*BARK_BASE, 255))
    
    # Bark vertical grain lines & watercolor wash strips
    for gx in np.linspace(-trunk_half_bottom + 10 * SCALE, trunk_half_bottom - 10 * SCALE, 24):
        grain_pts = []
        for t in np.linspace(0, 1, 12):
            tx = (1 - t) * (base_x + gx) + t * (base_x + gx * 0.45)
            ty = (1 - t) * (base_y + 20 * SCALE) + t * crown_y
            grain_pts.append((tx + random.uniform(-4 * SCALE, 4 * SCALE), ty))
        col = BARK_LIGHT if random.random() > 0.4 else BARK_MID
        b_draw.line(grain_pts, fill=(*col, 180), width=random.randint(int(4 * SCALE), int(9 * SCALE)))
        b_draw.line(grain_pts, fill=(*BARK_PENCIL, 140), width=random.randint(int(1 * SCALE), int(2 * SCALE)))

    # --- 2. Draw Branch Structures for Sockets ---
    for sock in sockets:
        sx = int(sock['x'] * W)
        sy = int(sock['y'] * H)
        
        # Connect trunk to hollow socket with curving natural bough
        b_start_x = base_x + (sx - base_x) * 0.25
        b_start_y = sy + random.randint(int(30 * SCALE), int(80 * SCALE))
        
        bough_pts = [
            (b_start_x, b_start_y),
            (base_x + (sx - base_x) * 0.6, sy + int(35 * SCALE)),
            (sx, sy + int(25 * SCALE))
        ]
        b_draw.line(bough_pts, fill=(*BARK_MID, 255), width=random.randint(int(24 * SCALE), int(38 * SCALE)))
        b_draw.line(bough_pts, fill=(*BARK_PENCIL, 220), width=random.randint(int(2 * SCALE), int(3 * SCALE)))
        
        # Draw wooden hanging rope / ivy tendril for the sign
        hang_type = sock.get('signHang', 'rope-left')
        rope_col = (139, 90, 43, 230)
        ivy_col = (82, 183, 136, 240)
        
        rx1, rx2 = sx - int(24 * SCALE), sx + int(24 * SCALE)
        ry1, ry2 = sy - int(52 * SCALE), sy - int(20 * SCALE)
        if 'left' in hang_type:
            d_draw.line([(rx1, ry1), (sx - int(20 * SCALE), ry2)], fill=rope_col, width=int(2 * SCALE))
            d_draw.line([(rx2, ry1), (sx + int(20 * SCALE), ry2)], fill=rope_col, width=int(2 * SCALE))
            # Little ivy leaves clinging to rope
            d_draw.ellipse((sx - int(24 * SCALE), sy - int(38 * SCALE), sx - int(18 * SCALE), sy - int(32 * SCALE)), fill=ivy_col)
            d_draw.ellipse((sx + int(20 * SCALE), sy - int(44 * SCALE), sx + int(26 * SCALE), sy - int(38 * SCALE)), fill=ivy_col)
        elif 'right' in hang_type:
            d_draw.line([(rx1, ry1), (sx - int(22 * SCALE), ry2)], fill=rope_col, width=int(2 * SCALE))
            d_draw.line([(rx2, ry1), (sx + int(22 * SCALE), ry2)], fill=rope_col, width=int(2 * SCALE))
            d_draw.ellipse((sx + int(20 * SCALE), sy - int(36 * SCALE), sx + int(26 * SCALE), sy - int(30 * SCALE)), fill=ivy_col)
        else: # center
            d_draw.line([(sx - int(22 * SCALE), sy - int(54 * SCALE)), (sx - int(18 * SCALE), ry2)], fill=rope_col, width=int(2 * SCALE))
            d_draw.line([(sx + int(22 * SCALE), sy - int(54 * SCALE)), (sx + int(18 * SCALE), ry2)], fill=rope_col, width=int(2 * SCALE))

    # --- 3. Draw Bark Hollows at each Socket ---
    for sock in sockets:
        sx = int(sock['x'] * W)
        sy = int(sock['y'] * H)
        draw_storybook_bark_hollow(bark_layer, b_draw, sx, sy, r=42)

    # --- 4. Draw Rich Watercolor Foliage Canopy ---
    is_celestial = (stage_num == 4)
    if stage_num == 1:
        canopy_centers = [
            (base_x - int(160 * SCALE), crown_y + int(40 * SCALE), int(150 * SCALE)),
            (base_x + int(160 * SCALE), crown_y + int(30 * SCALE), int(150 * SCALE)),
            (base_x, crown_y - int(60 * SCALE), int(190 * SCALE)),
            (base_x - int(80 * SCALE), crown_y - int(140 * SCALE), int(140 * SCALE)),
            (base_x + int(90 * SCALE), crown_y - int(130 * SCALE), int(140 * SCALE))
        ]
    elif stage_num == 2:
        canopy_centers = [
            (base_x - int(320 * SCALE), crown_y + int(80 * SCALE), int(170 * SCALE)),
            (base_x + int(320 * SCALE), crown_y + int(70 * SCALE), int(170 * SCALE)),
            (base_x - int(180 * SCALE), crown_y - int(40 * SCALE), int(200 * SCALE)),
            (base_x + int(190 * SCALE), crown_y - int(30 * SCALE), int(200 * SCALE)),
            (base_x, crown_y - int(120 * SCALE), int(230 * SCALE)),
            (base_x - int(120 * SCALE), crown_y - int(200 * SCALE), int(180 * SCALE)),
            (base_x + int(130 * SCALE), crown_y - int(190 * SCALE), int(180 * SCALE))
        ]
    else:  # Stages 3 & 4
        canopy_centers = [
            (base_x - int(460 * SCALE), crown_y + int(120 * SCALE), int(190 * SCALE)),
            (base_x + int(460 * SCALE), crown_y + int(110 * SCALE), int(190 * SCALE)),
            (base_x - int(300 * SCALE), crown_y, int(220 * SCALE)),
            (base_x + int(310 * SCALE), crown_y - int(10 * SCALE), int(220 * SCALE)),
            (base_x - int(140 * SCALE), crown_y - int(120 * SCALE), int(240 * SCALE)),
            (base_x + int(150 * SCALE), crown_y - int(110 * SCALE), int(240 * SCALE)),
            (base_x, crown_y - int(180 * SCALE), int(260 * SCALE)),
            (base_x - int(240 * SCALE), crown_y - int(220 * SCALE), int(200 * SCALE)),
            (base_x + int(240 * SCALE), crown_y - int(210 * SCALE), int(200 * SCALE)),
            (base_x, crown_y - int(280 * SCALE), int(210 * SCALE))
        ]
        
    for cx, cy, rad in canopy_centers:
        draw_canopy_cluster(foliage_layer, cx, cy, rad, is_celestial=is_celestial)

    # --- 5. Stage 4 Fairy Lanterns & Celestial Glow ---
    if is_celestial:
        # Hanging brass lanterns from boughs
        for lx, ly in [(base_x - int(220 * SCALE), crown_y + int(90 * SCALE)), 
                       (base_x + int(230 * SCALE), crown_y + int(80 * SCALE)), 
                       (base_x, crown_y - int(30 * SCALE))]:
            # Twine string
            d_draw.line([(lx, ly - int(45 * SCALE)), (lx, ly)], fill=(*BARK_PENCIL, 220), width=int(2 * SCALE))
            # Lantern glow aura
            for r_glow, a_glow in [(int(32 * SCALE), 45), (int(20 * SCALE), 85), (int(10 * SCALE), 180)]:
                d_draw.ellipse((lx - r_glow, ly - r_glow, lx + r_glow, ly + r_glow), fill=(*LANTERN_GLOW, a_glow))
            # Brass housing
            d_draw.polygon([
                (lx - int(10 * SCALE), ly - int(12 * SCALE)), (lx + int(10 * SCALE), ly - int(12 * SCALE)),
                (lx + int(8 * SCALE), ly + int(14 * SCALE)), (lx - int(8 * SCALE), ly + int(14 * SCALE))
            ], fill=(212, 163, 115, 255), outline=BARK_PENCIL)
            # Golden candle center
            c_r = int(5 * SCALE)
            d_draw.ellipse((lx - c_r, ly - c_r, lx + c_r, ly + c_r), fill=(255, 255, 255, 255))

    # --- 6. Composite Layers with Paper Texture ---
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
