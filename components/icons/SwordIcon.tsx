
import React from 'react';

const SwordIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M13.213 3.524a.75.75 0 01.373.648v5.845l4.336 2.502a.75.75 0 010 1.302l-4.336 2.503v5.845a.75.75 0 01-1.123.648L5.053 15.58a.75.75 0 010-1.302L12.463 8.04V4.172a.75.75 0 01.75-.648zM12.463 9.46a.75.75 0 01-.373-.648V6.639l-6.04 3.488a.75.75 0 000 1.302l6.04 3.488v-2.173a.75.75 0 01.373-.648l4.336-2.503a.75.75 0 000-1.302l-4.336-2.503z"
      clipRule="evenodd"
    />
  </svg>
);

export default SwordIcon;
