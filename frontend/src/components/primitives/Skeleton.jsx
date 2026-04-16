import React from 'react';

const Skeleton = ({ width, height, className = '' }) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
    />
  );
};

export default Skeleton;