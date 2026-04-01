import type { CowBreed } from '../types';

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", 
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", 
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", 
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", 
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", 
  "Wisconsin", "Wyoming"
];

export const REGION_MAPPING: Record<string, { definite: string[], probable: string[] }> = {
  "south": { 
    definite: ["Alabama", "Arkansas", "Florida", "Georgia", "Kentucky", "Louisiana", "Mississippi", "North Carolina", "South Carolina", "Tennessee", "Texas", "Virginia", "West Virginia"],
    probable: ["Maryland", "Delaware", "Oklahoma", "Missouri"] 
  },
  "gulf coast": {
    definite: ["Texas", "Louisiana", "Mississippi", "Alabama", "Florida"],
    probable: []
  },
  "deep south": {
    definite: ["Louisiana", "Mississippi", "Alabama", "Georgia", "South Carolina"],
    probable: ["Florida", "Arkansas", "Tennessee"]
  },
  "texas": {
    definite: ["Texas"],
    probable: ["Oklahoma", "New Mexico", "Louisiana"]
  },
  "west": {
    definite: ["California", "Oregon", "Washington", "Nevada", "Arizona", "New Mexico", "Colorado", "Utah", "Wyoming", "Idaho", "Montana", "Alaska", "Hawaii"],
    probable: []
  },
  "northeast": {
    definite: ["Maine", "New Hampshire", "Vermont", "Massachusetts", "Rhode Island", "Connecticut", "New York", "New Jersey", "Pennsylvania"],
    probable: ["Maryland", "Delaware", "West Virginia"]
  },
  "midwest": {
    definite: ["Ohio", "Indiana", "Illinois", "Michigan", "Wisconsin", "Minnesota", "Iowa", "Missouri", "North Dakota", "South Dakota", "Nebraska", "Kansas"],
    probable: []
  },
  "southwest": {
    definite: ["Arizona", "New Mexico", "Oklahoma", "Texas"],
    probable: ["Nevada", "Utah", "Colorado", "California"]
  },
  "florida": {
    definite: ["Florida"],
    probable: []
  },
  "great plains": {
    definite: ["North Dakota", "South Dakota", "Nebraska", "Kansas", "Oklahoma", "Texas", "Colorado", "Wyoming", "Montana", "New Mexico"],
    probable: ["Minnesota", "Iowa", "Missouri"]
  },
  "upper midwest": {
    definite: ["Minnesota", "Wisconsin", "Michigan", "Iowa"],
    probable: ["North Dakota", "South Dakota", "Illinois"]
  },
  "rockies": {
    definite: ["Idaho", "Montana", "Wyoming", "Colorado", "Utah"],
    probable: ["Nevada", "New Mexico", "Arizona"]
  },
  "northwest": {
    definite: ["Washington", "Oregon", "Idaho"],
    probable: ["Montana", "Wyoming", "California"]
  },
  "new england": {
    definite: ["Maine", "New Hampshire", "Vermont", "Massachusetts", "Rhode Island", "Connecticut"],
    probable: ["New York"]
  },
  "dairy states": {
    definite: ["California", "Wisconsin", "New York", "Pennsylvania", "Minnesota", "Idaho", "Texas"],
    probable: ["Michigan", "New Mexico", "Washington"]
  },
  "aleutian islands": {
    definite: ["Alaska"],
    probable: []
  }
};

export const COLOR_GROUPS: Record<string, { label: string, hex: string, members: string[] }> = {
  'black': { label: 'Black', hex: '#262626', members: ['black'] },
  'red': { label: 'Red', hex: '#a63426', members: ['red', 'dark red', 'cherry red', 'deep red', 'golden-red', 'light red'] },
  'brown': { label: 'Brown/Tan', hex: '#916d4e', members: ['brown', 'dark brown', 'light brown', 'fawn', 'dun', 'tan', 'chestnut brown', 'golden-brown'] },
  'white': { label: 'White/Cream', hex: '#f5eee6', members: ['white', 'cream', 'blonde'] },
  'grey': { label: 'Grey/Blue', hex: '#8a939e', members: ['grey', 'dark grey', 'light grey', 'silver-grey', 'mouse-grey', 'blue'] },
  'yellow': { label: 'Yellow/Golden', hex: '#e0b35e', members: ['yellow', 'golden'] },
};

export const COLOR_GROUP_MAP: Record<string, string> = Object.entries(COLOR_GROUPS).reduce((acc, [_, group]) => {
  group.members.forEach(m => {
    acc[m] = group.label;
  });
  return acc;
}, {} as Record<string, string>);

