"""
Synthetic Bengali Land Document Image Generator.
Generates 300+ degraded Khatian images (Pillow) with QR codes, 3+ Bangla fonts,
realistic legal layout, degradation pipeline, and per-image ground-truth bounding boxes.
"""

import os
import json
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import qrcode
from bangla_data import (
    MOUZAS,
    BANGLA_NAMES_MALE,
    BANGLA_NAMES_FEMALE,
    LAND_CLASSES_BN,
    SURVEY_TYPES,
    to_bn_digits,
)

SEED = 42

FONT_PATHS = [
    os.path.join("data", "synthetic", "fonts", "HindSiliguri-Regular.ttf"),
    os.path.join("data", "synthetic", "fonts", "NotoSansBengali-Regular.ttf"),
    os.path.join("data", "synthetic", "fonts", "Nirmala.ttf"),
]

def apply_perspective_warp(image, max_warp=12):
    """Applies a random 4-point homography / perspective transformation."""
    w, h = image.size
    dx1 = random.randint(-max_warp, max_warp)
    dy1 = random.randint(-max_warp, max_warp)
    dx2 = random.randint(-max_warp, max_warp)
    dy2 = random.randint(-max_warp, max_warp)
    dx3 = random.randint(-max_warp, max_warp)
    dy3 = random.randint(-max_warp, max_warp)
    dx4 = random.randint(-max_warp, max_warp)
    dy4 = random.randint(-max_warp, max_warp)

    coeffs = find_perspective_coeffs(
        [(0, 0), (w, 0), (w, h), (0, h)],
        [(dx1, dy1), (w + dx2, dy2), (w + dx3, h + dy3), (dx4, h + dy4)]
    )
    return image.transform((w, h), Image.PERSPECTIVE, coeffs, Image.BILINEAR, fillcolor=(246, 243, 237))

def find_perspective_coeffs(src, dst):
    matrix = []
    for (s_x, s_y), (d_x, d_y) in zip(src, dst):
        matrix.append([s_x, s_y, 1, 0, 0, 0, -d_x * s_x, -d_x * s_y])
        matrix.append([0, 0, 0, s_x, s_y, 1, -d_y * s_x, -d_y * s_y])
    A = np.matrix(matrix, dtype=float)
    B = np.array(dst).reshape(8)
    res = np.dot(np.linalg.pinv(A), B)
    return np.array(res).reshape(8)

def apply_shadow(image):
    """Simulates realistic mobile phone hand shadow or uneven desk illumination."""
    w, h = image.size
    shadow = Image.new('L', (w, h), 255)
    draw = ImageDraw.Draw(shadow)

    max_darkness = random.randint(180, 220)

    for y in range(h):
        factor = int(255 - (255 - max_darkness) * ((y / h) * 0.8 + (random.random() * 0.1)))
        draw.line([(0, y), (w, y)], fill=factor)

    shadow_blur = shadow.filter(ImageFilter.GaussianBlur(radius=random.randint(15, 35)))
    img_rgb = image.convert('RGB')
    
    # Blend shadow
    arr = np.array(img_rgb, dtype=np.float32)
    sh_arr = np.array(shadow_blur, dtype=np.float32) / 255.0
    arr = arr * sh_arr[:, :, np.newaxis]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

def apply_noise(image, intensity=0.03):
    """Adds camera sensor grain / salt-and-pepper scan noise."""
    arr = np.array(image, dtype=np.float32)
    noise = np.random.normal(0, intensity * 255, arr.shape)
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)

