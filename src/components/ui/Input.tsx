'use client';

import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  prefix?: string;
}

export function Input({
  label,
  error,
  icon,
  prefix,
  className = '',
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const hasValue = props.value !== undefined && props.value !== '' || props.defaultValue;
  
  return (
    <div className={`input-wrapper ${className}`}>
      {label && (
        <label 
          className="input-label" 
          style={{ 
            color: isFocused ? 'var(--accent)' : (error ? 'var(--danger)' : 'var(--text-secondary)')
          }}
        >
          {label}
        </label>
      )}
      <div className={`input-field-container ${error ? 'has-error' : ''}`}>
        {prefix && <div className="input-prefix">{prefix}</div>}
        <input
          className="input-field"
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {icon && <div className="input-icon">{icon}</div>}
      </div>
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  );
}
export default Input;
