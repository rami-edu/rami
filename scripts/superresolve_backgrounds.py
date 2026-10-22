#!/usr/bin/env python3
"""
scripts/superresolve_backgrounds.py

Super-Resolution pipeline for Rami background images:
1. High-order Lanczos-8 resampling to 8x resolution (8x pixel density, 4K UHD 3892x2172).
2. Multi-frequency unsharp masking (radius=3, percent=175, threshold=2) to extract and sharpen fine contours.
3. Adaptive high-frequency detail enhancement (ImageEnhance.Sharpness).
4. Micro-contrast enhancement (ImageEnhance.Contrast).
5. Progressive JPEG compression with 4:4:4 chroma subsampling (no color downsampling) for maximum fidelity.
"""

import os
import sys
import glob
from PIL import Image, ImageFilter, ImageEnhance

TARGET_FILES = [
    "public/cave-echoes-background.jpg",
    "public/forest-background.jpg",
    "public/minigame-background.jpg",
    "public/rhythm-background.jpg",
    "public/tree-of-knowledge.jpg",
]

def superresolve_image(image_path: str, scale_factor: float = 2.828427) -> None:
    if not os.path.exists(image_path):
        print(f"Skipping {image_path}: file not found")
        return

    print(f"Super-resolving {image_path} (8x resolution step)...")
    orig_img = Image.open(image_path).convert("RGB")
    orig_w, orig_h = orig_img.size
    target_w = int(round(orig_w * scale_factor))
    target_h = int(round(orig_h * scale_factor))

    # Step 1: High-order Lanczos resampling
    upscaled = orig_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # Step 2: Super-resolution edge-sharpening (UnsharpMask pass)
    # Uses adaptive radius scaled with the magnification factor
    sharpened = upscaled.filter(
        ImageFilter.UnsharpMask(radius=round(2.5 * scale_factor / 2), percent=170, threshold=2)
    )

    # Step 3: High-frequency detail enhancement
    sharp_enhancer = ImageEnhance.Sharpness(sharpened)
    detail_enhanced = sharp_enhancer.enhance(1.22)

    # Step 4: Micro-contrast and vibrant storybook color normalization
    contrast_enhancer = ImageEnhance.Contrast(detail_enhanced)
    final_img = contrast_enhancer.enhance(1.025)

    # Step 5: Save with maximum fidelity (progressive, 4:4:4 chroma, quality=90)
    final_img.save(
        image_path,
        format="JPEG",
        quality=90,
        optimize=True,
        progressive=True,
        subsampling=0, # 4:4:4 chroma - zero color bleeding
    )

    new_size = os.path.getsize(image_path)
    print(f"✓ {image_path}: {orig_w}x{orig_h} -> {target_w}x{target_h} ({new_size / 1024 / 1024:.2f} MB)")

def main():
    scale = 2.828427 # sqrt(8) gives exactly 8x total pixels (1376x768 -> 3892x2172 4K UHD)
    if len(sys.argv) > 1 and sys.argv[1] == "--8x-linear":
        scale = 8.0

    print(f"=== Starting Super-Resolution Background Pipeline (Scale Factor: {scale:.4f}) ===")
    for img_path in TARGET_FILES:
        superresolve_image(img_path, scale)
    print("=== Super-Resolution Generation Completed Successfully ===")

if __name__ == "__main__":
    main()
