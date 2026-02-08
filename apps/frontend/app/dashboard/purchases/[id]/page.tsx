import Link from 'next/link';

interface Purchase {
  id: string;
  product: {
    id: string;
    name: string;
    description: string;
  };
  licenseKey?: {
    id: string;
    keyString: string;
    status: string;
  };
  amount: string;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  stripePaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

async function getPurchase(id: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/users/purchases/${id}`, {
      cache: 'no-store',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { purchase: null, error: 'Failed to fetch purchase' };
    }

    const purchase = await response.json();
    return { purchase, error: null };
  } catch (error) {
    console.error('Purchase error:', error);
    return { purchase: null, error: 'Failed to connect to server' };
  }
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

export default async function PurchaseDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { purchase, error } = await getPurchase(params.id);

  if (error || !purchase) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-800">{error || 'Purchase not found'}</p>
        </div>
        <Link
          href="/dashboard/purchases"
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          ← Back to purchases
        </Link>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatKey = (key: string) => {
    return key.match(/.{1,4}/g)?.join('-') || key;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/purchases"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Back to purchases
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Purchase Details
          </h1>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            statusColors[purchase.status as keyof typeof statusColors]
          }`}
        >
          {purchase.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Product info */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Product</h2>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {purchase.product.name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {purchase.product.description}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Amount Paid</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">
                  {purchase.currency} {purchase.amount}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* License key */}
        {purchase.licenseKey && (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">License Key</h2>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="mb-4">
                <dt className="mb-2 text-sm font-medium text-gray-500">
                  Key
                </dt>
                <dd className="overflow-x-auto rounded bg-gray-100 px-3 py-2">
                  <code className="text-sm font-mono text-gray-900">
                    {formatKey(purchase.licenseKey.keyString)}
                  </code>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {purchase.licenseKey.status}
                </dd>
              </div>
              <div className="mt-4">
                <Link
                  href={`/dashboard/license-keys/${purchase.licenseKey.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View full key details →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Payment info */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Payment</h2>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Payment ID
                </dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">
                  {purchase.stripePaymentId || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Purchase Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(purchase.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(purchase.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Actions */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Actions</h2>
          </div>
          <div className="space-y-3 px-4 py-5 sm:p-6">
            <button className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Download Invoice
            </button>
            {purchase.status === 'COMPLETED' && (
              <button className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                Request Refund
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
