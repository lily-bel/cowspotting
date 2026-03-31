import csv
import json
import urllib.request
import urllib.parse
import time
import os
import re

INPUT_FILE = 'public/data/cows_enriched.csv'
OUTPUT_DIR = 'public/images/breeds'

# User-Agent to be respectful and avoid blocks
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = text.strip('-')
    return text

def download_image(url, breed_name):
    if not url:
        return None
    
    slug = slugify(breed_name)
    # Parse URL to get extension, or default to .jpg
    parsed_url = urllib.parse.urlparse(url)
    ext = os.path.splitext(parsed_url.path)[1]
    if not ext or len(ext) > 5: # Some URLs have weird query params
        ext = '.jpg'
    
    filename = f"{slug}{ext}"
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    # Avoid re-downloading if it exists
    if os.path.exists(filepath):
        return f"/images/breeds/{filename}"

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as response:
            with open(filepath, 'wb') as f:
                f.write(response.read())
        return f"/images/breeds/{filename}"
    except Exception as e:
        print(f"Failed to download {breed_name} from {url}: {e}")
        return None

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    with open(INPUT_FILE, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        if 'Local Image Path' not in fieldnames:
            fieldnames = fieldnames + ['Local Image Path']
        rows = list(reader)

    total = len(rows)
    print(f"Downloading images for {total} breeds...")
    
    for i, row in enumerate(rows):
        breed_name = row['Breed Name']
        image_url = row.get('Image URL')
        
        print(f"[{i+1}/{total}] {breed_name}...", end=" ", flush=True)
        
        local_path = download_image(image_url, breed_name)
        row['Local Image Path'] = local_path if local_path else ""
        
        if local_path:
            print(f"Done: {local_path}")
        else:
            print("Skipped/Failed.")
            
        # Small delay between downloads
        time.sleep(0.1)

    with open(INPUT_FILE, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nCompleted! CSV updated with Local Image Path.")

if __name__ == "__main__":
    main()
