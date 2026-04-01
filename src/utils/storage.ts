import localforage from 'localforage';
import type { Sighting, CowPhoto } from '../types';

// Instance for metadata
export const cowDexStorage = localforage.createInstance({
  name: 'CowSpotter',
  storeName: 'data'
});

// Instance for photos (CowPhoto objects)
export const photoStorage = localforage.createInstance({
  name: 'CowSpotter',
  storeName: 'photos'
});

export const saveSightings = async (sightings: Sighting[]) => {
  await cowDexStorage.setItem('sightings', sightings);
};

export const loadSightings = async (): Promise<Sighting[]> => {
  return (await cowDexStorage.getItem<Sighting[]>('sightings')) || [];
};

export const saveWishlist = async (wishlist: string[]) => {
  await cowDexStorage.setItem('wishlist', wishlist);
};

export const loadWishlist = async (): Promise<string[]> => {
  return (await cowDexStorage.getItem<string[]>('wishlist')) || [];
};

export const savePhoto = async (cowId: string, photo: CowPhoto) => {
  let photos = (await photoStorage.getItem<CowPhoto[]>(cowId)) || [];
  
  // If this is set as main, unset others
  if (photo.isMain) {
    photos = photos.map(p => ({ ...p, isMain: false }));
  } else if (photos.length === 0) {
    // If it's the first photo, it should be main
    photo.isMain = true;
  }
  
  // Check if we already have this photo (by ID) to avoid duplicates
  const existingIndex = photos.findIndex(p => p.id === photo.id);
  if (existingIndex >= 0) {
    photos[existingIndex] = photo;
  } else {
    photos = [photo, ...photos];
  }
  
  await photoStorage.setItem(cowId, photos);
};

export const savePhotos = async (cowId: string, photos: CowPhoto[]) => {
  await photoStorage.setItem(cowId, photos);
};

export const loadPhotos = async (cowId: string): Promise<CowPhoto[]> => {
  return (await photoStorage.getItem<CowPhoto[]>(cowId)) || [];
};

export const getMainPhotos = async (): Promise<Record<string, Blob>> => {
  const mainPhotos: Record<string, Blob> = {};
  
  await photoStorage.iterate((photos: CowPhoto[], key) => {
    if (photos && Array.isArray(photos) && photos.length > 0) {
      const main = photos.find(p => p.isMain) || photos[0];
      if (main && main.blob) {
        mainPhotos[key] = main.blob;
      }
    }
  });
  
  return mainPhotos;
};

