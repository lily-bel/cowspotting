import csv
import os

FILE_PATH = 'public/data/cows_enriched.csv'

UPDATES = {
    'Aleutian Wild Cattle': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT08qp_-5Gqt2SAJ-ngCXtYGY3aHXKOamcKNoZTDsdA2Q&s=10',
    'Mashona': 'https://www.mashonacattlezim.co.zw/images/Mashona-Cattle-Society-Zimbabwe-black-mashona-cattle-golden-scenic-background-a.jpg',
    'Simbrah': 'https://cdn.globalagmedia.com/uploads/files/breeds/simbrahcow.jpg',
    'Indo-Brazilian': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT08qp_-5Gqt2SAJ-ngCXtYGY3aHXKOamcKNoZTDsdA2Q&s=10',
    'American White Park': 'https://www.agrifarming.in/wp-content/uploads/2018/12/American-White-Park-Cattle..jpg',
    'Limousin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Vache-de-race-limousine-en-correze-2.jpg/500px-Vache-de-race-limousine-en-correze-2.jpg'
}

def update_csv():
    rows = []
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            breed = row['Breed Name']
            if breed in UPDATES:
                row['Image URL'] = UPDATES[breed]
                # Clear local path to force re-download
                row['Local Image Path'] = ''
            rows.append(row)
            
    with open(FILE_PATH, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

if __name__ == '__main__':
    update_csv()
    print("Updated CSV with new URLs.")
