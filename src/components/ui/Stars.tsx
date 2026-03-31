import React from 'react';
import { Star } from 'lucide-react';

interface StarsProps {
  count: number;
  size?: number;
}

export const Stars: React.FC<StarsProps> = ({ count, size = 16 }) => {
  return (
    <div className="flex text-orange-400 drop-shadow-sm">
      {[...Array(count)].map((_, i) => (
        <Star
          key={i}
          size={size}
          className="fill-current"
        />
      ))}
    </div>
  );
};