def generate_documents(output_dir="data/synthetic/documents", count=310):
    random.seed(SEED)
    np.random.seed(SEED)
    os.makedirs(output_dir, exist_ok=True)

    print(f"Generating {count} synthetic degraded Bangla Khatian documents (with QR, Pillow, 3 fonts)...")

    all_names = BANGLA_NAMES_MALE + BANGLA_NAMES_FEMALE
    consolidated_gt = {}

    for doc_idx in range(1, count + 1):
        font_path = random.choice(FONT_PATHS)
        font_name = os.path.basename(font_path).split(".")[0]

        try:
            font_title = ImageFont.truetype(font_path, 28)
            font_header = ImageFont.truetype(font_path, 20)
            font_body = ImageFont.truetype(font_path, 17)
            font_bold = ImageFont.truetype(font_path, 18)
            font_small = ImageFont.truetype(font_path, 13)
        except Exception:
            font_title = ImageFont.load_default()
            font_header = ImageFont.load_default()
            font_body = ImageFont.load_default()
            font_bold = ImageFont.load_default()
            font_small = ImageFont.load_default()

        # Canvas: 900 x 1280 (A4 aspect ratio)
        paper_bg = (random.randint(245, 252), random.randint(242, 249), random.randint(234, 242))
        img = Image.new('RGB', (900, 1280), paper_bg)
        draw = ImageDraw.Draw(img)

        # Cadastral record metadata
        mouza = random.choice(MOUZAS)
        survey_type = random.choice(SURVEY_TYPES)
        khatian_int = random.randint(100, 9999)
        dag_int = random.randint(500, 8888)
        owner_name = random.choice(all_names)
        land_class = random.choice(LAND_CLASSES_BN).split("(")[0].strip()
        area_dec = round(random.uniform(3.5, 85.0), 2)
        khatian_bn = to_bn_digits(khatian_int)
        dag_bn = to_bn_digits(dag_int)
        area_bn = to_bn_digits(f"{area_dec:.2f}")

        # Ground truth field dictionary with initial exact coordinates
        gt_fields = {}

        # 1. Header & Government Monogram Simulation
        draw.text((360, 40), "বাংলাদেশ ফরম নং ৫৪৬৩", fill=(40, 40, 40), font=font_small)
        draw.text((385, 65), "খতিয়ান (পরচা)", fill=(15, 23, 42), font=font_title)
        draw.text((370, 105), f"জরিপের ধরন: {survey_type}", fill=(30, 41, 59), font=font_bold)
        gt_fields["survey_type"] = {"value": survey_type, "bbox": [370, 105, 520, 130]}

        # Sub-header Line
        draw.line([(50, 140), (850, 140)], fill=(80, 80, 80), width=2)

        # Region & Mouza Attributes
        draw.text((60, 155), f"জেলা: {mouza['district']}", fill=(30, 41, 59), font=font_header)
        draw.text((320, 155), f"উপজেলা: {mouza['upazila']}", fill=(30, 41, 59), font=font_header)
        draw.text((580, 155), f"মৌজা: {mouza['name_bn']} (জে.এল {mouza['jl_no']})", fill=(30, 41, 59), font=font_header)
        gt_fields["mouza"] = {"value": mouza["name_bn"], "bbox": [580, 155, 830, 180]}
        gt_fields["jl_no"] = {"value": mouza["jl_no"], "bbox": [760, 155, 840, 180]}

        # 2. Key Metadata Box
        box_y = 200
        draw.rectangle([(50, box_y), (850, box_y + 80)], outline=(100, 100, 100), width=2, fill=(255, 255, 255, 120))
        draw.line([(450, box_y), (450, box_y + 80)], fill=(120, 120, 120), width=1)

        draw.text((80, box_y + 15), "খতিয়ান নম্বর:", fill=(50, 50, 50), font=font_body)
        draw.text((220, box_y + 12), khatian_bn, fill=(10, 10, 10), font=font_title)
        gt_fields["khatian_no"] = {"value": khatian_bn, "raw": str(khatian_int), "bbox": [220, box_y + 12, 380, box_y + 45]}

        draw.text((480, box_y + 15), "মূল দাগ নম্বর:", fill=(50, 50, 50), font=font_body)
        draw.text((620, box_y + 12), dag_bn, fill=(10, 10, 10), font=font_title)
        gt_fields["dag_no"] = {"value": dag_bn, "raw": str(dag_int), "bbox": [620, box_y + 12, 780, box_y + 45]}

        # 3. Traditional Khatian Table Grid
        table_top = 310
        table_bottom = 780
        col_x = [50, 160, 480, 650, 850]

        draw.rectangle([(50, table_top), (850, table_bottom)], outline=(60, 60, 60), width=2)
        draw.line([(50, table_top + 45), (850, table_top + 45)], fill=(60, 60, 60), width=2)

        # Vertical columns
        for cx in col_x[1:-1]:
            draw.line([(cx, table_top), (cx, table_bottom)], fill=(80, 80, 80), width=1)

        # Table Column Headers
        draw.text((70, table_top + 12), "দাগ নং", fill=(20, 20, 20), font=font_bold)
        draw.text((220, table_top + 12), "মালিকের নাম ও অংশ", fill=(20, 20, 20), font=font_bold)
        draw.text((510, table_top + 12), "জমির শ্রেণি", fill=(20, 20, 20), font=font_bold)
        draw.text((680, table_top + 12), "পরিমাণ (শতাংশ)", fill=(20, 20, 20), font=font_bold)

        # Table Row 1 (Primary ground truth entry)
        row1_y = table_top + 65
        draw.text((80, row1_y), dag_bn, fill=(10, 10, 10), font=font_header)
        draw.text((180, row1_y), f"১. {owner_name} (অংশ ১.০০০)", fill=(10, 10, 10), font=font_body)
        gt_fields["owner_name"] = {"value": owner_name, "bbox": [180, row1_y, 460, row1_y + 25]}

        draw.text((500, row1_y), land_class, fill=(10, 10, 10), font=font_body)
        gt_fields["land_class"] = {"value": land_class, "bbox": [500, row1_y, 630, row1_y + 25]}

        draw.text((710, row1_y), area_bn, fill=(10, 10, 10), font=font_header)
        gt_fields["area_decimal"] = {"value": area_bn, "raw": area_dec, "bbox": [710, row1_y, 820, row1_y + 25]}

        # Row 2 (Co-owner or adjacent partition)
        row2_y = table_top + 140
        draw.line([(50, row2_y - 10), (850, row2_y - 10)], fill=(160, 160, 160), width=1)
        sub_dag_bn = to_bn_digits(dag_int + 1)
        co_owner = random.choice([n for n in all_names if n != owner_name])
        draw.text((80, row2_y), sub_dag_bn, fill=(60, 60, 60), font=font_body)
        draw.text((180, row2_y), f"২. {co_owner} (অংশ ০.৫০০)", fill=(60, 60, 60), font=font_body)
        draw.text((500, row2_y), "ভিটি", fill=(60, 60, 60), font=font_body)
        draw.text((710, row2_y), to_bn_digits("১২.৫০"), fill=(60, 60, 60), font=font_body)

        # 4. Optional QR Code (bottom right)
        qr_included = random.random() < 0.85
        if qr_included:
            qr = qrcode.QRCode(box_size=3, border=2)
            qr.add_data(f"https://landos.gov.bd/v/khatian/{khatian_int}?dag={dag_int}&mouza={mouza['jl_no']}")
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
            qr_w, qr_h = qr_img.size
            qr_x, qr_y = 690, 830
            img.paste(qr_img, (qr_x, qr_y, qr_x + qr_w, qr_y + qr_h))
            gt_fields["qr_code"] = {"bbox": [qr_x, qr_y, qr_x + qr_w, qr_y + qr_h], "payload": f"khatian/{khatian_int}"}

        # 5. Official Signature & Stamp Simulation
        draw.text((80, 850), "প্রস্তুতকারীর স্বাক্ষর ও তারিখ:", fill=(80, 80, 80), font=font_small)
        draw.text((80, 880), "তহশিলদার / ইউনিয়ন সহকারী ভূমি কর্মকর্তা", fill=(100, 100, 100), font=font_small)
        draw.text((450, 850), "সহকারী কমিশনার (ভূমি) এর অনুমোদন স্বাক্ষর:", fill=(80, 80, 80), font=font_small)
        draw.text((450, 920), "তারিখ: ১২/০৮/২০২৪", fill=(80, 80, 80), font=font_small)

        # Verification notice
        draw.text((120, 1050), "ভূমি মন্ত্রণালয় ডিজিটাল রেকর্ড ট্র্যাকিং সিস্টেম (SYNTHETIC PROTOTYPE DEMO)", fill=(130, 130, 130), font=font_small)

        # -------------------------------------------------------------
        # Degradation Pipeline: Perspective Warp, Rotation, Blur, Noise, Shadow, JPEG
        # -------------------------------------------------------------
        # a. Perspective warp
        warp_applied = random.randint(4, 12)
        degraded = apply_perspective_warp(img, max_warp=warp_applied)

        # b. Rotation (+- 6 degrees)
        rot_angle = round(random.uniform(-6.0, 6.0), 2)
        degraded = degraded.rotate(rot_angle, resample=Image.BILINEAR, expand=False, fillcolor=paper_bg)

        # c. Blur
        blur_r = round(random.uniform(0.4, 1.2), 2)
        degraded = degraded.filter(ImageFilter.GaussianBlur(radius=blur_r))

        # d. Lighting & shadow gradient
        degraded = apply_shadow(degraded)

        # e. Sensor noise
        degraded = apply_noise(degraded, intensity=random.uniform(0.015, 0.035))

        # f. JPEG compression artifacts
        jpeg_q = random.randint(30, 65)

        filename_base = f"doc_{doc_idx:03d}"
        img_filename = f"{filename_base}.jpg"
        img_filepath = os.path.join(output_dir, img_filename)
        json_filepath = os.path.join(output_dir, f"{filename_base}.json")

        degraded.save(img_filepath, "JPEG", quality=jpeg_q, optimize=True)

        gt_record = {
            "image_file": img_filename,
            "document_id": f"DOC-SYN-{doc_idx:04d}",
            "font_used": font_name,
            "degradations": {
                "rotation_degrees": rot_angle,
                "perspective_warp_max_px": warp_applied,
                "blur_radius": blur_r,
                "jpeg_quality": jpeg_q,
                "qr_code_present": qr_included
            },
            "fields": gt_fields
        }

        with open(json_filepath, "w", encoding="utf-8") as f:
            json.dump(gt_record, f, ensure_ascii=False, indent=2)

        consolidated_gt[img_filename] = gt_record

        if doc_idx % 50 == 0 or doc_idx == count:
            print(f"Generated {doc_idx}/{count} degraded documents...")

    # Save consolidated ground truth
    with open(os.path.join(output_dir, "ground_truth_all.json"), "w", encoding="utf-8") as f:
        json.dump(consolidated_gt, f, ensure_ascii=False, indent=2)

    print(f"Successfully generated {count} synthetic degraded document images and ground truth files in {output_dir}.")
    return consolidated_gt

if __name__ == "__main__":
    generate_documents()
