import React from 'react';
import clsx from 'clsx';
import { api } from '../../lib/api';

interface AvatarProps {
  photoUrl?: string;
  name?: string;
  className?: string;
}

export function Avatar({ photoUrl, name, className }: AvatarProps) {
  const initial = name ? name.charAt(0).toUpperCase() : 'U';

  return (
    <div 
      className={clsx(
        "flex items-center justify-center rounded-full bg-mono-text text-mono-bg font-bold overflow-hidden border border-mono-border shrink-0",
        className
      )}
    >
      {photoUrl ? (
        <img 
          src={photoUrl.startsWith('http') || photoUrl.startsWith('/') ? photoUrl : `${api.defaults.baseURL?.replace('/api/v1', '')}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`} 
          alt={name || "Avatar"} 
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
