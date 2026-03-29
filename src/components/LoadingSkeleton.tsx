import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
  height?: string;
  width?: string;
  className?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  count = 1,
  height = 'h-4',
  width = 'w-full',
  className = '',
}) => {
  const skeletons = Array(count).fill(0);

  return (
    <>
      {skeletons.map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 rounded animate-pulse ${height} ${width} ${className} mb-2`}
        />
      ))}
    </>
  );
};

export default LoadingSkeleton;