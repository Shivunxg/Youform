import { useState } from 'react';
import { CreditCard, ExternalLink, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StripeSettings() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    // In production: redirect to Stripe Connect OAuth flow
    await new Promise(r => setTimeout(r, 1000));
    setConnecting(false);
    toast('Stripe Connect coming soon — add your Stripe Secret Key in environment variables for now.');
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Stripe Settings</h1>
      <p className="text-sm text-gray-500 mb-2">
        Manage Stripe accounts connected for payment blocks in this organization.{' '}
        <a href="https://stripe.com/docs" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline inline-flex items-center gap-1">
          Learn about Stripe payments <ExternalLink className="w-3 h-3" />
        </a>
      </p>

      {connected ? (
        <div className="mt-6 p-5 border border-green-200 bg-green-50 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Stripe connected</p>
              <p className="text-xs text-gray-500">Payments are enabled for this organization</p>
            </div>
            <button onClick={() => setConnected(false)} className="ml-auto text-xs text-red-400 hover:text-red-600">Disconnect</button>
          </div>
        </div>
      ) : (
        <div className="mt-6 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-700 mb-1">No Stripe accounts connected</p>
          <p className="text-sm text-gray-400 mb-5">Add a payment block to any form and connect Stripe from the builder.</p>
          <button onClick={handleConnect} disabled={connecting} className="btn-primary">
            {connecting ? 'Connecting…' : '+ Connect Stripe'}
          </button>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-xl">
        <p className="text-xs text-blue-700 font-medium mb-1">How it works</p>
        <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
          <li>Add a Payment question to your form</li>
          <li>Connect your Stripe account here</li>
          <li>Payments go directly to your Stripe account</li>
          <li>FormFlow takes no commission</li>
        </ul>
      </div>
    </div>
  );
}
