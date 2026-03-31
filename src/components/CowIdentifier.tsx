import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Camera, Sparkles, X, ChevronRight, ChevronLeft, Check, RotateCcw } from 'lucide-react';
import type { CowBreed } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface CowIdentifierProps {
  breeds: CowBreed[];
  onSelectBreed: (breed: CowBreed, photoBlob?: Blob) => void;
  onQuit: () => void;
}

type QuestionKey = 
  | 'pattern' 
  | 'mainColor' 
  | 'secondaryColor' 
  | 'hump' 
  | 'fluffy' 
  | 'horns' 
  | 'special' 
  | 'region' 
  | 'specialLocation' 
  | 'dairy' 
  | 'hybrid';

interface Question {
  id: QuestionKey;
  text: string;
  column: keyof CowBreed | 'dairy' | 'hybrid';
  type: 'choice' | 'boolean';
  skipIf?: (answers: Partial<Record<QuestionKey, string>>) => boolean;
}

const QUESTIONS: Question[] = [
  { id: 'pattern', text: "What is the cow's pattern?", column: 'pattern', type: 'choice' },
  { id: 'mainColor', text: "What main color is the cow's body?", column: 'mainColor', type: 'choice' },
  { 
    id: 'secondaryColor', 
    text: "What secondary color is the cow's body?", 
    column: 'secondaryColor', 
    type: 'choice',
    skipIf: (answers) => answers.pattern === 'solid'
  },
  { id: 'hump', text: "Does the cow have a notable hump above her neck?", column: 'hump', type: 'choice' },
  { id: 'fluffy', text: "Is the cow notably fluffy?", column: 'fluffy', type: 'choice' },
  { id: 'horns', text: "Does the cow have unique horns?", column: 'horns', type: 'choice' },
  { id: 'special', text: "Does the cow have any of these special characteristics?", column: 'special', type: 'choice' },
  { id: 'region', text: "What region was this cow found in?", column: 'primaryRegion', type: 'choice' },
  { id: 'specialLocation', text: "Was the cow found in a special location?", column: 'specialLocation', type: 'choice' },
  { id: 'dairy', text: "Was this cow at a dairy farm?", column: 'dairy', type: 'boolean' },
  { id: 'hybrid', text: "Is this cow a hybrid cow?", column: 'hybrid', type: 'boolean' },
];

