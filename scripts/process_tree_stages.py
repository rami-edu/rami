#!/usr/bin/env python3
"""
Processes generated Wonder Tree stage illustrations:
- Performs connected-component background separation to remove white backgrounds without clipping interior details.
- Applies smooth sub-pixel alpha matting for natural watercolor leaf edges.
- Centers and bottom-anchors each tree on a standard 1400x1600 logical canvas.
- Outputs transparent PNGs: public/tree-stage-1.png through tree-stage-10.png.
"""

import sys
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

TARGET_W = 1400
TARGET_H = 1600

def remove_white_background(img_path: str, output_path: str) -> None:
    im = Image.open(img_path).convert('RGB')
    w, h = im.size
    arr = np.array(im, dtype=np.float32)

    # Euclidean distance from pure white in RGB space
    dist_from_white = np.sqrt(np.sum((255.0 - arr)**2, axis=-1))

    # Identify outer background connected to canvas borders
    is_near_white = (dist_from_white < 30.0)
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
    # Distance from outer background mask
    dist_to_bg = ndimage.distance_transform_edt(~outer_bg)
    
    # Smooth alpha: 0 where outer_bg, transitioning to 255 within 2-3 pixels
    alpha = np.clip(dist_to_bg / 2.2, 0.0, 1.0) * 255.0
    alpha = alpha.astype(np.uint8)

    # Assemble RGBA
    rgba = np.dstack([np.array(im), alpha]).astype(np.uint8)
    res_img = Image.fromarray(rgba, mode='RGBA')

    # Find bounding box of visible content (alpha > 10)
    bbox = res_img.getbbox()
    if bbox:
        cropped = res_img.crop(bbox)
    else:
        cropped = res_img

    cw, ch = cropped.size
    
    # Scale to fit comfortably within target canvas (leaving generous top clearance)
    max_w = int(TARGET_W * 0.92)
    max_h = int(TARGET_H * 0.88)
    
    scale = min(max_w / cw, max_h / ch)
    new_w = max(1, int(cw * scale))
    new_h = max(1, int(ch * scale))
    
    scaled_tree = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Place onto standard canvas anchored at bottom-center
    final_canvas = Image.new('RGBA', (TARGET_W, TARGET_H), (0, 0, 0, 0))
    paste_x = (TARGET_W - new_w) // 2
    paste_y = TARGET_H - new_h - int(TARGET_H * 0.02) # small bottom margin
    
    final_canvas.paste(scaled_tree, (paste_x, paste_y), scaled_tree)
    final_canvas.save(output_path, 'PNG', optimize=True)
    print(f"Processed {os.path.basename(img_path)} -> {output_path} ({TARGET_W}x{TARGET_H})")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 process_tree_stages.py <input_jpg> <output_png>")
        sys.exit(1)
    remove_white_background(sys.argv[1], sys.argv[2])
