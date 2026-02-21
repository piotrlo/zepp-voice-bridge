"""
Extracts the round watch face from a photo and outputs a 360x360 PNG
with transparent background. Detects the watch bezel by combining
edge strength on the circle with dark interior requirement.
"""

import sys
import os
import numpy as np
from PIL import Image, ImageDraw

OUTPUT_SIZE = 360


def find_watch_face(img):
    """Finds center and radius of the watch screen using edge + dark interior detection."""
    gray = np.array(img.convert("L"), dtype=np.float64)
    h, w = gray.shape

    gx = np.diff(gray, axis=1, prepend=gray[:, :1])
    gy = np.diff(gray, axis=0, prepend=gray[:1, :])
    edges = np.sqrt(gx ** 2 + gy ** 2)

    min_radius = int(min(h, w) * 0.22)
    max_radius = int(min(h, w) * 0.40)

    best_score = -1
    best_cx, best_cy, best_r = w // 2, h // 2, min_radius

    angles = np.linspace(0, 2 * np.pi, 72, endpoint=False)
    inner_angles = np.linspace(0, 2 * np.pi, 36, endpoint=False)

    step = 14
    for cy in range(h // 3, 3 * h // 4, step):
        for cx in range(w // 4, 3 * w // 4, step):
            for r in range(min_radius, max_radius, step):
                xs = (cx + r * np.cos(angles)).astype(int)
                ys = (cy + r * np.sin(angles)).astype(int)
                valid = (xs >= 0) & (xs < w) & (ys >= 0) & (ys < h)
                if valid.sum() < 40:
                    continue
                edge_score = edges[ys[valid], xs[valid]].mean()

                inner_r = int(r * 0.5)
                ixs = (cx + inner_r * np.cos(inner_angles)).astype(int)
                iys = (cy + inner_r * np.sin(inner_angles)).astype(int)
                ivalid = (ixs >= 0) & (ixs < w) & (iys >= 0) & (iys < h)
                if ivalid.sum() < 20:
                    continue
                inner_brightness = gray[iys[ivalid], ixs[ivalid]].mean()

                darkness_bonus = max(0, (120 - inner_brightness) / 120)
                score = edge_score * (0.3 + 0.7 * darkness_bonus)

                if score > best_score:
                    best_score = score
                    best_cx, best_cy, best_r = cx, cy, r

    fine_step = 3
    coarse_cx, coarse_cy, coarse_r = best_cx, best_cy, best_r
    for cy in range(coarse_cy - step, coarse_cy + step + 1, fine_step):
        for cx in range(coarse_cx - step, coarse_cx + step + 1, fine_step):
            for r in range(coarse_r - step, coarse_r + step + 1, fine_step):
                if r < min_radius:
                    continue
                xs = (cx + r * np.cos(angles)).astype(int)
                ys = (cy + r * np.sin(angles)).astype(int)
                valid = (xs >= 0) & (xs < w) & (ys >= 0) & (ys < h)
                if valid.sum() < 40:
                    continue
                edge_score = edges[ys[valid], xs[valid]].mean()

                inner_r = int(r * 0.5)
                ixs = (cx + inner_r * np.cos(inner_angles)).astype(int)
                iys = (cy + inner_r * np.sin(inner_angles)).astype(int)
                ivalid = (ixs >= 0) & (ixs < w) & (iys >= 0) & (iys < h)
                if ivalid.sum() < 20:
                    continue
                inner_brightness = gray[iys[ivalid], ixs[ivalid]].mean()

                darkness_bonus = max(0, (120 - inner_brightness) / 120)
                score = edge_score * (0.3 + 0.7 * darkness_bonus)

                if score > best_score:
                    best_score = score
                    best_cx, best_cy, best_r = cx, cy, r

    return best_cx, best_cy, best_r


def crop_circle(img, cx, cy, radius, output_size):
    """Crops a circular region and produces a square RGBA image with transparent background."""
    padding = int(radius * 0.04)
    r = radius - padding

    left = cx - r
    top = cy - r
    right = cx + r
    bottom = cy + r
    cropped = img.crop((left, top, right, bottom))
    cropped = cropped.resize((output_size, output_size), Image.LANCZOS)

    mask = Image.new("L", (output_size, output_size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse([0, 0, output_size - 1, output_size - 1], fill=255)

    result = Image.new("RGBA", (output_size, output_size), (0, 0, 0, 0))
    result.paste(cropped.convert("RGB"), (0, 0))
    result.putalpha(mask)
    return result


def process_image(input_path, output_path):
    """Loads a photo, detects the watch face, and saves a circular screenshot."""
    img = Image.open(input_path)
    print(f"  Image size: {img.size}")
    cx, cy, radius = find_watch_face(img)
    print(f"  Detected face: center=({cx},{cy}), radius={radius}")
    result = crop_circle(img, cx, cy, radius, OUTPUT_SIZE)
    result.save(output_path, "PNG")
    print(f"  Saved: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python crop-screenshots.py <image1> [image2] [image3] ...")
        sys.exit(1)

    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "screenshots")
    os.makedirs(output_dir, exist_ok=True)

    for i, path in enumerate(sys.argv[1:], 1):
        print(f"Processing {path}...")
        output_path = os.path.join(output_dir, f"screenshot-{i}.png")
        process_image(path, output_path)

    print(f"\nDone! {len(sys.argv) - 1} screenshots saved to {output_dir}/")
