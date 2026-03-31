import csv
import json
import urllib.request
import urllib.parse
import time
import os

INPUT_FILE = 'public/data/cows.csv'
OUTPUT_FILE = 'public/data/cows_enriched.csv'

# Wikipedia API requires a descriptive User-Agent
HEADERS = {
    'User-Agent': 'CowSpotterEnrichmentScript/1.0 (https://github.com/example/cowspotter)'
}

def get_wikipedia_info(breed_name):
    # Try the breed name directly and also with "cattle" appended for better accuracy
    search_queries = [breed_name, f"{breed_name} cattle"]
    
    for query in search_queries:
        encoded_query = urllib.parse.quote(query)
        # Wikipedia API to get page info, URL, and original image
        url = f"https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|info&inprop=url&piprop=original&titles={encoded_query}&redirects=1"
        
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                pages = data.get('query', {}).get('pages', {})
                
                for page_id, page_info in pages.items():
                    if page_id == "-1":
                        continue
                    
                    wiki_url = page_info.get('fullurl')
                    image_url = page_info.get('original', {}).get('source')
                    
                    if wiki_url:
                        return wiki_url, image_url
        except Exception as e:
            print(f"Error fetching data for {query}: {e}")
            
    # If no direct match, try a search
    try:
        search_url = f"https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch={urllib.parse.quote(breed_name + ' cattle')}&srlimit=1"
        req = urllib.request.Request(search_url, headers=HEADERS)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            search_results = data.get('query', {}).get('search', [])
            if search_results:
                title = search_results[0]['title']
                return get_wikipedia_info(title)
    except Exception as e:
        print(f"Search error for {breed_name}: {e}")

    return None, None

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    with open(INPUT_FILE, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames + ['Wikipedia URL', 'Image URL']
        rows = list(reader)

    enriched_rows = []
    total = len(rows)
    found_count = 0
    
    print(f"Enriching {total} breeds...")
    
    for i, row in enumerate(rows):
        breed_name = row['Breed Name']
        print(f"[{i+1}/{total}] Processing: {breed_name}...", end=" ", flush=True)
        
        wiki_url, image_url = get_wikipedia_info(breed_name)
        
        row['Wikipedia URL'] = wiki_url if wiki_url else ""
        row['Image URL'] = image_url if image_url else ""
        
        if wiki_url:
            found_count += 1
            print("Found!")
        else:
            print("Not found.")
            
        enriched_rows.append(row)
        # Small sleep to be respectful to the API
        time.sleep(0.1)

    with open(OUTPUT_FILE, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(enriched_rows)

    print(f"\nDone! Found {found_count}/{total} breeds.")
    print(f"Enriched data saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
