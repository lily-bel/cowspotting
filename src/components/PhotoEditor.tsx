import React, { useState, useRef, useEffect } from 'react';
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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = imgUrl;
    img.onload = () => {
      setImgObj(img);
      // Default crop: centered 1:1
      const size = Math.min(img.width, img.height);
      setCrop({
        x: (img.width - size) / 2,
        y: (img.height - size) / 2,
        width: size,
        height: size
      });
    };
    return () => URL.revokeObjectURL(imgUrl);
  }, [imgUrl]);

  useEffect(() => {
    if (!imgObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the full image dimmed
    const scale = Math.min(canvas.width / imgObj.width, canvas.height / imgObj.height);
    const dw = imgObj.width * scale;
    const dh = imgObj.height * scale;
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh) / 2;

    ctx.globalAlpha = 0.5;
    ctx.drawImage(imgObj, dx, dy, dw, dh);
    ctx.globalAlpha = 1.0;

    // Draw the crop area
    const cx = dx + crop.x * scale;
    const cy = dy + crop.y * scale;
    const cw = crop.width * scale;
    const ch = crop.height * scale;

    ctx.drawImage(imgObj, crop.x, crop.y, crop.width, crop.height, cx, cy, cw, ch);
    
    // Draw border for crop area
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);
  }, [imgObj, crop]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!imgObj || !canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const dx = (e.clientX - dragStart.x) * scaleX;
      const dy = (e.clientY - dragStart.y) * scaleY;
      
      // Calculate centering scale to convert from canvas space back to image space
      const imageCenteringScale = Math.min(canvas.width / imgObj.width, canvas.height / imgObj.height);
      
      setCrop(prev => {
        const newX = Math.max(0, Math.min(imgObj.width - prev.width, prev.x + dx / imageCenteringScale));
        const newY = Math.max(0, Math.min(imgObj.height - prev.height, prev.y + dy / imageCenteringScale));
        return { ...prev, x: newX, y: newY };
      });
      
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, imgObj]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleApplyCrop = () => {
    if (!imgObj) return;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = 512;
    outCanvas.height = 512;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;

    outCtx.drawImage(imgObj, crop.x, crop.y, crop.width, crop.height, 0, 0, 512, 512);
    outCanvas.toBlob((blob) => {
      if (blob) {
        onSave({
          ...photo,
          blob,
          name,
          isMain
        });
      }
    }, 'image/jpeg', 0.9);
  };

  const handleSaveMetaOnly = () => {
    onSave({
      ...photo,
      name,
      isMain
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onClose} className="text-white"><X size={24} /></button>
        <h2 className="text-white font-bold">Edit Photo</h2>
        <button onClick={onDelete} className="text-red-400"><Trash2 size={24} /></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative group">
        <canvas 
          ref={canvasRef}
          width={400}
          height={400}
          className="max-w-full max-h-[60vh] border border-white/20 cursor-move touch-none"
          onMouseDown={handleMouseDown}
        />
        <button 
          onClick={handleApplyCrop}
          className="absolute top-4 right-4 bg-cow-accent text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Check size={18} /> Crop
        </button>
        <p className="text-white/60 text-xs mt-2">Drag to reposition 1:1 crop</p>
      </div>

      <div className="bg-white rounded-t-2xl p-6 space-y-6 -mx-4 -mb-4">
        <div>
          <label className="block text-xs font-bold text-cow-accent uppercase mb-1">Photo Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bessie in the field"
            className="w-full px-4 py-2 border-2 border-cow-border rounded font-fredoka"
          />
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setIsMain(!isMain)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-colors font-bold ${
              isMain ? 'bg-orange-400 border-orange-500 text-white' : 'border-gray-200 text-gray-400'
            }`}
          >
            <Star size={20} className={isMain ? 'fill-current' : ''} />
            {isMain ? 'Starred' : 'Star Photo'}
          </button>
          
          <button 
            onClick={handleSaveMetaOnly}
            className="flex-1 py-3 bg-cow-accent text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
