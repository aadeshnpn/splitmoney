'use client';

import React from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const colors = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#14b8a6', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
];

function getDetermininsticColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const bg = getDetermininsticColor(name);
  
  return (
    <div 
      className={`avatar avatar-${size}`}
      style={{ backgroundColor: src ? 'transparent' : bg }}
      title={name}
    >
      {src ? (
        <img src={src} alt={name} className="avatar-img" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}
export default Avatar;
