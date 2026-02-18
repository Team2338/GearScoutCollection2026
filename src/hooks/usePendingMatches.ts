/**
 * Custom hook for managing pending matches
 */

import { useState, useEffect, useCallback } from 'react';
import { isValidUser } from '@/model/Models';
import { getPendingMatches, submitAllPendingMatches } from '@/services/matchStorage';
import { TIMING, STORAGE_KEYS } from '@/constants';

interface UsePendingMatchesReturn {
  /** Number of pending matches waiting to be submitted */
  pendingCount: number;
  /** Whether a retry operation is in progress */
  isRetrying: boolean;
  /** Function to retry submitting pending matches */
  handleRetry: () => Promise<void>;
}

/**
 * Hook to track and manage pending matches that need to be submitted
 * @returns Object with pending count, retry status, and handler functions
 */
export function usePendingMatches(): UsePendingMatchesReturn {
  const [pendingCount, setPendingCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    const userDataStr = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!userDataStr) {
      return;
    }

    setIsRetrying(true);

    try {
      const parsed = JSON.parse(userDataStr);
      if (!isValidUser(parsed)) {
        console.error('[Pending Matches] Invalid user data');
        return;
      }
      await submitAllPendingMatches(parsed);
      
      const pending = getPendingMatches(parsed);
      setPendingCount(pending.length);
    } catch (error) {
      console.error('Error retrying submission:', error);
    } finally {
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    // Define update function inside effect to avoid dependency issues
    const update = () => {
      const userDataStr = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!userDataStr) {
        return;
      }

      try {
        const parsed = JSON.parse(userDataStr);
        if (!isValidUser(parsed)) {
          console.warn('[Pending Matches] Invalid user data');
          return;
        }
        const pending = getPendingMatches(parsed);
        setPendingCount(pending.length);
      } catch (error) {
        if (error instanceof Error) {
          console.warn('[Pending Matches] Error reading:', error.message);
        }
      }
    };

    update();
    const interval = setInterval(update, TIMING.PENDING_MATCHES_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, []); // Empty deps - stable interval

  return {
    pendingCount,
    isRetrying,
    handleRetry,
  };
}
