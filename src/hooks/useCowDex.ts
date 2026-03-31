import { useState, useEffect } from 'react';
import type { CowBreed, Sighting } from '../types';
import { parseCowsCsv } from '../utils/csvParser';
import * as storage from '../utils/storage';

export const useCowDex = () => {
  const [breeds, setBreeds] = useState<CowBreed[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const [csvBreeds, savedSightings, savedWishlist] = await Promise.all([
          parseCowsCsv(),
          storage.loadSightings(),
          storage.loadWishlist()
        ]);
        setBreeds(csvBreeds);
        setSightings(savedSightings);
        setWishlist(savedWishlist);
      } catch (error) {
        console.error("Failed to load cowdex data:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const addSighting = async (sighting: Omit<Sighting, 'id'>) => {
    const newSighting = { ...sighting, id: Date.now() };
    const newSightings = [newSighting, ...sightings];
    setSightings(newSightings);
    await storage.saveSightings(newSightings);
  };

  const updateSighting = async (sighting: Sighting) => {
    const newSightings = sightings.map(s => s.id === sighting.id ? sighting : s);
    setSightings(newSightings);
    await storage.saveSightings(newSightings);
  };

  const toggleWishlist = async (cowId: string) => {
    const newWishlist = wishlist.includes(cowId)
      ? wishlist.filter(id => id !== cowId)
      : [...wishlist, cowId];
    setWishlist(newWishlist);
    await storage.saveWishlist(newWishlist);
  };

  return {
    breeds,
    sightings,
    wishlist,
    loading,
    addSighting,
    updateSighting,
    toggleWishlist
  };
};
