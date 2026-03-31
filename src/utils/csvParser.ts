import Papa from 'papaparse';
import type { CowBreed } from '../types';

const slugify = (text: string) => {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

export const parseCowsCsv = async (): Promise<CowBreed[]> => {
  const response = await fetch('/data/cows_enriched.csv');
  const csvText = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const breeds: CowBreed[] = results.data.map((row: any) => {
          const name = row['Breed Name'] || '';
          const tags: string[] = [];
          
          if (row['Dairy']) tags.push(row['Dairy']);
          if (row['Hump']) tags.push(row['Hump']);
          if (row['Mini']) tags.push(row['Mini']);
          if (row['Horns']) tags.push(row['Horns']);
          if (row['Fluffy']) tags.push(row['Fluffy']);
          if (row['Pattern']) tags.push(row['Pattern']);
          if (row['Main Color']) tags.push(row['Main Color']);
          if (row['Primary US Region']) tags.push(row['Primary US Region']);

          return {
            id: slugify(name),
            name,
            rarity: parseInt(row['Rarity']) || 1,
            isDairy: row['Dairy']?.toLowerCase().includes('dairy') || false,
            isDual: row['Dairy']?.toLowerCase().includes('dual') || false,
            hump: row['Hump'] || '',
            mini: row['Mini'] || '',
            horns: row['Horns'] || '',
            fluffy: row['Fluffy'] || '',
            special: row['Special'] || '',
            hybrid: row['Hybrid'] || '',
            mainColor: row['Main Color'] || '',
            pattern: row['Pattern'] || '',
            secondaryColor: row['Secondary Color'] || '',
            primaryRegion: row['Primary US Region'] || '',
            specialLocation: row['Special Location'] || '',
            altName: row['Alt Name'] || '',
            tags: Array.from(new Set(tags)).filter(Boolean),
            wikipediaUrl: row['Wikipedia URL'] || '',
            imageUrl: row['Image URL'] || '',
            localImagePath: row['Local Image Path'] || '',
          };
        });
        resolve(breeds);
      },
      error: (error: any) => {
        reject(error);
      }
    });
  });
};
