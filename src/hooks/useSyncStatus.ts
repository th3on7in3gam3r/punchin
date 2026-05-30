import { useEffect, useState } from 'react';
import { getSyncState, subscribeSyncStatus, type SyncStatus } from '../lib/syncStatus';

export function useSyncStatus() {
  const [state, setState] = useState(getSyncState);

  useEffect(() => subscribeSyncStatus((status, pendingCount) => setState({ status, pendingCount })), []);

  return state as { status: SyncStatus; pendingCount: number };
}
