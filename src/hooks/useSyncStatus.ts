import { useEffect, useState } from 'react';
import { getSyncState, subscribeSyncStatus, type SyncStatus } from '../lib/syncStatus';

export function useSyncStatus() {
  const [state, setState] = useState(getSyncState);

  useEffect(
    () =>
      subscribeSyncStatus((status, pendingCount, cloudReachable) =>
        setState({ status, pendingCount, cloudReachable }),
      ),
    [],
  );

  return state as {
    status: SyncStatus;
    pendingCount: number;
    cloudReachable: boolean | null;
  };
}
