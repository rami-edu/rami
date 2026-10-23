#!/usr/bin/env python3
"""
Processes all 6 bespoke hand-drawn watercolor animal avatars:
- Dino, Raccoon, Owl, Bear, Fox, Otter.
- Performs connected-component background separation on the pure white background.
- Smooth alpha feathering for natural watercolor paper edges.
- Centers each character on a square 512x512 transparent PNG.
- Outputs directly to public/avatars/<name>.png.
"""

import os
import numpy as np
from PIL import Image
from scipy import ndimage

TARGET_SIZE = 512

AVATARS = {
    'dino': '/home/fquiroga/.gemini/antigravity-cli/brain/84c1bece-a163-4c41-8d8a-b23634c11698/avatar_dino_1792719662360.jpg',
    'raccoon': '/home/fquiroga/.gemini/antigravity-cli/brain/84c1bece-a163-4c41-8d8a-b23634c11698/avatar_raccoon_1792719681275.jpg',
    'owl': '/home/fquiroga/.gemini/antigravity-cli/brain/84c1bece-a163-4c41-8d8a-b23634c11698/avatar_owl_handdrawn_1792734980885.jpg',
    'bear': '/home/fquiroga/.gemini/antigravity-cli/brain/84c1bece-a163-4c41-8d8a-b23634c11698/avatar_bear_handdrawn_1792734998303.jpg',
    'fox': '/home/fquiroga/.gemini/antigravity-cli/brain/84c1bece-a163-4c41-8d8a-b23634c11698/avatar_fox_handdrawn_1792735016663.jpg',
    'otter': '/home/fquiroga/.gemini/antigravity-cli/brain/84c1bece-a163-4c41-8d8a-b23634c11698/avatar_otter_handdrawn_1792735037577.jpg',
}

def process_avatar(img_path: str, output_path: str) -> None:
    im = Image.open(img_path).convert('RGB')
    arr = np.array(im, dtype=np.float32)

    # Euclidean distance from pure white in RGB space
    dist_from_white = np.sqrt(np.sum((255.0 - arr)**2, axis=-1))

    # Identify outer background connected to canvas borders
    is_near_white = (dist_from_white < 28.0)
    labeled, num_features = ndimage.label(is_near_white)

    # Sample labels from all 4 borders
    border_labels = set()
    border_labels.update(labeled[0, :])       # top row
    border_labels.update(labeled[-1, :])      # bottom row
    border_labels.update(labeled[:, 0])       # left col
    border_labels.update(labeled[:, -1])      # right col
    border_labels.discard(0)

    outer_bg = np.isin(labeled, list(border_labels))
    fg_mask = ~outer_bg

    # Smooth alpha feathering on the boundary
    dist_to_bg = ndimage.distance_transform_edt(fg_mask)
    alpha = np.clip(dist_to_bg / 2.2, 0.0, 1.0) * 255.0
    alpha = alpha.astype(np.uint8)

    # Assemble RGBA
    rgba = np.dstack([np.array(im), alpha]).astype(np.uint8)
    res_img = Image.fromarray(rgba, mode='RGBA')

    # Find bounding box of visible content
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
    print(f'Processed {os.path.basename(img_path)} -> {output_path} ({new_w}x{new_h})')

def main():
    for name, path in AVATARS.items():
        out = f'public/avatars/{name}.png'
        process_avatar(path, out)
    print('All 6 avatars processed successfully into public/avatars/!')

if __name__ == '__main__':
    main()
