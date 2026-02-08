'use client';

import { useEffect, useState } from 'react';

interface KeyStats {
  total: number;
  available: number;
  sold: number;
  active: number;
  revoked: number;
  expired: number;
}

interface LicenseKey {
  id: string;
  keyString: string;
  productId: string;
  status: string;
  activations: number;
  maxActivations: number;
  expiresAt: string | null;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function LicenseKeysPage() {
  const [stats, setStats] = useState<KeyStats>({
    total: 0,
    available: 0,
    sold: 0,
    active: 0,
    revoked: 0,
    expired: 0,
  });
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchStats();
    fetchKeys();
    fetchProducts();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/license-keys/stats/summary`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/license-keys?page=1&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setKeys(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/products`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const handleGenerate = async (productId: string, count: number) => {
    try {
      const response = await fetch(`${API_BASE}/license-keys/generate/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, count }),
      });

      if (response.ok) {
        alert(`Successfully generated ${count} keys`);
        fetchStats();
        fetchKeys();
      } else {
        const error = await response.json();
        alert(`Failed to generate keys: ${error.message}`);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate keys');
    }
  };

  const handleExport = () => {
    const csv = [
      ['Key', 'Status', 'Activations', 'Max Activations', 'Expires', 'Created'].join(','),
      ...keys.map((key) =>
        [
          key.keyString,
          key.status,
          key.activations,
          key.maxActivations,
          key.expiresAt || 'Never',
          new Date(key.createdAt).toLocaleDateString(),
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license-keys-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">License Key Management</h1>

      <div className="space-y-6">
        <KeyStatistics stats={stats} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LicenseKeyGenerator products={products} onGenerate={handleGenerate} />
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={fetchStats}
                className="w-full px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-left"
              >
                🔄 Refresh Statistics
              </button>
              <button
                onClick={fetchKeys}
                className="w-full px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-left"
              >
                🔄 Refresh Key List
              </button>
            </div>
          </div>
        </div>

        <KeyListTable keys={keys} loading={loading} onExport={handleExport} />
      </div>
    </div>
  );
}

// Import components (would normally be separate imports)
function KeyStatistics({ stats, loading }: { stats: KeyStats; loading?: boolean }) {
  const statCards = [
    { label: 'Total Keys', value: stats.total, color: 'bg-gray-100' },
    { label: 'Available', value: stats.available, color: 'bg-green-100' },
    { label: 'Sold', value: stats.sold, color: 'bg-blue-100' },
    { label: 'Active', value: stats.active, color: 'bg-purple-100' },
    { label: 'Revoked', value: stats.revoked, color: 'bg-red-100' },
    { label: 'Expired', value: stats.expired, color: 'bg-yellow-100' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <div key={stat.label} className={`${stat.color} rounded-lg p-4`}>
          <div className="text-sm text-gray-600">{stat.label}</div>
          <div className="text-2xl font-semibold">
            {loading ? '-' : stat.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

function LicenseKeyGenerator({
  products,
  onGenerate,
}: {
  products: Array<{ id: string; name: string }>;
  onGenerate: (productId: string, count: number) => Promise<void>;
}) {
  const [productId, setProductId] = useState('');
  const [count, setCount] = useState(100);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!productId || count <= 0) return;

    setGenerating(true);
    try {
      await onGenerate(productId, count);
      alert(`Generated ${count} keys successfully`);
    } catch (error) {
      console.error('Generation failed:', error);
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

function KeyListTable({
  keys,
  loading,
  onExport,
}: {
  keys: LicenseKey[];
  loading?: boolean;
  onExport?: () => void;
}) {
  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-800',
    SOLD: 'bg-blue-100 text-blue-800',
    ACTIVE: 'bg-purple-100 text-purple-800',
    REVOKED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-yellow-100 text-yellow-800',
  };

  if (loading) {
    return <div className="text-center py-8">Loading keys...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold">License Keys</h3>
        {onExport && (
          <button
            onClick={onExport}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Export CSV
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium">Key</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Activations</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Expires</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {keys.map((key) => (
              <tr key={key.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-sm">{key.keyString}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      statusColors[key.status] || 'bg-gray-100'
                    }`}
                  >
                    {key.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm">
                  {key.activations} / {key.maxActivations}
                </td>
                <td className="px-4 py-2 text-sm">
                  {key.expiresAt
                    ? new Date(key.expiresAt).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="px-4 py-2 text-sm">
                  {new Date(key.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {keys.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No license keys found
          </div>
        )}
      </div>
    </div>
  );
}
