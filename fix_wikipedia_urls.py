import csv
import json
import urllib.request
import urllib.parse
import time
import os

INPUT_FILE = 'public/data/cows_enriched.csv'
HEADERS = {
    'User-Agent': 'CowSpotterFixer/1.0 (https://github.com/example/cowspotter)'
}

BREEDS_TO_FIX = ['Aleutian Wild Cattle', 'Indo-Brazilian', 'Mashona']

def get_correct_wiki_image(breed_name):
    # Try with "cattle" appended
    query = f"{breed_name} cattle"
    encoded_query = urllib.parse.quote(query)
    url = f"https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=1000&titles={encoded_query}&redirects=1"
    
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            pages = data.get('query', {}).get('pages', {})
            for page_id, page_info in pages.items():
                if page_id != "-1":
                    return page_info.get('thumbnail', {}).get('source')
    except Exception as e:
        print(f"Error for {breed_name}: {e}")
    return None

def main():
    rows = []
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            if row['Breed Name'] in BREEDS_TO_FIX:
                print(f"Fixing {row['Breed Name']}...", end=" ")
                new_url = get_correct_wiki_image(row['Breed Name'])
                if new_url:
                    print(f"Found: {new_url}")
                    row['Image URL'] = new_url
                    row['Local Image Path'] = '' # Force re-download
                else:
                    print("Not found.")
            rows.append(row)
            
    with open(INPUT_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

if __name__ == "__main__":
    main()
