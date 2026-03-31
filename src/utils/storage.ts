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
  const photos = (await photoStorage.getItem<CowPhoto[]>(cowId)) || [];
  // If this is set as main, unset others
  if (photo.isMain) {
    photos.forEach(p => p.isMain = false);
  }
  await photoStorage.setItem(cowId, [photo, ...photos]);
};

export const savePhotos = async (cowId: string, photos: CowPhoto[]) => {
  await photoStorage.setItem(cowId, photos);
};

export const loadPhotos = async (cowId: string): Promise<CowPhoto[]> => {
  return (await photoStorage.getItem<CowPhoto[]>(cowId)) || [];
};

export const getMainPhotos = async (): Promise<Record<string, Blob>> => {
  const keys = await photoStorage.keys();
  const mainPhotos: Record<string, Blob> = {};
  
  for (const key of keys) {
    const photos = await photoStorage.getItem<CowPhoto[]>(key);
    if (photos) {
      const main = photos.find(p => p.isMain);
      if (main) {
        mainPhotos[key] = main.blob;
      } else if (photos.length > 0) {
        mainPhotos[key] = photos[0].blob;
      }
    }
  }
  return mainPhotos;
};

