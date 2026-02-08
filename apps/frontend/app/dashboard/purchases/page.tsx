import { PurchaseCard } from '@/components/dashboard/purchase-card';

interface Purchase {
  id: string;
  product: {
    name: string;
  };
  amount: string;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
}

async function getPurchases(page = 1, limit = 20) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(
      `${apiUrl}/users/purchases?page=${page}&limit=${limit}`,
      {
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return { purchases: [], error: 'Failed to fetch purchases' };
    }

    const data = await response.json();
    return { purchases: data.data || data, error: null };
  } catch (error) {
    console.error('Purchases error:', error);
    return { purchases: [], error: 'Failed to connect to server' };
  }
}

export default async function PurchasesPage() {
  const { purchases, error } = await getPurchases();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Purchase History</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and manage all your purchases
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
              Completed
            </button>
            <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Pending
            </button>
            <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Refunded
            </button>
          </div>

          {/* Purchases list */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            {purchases && purchases.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {purchases.map((purchase: Purchase) => (
                  <PurchaseCard
                    key={purchase.id}
                    id={purchase.id}
                    productName={purchase.product?.name || 'Unknown Product'}
                    amount={purchase.amount}
                    currency={purchase.currency}
                    status={purchase.status}
                    createdAt={purchase.createdAt}
                  />
                ))}
              </ul>
            ) : (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-gray-500">No purchases found</p>
                <a
                  href="/checkout"
                  className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Browse products →
                </a>
              </div>
            )}
          </div>

          {/* Pagination */}
          {purchases && purchases.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to{' '}
                <span className="font-medium">{purchases.length}</span> of{' '}
                <span className="font-medium">{purchases.length}</span> results
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
