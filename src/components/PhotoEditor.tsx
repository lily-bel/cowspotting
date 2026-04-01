import React, { useState } from 'react';
import { X, Check, Trash2, Star } from 'lucide-react';
import type { CowPhoto } from '../types';

interface PhotoEditorProps {
  photo: CowPhoto;
  onSave: (updatedPhoto: CowPhoto) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const PhotoEditor: React.FC<PhotoEditorProps> = ({ 
  photo, 
  onSave, 
  onDelete, 
  onClose 
}) => {
  const [name, setName] = useState(photo.name || '');
  const [isMain, setIsMain] = useState(photo.isMain || false);
  const [imgUrl] = useState<string>(URL.createObjectURL(photo.blob));
  
  const handleSave = () => {
    onSave({
      ...photo,
      name,
      isMain
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onClose} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24} /></button>
        <h2 className="text-white font-bold">Photo Details</h2>
        <button onClick={onDelete} className="text-red-400 hover:bg-red-400/10 p-2 rounded-full transition-colors"><Trash2 size={24} /></button>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 p-4">
        <div className="relative max-w-full max-h-full shadow-2xl">
          <img 
            src={imgUrl} 
            alt="Cow"
            className="max-w-full max-h-[60vh] object-contain rounded-lg border border-white/20"
          />
        </div>
      </div>

      <div className="bg-white rounded-t-2xl p-6 space-y-6 -mx-4 -mb-4">
        <div>
          <label className="block text-xs font-bold text-cow-accent uppercase mb-1">Photo Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bessie in the field"
            className="w-full px-4 py-2 border-2 border-cow-border rounded font-fredoka focus:border-cow-accent outline-none transition-colors"
          />
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setIsMain(!isMain)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all font-bold ${
              isMain ? 'bg-orange-400 border-orange-500 text-white shadow-inner' : 'border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            <Star size={20} className={isMain ? 'fill-current' : ''} />
            {isMain ? 'Starred' : 'Star Photo'}
          </button>
          
          <button 
            onClick={handleSave}
            className="flex-1 py-3 bg-cow-accent text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-md hover:bg-cow-accent/90 transition-colors active:scale-95"
          >
            <Check size={20} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

