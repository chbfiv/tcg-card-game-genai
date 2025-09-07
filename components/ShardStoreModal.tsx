import React from 'react';

interface ShardStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShardStoreModal: React.FC<ShardStoreModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-80 flex justify-center items-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-title"
    >
      <div
        className="bg-gray-800 rounded-xl shadow-2xl p-8 max-w-lg w-full transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="store-title" className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500 mb-4">
          Image Shard Store
        </h2>
        <p className="text-gray-400 text-center mb-8">
          This is a mock store for demonstration purposes. In a real application, this would integrate with a payment provider.
        </p>

        <div className="space-y-4">
          {/* Shard Packages */}
          <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border-2 border-gray-600">
            <div>
              <p className="text-xl font-semibold text-white">500 Shards</p>
              <p className="text-gray-400">Basic Crystal Pack</p>
            </div>
            <button className="bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg opacity-50 cursor-not-allowed" disabled>
              $4.99
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border-2 border-cyan-500 shadow-lg shadow-cyan-500/20">
            <div>
              <p className="text-xl font-semibold text-white">1200 Shards <span className="text-sm text-cyan-400">(+20% Bonus!)</span></p>
              <p className="text-gray-400">Geode Bundle</p>
            </div>
            <button className="bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg opacity-50 cursor-not-allowed" disabled>
              $9.99
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border-2 border-gray-600">
            <div>
              <p className="text-xl font-semibold text-white">3000 Shards</p>
              <p className="text-gray-400">Mountain of Power</p>
            </div>
            <button className="bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg opacity-50 cursor-not-allowed" disabled>
              $19.99
            </button>
          </div>
        </div>
        
        <div className="text-center mt-8">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white font-bold py-2 px-8 rounded-lg hover:bg-gray-500 transition-colors"
            aria-label="Close store"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShardStoreModal;
