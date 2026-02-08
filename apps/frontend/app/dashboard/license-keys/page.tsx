import { LicenseKeyCard } from '@/components/dashboard/license-key-card';

interface LicenseKey {
  id: string;
  keyString: string;
  product: {
    name: string;
  };
  status: 'AVAILABLE' | 'SOLD' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  activations: number;
  maxActivations: number;
  expiresAt: string | null;
}

async function getLicenseKeys(page = 1, limit = 20) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(
      `${apiUrl}/users/license-keys?page=${page}&limit=${limit}`,
      {
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return { licenseKeys: [], error: 'Failed to fetch license keys' };
    }

    const data = await response.json();
    return { licenseKeys: data.data || data, error: null };
  } catch (error) {
    console.error('License keys error:', error);
    return { licenseKeys: [], error: 'Failed to connect to server' };
  }
}

export default async function LicenseKeysPage() {
  const { licenseKeys, error } = await getLicenseKeys();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">License Keys</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your software license keys
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              All
            </button>
            <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Active
            </button>
            <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Expired
            </button>
            <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Revoked
            </button>
          </div>

          {/* License keys grid */}
          {licenseKeys && licenseKeys.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {licenseKeys.map((key: LicenseKey) => (
                <LicenseKeyCard
                  key={key.id}
                  id={key.id}
                  keyString={key.keyString}
                  productName={key.product.name}
                  status={key.status}
                  activations={key.activations}
                  maxActivations={key.maxActivations}
                  expiresAt={key.expiresAt || undefined}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-gray-500">No license keys found</p>
                <a
                  href="/checkout"
                  className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Purchase a license →
                </a>
              </div>
            </div>
          )}

          {/* Pagination */}
          {licenseKeys && licenseKeys.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to{' '}
                <span className="font-medium">{licenseKeys.length}</span> of{' '}
                <span className="font-medium">{licenseKeys.length}</span> results
              </p>
              <nav className="flex gap-2">
                <button
                  disabled
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
}
