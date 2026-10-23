#!/usr/bin/env python3
"""
Processes generated storybook animal avatar illustrations:
- Performs connected-component background separation to remove white backgrounds without clipping interior details.
- Applies smooth sub-pixel alpha matting for natural watercolor edges.
- Centers each character on a square 512x512 canvas.
- Outputs transparent PNGs: public/avatars/<name>.png.
"""

import sys
import os
import numpy as np
from PIL import Image
from scipy import ndimage

TARGET_SIZE = 512

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

    # Smooth alpha feathering on the boundary
    dist_to_bg = ndimage.distance_transform_edt(~outer_bg)
    
    # Smooth alpha: 0 where outer_bg, transitioning to 255 within 2.2 pixels
    alpha = np.clip(dist_to_bg / 2.2, 0.0, 1.0) * 255.0
    alpha = alpha.astype(np.uint8)

    # Assemble RGBA
    rgba = np.dstack([np.array(im), alpha]).astype(np.uint8)
    res_img = Image.fromarray(rgba, mode='RGBA')

    # Find bounding box of visible content
    bbox = res_img.getbbox()
    if bbox:
        cropped = res_img.crop(bbox)
    else:
        cropped = res_img

    cw, ch = cropped.size
    
    # Scale to fit comfortably within target 512x512 canvas (leaving ~10% margin)
    max_dim = int(TARGET_SIZE * 0.88)
    scale = min(max_dim / cw, max_dim / ch)
    new_w = max(1, int(cw * scale))
    new_h = max(1, int(ch * scale))
    
    scaled = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Place centered onto standard canvas
    final_canvas = Image.new('RGBA', (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))
    paste_x = (TARGET_SIZE - new_w) // 2
    paste_y = (TARGET_SIZE - new_h) // 2
    
    final_canvas.paste(scaled, (paste_x, paste_y), scaled)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final_canvas.save(output_path, 'PNG', optimize=True)
    print(f"Processed {os.path.basename(img_path)} -> {output_path} ({TARGET_SIZE}x{TARGET_SIZE})")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 process_avatars.py <input_jpg> <output_png>")
        sys.exit(1)
    process_avatar(sys.argv[1], sys.argv[2])
