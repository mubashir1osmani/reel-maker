'use client';

import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <h2 className="text-3xl font-bold text-red-600">Authentication Error</h2>
        <p className="mt-2 text-gray-600">
          There was a problem authenticating your account. Please try again.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
