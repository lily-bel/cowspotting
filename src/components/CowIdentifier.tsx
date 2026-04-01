import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Camera, Sparkles, X, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';
import type { CowBreed } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { US_STATES, isStateInRegion, isColorMatch, isPatternMatch, COLOR_GROUPS, COLOR_GROUP_MAP } from '../utils/cowLogic';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CowIdentifierProps {
  breeds: CowBreed[];
  mainPhotoUrls?: Record<string, string>;
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
  column: keyof CowBreed | 'isDairy' | 'hybrid';
  type: 'choice';
  extraOptions?: string[]; // "No", "Don't Know"
  staticOptions?: string[]; // For Dairy/Hybrid/States
  skipIf?: (answers: Partial<Record<QuestionKey, string>>) => boolean;
  ignoreSlash?: boolean;
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
  { id: 'hump', text: "Does the cow have a notable hump above her neck?", column: 'hump', type: 'choice', extraOptions: ['No'] },
  { id: 'fluffy', text: "Is the cow notably fluffy?", column: 'fluffy', type: 'choice', extraOptions: ['No'] },
  { id: 'special', text: "Does the cow have any of these special characteristics?", column: 'special', type: 'choice', extraOptions: ['No'] },
  { id: 'region', text: "In which US state was this cow found?", column: 'primaryRegion', type: 'choice', staticOptions: US_STATES, extraOptions: ["Don't Know"] },
  { id: 'specialLocation', text: "Was the cow found in a special location?", column: 'specialLocation', type: 'choice', extraOptions: ['No'], ignoreSlash: true },
  { id: 'dairy', text: "Was this cow at a dairy farm?", column: 'isDairy', type: 'choice', staticOptions: ['Yes', 'No', "Don't Know"] },
  { id: 'hybrid', text: "Is this cow a hybrid cow?", column: 'hybrid', type: 'choice', staticOptions: ['Yes', 'No', "Don't Know"] },
];

const OPTION_IMAGES: Record<string, string> = {
  // Patterns
  'solid': '/images/solid.jpg',
  'spotted': '/images/spotted.jpg',
  'points': '/images/points.jpg',
  'belted': '/images/belted.jpg',
  'white face': '/images/white face.jpg',
  'white face + neck': '/images/white face + neck.jpg',
  'ombre': '/images/ombre.jpg',
  'lineback': '/images/lineback.jpg',
  'roan': '/images/roan.jpg',
  'speckled': '/images/speckled.jpg',
  'brindle': '/images/tiger stripe.jpg',
};

