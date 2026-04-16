import os
import re
import json
import mimetypes
from typing import Optional
<<<<<<< HEAD
=======
from dotenv import load_dotenv
load_dotenv()
>>>>>>> gina

import boto3
import httpx
from playwright.sync_api import sync_playwright


PEAKS_URL = "https://climb4kc.org/peaks"
<<<<<<< HEAD
MOUNTAINS_API_URL = os.getenv("MOUNTAINS_API_URL", "http://127.0.0.1:8002/mountains")
=======
MOUNTAINS_API_URL = "https://climb-4-kidney-cancer-production-fde3.up.railway.app/mountains/mountains"
>>>>>>> gina

S3_BUCKET = os.getenv("S3_BUCKET", "summitstepimages")
S3_REGION = os.getenv("S3_REGION", "us-east-2")
MOUNTAIN_PREFIX = "MountainsImages/"
<<<<<<< HEAD
=======
MOUNTAINS_API_TOKEN = os.getenv("MOUNTAINS_API_TOKEN") or os.getenv("AUTH_TOKEN")
>>>>>>> gina

DRY_RUN = False  # True면 print + json만 저장, False면 S3 업로드 + API POST까지 실행

s3 = boto3.client("s3", region_name=S3_REGION)


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    return slug or "mountain"


def get_extension(image_url: str, content_type: Optional[str]) -> str:
    path = image_url.split("?")[0]
    ext = os.path.splitext(path)[1].lower()

    if ext in {".jpg", ".jpeg", ".png", ".webp"}:
        return ext

    if content_type:
        guessed = mimetypes.guess_extension(content_type.split(";")[0].strip())
        if guessed:
            if guessed == ".jpe":
                return ".jpg"
            return guessed

    return ".png"


def build_filename(name: str, image_url: str, content_type: Optional[str]) -> str:
    ext = get_extension(image_url, content_type)
    return f"{slugify(name)}{ext}"


<<<<<<< HEAD
=======
def build_s3_key(name: str, image_url: str, content_type: Optional[str]) -> str:
    mountain_slug = slugify(name)
    filename = build_filename(name, image_url, content_type)
    return f"{MOUNTAIN_PREFIX}{mountain_slug}/{filename}"


>>>>>>> gina
def parse_title_line(title_line: str) -> dict:
    """
    예시:
    - Torreys Peak (14,267 ft.) Colorado, USA
    - Lobuche Peak (20, 075 Ft) Himalayan Mountains- Nepal
    - Grand Canyon Rim to Rim to Rim (approx. 10,710 ft.) USA
    - Yokahu Tower (95 steps) El Yunque National Forest, Puerto Rico
    """
    title_line = clean_text(title_line)

    pattern = r"^(.*?)\s*\((.*?)\)\s*(.*)$"
    m = re.match(pattern, title_line, re.IGNORECASE)

    if not m:
        return {
            "name": title_line,
            "height": None,
            "location": None,
        }

    name = clean_text(m.group(1))
    paren_content = clean_text(m.group(2))
    location = clean_text(m.group(3)) or None

    # Photo credit 꼬리 제거
    if location:
        location = re.sub(r"\bPhoto credit:.*$", "", location, flags=re.IGNORECASE).strip()

    digits = re.sub(r"[^\d]", "", paren_content)
    height = int(digits) if digits else None

    return {
        "name": name,
        "height": height,
        "location": location,
    }


def extract_year(text: str) -> Optional[int]:
    years = re.findall(r"\b(20\d{2})\b", text)
    if not years:
        return None
    return int(years[-1])


def parse_card(card) -> Optional[dict]:
    text = card.inner_text().strip()
    lines = [line.strip() for line in text.split("\n") if line.strip()]

    if not lines:
        return None

    title_line = lines[0]
    description = None

    for line in lines[1:]:
        lower = line.lower()
        if lower in {"more details", "click here", "make it", "more to come"}:
            continue
        if lower.startswith("item "):
            continue
        description = line
        break

    parsed_title = parse_title_line(title_line)

    img = card.locator("img.user-items-list-carousel__media").first
    image_url = (
        img.get_attribute("data-src")
        or img.get_attribute("data-image")
        or img.get_attribute("src")
    )

    if not parsed_title["name"]:
        return None

    return {
        "name": parsed_title["name"],
        "height": parsed_title["height"],
        "location": parsed_title["location"],
        "description": description,
        "source_image_url": image_url,
        "year": extract_year(text),
    }


