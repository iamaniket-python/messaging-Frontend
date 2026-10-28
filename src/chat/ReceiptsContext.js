import { createContext } from 'react';

// value: (message) => 'sent' | 'delivered' | 'read' | null
export const ReceiptsContext = createContext(() => null);
