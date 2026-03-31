import { useState, useMemo, useEffect, useRef } from 'react';
import { useCowDex } from './hooks/useCowDex';
import { CowCard } from './components/CowCard';
import { CowDetail } from './components/CowDetail';
import { SpotModal } from './components/SpotModal';
import { CowIdentifier } from './components/CowIdentifier';
import type { Sighting, CowBreed, CowPhoto } from './types';
import { Binoculars, LayoutGrid, Search, ArrowUpDown, Sparkles, Filter, X, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as storage from './utils/storage';
import { US_STATES, isStateInRegion, isColorMatch, isPatternMatch } from './utils/cowLogic';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SortMode = 'name-asc' | 'name-desc' | 'rarity-asc' | 'rarity-desc';

interface Filters {
  state?: string;
  color?: string;
  pattern?: string;
  isDairy?: boolean | null;
  isHybrid?: boolean | null;
  wishlistOnly?: boolean;
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

  const [view, setView] = useState<'spot' | 'collection' | 'detail' | 'identify'>('spot');
  const [selectedCowId, setSelectedCowId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('rarity-asc');
  const [filters, setFilters] = useState<Filters>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSighting, setEditingSighting] = useState<Sighting | undefined>(undefined);
  const [mainPhotoUrls, setMainPhotoUrls] = useState<Record<string, string>>({});
  const [photosVersion, setPhotosVersion] = useState(0);

  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const refreshPhotos = () => setPhotosVersion(v => v + 1);

  useEffect(() => {
    const loadMainPhotos = async () => {
      const photos = await storage.getMainPhotos();
      const urls: Record<string, string> = {};
      Object.entries(photos).forEach(([id, blob]) => {
        urls[id] = URL.createObjectURL(blob);
      });
      setMainPhotoUrls(prevUrls => {
        Object.values(prevUrls).forEach(URL.revokeObjectURL);
        return urls;
      });
    };
    if (!loading) {
      loadMainPhotos();
    }
  }, [loading, sightings, photosVersion]);

  const filteredCows = useMemo(() => {
    const scores = breeds.map(cow => {
      let score = 0;
      let totalFilters = 0;

      if (searchTerm) {
        if (!cow.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return { cow, score: -1 };
        }
      }

      // Filter: State
      if (filters.state) {
        totalFilters++;
        score += isStateInRegion(filters.state, cow.primaryRegion || '');
      }

      // Filter: Color
      if (filters.color) {
        totalFilters++;
        score += isColorMatch(filters.color, cow);
      }

      // Filter: Pattern
      if (filters.pattern) {
        totalFilters++;
        score += isPatternMatch(filters.pattern, cow.pattern || '');
      }

      // Filter: Dairy
      if (filters.isDairy !== undefined && filters.isDairy !== null) {
        totalFilters++;
        const isCowDairy = cow.isDairy || cow.isDual;
        if (filters.isDairy === isCowDairy) score += 1;
      }

      // Filter: Hybrid
      if (filters.isHybrid !== undefined && filters.isHybrid !== null) {
        totalFilters++;
        const isCowHybrid = !!cow.hybrid;
        if (filters.isHybrid === isCowHybrid) score += 1;
      }

      // Filter: Wishlist
      if (filters.wishlistOnly) {
        totalFilters++;
        if (wishlist.includes(cow.id)) score += 1;
      }

      const finalScore = totalFilters > 0 ? score / totalFilters : 1;
      return { cow, score: finalScore };
    });

    return scores
      .filter(s => s.score > 0)
      .sort((a, b) => {
        // First, sort by score (exact matches first, then close matches)
        if (a.score !== b.score) return b.score - a.score;

        // Then apply the selected sort mode
        switch (sortMode) {
          case 'name-asc':
            return a.cow.name.localeCompare(b.cow.name);
          case 'name-desc':
            return b.cow.name.localeCompare(a.cow.name);
          case 'rarity-asc':
            return a.cow.rarity - b.cow.rarity;
          case 'rarity-desc':
            return b.cow.rarity - a.cow.rarity;
          default:
            return 0;
        }
      })
      .map(s => s.cow);
  }, [breeds, searchTerm, sortMode, filters, wishlist]);

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

  const handleSelectBreedFromIdentifier = async (breed: CowBreed, photoBlob?: Blob) => {
    if (photoBlob) {
      const photo: CowPhoto = {
        id: Date.now().toString(),
        cowId: breed.id,
        blob: photoBlob,
        isMain: true
      };
      await storage.savePhoto(breed.id, photo);
      refreshPhotos();
    }
    setSelectedCowId(breed.id);
    setEditingSighting(undefined);
    setIsModalOpen(true);
    setView('detail'); // Show detail page behind the modal
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-bold text-2xl animate-pulse">
      </div>
    );
  }

  const getRarityColor = (rarity: number) => {
    switch (rarity) {
      case 1: return 'bg-rarity-1';
      case 2: return 'bg-rarity-2';
      case 3: return 'bg-rarity-3';
      case 4: return 'bg-rarity-4';
      case 5: return 'bg-rarity-5';
      case 6: return 'bg-rarity-6';
      default: return 'bg-rarity-1';
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative" style={{ height: '100dvh' }}>

      {/* MAIN CONTAINER */}
      <div className="flex-1 bg-cow-bg overflow-hidden flex flex-col">

        {/* HEADER */}
        {view !== 'identify' && (
          <div className="p-4 border-b border-cow-border bg-[#fffbfb] flex justify-between items-center shrink-0">
            <h1 className="text-2xl text-cow-accent font-bold">
              {view === 'spot' && 'Cowspotting'}
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
        )}

        {/* CONTENT AREA */}
        <div className={cn(
          "flex-1 overflow-y-auto no-scrollbar",
          view !== 'identify' && "p-4"
        )}>
          
          {view === 'spot' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
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
                  
                  {/* Sort Dropdown */}
                  <div className="relative" ref={sortRef}>
                    <button 
                      onClick={() => setIsSortOpen(!isSortOpen)}
                      className={cn(
                        "px-3 h-10 bg-white border border-cow-border rounded text-cow-text flex items-center gap-1 transition-all",
                        isSortOpen && "border-cow-accent"
                      )}
                    >
                      <ArrowUpDown size={18} />
                    </button>
                    
                    {isSortOpen && (
                      <div className="absolute right-0 mt-1 w-48 bg-white border border-cow-border rounded-lg shadow-xl z-[60] overflow-hidden">
                        {[
                          { id: 'name-asc', label: 'Name A-Z' },
                          { id: 'name-desc', label: 'Name Z-A' },
                          { id: 'rarity-asc', label: 'Rarity (Increasing)' },
                          { id: 'rarity-desc', label: 'Rarity (Decreasing)' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => { setSortMode(opt.id as SortMode); setIsSortOpen(false); }}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm hover:bg-orange-50 transition-colors",
                              sortMode === opt.id ? "text-cow-accent font-bold bg-orange-50/50" : "text-cow-text"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setIsFilterOpen(true)}
                    className={cn(
                      "px-3 h-10 border border-cow-border rounded text-cow-text flex items-center gap-1 transition-all",
                      Object.keys(filters).length > 0 ? "bg-cow-accent text-white border-cow-accent" : "bg-white"
                    )}
                  >
                    <Filter size={18} />
                  </button>
                </div>

                {/* Active Filter Pills */}
                {Object.keys(filters).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(filters).map(([key, val]) => {
                      if (val === undefined || val === null || val === '') return null;
                      let label = '';
                      if (key === 'state') label = `State: ${val}`;
                      else if (key === 'color') label = `Color: ${val}`;
                      else if (key === 'pattern') label = `Pattern: ${val}`;
                      else if (key === 'isDairy') label = val ? 'Dairy' : 'Beef/Show';
                      else if (key === 'isHybrid') label = val ? 'Hybrid' : 'Purebred';
                      else if (key === 'wishlistOnly') label = 'Wishlist';
                      
                      return (
                        <div key={key} className="flex items-center gap-1 px-2 py-1 bg-white border border-cow-accent/30 text-cow-accent rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {label}
                          <button onClick={() => setFilters(prev => {
                            const next = { ...prev };
                            delete next[key as keyof Filters];
                            return next;
                          })}>
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                    <button 
                      onClick={() => setFilters({})}
                      className="text-[10px] font-bold text-cow-text/50 hover:text-cow-accent uppercase tracking-wider underline px-1"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 pb-4">
                {filteredCows.map(cow => (
                  <CowCard 
                    key={cow.id}
                    cow={cow}
                    mainPhoto={mainPhotoUrls[cow.id]}
                    fallbackPhoto={cow.localImagePath || cow.imageUrl}
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
                    className={cn(
                      "rounded-lg retro-shadow p-3 flex flex-col items-center text-center cursor-pointer min-h-[140px]",
                      getRarityColor(cow.rarity)
                    )}
                  >
                    <div className="w-full aspect-square bg-white rounded mb-2 flex items-center justify-center border border-orange-200 text-3xl overflow-hidden">
                      {mainPhotoUrls[cow.id] ? (
                        <img src={mainPhotoUrls[cow.id]} className="w-full h-full object-cover" alt={cow.name} />
                      ) : (cow.localImagePath || cow.imageUrl) ? (
                        <img src={cow.localImagePath || cow.imageUrl} className="w-full h-full object-cover" alt={cow.name} />
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
              onPhotosChange={refreshPhotos}
            />
          )}

          {view === 'identify' && (
            <CowIdentifier 
              breeds={breeds} 
              onSelectBreed={handleSelectBreedFromIdentifier}
              onQuit={() => setView('spot')}
            />
          )}

        </div>

        {/* BOTTOM NAV */}
        <div className="h-16 bg-cow-card grid grid-cols-3 border-t border-cow-border shrink-0">
          <button 
            onClick={() => setView('spot')} 
            className={cn(
              "flex flex-col items-center justify-center transition-all",
              view === 'spot' ? "text-cow-accent scale-110" : "text-cow-text/50"
            )}
          >
            <Binoculars size={24} className={view === 'spot' ? "fill-cow-accent/20" : ""} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Spot</span>
          </button>
          
          <button 
            onClick={() => setView('identify')} 
            className={cn(
              "flex flex-col items-center justify-center transition-all",
              view === 'identify' ? "text-cow-accent scale-110" : "text-cow-text/50"
            )}
          >
            <Sparkles size={24} className={view === 'identify' ? "fill-cow-accent/20" : ""} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Identify</span>
          </button>

          <button 
            onClick={() => setView('collection')} 
            className={cn(
              "flex flex-col items-center justify-center transition-all",
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

      {/* FILTER MODAL */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#fffbfb] w-full max-w-sm rounded-3xl p-6 shadow-2xl retro-shadow border-2 border-cow-accent/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-cow-accent">Filters</h2>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} className="text-cow-text" />
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
              {/* US State */}
              <div>
                <label className="block text-xs font-bold text-cow-accent uppercase tracking-widest mb-2">US State</label>
                <div className="relative">
                  <select 
                    className="w-full p-3 bg-white border border-cow-border rounded-xl text-cow-text appearance-none focus:outline-none focus:border-cow-accent font-bold"
                    value={filters.state || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value || undefined }))}
                  >
                    <option value="">Any State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-cow-accent pointer-events-none" />
                </div>
              </div>

              {/* Wishlist Toggle */}
              <div>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, wishlistOnly: !prev.wishlistOnly }))}
                  className={cn(
                    "w-full p-3 rounded-xl border-2 flex items-center justify-between font-bold transition-all",
                    filters.wishlistOnly ? "bg-cow-accent text-white border-cow-accent shadow-md" : "bg-white border-cow-border text-cow-text"
                  )}
                >
                  <span className="text-xs uppercase tracking-widest">Wishlisted Only</span>
                  <Sparkles size={18} className={filters.wishlistOnly ? "text-yellow-300 fill-yellow-300" : "text-cow-accent"} />
                </button>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-bold text-cow-accent uppercase tracking-widest mb-2">Color</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Black', 'White', 'Red', 'Brown', 'Grey', 'Tan', 'Yellow', 'Golden'].map(c => (
                    <button
                      key={c}
                      onClick={() => setFilters(prev => ({ ...prev, color: prev.color === c ? undefined : c }))}
                      className={cn(
                        "p-2 rounded-xl border text-sm font-bold transition-all",
                        filters.color === c ? "bg-cow-accent text-white border-cow-accent" : "bg-white border-cow-border text-cow-text hover:border-cow-accent/50"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pattern */}
              <div>
                <label className="block text-xs font-bold text-cow-accent uppercase tracking-widest mb-2">Pattern</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Solid', 'Spotted', 'Belted', 'Points', 'Roan', 'White Face'].map(p => (
                    <button
                      key={p}
                      onClick={() => setFilters(prev => ({ ...prev, pattern: prev.pattern === p ? undefined : p }))}
                      className={cn(
                        "p-2 rounded-xl border text-sm font-bold transition-all",
                        filters.pattern === p ? "bg-cow-accent text-white border-cow-accent" : "bg-white border-cow-border text-cow-text hover:border-cow-accent/50"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dairy / Hybrid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-cow-accent uppercase tracking-widest mb-2">Type</label>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, isDairy: prev.isDairy === true ? null : true }))}
                      className={cn(
                        "p-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all",
                        filters.isDairy === true ? "bg-cow-accent text-white border-cow-accent" : "bg-white border-cow-border text-cow-text"
                      )}
                    >
                      Dairy
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, isDairy: prev.isDairy === false ? null : false }))}
                      className={cn(
                        "p-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all",
                        filters.isDairy === false ? "bg-cow-accent text-white border-cow-accent" : "bg-white border-cow-border text-cow-text"
                      )}
                    >
                      Beef/Other
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-cow-accent uppercase tracking-widest mb-2">Genetics</label>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, isHybrid: prev.isHybrid === true ? null : true }))}
                      className={cn(
                        "p-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all",
                        filters.isHybrid === true ? "bg-cow-accent text-white border-cow-accent" : "bg-white border-cow-border text-cow-text"
                      )}
                    >
                      Hybrid
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, isHybrid: prev.isHybrid === false ? null : false }))}
                      className={cn(
                        "p-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all",
                        filters.isHybrid === false ? "bg-cow-accent text-white border-cow-accent" : "bg-white border-cow-border text-cow-text"
                      )}
                    >
                      Purebred
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsFilterOpen(false)}
              className="w-full py-4 bg-cow-accent text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all mt-8"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