export const COLOR_CLOSENESS: Record<string, string[]> = {
  'black': ['dark grey', 'dark brown'],
  'grey': ['silver-grey', 'mouse-grey', 'light grey', 'dark grey', 'blue'],
  'dark grey': ['black', 'grey', 'mouse-grey', 'blue'],
  'light grey': ['grey', 'silver-grey', 'white', 'mouse-grey'],
  'silver-grey': ['grey', 'light grey'],
  'mouse-grey': ['grey', 'dark grey', 'light grey'],
  'blue': ['grey', 'dark grey'],
  'red': ['brown', 'dark red', 'cherry red', 'deep red', 'golden-red', 'chestnut brown'],
  'dark red': ['red', 'cherry red', 'deep red', 'brown'],
  'cherry red': ['red', 'dark red', 'deep red'],
  'deep red': ['red', 'dark red', 'cherry red'],
  'golden-red': ['red', 'golden', 'yellow'],
  'brown': ['red', 'dark brown', 'light brown', 'fawn', 'dun', 'chestnut brown'],
  'dark brown': ['black', 'brown'],
  'light brown': ['brown', 'tan', 'fawn', 'white'],
  'chestnut brown': ['brown', 'red'],
  'white': ['cream', 'blonde', 'light grey', 'yellow'],
  'cream': ['white', 'blonde', 'yellow'],
  'blonde': ['white', 'cream', 'yellow', 'fawn'],
  'fawn': ['dun', 'yellow', 'light brown', 'tan', 'blonde'],
  'dun': ['fawn', 'yellow', 'brown', 'tan'],
  'tan': ['fawn', 'dun', 'light brown'],
  'yellow': ['golden', 'blonde', 'fawn', 'dun', 'cream', 'white'],
  'golden': ['yellow', 'golden-red', 'blonde']
};

export const PATTERN_CLOSENESS: Record<string, string[]> = {
  'points': ['ombre'],
  'ombre': ['points'],
  'roan': ['spotted'],
  'spotted': ['roan'],
  'white face': ['white face + neck'],
  'white face + neck': ['white face']
};

export const isStateInRegion = (state: string, breedRegionStr: string): number => {
  const breedRegions = breedRegionStr.toLowerCase().split(',').map(s => s.trim());
  if (breedRegions.includes('nationwide')) return 1;

  let maxScore = 0;
  Object.entries(REGION_MAPPING).forEach(([regionKey, mapping]) => {
    if (breedRegions.some(br => br.includes(regionKey))) {
      if (mapping.definite.includes(state)) {
        maxScore = Math.max(maxScore, 1);
      } else if (mapping.probable.includes(state)) {
        maxScore = Math.max(maxScore, 0.5);
      }
    }
  });
  return maxScore;
};

export const isColorMatch = (color: string, breed: CowBreed): number => {
  const searchColor = color.toLowerCase();
  const mainColor = breed.mainColor.toLowerCase();
  const secondaryColor = breed.secondaryColor.toLowerCase();

  const breedColors = [mainColor, ...secondaryColor.split(/[,/]/).map(s => s.trim())].filter(Boolean);
  
  // If searchColor is a group label (e.g., "Brown/Tan")
  const group = Object.values(COLOR_GROUPS).find(g => g.label.toLowerCase() === searchColor);
  if (group) {
    if (breedColors.some(bc => group.members.includes(bc))) return 1;
    
    // Check closeness for any member of the group
    if (breedColors.some(bc => group.members.some(m => (COLOR_CLOSENESS[m] || []).includes(bc)))) return 0.5;
    return 0;
  }

  if (breedColors.includes(searchColor)) return 1;
  
  const closeColors = COLOR_CLOSENESS[searchColor] || [];
  if (breedColors.some(c => closeColors.includes(c))) return 0.5;
  
  return 0;
};

export const isPatternMatch = (pattern: string, breedPatternStr: string): number => {
  const searchPattern = pattern.toLowerCase();
  const breedPatterns = breedPatternStr.toLowerCase().split(/[,/]/).map(s => s.trim());
  
  if (breedPatterns.includes(searchPattern)) return 1;
  
  const closePatterns = PATTERN_CLOSENESS[searchPattern] || [];
  if (breedPatterns.some(p => closePatterns.includes(p))) return 0.5;
  
  return 0;
};