export const CowIdentifier: React.FC<CowIdentifierProps> = ({ breeds, onSelectBreed, onQuit }) => {
  const [step, setStep] = useState<number>(-1); // -1 is the pre-quiz page
  const [answers, setAnswers] = useState<Partial<Record<QuestionKey, string>>>({});
  const [uploadedPhoto, setUploadedPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (uploadedPhoto) {
      const url = URL.createObjectURL(uploadedPhoto);
      setPhotoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [uploadedPhoto]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedPhoto(file);
    }
  };

  // Extract unique options for each question from the breeds data
  const optionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    
    QUESTIONS.forEach(q => {
      if (q.type === 'choice') {
        const options = new Set<string>();
        breeds.forEach(breed => {
          const val = breed[q.column as keyof CowBreed];
          if (typeof val === 'string' && val) {
            // Split by comma or slash
            val.split(/[,/]/).forEach(s => {
              const trimmed = s.trim().toLowerCase();
              if (trimmed && trimmed !== 'none' && trimmed !== 'no') {
                map[q.id] = map[q.id] || [];
                // Capitalize for display
                const display = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
                options.add(display);
              }
            });
          }
        });
        map[q.id] = Array.from(options).sort();
      }
    });
    
    return map;
  }, [breeds]);

  const currentQuestion = step >= 0 ? QUESTIONS[step] : null;

  const nextStep = () => {
    let next = step + 1;
    while (next < QUESTIONS.length && QUESTIONS[next].skipIf?.(answers)) {
      next++;
    }
    setStep(next);
  };

  const prevStep = () => {
    if (step === -1) return;
    let prev = step - 1;
    while (prev >= 0 && QUESTIONS[prev].skipIf?.(answers)) {
      prev--;
    }
    setStep(prev);
  };

  const handleAnswer = (val: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion!.id]: val }));
    nextStep();
  };

  const topCows = useMemo(() => {
    if (step < QUESTIONS.length) return [];

    const scores = breeds.map(breed => {
      let score = 0;
      QUESTIONS.forEach(q => {
        const answer = answers[q.id];
        if (!answer) return;

        if (q.type === 'boolean') {
          const isTrue = answer === 'Yes';
          if (q.id === 'dairy') {
            if (isTrue && (breed.isDairy || breed.isDual)) score += 1;
            if (!isTrue && (!breed.isDairy && !breed.isDual)) score += 0.5;
          } else if (q.id === 'hybrid') {
            if (isTrue && breed.hybrid) score += 1;
            if (!isTrue && !breed.hybrid) score += 1;
          }
        } else {
          const val = breed[q.column as keyof CowBreed] as string;
          if (val) {
            const vals = val.toLowerCase().split(/[,/]/).map(s => s.trim());
            if (vals.includes(answer.toLowerCase())) {
              score += 1;
            }
          }
        }
      });
      return { breed, score };
    });

    return scores
      .sort((a, b) => b.score - a.score || b.breed.rarity - a.breed.rarity)
      .slice(0, 5);
  }, [breeds, answers, step]);

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] text-white overflow-hidden relative">
      {/* Quiz Area */}
      <div className={cn(
        "bg-white text-cow-text flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all duration-700 overflow-hidden",
        step === -1 ? "h-0" : "flex-1 rounded-b-3xl p-6"
      )}>
        {step >= 0 && step < QUESTIONS.length ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <button onClick={prevStep} className="p-2 -ml-2 text-cow-accent disabled:opacity-30" disabled={step === 0}>
                <ChevronLeft size={24} />
              </button>
              <div className="flex-1 text-center">
                <div className="text-[10px] font-bold uppercase tracking-widest text-cow-accent/60 mb-1">
                  Step {step + 1} of {QUESTIONS.length}
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden w-24 mx-auto">
                  <div 
                    className="h-full bg-cow-accent transition-all duration-300" 
                    style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
                  />
                </div>
              </div>
              <button onClick={onQuit} className="p-2 -mr-2 text-cow-accent">
                <X size={24} />
              </button>
            </div>

            <h3 className="text-xl font-bold mb-6 text-center leading-tight">
              {currentQuestion?.text}
            </h3>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-6">
              {currentQuestion?.type === 'choice' ? (
                <>
                  {optionsMap[currentQuestion.id]?.map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      className="w-full text-left p-4 rounded-xl border-2 border-orange-100 bg-orange-50/30 hover:bg-orange-50 hover:border-cow-accent transition-all font-bold flex justify-between items-center group"
                    >
                      {opt}
                      <ChevronRight size={18} className="text-cow-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                  <button
                    onClick={() => handleAnswer('None/Other')}
                    className="w-full text-left p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-500 transition-all font-bold"
                  >
                    None / Other
                  </button>
                </>
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={() => handleAnswer('Yes')}
                    className="flex-1 py-12 rounded-2xl border-2 border-orange-100 bg-green-50/30 hover:bg-green-50 hover:border-green-500 transition-all font-bold text-xl flex flex-col items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <Check size={24} strokeWidth={3} />
                    </div>
                    Yes
                  </button>
                  <button
                    onClick={() => handleAnswer('No')}
                    className="flex-1 py-12 rounded-2xl border-2 border-orange-100 bg-red-50/30 hover:bg-red-50 hover:border-red-500 transition-all font-bold text-xl flex flex-col items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                      <X size={24} strokeWidth={3} />
                    </div>
                    No
                  </button>
                </div>
              )}
            </div>
          </>
        ) : step >= QUESTIONS.length ? (
          <div className="flex-1 flex flex-col">
             <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-cow-accent">Predictions</h3>
              <button onClick={() => { setStep(-1); setAnswers({}); }} className="flex items-center gap-1 text-sm font-bold text-cow-text opacity-50">
                <RotateCcw size={16} /> Reset
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-6">
              {topCows.map(({ breed, score }) => (
                <div 
                  key={breed.id}
                  onClick={() => onSelectBreed(breed, uploadedPhoto || undefined)}
                  className="bg-white border-2 border-orange-100 rounded-2xl p-4 flex gap-4 cursor-pointer hover:border-cow-accent hover:shadow-lg transition-all"
                >
                  <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-orange-50">
                    <img 
                      src={breed.localImagePath || breed.imageUrl} 
                      className="w-full h-full object-cover" 
                      alt={breed.name} 
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="font-bold text-lg truncate">{breed.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400" 
                          style={{ width: `${(score / QUESTIONS.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">Match</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={onQuit}
              className="w-full py-4 bg-cow-accent text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all mt-auto"
            >
              Done Identifying
            </button>
          </div>
        ) : null}
      </div>

      {/* Background/Crystal Ball Area */}
      <div className={cn(
        "relative transition-all duration-700 flex items-center justify-center overflow-hidden",
        step === -1 ? "flex-1" : "h-1/3"
      )}>
        <CrystalBall 
          photoUrl={photoUrl} 
          isSmall={step !== -1} 
          breeds={breeds}
        />
        
        {step === -1 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
            <h2 className="text-3xl font-bold mb-4 drop-shadow-lg">Breed Seer</h2>
            <p className="text-blue-200 mb-8 max-w-xs">Look into the ball to identify your spotted cow...</p>
            
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold transition-all active:scale-95 shadow-xl"
              >
                <Camera size={20} />
                {uploadedPhoto ? 'Change Photo' : 'Upload Photo'}
              </button>
              <button 
                onClick={() => setStep(0)}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 py-3 rounded-lg font-bold backdrop-blur-md border border-white/20 transition-all active:scale-95 shadow-xl"
              >
                <Sparkles size={20} className="text-yellow-400" />
                Start Identifying
              </button>
              <button 
                onClick={onQuit}
                className="text-white/50 text-sm mt-4 hover:text-white"
              >
                Cancel
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoUpload}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const CrystalBall: React.FC<{ photoUrl: string | null, isSmall: boolean, breeds: CowBreed[] }> = ({ photoUrl, isSmall, breeds }) => {
  const [orbitCows, setOrbitCows] = useState<Array<{ id: string, img: string, angle: number, speed: number, distance: number, size: number }>>([]);
  
  useEffect(() => {
    // Generate random cows for orbit
    const count = 4;
    const items = [];
    
    // Weight by rarity: 1 is common (60% weight), 6 is rare (5% weight)
    const weightedBreeds = breeds.flatMap(b => {
      const weight = Math.max(1, 7 - b.rarity);
      return Array(weight).fill(b);
    });

    for (let i = 0; i < count; i++) {
      const breed = weightedBreeds[Math.floor(Math.random() * weightedBreeds.length)];
      items.push({
        id: breed.id + Math.random(),
        img: breed.localImagePath || breed.imageUrl || '',
        angle: (i / count) * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.01,
        distance: 120 + Math.random() * 40,
        size: 40 + Math.random() * 20
      });
    }
    setOrbitCows(items);
  }, [breeds]);

  // Animation loop for orbit
  const requestRef = useRef<number>(null);
  const [angles, setAngles] = useState<number[]>([]);

  const animate = () => {
    setAngles(prev => orbitCows.map((c, i) => (prev[i] || c.angle) + c.speed));
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [orbitCows]);

  return (
    <div className={cn(
      "relative transition-all duration-700",
      isSmall ? "scale-50 translate-y-4" : "scale-100"
    )}>
      {/* Glow */}
      <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full" />
      
      {/* Orbiting Cows */}
      {orbitCows.map((cow, i) => {
        const angle = angles[i] || cow.angle;
        const x = Math.cos(angle) * cow.distance;
        const z = Math.sin(angle); // -1 to 1 for depth
        const scale = 0.7 + (z + 1) * 0.3; // z is -1 (back) to 1 (front)
        const opacity = z < -0.5 ? 0 : (z + 0.5) * 2; // fade out when going behind
        
        return (
          <div 
            key={cow.id}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300"
            style={{ 
              transform: `translate(calc(-50% + ${x}px), -50%) scale(${scale})`,
              zIndex: z > 0 ? 20 : 0,
              opacity: Math.min(1, opacity)
            }}
          >
            <div className="w-12 h-12 rounded-full border-2 border-white/50 overflow-hidden shadow-xl">
              <img src={cow.img} className="w-full h-full object-cover" alt="cow" />
            </div>
          </div>
        );
      })}

      {/* The Ball */}
      <div className="relative w-48 h-48 rounded-full overflow-hidden shadow-[inset_0_0_50px_rgba(255,255,255,0.5),0_0_30px_rgba(66,135,245,0.5)] bg-gradient-to-br from-blue-400/20 to-purple-600/30 backdrop-blur-sm flex items-center justify-center border border-white/30">
        <img 
          src="/images/ball.png" 
          className="w-full h-full object-cover mix-blend-overlay opacity-80" 
          alt="crystal ball" 
        />
        
        {/* Uploaded Photo Overlay */}
        {photoUrl && (
          <div className="absolute inset-4 rounded-full overflow-hidden border-2 border-white/30 shadow-inner">
            <img src={photoUrl} className="w-full h-full object-cover" alt="uploaded" />
          </div>
        )}

        {/* Inner Glow/Sparkle */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4)_0%,transparent_50%)]" />
      </div>
    </div>
  );
};
