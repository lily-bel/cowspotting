import { useState, useMemo, useEffect } from 'react';
import { useCowDex } from './hooks/useCowDex';
import { CowCard } from './components/CowCard';
import { CowDetail } from './components/CowDetail';
import { SpotModal } from './components/SpotModal';
import type { Sighting } from './types';
import { Binoculars, LayoutGrid, Search, ArrowUpDown, Trophy, Globe, Camera } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as storage from './utils/storage';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function App() {
  const { 
    breeds, 
    sightings, 
    wishlist, 
    loading, 
    addSighting, 
    updateSighting, 
    toggleWishlist 
  } = useCowDex();

  const [view, setView] = useState<'spot' | 'collection' | 'detail'>('spot');
  const [selectedCowId, setSelectedCowId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<'name' | 'rarity'>('name');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSighting, setEditingSighting] = useState<Sighting | undefined>(undefined);
  const [mainPhotoUrls, setMainPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadMainPhotos = async () => {
      const photos = await storage.getMainPhotos();
      const urls: Record<string, string> = {};
      Object.entries(photos).forEach(([id, blob]) => {
        urls[id] = URL.createObjectURL(blob);
      });
      setMainPhotoUrls(urls);
    };
    if (!loading) {
      loadMainPhotos();
    }
    return () => {
      Object.values(mainPhotoUrls).forEach(URL.revokeObjectURL);
    };
  }, [loading, sightings]); // Reload when sightings change (might have new photos)

  const filteredCows = useMemo(() => {
    return breeds
      .filter(cow => cow.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        // Wishlisted cows always go to top if searching
        const aWish = wishlist.includes(a.id);
        const bWish = wishlist.includes(b.id);
        if (aWish && !bWish) return -1;
        if (!aWish && bWish) return 1;

        if (sortMode === 'rarity') return b.rarity - a.rarity;
        return a.name.localeCompare(b.name);
      });
  }, [breeds, searchTerm, sortMode, wishlist]);

  const selectedCow = useMemo(() => 
    breeds.find(c => c.id === selectedCowId), 
    [breeds, selectedCowId]
  );

  const stats = useMemo(() => {
    const seenBreedIds = new Set(sightings.map(s => s.cowId));
    return {
      totalSightings: sightings.length,
      uniqueBreeds: seenBreedIds.size,
      totalBreeds: breeds.length
    };
  }, [sightings, breeds]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-bold text-2xl animate-pulse">
        Mooo-ading...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative" style={{ height: '100dvh' }}>
      
      {/* MAIN CONTAINER */}
      <div className="flex-1 bg-cow-bg overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="p-4 border-b border-cow-border bg-[#fffbfb] flex justify-between items-center shrink-0">
          <h1 className="text-2xl text-cow-accent font-bold">
            {view === 'spot' && 'Cow Spotter'}
            {view === 'collection' && 'My Collection'}
            {view === 'detail' && 'Cow Details'}
          </h1>
          {view === 'detail' && (
            <button 
              onClick={() => setView('spot')} 
              className="text-cow-text hover:underline text-sm font-bold"
            >
              Back
            </button>
          )}
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          
          {view === 'spot' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-cow-border" />
                  <input 
                    type="text" 
                    placeholder="Search breeds..." 
                    className="w-full pl-10 pr-4 py-2 border border-cow-border rounded bg-white text-cow-text placeholder-cow-border focus:outline-none focus:border-cow-card"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setSortMode(sortMode === 'name' ? 'rarity' : 'name')}
                  className="px-3 bg-cow-card rounded border-b border-r border-orange-300 text-cow-text transition-transform active:translate-y-0.5"
                >
                  <ArrowUpDown size={20} />
                </button>
              </div>

              <div className="space-y-3 pb-4">
                {filteredCows.map(cow => (
                  <CowCard 
                    key={cow.id}
                    cow={cow}
                    mainPhoto={mainPhotoUrls[cow.id]}
                    fallbackPhoto={cow.imageUrl}
                    seenCount={sightings.filter(s => s.cowId === cow.id).length}
                    isWishlisted={wishlist.includes(cow.id)}
                    onClick={() => { setSelectedCowId(cow.id); setView('detail'); }}
                    onSpot={(e) => {
                      e.stopPropagation();
                      setSelectedCowId(cow.id);
                      setEditingSighting(undefined);
                      setIsModalOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {view === 'collection' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                {breeds.filter(c => sightings.some(s => s.cowId === c.id)).map(cow => (
                  <div 
                    key={cow.id}
                    onClick={() => { setSelectedCowId(cow.id); setView('detail'); }}
                    className="bg-cow-card rounded-lg retro-shadow p-3 flex flex-col items-center text-center cursor-pointer min-h-[140px]"
                  >
                    <div className="w-full aspect-square bg-white rounded mb-2 flex items-center justify-center border border-orange-200 text-3xl overflow-hidden">
                      {mainPhotoUrls[cow.id] ? (
                        <img src={mainPhotoUrls[cow.id]} className="w-full h-full object-cover" alt={cow.name} />
                      ) : cow.imageUrl ? (
                        <img src={cow.imageUrl} className="w-full h-full object-cover" alt={cow.name} />
                      ) : (
                        '🐄'
                      )}
                    </div>
                    <h3 className="font-bold text-sm leading-tight text-cow-text line-clamp-2">{cow.name}</h3>
                  </div>
                ))}
                {stats.uniqueBreeds === 0 && (
                  <div className="col-span-full text-center py-20 opacity-50">
                    <Binoculars size={48} className="mx-auto mb-2" />
                    <p className="font-bold">No cows spotted yet! Go find some!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'detail' && selectedCow && (
            <CowDetail 
              cow={selectedCow}
              sightings={sightings}
              isWishlisted={wishlist.includes(selectedCow.id)}
              onToggleWishlist={() => toggleWishlist(selectedCow.id)}
              onEditSighting={(s) => { setEditingSighting(s); setIsModalOpen(true); }}
              onAddSighting={() => { setEditingSighting(undefined); setIsModalOpen(true); }}
            />
          )}

        </div>

        {/* BOTTOM NAV */}
        <div className="h-16 bg-cow-card flex items-center justify-around border-t border-cow-border shrink-0">
          <button 
            onClick={() => setView('spot')} 
            className={cn(
              "flex flex-col items-center transition-all",
              view === 'spot' ? "text-cow-accent scale-110" : "text-cow-text/50"
            )}
          >
            <Binoculars size={24} className={view === 'spot' ? "fill-cow-accent/20" : ""} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Spot</span>
          </button>
          <button 
            onClick={() => setView('collection')} 
            className={cn(
              "flex flex-col items-center transition-all",
              view === 'collection' ? "text-cow-accent scale-110" : "text-cow-text/50"
            )}
          >
            <LayoutGrid size={24} className={view === 'collection' ? "fill-cow-accent/20" : ""} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Collection</span>
          </button>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && selectedCow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <SpotModal 
            cow={selectedCow} 
            existingData={editingSighting}
            onClose={() => setIsModalOpen(false)}
            onSave={(data) => {
              if ('id' in data) {
                updateSighting(data as Sighting);
              } else {
                addSighting(data);
              }
              setIsModalOpen(false);
            }}
          />
        </div>
      )}

    </div>
  );
}

export default App;
