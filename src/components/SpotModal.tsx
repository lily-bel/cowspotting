import React, { useState } from 'react';
import type { CowBreed, Sighting } from '../types';
import { X, MapPin, Loader2 } from 'lucide-react';

interface SpotModalProps {
  cow: CowBreed;
  existingData?: Sighting;
  onClose: () => void;
  onSave: (data: Omit<Sighting, 'id'> | Sighting) => void;
}

export const SpotModal: React.FC<SpotModalProps> = ({ 
  cow, 
  existingData, 
  onClose, 
  onSave 
}) => {
  const [date, setDate] = useState(existingData ? new Date(existingData.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(existingData ? new Date(existingData.timestamp).toTimeString().substring(0,5) : new Date().toTimeString().substring(0,5));
  const [coords, setCoords] = useState(existingData?.coords || undefined);
  const [locName, setLocName] = useState(existingData?.locationName || '');
  const [isLoadingLoc, setIsLoadingLoc] = useState(false);

  const handleGetLocation = () => {
    setIsLoadingLoc(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocName(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        setIsLoadingLoc(false);
      }, () => {
        alert("Could not get location.");
        setIsLoadingLoc(false);
      });
    } else {
      alert("Geolocation not supported");
      setIsLoadingLoc(false);
    }
  };

  const handleSubmit = () => {
    const combinedDate = new Date(`${date}T${time}`);
    onSave({
      ...(existingData ? { id: existingData.id } : {}),
      cowId: cow.id,
      timestamp: combinedDate.getTime(),
      coords,
      locationName: locName
    });
  };

  return (
    <div className="bg-cow-bg p-6 rounded-lg w-full max-w-xs retro-shadow border border-cow-border relative">
      <button onClick={onClose} className="absolute top-2 right-2 text-cow-text hover:text-cow-accent">
        <X size={24} />
      </button>
      
      <h3 className="text-xl font-bold mb-4 text-center">
        {existingData ? 'Edit Sighting' : 'I Spotted a Cow!'}
      </h3>
      
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 rounded-full border-4 border-cow-card overflow-hidden flex items-center justify-center bg-white">
          <span className="text-4xl">🐄</span>
        </div>
      </div>
      <p className="text-center font-bold text-cow-accent mb-4">{cow.name}</p>

      <div className="space-y-3 text-cow-text">
        <div>
          <label className="block text-xs font-bold uppercase mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 rounded border border-cow-border bg-white" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase mb-1">Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2 rounded border border-cow-border bg-white" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase mb-1">Location</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={locName} 
              onChange={e => setLocName(e.target.value)}
              placeholder="Near the old barn..." 
              className="flex-1 p-2 rounded border border-cow-border bg-white text-sm" 
            />
            <button 
              onClick={handleGetLocation} 
              className="bg-blue-100 text-blue-600 p-2 rounded border border-blue-200"
              disabled={isLoadingLoc}
            >
              {isLoadingLoc ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
            </button>
          </div>
          {coords && <p className="text-[10px] mt-1 text-green-600">✓ GPS Pinned</p>}
        </div>
      </div>

      <button 
        onClick={handleSubmit} 
        className="w-full bg-cow-card hover:bg-orange-300 text-cow-text font-bold py-3 rounded mt-6 retro-shadow-sm transition-transform active:scale-95"
      >
        Save Spot
      </button>
    </div>
  );
};
