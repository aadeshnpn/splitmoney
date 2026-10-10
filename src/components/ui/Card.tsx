'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export function Card({ children, className = '', hoverable = false, ...props }: CardProps) {
  return (
    <div 
      className={`card ${hoverable ? 'hoverable' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
export default Card;