def upload_image_from_url_to_s3(image_url: str, mountain_name: str) -> Optional[str]:
    if not image_url:
        return None

    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        resp = client.get(image_url)
        resp.raise_for_status()

        content_type = resp.headers.get("content-type", "image/png")
<<<<<<< HEAD
        filename = build_filename(mountain_name, image_url, content_type)
        s3_key = f"{MOUNTAIN_PREFIX}{filename}"
=======
        s3_key = build_s3_key(mountain_name, image_url, content_type)
>>>>>>> gina

        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=resp.content,
            ContentType=content_type,
        )

    return s3_key


def post_mountain_to_api(mountain: dict) -> dict:
    payload = {
        "name": mountain["name"],
        "height": mountain["height"],
        "location": mountain["location"],
        "description": mountain["description"],
        "url": mountain["s3_key"],
    }
<<<<<<< HEAD

    with httpx.Client(timeout=30.0) as client:
        resp = client.post(MOUNTAINS_API_URL, json=payload)
=======
    headers = {}

    if not MOUNTAINS_API_TOKEN:
        raise ValueError(
            "Missing MOUNTAINS_API_TOKEN (or AUTH_TOKEN) for authenticated mountain import."
        )

    headers["Authorization"] = f"Bearer {MOUNTAINS_API_TOKEN}"

    with httpx.Client(timeout=30.0) as client:
        resp = client.post(MOUNTAINS_API_URL, json=payload, headers=headers)
>>>>>>> gina
        resp.raise_for_status()
        return resp.json()


def main():
    results = []

    with sync_playwright() as p:
<<<<<<< HEAD
        browser = p.chromium.launch(headless=False)
=======
        # Should be True in production, set to False for debugging
        # False can show to crawling process
        browser = p.chromium.launch(headless=False) 
>>>>>>> gina
        page = browser.new_page()
        page.goto(PEAKS_URL, wait_until="networkidle")

        cards = page.locator("li.user-items-list-carousel__slide.list-item")
        count = cards.count()
        print(f"Found cards: {count}")

        seen_names = set()

        for i in range(count):
            card = cards.nth(i)
            parsed = parse_card(card)

            if not parsed:
                continue

            if not parsed["name"]:
                continue

            dedupe_key = parsed["name"].strip().lower()
            if dedupe_key in seen_names:
                continue
            seen_names.add(dedupe_key)

            if not parsed["height"] or not parsed["location"]:
                print(f"Skipping (insufficient data): {parsed}")
                continue

            print(f"\n[{i+1}/{count}] {parsed['name']}")
            print("  location:", parsed["location"])
            print("  height:", parsed["height"])
            print("  description:", parsed["description"])
            print("  source_image_url:", parsed["source_image_url"])

            if DRY_RUN:
                parsed["filename"] = build_filename(
                    parsed["name"],
                    parsed["source_image_url"] or "",
                    None,
                )
<<<<<<< HEAD
                parsed["s3_key"] = f"{MOUNTAIN_PREFIX}{parsed['filename']}"
=======
                parsed["s3_key"] = build_s3_key(
                    parsed["name"],
                    parsed["source_image_url"] or "",
                    None,
                )
>>>>>>> gina
                results.append(parsed)
                continue

            try:
                s3_key = upload_image_from_url_to_s3(
                    parsed["source_image_url"],
                    parsed["name"],
                )
                parsed["s3_key"] = s3_key

                api_response = post_mountain_to_api(parsed)

                print("  uploaded to S3:", s3_key)
                print("  API response:", api_response)

                results.append(parsed)

            except httpx.HTTPStatusError as e:
                print("  API/HTTP error:", e.response.status_code, e.response.text)
            except Exception as e:
                print("  ERROR:", e)

        browser.close()

    with open("peaks_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\nSaved {len(results)} mountains to peaks_results.json")
    print(f"Finished. Processed {len(results)} mountains.")


if __name__ == "__main__":
<<<<<<< HEAD
    main()
=======
    main()
>>>>>>> gina
