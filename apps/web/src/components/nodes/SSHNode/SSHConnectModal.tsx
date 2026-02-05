/**
 * SSH Connect Modal
 *
 * Modal dialog for configuring SSH connection parameters.
 * Supports password, private key, and SSH agent authentication.
 */

'use client';

import { useState, useCallback } from 'react';
import type { SSHAuthMethod } from '@masterdashboard/shared';

interface SSHConnectModalProps {
  onConnect: (config: {
    host: string;
    port?: number;
    username: string;
    authMethod: SSHAuthMethod;
    password?: string;
    privateKey?: string;
    passphrase?: string;
  }) => void;
  onClose: () => void;
  isConnecting: boolean;
  initialHost?: string;
  initialUsername?: string;
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
      />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function SSHConnectModal({
  onConnect,
  onClose,
  isConnecting,
  initialHost = '',
  initialUsername = '',
}: SSHConnectModalProps) {
  const [host, setHost] = useState(initialHost);
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState(initialUsername);
  const [authMethod, setAuthMethod] = useState<SSHAuthMethod>('password');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const config: {
        host: string;
        port?: number;
        username: string;
        authMethod: SSHAuthMethod;
        password?: string;
        privateKey?: string;
        passphrase?: string;
      } = {
        host,
        port: parseInt(port, 10) || 22,
        username,
        authMethod,
      };

      if (authMethod === 'password' && password) {
        config.password = password;
      }
      if (authMethod === 'privateKey' && privateKey) {
        config.privateKey = privateKey;
        if (passphrase) {
          config.passphrase = passphrase;
        }
      }

      onConnect(config);
    },
    [host, port, username, authMethod, password, privateKey, passphrase, onConnect]
  );

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          setPrivateKey(content);
        }
      };
      reader.readAsText(file);
    }
  }, []);

  // Handle click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg shadow-xl w-[400px] max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <ServerIcon className="w-5 h-5" />
            SSH Connection
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Host */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Host</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="example.com or 192.168.1.1"
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-amber-500 outline-none"
              required
              autoFocus
            />
          </div>

          {/* Port */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              min={1}
              max={65535}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-amber-500 outline-none"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="root"
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-amber-500 outline-none"
              required
            />
          </div>

          {/* Auth Method */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Authentication</label>
            <div className="flex gap-2">
              {(['password', 'privateKey', 'agent'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setAuthMethod(method)}
                  className={`flex-1 py-2 rounded text-sm flex items-center justify-center gap-1 transition-colors ${
                    authMethod === method
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {method === 'password' && <LockIcon className="w-4 h-4" />}
                  {method === 'privateKey' && <KeyIcon className="w-4 h-4" />}
                  {method.charAt(0).toUpperCase() + method.slice(1).replace('K', ' K')}
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          {authMethod === 'password' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-amber-500 outline-none"
                required
              />
            </div>
          )}

          {/* Private Key */}
          {authMethod === 'privateKey' && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Private Key</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pem,.key,id_rsa,id_ed25519,id_ecdsa"
                    className="w-full text-sm text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600"
                  />
                  <textarea
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Or paste your private key here..."
                    rows={4}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-amber-500 outline-none font-mono text-xs resize-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Passphrase (optional)
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="If your key is encrypted"
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-amber-500 outline-none"
                />
              </div>
            </>
          )}

          {/* Agent info */}
          {authMethod === 'agent' && (
            <div className="bg-gray-700 p-3 rounded text-sm text-gray-300">
              <p>
                Using SSH agent from{' '}
                <code className="text-amber-400 bg-gray-800 px-1 rounded">SSH_AUTH_SOCK</code>.
              </p>
              <p className="mt-2 text-gray-400 text-xs">
                Make sure your key is loaded with{' '}
                <code className="text-amber-400 bg-gray-800 px-1 rounded">ssh-add</code>.
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isConnecting}
            className={`w-full py-2 rounded font-medium transition-colors ${
              isConnecting
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {isConnecting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Connecting...
              </span>
            ) : (
              'Connect'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
