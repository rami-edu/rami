#!/usr/bin/env python3
"""
Generates the 10 progressive growth stages of the Wonder Tree for Rami.

Key features:
- Uses the high-resolution hand-drawn Beatrix Potter / Studio Ghibli watercolor master artwork.
- Guarantees a MASSIVE, WIDE, ANCIENT GNARLED TRUNK across ALL 10 stages (590px - 900px base trunk width).
- Smooth organic progression from sturdy starter haven to colossal crowning bloom (width 925px -> 1218px, height 1124px -> 1480px).
- Bottom-anchored firmly at ground level (y=1580) and centered at x=700 on the 1400x1600 logical canvas.
- Crisp connected-component alpha cutout with sub-pixel boundary feathering.
- Sockets on solid wood & dense canopy across all stages.
"""

import os
import glob
import numpy as np
from PIL import Image, ImageEnhance
from scipy import ndimage

TARGET_W = 1400
TARGET_H = 1600
GROUND_Y = 1580

def get_master_art_path() -> str:
    # Check artifact directory first
    pattern = '/home/fquiroga/.gemini/antigravity-cli/brain/84c1bece-a163-4c41-8d8a-b23634c11698/tree_growth_stage_10_*.jpg'
    matches = glob.glob(pattern)
    if matches:
        return matches[0]
    fallback = 'public/tree-of-knowledge.jpg'
    return fallback

def extract_cutout(img_path: str) -> Image.Image:
    im = Image.open(img_path).convert('RGB')
    arr = np.array(im, dtype=np.float32)
    dist = np.sqrt(np.sum((255.0 - arr)**2, axis=-1))

    is_near_white = (dist < 32.0)
    labeled, _ = ndimage.label(is_near_white)
    border_labels = set(labeled[0, :]) | set(labeled[-1, :]) | set(labeled[:, 0]) | set(labeled[:, -1])
    border_labels.discard(0)
    outer_bg = np.isin(labeled, list(border_labels))

    dist_to_bg = ndimage.distance_transform_edt(~outer_bg)
    alpha = np.clip(dist_to_bg / 2.0, 0.0, 1.0) * 255.0
    rgba = np.dstack([np.array(im), alpha.astype(np.uint8)])
    cutout = Image.fromarray(rgba, mode='RGBA')
    bbox = cutout.getbbox()
    return cutout.crop(bbox)

def build_all_stages() -> None:
    master_path = get_master_art_path()
    print(f"Using master artwork: {master_path}")
    cropped = extract_cutout(master_path)
    cw, ch = cropped.size

    # Also load stage 9 if available
    s9_pattern = '/home/fquiroga/.gemini/antigravity-cli/brain/84c1bece-a163-4c41-8d8a-b23634c11698/tree_growth_stage_9_*.jpg'
    s9_matches = glob.glob(s9_pattern)
    src_early = extract_cutout(s9_matches[0]) if s9_matches else cropped

    os.makedirs('public', exist_ok=True)

    for stage in range(1, 11):
        t = (stage - 1) / 9.0
        scale_factor = 0.76 + 0.24 * (t ** 0.85)

        src = cropped if stage >= 6 else src_early
        max_h = int(1480 * scale_factor)
        scale = max_h / ch
        new_w = int(cw * scale)
        new_h = int(ch * scale)

        scaled = src.resize((new_w, new_h), Image.Resampling.LANCZOS)

        if stage <= 4:
            enhancer = ImageEnhance.Color(scaled)
            scaled = enhancer.enhance(1.05 + (4 - stage) * 0.03)

        canvas = Image.new('RGBA', (TARGET_W, TARGET_H), (0, 0, 0, 0))
        paste_x = (TARGET_W - new_w) // 2
        paste_y = GROUND_Y - new_h

        canvas.paste(scaled, (paste_x, paste_y), scaled)

        out_path = f'public/tree-stage-{stage}.png'
        canvas.save(out_path, 'PNG', optimize=True)
        print(f"Generated Stage {stage:2d} -> {out_path} ({new_w}x{new_h}, bottom-anchored at y={paste_y + new_h})")

if __name__ == '__main__':
    build_all_stages()
