'use client';

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

interface KeyListTableProps {
  keys: LicenseKey[];
  loading?: boolean;
  onExport?: () => void;
}

export function KeyListTable({ keys, loading, onExport }: KeyListTableProps) {
  const statusColors = {
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
                      statusColors[key.status as keyof typeof statusColors]
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
