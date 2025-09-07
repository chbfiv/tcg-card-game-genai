import React from 'react';

const ShardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-label="Image Shard Icon"
    role="img"
  >
    <path d="M12.001 2.503l-8.484 8.484c-.452.452-.452 1.186 0 1.638l8.484 8.484c.452.452 1.186.452 1.638 0l8.484-8.484c.452-.452.452-1.186 0-1.638l-8.484-8.484c-.452-.452-1.186-.452-1.638 0zM9.505 8.52h5.01v2.004h-5.01V8.52zm0 5.01h5.01v2.004h-5.01v-2.004z" />
  </svg>
);

export default ShardIcon;
