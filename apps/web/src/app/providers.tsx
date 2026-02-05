/**
 * Providers Component
 *
 * Wraps the application with necessary context providers.
 */

'use client';

import { type ReactNode } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { ThemeProvider } from '@/providers/ThemeProvider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <ReactFlowProvider>{children}</ReactFlowProvider>
    </ThemeProvider>
  );
}
