import React, { useState, useEffect } from 'react';
import type { CowBreed, Sighting, CowPhoto } from '../types';
import { Stars } from './ui/Stars';
import { Heart, Plus, Pencil, ExternalLink, MapPin, Star } from 'lucide-react';
import * as storage from '../utils/storage';
import { PhotoEditor } from './PhotoEditor';

interface CowDetailProps {
  cow: CowBreed;
  sightings: Sighting[];
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  onEditSighting: (sighting: Sighting) => void;
  onAddSighting: () => void;
}

export const CowDetail: React.FC<CowDetailProps> = ({
  cow,
  sightings,
  isWishlisted,
  onToggleWishlist,
  onEditSighting,
  onAddSighting
}) => {
  const [photos, setPhotos] = useState<CowPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [editingPhoto, setEditingPhoto] = useState<CowPhoto | null>(null);
  const cowSightings = sightings.filter(s => s.cowId === cow.id).sort((a, b) => b.timestamp - a.timestamp);

  useEffect(() => {
    const loadPhotos = async () => {
      const storedPhotos = await storage.loadPhotos(cow.id);
      setPhotos(storedPhotos);
      
      const urls: Record<string, string> = {};
      storedPhotos.forEach(p => {
        urls[p.id] = URL.createObjectURL(p.blob);
      });
      setPhotoUrls(urls);
      
      return () => {
        Object.values(urls).forEach(url => URL.revokeObjectURL(url));
      };
    };
    loadPhotos();
  }, [cow.id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newPhoto: CowPhoto = {
      id: Math.random().toString(36).substr(2, 9),
      cowId: cow.id,
      blob: file,
      isMain: photos.length === 0 // First photo is main by default
    };

    await storage.savePhoto(cow.id, newPhoto);
    setPhotos(prev => [newPhoto, ...prev]);
    const url = URL.createObjectURL(file);
    setPhotoUrls(prev => ({ ...prev, [newPhoto.id]: url }));
  };

  const handleUpdatePhoto = async (updatedPhoto: CowPhoto) => {
    let newPhotos = photos.map(p => p.id === updatedPhoto.id ? updatedPhoto : p);
    
    // Handle main photo logic
    if (updatedPhoto.isMain) {
      newPhotos = newPhotos.map(p => p.id === updatedPhoto.id ? p : { ...p, isMain: false });
    }

    await storage.savePhotos(cow.id, newPhotos);
    setPhotos(newPhotos);
    
    // Update URL if blob changed (after crop)
    if (photoUrls[updatedPhoto.id]) {
       URL.revokeObjectURL(photoUrls[updatedPhoto.id]);
    }
    const newUrl = URL.createObjectURL(updatedPhoto.blob);
    setPhotoUrls(prev => ({ ...prev, [updatedPhoto.id]: newUrl }));
    setEditingPhoto(null);
  };

  const handleDeletePhoto = async (photoId: string) => {
    const newPhotos = photos.filter(p => p.id !== photoId);
    await storage.savePhotos(cow.id, newPhotos);
    setPhotos(newPhotos);
    if (photoUrls[photoId]) {
      URL.revokeObjectURL(photoUrls[photoId]);
      const newUrls = { ...photoUrls };
      delete newUrls[photoId];
      setPhotoUrls(newUrls);
    }
    setEditingPhoto(null);
  };

  return (
    <div className="pb-20 text-cow-text">
      {/* Gallery */}
      <div className="flex overflow-x-auto gap-4 py-2 no-scrollbar mb-4 -mx-4 px-4 bg-orange-50/50">
        {/* Add Photo Button */}
        <label className="flex-shrink-0 w-32 h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer text-gray-400">
          <Plus size={32} />
          <span className="text-xs mt-1 font-bold">Add Photo</span>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </label>

        {/* User Photos (Polaroid Style) */}
        {photos.map((p) => (
          <div 
            key={p.id} 
            className="flex-shrink-0 w-40 polaroid cursor-pointer"
            onClick={() => setEditingPhoto(p)}
          >
            <div className="w-full h-32 bg-gray-200 overflow-hidden relative">
              <img src={photoUrls[p.id]} className="w-full h-full object-cover" alt={p.name || "User sighting"} />
              {p.isMain && (
                <div className="absolute top-1 right-1 bg-orange-400 text-white p-1 rounded-full shadow-sm">
                  <Star size={12} className="fill-current" />
                </div>
              )}
            </div>
            {p.name && (
              <p className="text-[10px] mt-1 font-bold truncate text-center">{p.name}</p>
            )}
          </div>
        ))}

        {/* Default Placeholder / Wikipedia Image */}
        <div className="flex-shrink-0 w-64 h-48 rounded-lg overflow-hidden retro-shadow border-2 border-white bg-white flex items-center justify-center">
          {cow.imageUrl ? (
            <img src={cow.imageUrl} className="w-full h-full object-cover" alt={cow.name} />
          ) : (
            <span className="text-6xl">🐄</span>
          )}
        </div>
      </div>

      {/* Info Header */}
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-3xl font-bold text-cow-accent">{cow.name}</h2>
        <button onClick={onToggleWishlist} className="text-2xl text-cow-accent transition-transform active:scale-125">
          <Heart size={32} className={isWishlisted ? "fill-current" : ""} />
        </button>
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <Stars count={cow.rarity} />
        <span className="text-xs uppercase font-bold tracking-widest text-orange-400">Rarity</span>
      </div>

      {/* Tags */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {cow.tags.map(t => (
          <span key={t} className="px-2 py-1 bg-orange-100 text-cow-text text-xs rounded-full border border-orange-200 font-bold">{t}</span>
        ))}
      </div>

      <div className="space-y-4 mb-8">
        <p className="text-lg leading-relaxed font-lora italic">
          {cow.special || "A beautiful cow breed with unique characteristics."}
        </p>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          {cow.primaryRegion && (
            <div className="bg-white/50 p-2 rounded border border-cow-border">
              <span className="block text-[10px] font-bold uppercase opacity-60">Region</span>
              {cow.primaryRegion}
            </div>
          )}
          {cow.mainColor && (
            <div className="bg-white/50 p-2 rounded border border-cow-border">
              <span className="block text-[10px] font-bold uppercase opacity-60">Color</span>
              {cow.mainColor}
            </div>
          )}
        </div>
      </div>
      
      <a 
        href={cow.wikipediaUrl || `https://en.wikipedia.org/wiki/${cow.name.replace(/ /g, '_')}_cattle`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-cow-accent underline mb-8 font-bold"
      >
        Read more on Wikipedia <ExternalLink size={14} />
      </a>

      {/* Sighting History */}
      <h3 className="text-xl font-bold border-b-2 border-cow-border pb-2 mb-4 flex items-center gap-2">
        Sighting Log <span className="text-sm bg-cow-accent text-white px-2 rounded-full">{cowSightings.length}</span>
      </h3>
      <div className="space-y-3">
        {cowSightings.map((spot, index) => (
          <div key={spot.id} className="bg-white p-3 rounded border border-cow-border flex gap-3 relative retro-shadow-sm">
            <div className="bg-cow-card w-10 h-10 rounded-full flex items-center justify-center text-cow-text retro-shadow-sm flex-shrink-0">
              <span className="font-bold text-sm">#{cowSightings.length - index}</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">
                {new Date(spot.timestamp).toLocaleDateString()} 
                <span className="font-normal opacity-70 ml-2">
                  at {new Date(spot.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </p>
              {spot.coords && (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${spot.coords.lat},${spot.coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"
                >
                  <MapPin size={12} /> {spot.locationName || "Map Location"}
                </a>
              )}
              {!spot.coords && <p className="text-xs opacity-50 italic">No location data</p>}
            </div>
            <button 
              onClick={() => onEditSighting(spot)}
              className="text-gray-400 hover:text-cow-accent transition-colors"
            >
              <Pencil size={18} />
            </button>
          </div>
        ))}
        {cowSightings.length === 0 && (
          <div className="text-center py-6 bg-orange-50 rounded border border-dashed border-orange-200">
            <p className="text-sm opacity-60 font-bold">You haven't seen this cow yet!</p>
            <button 
              onClick={onAddSighting}
              className="mt-2 text-cow-accent font-bold text-sm hover:underline"
            >
              Log a sighting now
            </button>
          </div>
        )}
      </div>

      {editingPhoto && (
        <PhotoEditor 
          photo={editingPhoto}
          onSave={handleUpdatePhoto}
          onDelete={() => handleDeletePhoto(editingPhoto.id)}
          onClose={() => setEditingPhoto(null)}
        />
      )}
    </div>
  );
};
