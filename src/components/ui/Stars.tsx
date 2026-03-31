import React from 'react';
import { Star } from 'lucide-react';

interface StarsProps {
  count: number;
}

export const Stars: React.FC<StarsProps> = ({ count }) => {
  return (
    <div className="flex text-orange-400 drop-shadow-sm">
      {[...Array(count)].map((_, i) => (
        <Star
          key={i}
          size={16}
          className="fill-current"
        />
      ))}
    </div>
  );
};
