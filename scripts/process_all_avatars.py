#!/usr/bin/env python3
"""
Refined storybook avatar processor:
- Accurately segments each character without stray edge artifacts.
- Applies watercolor wash smoothing, subtle cold-press paper grain, and soft pencil line work.
- Centers each character on 512x512 transparent PNG.
"""

import os
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from scipy import ndimage

TARGET_SIZE = 512

def process_avatar_clean(im_rgb: Image.Image, output_path: str, is_spritesheet: bool = False):
    arr = np.array(im_rgb, dtype=np.float32)

    # 1. Background separation: detect near-white connected to boundary
    dist_from_white = np.sqrt(np.sum((255.0 - arr)**2, axis=-1))
    is_near_white = (dist_from_white < 25.0)
    labeled, num_features = ndimage.label(is_near_white)

    border_labels = set()
    border_labels.update(labeled[0, :])
    border_labels.update(labeled[-1, :])
    border_labels.update(labeled[:, 0])
    border_labels.update(labeled[:, -1])
    border_labels.discard(0)

    outer_bg = np.isin(labeled, list(border_labels))
    fg_mask = ~outer_bg

    # Filter out small disconnected islands (specks/artifacts < 1000 pixels)
    labeled_fg, num_fg = ndimage.label(fg_mask)
    if num_fg > 1:
        # Keep only the primary large character body
        sizes = ndimage.sum(fg_mask, labeled_fg, range(1, num_fg + 1))
        max_idx = int(np.argmax(sizes)) + 1
        # Also keep any substantial component (> 1500 px, like detached staff or tail)
        valid_indices = [i for i, s in enumerate(sizes, 1) if s > 1200 or i == max_idx]
        fg_mask = np.isin(labeled_fg, valid_indices)

    if is_spritesheet:
        # A. Soft pencil linework on foreground
        gray = im_rgb.convert('L')
        gray_smooth = gray.filter(ImageFilter.GaussianBlur(radius=0.6))
        edges = gray_smooth.filter(ImageFilter.FIND_EDGES)
        inv_edges = Image.eval(edges, lambda x: 255 - x)
        pencil_lines = ImageEnhance.Contrast(inv_edges).enhance(1.4)
        
        # B. Soft watercolor smoothing
        smooth = im_rgb.filter(ImageFilter.MedianFilter(size=5))
        smooth = smooth.filter(ImageFilter.SMOOTH_MORE)
        arr_smooth = np.array(smooth, dtype=np.float32)
        
        # C. Paper grain
        h, w, _ = arr_smooth.shape
        np.random.seed(42)
        noise = np.random.normal(0, 3.0, (h, w, 1))
        noise_smooth = ndimage.gaussian_filter(noise, sigma=0.8)
        arr_wash = np.clip(arr_smooth + noise_smooth * 2.0, 0, 255)
        
        pencil_arr = np.array(pencil_lines, dtype=np.float32) / 255.0
        pencil_factor = 0.5 + 0.5 * pencil_arr
        arr_styled = arr_wash * pencil_factor[:, :, np.newaxis]
        
        # Warm storybook tint
        arr_styled[:, :, 0] = np.clip(arr_styled[:, :, 0] * 1.02 + 2, 0, 255)
        arr_styled[:, :, 2] = np.clip(arr_styled[:, :, 2] * 0.97 - 1, 0, 255)
        
        fg_3d = fg_mask[:, :, np.newaxis]
        final_rgb = np.where(fg_3d, arr_styled, arr).astype(np.uint8)
    else:
        final_rgb = np.array(im_rgb, dtype=np.uint8)

    # Smooth alpha feathering
    dist_to_bg = ndimage.distance_transform_edt(fg_mask)
    alpha = np.clip(dist_to_bg / 2.0, 0.0, 1.0) * 255.0
    alpha = alpha.astype(np.uint8)

    rgba = np.dstack([final_rgb, alpha])
    res_img = Image.fromarray(rgba, mode='RGBA')

    bbox = res_img.getbbox()
    cropped = res_img.crop(bbox) if bbox else res_img

    cw, ch = cropped.size
    max_dim = int(TARGET_SIZE * 0.88)
    scale = min(max_dim / cw, max_dim / ch)
    new_w = max(1, int(cw * scale))
    new_h = max(1, int(ch * scale))
    
    scaled = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    final_canvas = Image.new('RGBA', (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))
    paste_x = (TARGET_SIZE - new_w) // 2
    paste_y = (TARGET_SIZE - new_h) // 2
    final_canvas.paste(scaled, (paste_x, paste_y), scaled)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final_canvas.save(output_path, 'PNG', optimize=True)
    print(f'Processed {output_path} ({new_w}x{new_h})')

def main():
    sheet_path = '/home/fquiroga/.gemini/antigravity-cli/brain/8901432d-4351-499a-8979-9ac41d0aad8b/animal_explorers_spritesheet_1792592406124.jpg'
    sheet = Image.open(sheet_path)

    # Pure bespoke hand-drawn watercolor paintings:
    dino_src = '/home/fquiroga/.gemini/antigravity-cli/brain/84c1bece-a163-4c41-8d8a-b23634c11698/avatar_dino_1792719662360.jpg'
    raccoon_src = '/home/fquiroga/.gemini/antigravity-cli/brain/84c1bece-a163-4c41-8d8a-b23634c11698/avatar_raccoon_1792719681275.jpg'
    process_avatar_clean(Image.open(dino_src).convert('RGB'), 'public/avatars/dino.png', is_spritesheet=False)
    process_avatar_clean(Image.open(raccoon_src).convert('RGB'), 'public/avatars/raccoon.png', is_spritesheet=False)

    # Clean crops for Bear, Owl, Fox, Otter:
    # Owl starts at x=686 to completely avoid Raccoon tail:
    owl_crop = sheet.crop((686, 85, 1002, 460))
    bear_crop = sheet.crop((380, 535, 668, 985))
    fox_crop = sheet.crop((20, 535, 360, 985))
    otter_crop = sheet.crop((675, 555, 975, 988))

    process_avatar_clean(bear_crop, 'public/avatars/bear.png', is_spritesheet=True)
    process_avatar_clean(owl_crop, 'public/avatars/owl.png', is_spritesheet=True)
    process_avatar_clean(fox_crop, 'public/avatars/fox.png', is_spritesheet=True)
    process_avatar_clean(otter_crop, 'public/avatars/otter.png', is_spritesheet=True)

if __name__ == '__main__':
    main()
