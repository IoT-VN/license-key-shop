'use client';

import { useState } from 'react';

interface GenerateKeyFormProps {
  onGenerate: (productId: string, count: number) => Promise<void>;
  products: Array<{ id: string; name: string }>;
}

export function LicenseKeyGenerator({ onGenerate, products }: GenerateKeyFormProps) {
  const [productId, setProductId] = useState('');
  const [count, setCount] = useState(100);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    if (!productId || count <= 0) return;

    setGenerating(true);
    setProgress(0);

    try {
      await onGenerate(productId, count);
      setProgress(100);
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate keys');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Generate License Keys</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Product</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={generating}
            className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100"
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Number of Keys (max 10,000)
          </label>
          <input
            type="number"
            min="1"
            max="10000"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
            disabled={generating}
            className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100"
          />
        </div>

        {generating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Generating...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!productId || count <= 0 || generating}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {generating ? 'Generating...' : 'Generate Keys'}
        </button>
      </div>
    </div>
  );
}