export const CowIdentifier: React.FC<CowIdentifierProps> = ({ breeds, mainPhotoUrls, onSelectBreed, onQuit }) => {
  const [step, setStep] = useState<number>(-1); 
  const [answers, setAnswers] = useState<Partial<Record<QuestionKey, string>>>({});
  const [uploadedPhoto, setUploadedPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (uploadedPhoto) {
      const url = URL.createObjectURL(uploadedPhoto);
      setPhotoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [uploadedPhoto]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
  }, [step]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedPhoto(file);
    }
  };

  const optionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    const counts: Record<string, Record<string, number>> = {};

    QUESTIONS.forEach(q => {
      if (q.staticOptions) {
        map[q.id] = q.staticOptions;
        return;
      }

      counts[q.id] = {};
      breeds.forEach(breed => {
        const val = breed[q.column as keyof CowBreed];
        if (typeof val === 'string' && val) {
          const splitRegex = q.ignoreSlash ? /[,]/ : /[,/]/;
          val.split(splitRegex).forEach(s => {
            let trimmed = s.trim();
            if (trimmed && trimmed.toLowerCase() !== 'none' && trimmed.toLowerCase() !== 'no' && trimmed.toLowerCase() !== 'various') {
              if (q.id === 'mainColor' || q.id === 'secondaryColor') {
                const groupLabel = COLOR_GROUP_MAP[trimmed.toLowerCase()];
                if (groupLabel) {
                  trimmed = groupLabel;
                }
              }

              if (trimmed.toLowerCase().includes('specialty farm')) {
                trimmed = 'Specialty Farm';
              }
              counts[q.id][trimmed] = (counts[q.id][trimmed] || 0) + 1;
            }
          });
        }
      });

      let sortedTraitOptions = Object.keys(counts[q.id]).sort((a, b) => {
        // For secondary color, use the frequency counts of the main color to determine order
        const countId = (q.id === 'secondaryColor' && counts['mainColor']) ? 'mainColor' : q.id;
        const freqDiff = (counts[countId][b] || 0) - (counts[countId][a] || 0);
        if (freqDiff !== 0) return freqDiff;
        return a.localeCompare(b);
      });

      // NO OVERRIDE: For Hump, Fluffy, Horns, "No" goes AFTER the traits
      if (q.id === 'hump') {
        const order = ['Yes', 'Slight'];
        sortedTraitOptions = sortedTraitOptions.sort((a, b) => order.indexOf(a) - order.indexOf(b));
        map[q.id] = [...sortedTraitOptions, 'No'];
      } else if (q.id === 'fluffy') {
        const order = ['Very Fluffy', 'Fluffy Head', 'Thick Coat'];
        sortedTraitOptions = sortedTraitOptions.sort((a, b) => {
          const ai = order.indexOf(a);
          const bi = order.indexOf(b);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return 0;
        });
        map[q.id] = [...sortedTraitOptions, 'No'];
      } else {
        // DEFAULT: No at top, traits after
        // Special case: specialLocation also wants 'No' at the bottom
        if (q.id === 'specialLocation') {
          map[q.id] = [...sortedTraitOptions, 'No'];
        } else {
          const topExtras = (q.extraOptions || []).filter(o => o === 'No');
          map[q.id] = [...topExtras, ...sortedTraitOptions];
        }
      }

      // Consistently put "Don't Know" at the absolute bottom
      if (q.extraOptions?.includes("Don't Know")) {
        map[q.id] = [...map[q.id].filter(o => o !== "Don't Know"), "Don't Know"];
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
      let totalWeightedScore = 0;
      let totalPossibleWeight = 0;

      QUESTIONS.forEach(q => {
        const answer = answers[q.id];
        if (!answer || answer === "Don't Know") return;

        // Determine Weight
        let weight = 1.0;
        if (q.id === 'hump') {
          weight = 2.0;
        } else if (q.id === 'fluffy') {
          weight = answer.toLowerCase() === 'thick coat' ? 1.0 : 2.0;
        } else if (q.id === 'pattern' || q.id === 'dairy') {
          weight = 1.5;
        }

        totalPossibleWeight += weight;

        const ansLower = answer.toLowerCase();
        let matchScore = 0;

        // Handle State dropdown scoring
        if (q.id === 'region' && answer !== "Don't Know") {
          matchScore = isStateInRegion(answer, breed.primaryRegion || '');
        } 
        // Handle static options (Dairy/Hybrid)
        else if (q.staticOptions && (q.id === 'dairy' || q.id === 'hybrid')) {
          const isYes = answer === 'Yes';
          if (q.id === 'dairy') {
            if (isYes && (breed.isDairy || breed.isDual)) matchScore = 1;
            else if (!isYes && (!breed.isDairy && !breed.isDual)) matchScore = 1;
          } else if (q.id === 'hybrid') {
            if (isYes && breed.hybrid) matchScore = 1;
            else if (!isYes && !breed.hybrid) matchScore = 1;
          }
        }
        else {
          const val = (breed[q.column as keyof CowBreed] as string || '').toLowerCase();
          const splitRegex = q.ignoreSlash ? /[,]/ : /[,/]/;
          const vals = val.split(splitRegex).map(s => s.trim()).map(v => v.includes('specialty farm') ? 'specialty farm' : v);

          if (vals.includes(ansLower) || (ansLower === 'no' && (val === '' || val === 'none'))) {
            matchScore = 1;
          } else if (ansLower !== 'no') {
            if (q.id === 'mainColor' || q.id === 'secondaryColor') {
              matchScore = isColorMatch(ansLower, breed);
            }
            else if (q.id === 'hump') {
              if (ansLower === 'slight' && vals.includes('yes')) matchScore = 0.5;
              if (ansLower === 'yes' && vals.includes('slight')) matchScore = 0.5;
            }
            else if (q.id === 'fluffy') {
              if (ansLower === 'no' && vals.includes('thick coat')) matchScore = 0.5;
            }
            else if (q.id === 'pattern') {
              matchScore = isPatternMatch(ansLower, breed.pattern || '');
            }
            else if (q.id === 'specialLocation') {
              if (ansLower === 'specialty farm' && vals.includes('hobby/show')) matchScore = 0.5;
              if (ansLower === 'hobby/show' && vals.includes('specialty farm')) matchScore = 0.5;
            }
          }
        }

        totalWeightedScore += (matchScore * weight);
      });

      const rarityBonus = (7 - breed.rarity) * 0.02;
      const finalScore = totalPossibleWeight > 0 
        ? (totalWeightedScore / totalPossibleWeight) * 10 
        : 0;

      return { breed, score: finalScore + rarityBonus };
    });

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
  }, [breeds, answers, step]);

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] text-white overflow-hidden relative">
      <div className={cn(
        "bg-white text-cow-text flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all duration-700 overflow-hidden shrink-0",
        step === -1 ? "h-0" : "flex-1 rounded-b-3xl"
      )}>
        {step >= 0 && step < QUESTIONS.length ? (
          <div className="flex flex-col h-full p-6">
            <div className="flex justify-between items-center mb-6 shrink-0">
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

            <h3 className="text-xl font-bold mb-6 text-center leading-tight shrink-0">
              {currentQuestion?.text}
            </h3>

            <div ref={scrollAreaRef} className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-6">
              {optionsMap[currentQuestion!.id]?.map(opt => {
                const isColor = currentQuestion!.id === 'mainColor' || currentQuestion!.id === 'secondaryColor';
                const colorGroup = isColor ? Object.values(COLOR_GROUPS).find(g => g.label === opt) : null;
                const showImage = (currentQuestion!.id === 'pattern') && OPTION_IMAGES[opt.toLowerCase()];
                
                return (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border-2 transition-all font-bold flex items-center gap-4 group",
                      (opt === "Don't Know") 
                        ? "border-dashed border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500" 
                        : "border-orange-100 bg-orange-50/30 hover:bg-orange-50 hover:border-cow-accent"
                    )}
                  >
                    {showImage && (
                      <div className="w-20 aspect-[4/3] rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-orange-100/50">
                        <img src={OPTION_IMAGES[opt.toLowerCase()]} className="w-full h-full object-cover" alt={opt} />
                      </div>
                    )}
                    {colorGroup && (
                      <div 
                        className="w-20 aspect-[4/3] rounded-lg shrink-0 border border-black/10 shadow-inner" 
                        style={{ backgroundColor: colorGroup.hex }}
                      />
                    )}
                    <span className="flex-1">{opt}</span>
                    <ChevronRight size={18} className="text-cow-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : step >= QUESTIONS.length ? (
          <div className="flex flex-col h-full p-6">
             <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-bold text-cow-accent">Predictions</h3>
              <button onClick={() => { setStep(-1); setAnswers({}); }} className="flex items-center gap-1 text-sm font-bold text-cow-text opacity-50">
                <RotateCcw size={16} /> Reset
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-6 min-h-0">
              {topCows.map(({ breed, score }) => (
                <div 
                  key={breed.id}
                  onClick={() => onSelectBreed(breed, uploadedPhoto || undefined)}
                  className="bg-white border-2 border-orange-100 rounded-2xl p-4 flex gap-4 cursor-pointer hover:border-cow-accent hover:shadow-lg transition-all"
                >
                  <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-orange-50">
                    <img 
                      src={(mainPhotoUrls && mainPhotoUrls[breed.id]) || breed.localImagePath} 
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
                          style={{ width: `${Math.min(100, (score / 10) * 100)}%` }}
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
              className="w-full py-4 bg-cow-accent text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all mt-4 shrink-0"
            >
              Done Identifying
            </button>
          </div>
        ) : null}
      </div>

      <div className={cn(
        "relative transition-all duration-700 flex items-center justify-center overflow-hidden",
        step === -1 ? "flex-1" : "h-[30vh]"
      )}>
        <CrystalBall 
          photoUrl={photoUrl} 
          isSmall={step !== -1} 
          breeds={breeds}
          mainPhotoUrls={mainPhotoUrls}
        />
        
        {step === -1 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
            <h2 className="text-3xl font-bold mb-4 drop-shadow-lg">Cow Scrying</h2>
            <p className="text-blue-200 mb-8 max-w-xs">Describe a cow to find likely breeds</p>            
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

const CrystalBall: React.FC<{ photoUrl: string | null, isSmall: boolean, breeds: CowBreed[], mainPhotoUrls?: Record<string, string> }> = ({ photoUrl, isSmall, breeds, mainPhotoUrls }) => {
  const [orbitCows, setOrbitCows] = useState<Array<{ id: string, img: string, angle: number, speed: number, distance: number, size: number, yOffset: number, ySpeed: number }>>([]);
  
  useEffect(() => {
    const count = 4;
    const items = [];
    const weightedBreeds = breeds.flatMap(b => {
      const weight = Math.max(1, 7 - b.rarity);
      return Array(weight).fill(b);
    });

    for (let i = 0; i < count; i++) {
      const breed = weightedBreeds[Math.floor(Math.random() * weightedBreeds.length)];
      items.push({
        id: breed.id + Math.random(),
        img: (mainPhotoUrls && mainPhotoUrls[breed.id]) || breed.localImagePath || '',
        angle: (i / count) * Math.PI * 2,
        speed: 0.005 + Math.random() * 0.01,
        distance: 120 + Math.random() * 40,
        size: 40 + Math.random() * 20,
        yOffset: Math.random() * Math.PI * 2,
        ySpeed: 0.01 + Math.random() * 0.02
      });
    }
    setOrbitCows(items);
  }, [breeds, mainPhotoUrls]);

  const requestRef = useRef<number>(null);
  const [frame, setFrame] = useState(0);

  const animate = () => {
    setFrame(f => f + 1);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  return (
    <div className={cn(
      "relative transition-all duration-700",
      isSmall ? "scale-50 translate-y-4" : "scale-100"
    )}>
      <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full" />
      
      {orbitCows.map((cow) => {
        const angle = cow.angle + frame * cow.speed;
        const x = Math.cos(angle) * cow.distance;
        const z = Math.sin(angle); 
        const yVariation = Math.sin(cow.yOffset + frame * cow.ySpeed) * 20;
        const scale = 0.7 + (z + 1) * 0.3; 
        const opacity = z < -0.5 ? 0 : (z + 0.5) * 2; 
        
        return (
          <div 
            key={cow.id}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300"
            style={{ 
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${yVariation}px)) scale(${scale})`,
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

      <div className="relative w-48 h-48 rounded-full overflow-hidden shadow-[inset_0_0_50px_rgba(255,255,255,0.5),0_0_30px_rgba(66,135,245,0.5)] bg-gradient-to-br from-blue-400/20 to-purple-600/30 backdrop-blur-sm flex items-center justify-center border border-white/30">
        <img 
          src="/images/ball.png" 
          className="w-full h-full object-cover mix-blend-overlay opacity-80" 
          alt="crystal ball" 
        />
        
        {photoUrl && (
          <div className="absolute inset-4 rounded-full overflow-hidden border-2 border-white/30 shadow-inner">
            <img src={photoUrl} className="w-full h-full object-cover" alt="uploaded" />
          </div>
        )}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4)_0%,transparent_50%)]" />
      </div>
    </div>
  );
};
