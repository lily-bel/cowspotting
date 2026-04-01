export type CowBreed = {
  id: string;
  name: string;
  rarity: number;
  isDairy: boolean;
  isDual: boolean;
  hump: string; // Changed to string to capture "Slight", "Yes", etc.
  mini: string;
  horns: string;
  fluffy: string;
  special: string;
  specialDetailed: string;
  hybrid: string;
  mainColor: string;
  pattern: string;
  secondaryColor: string;
  primaryRegion: string;
  specialLocation: string;
  altName: string;
  tags: string[];
  wikipediaUrl?: string;
  localImagePath?: string;
}

export type Sighting = {
  id: number;
  cowId: string;
  timestamp: number;
  coords?: {
    lat: number;
    lng: number;
  };
  locationName?: string;
}

export type CowPhoto = {
  id: string;
  cowId: string;
  blob: Blob;
  name?: string;
  isMain?: boolean;
}

export type UserData = {
  sightings: Sighting[];
  wishlist: string[];
}
