import React from 'react';

const Card = ({
  children,
  hover = false,
  gradient = false,
  glow = false,
  className = '',
  onClick,
  ...props
}) => {
  const baseClasses = 'glass-strong rounded-2xl p-6';
  const hoverClasses = hover ? 'hover-lift cursor-pointer' : '';
  const glowClasses = glow ? 'hover-glow' : '';
  const gradientClasses = gradient
    ? 'border-2 border-transparent bg-clip-padding relative before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:bg-gradient-to-r before:from-primary before:to-accent before:p-[2px]'
    : '';

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${glowClasses} ${gradientClasses} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;