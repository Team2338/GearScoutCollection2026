/**
 * Pending Matches Indicator Component
 * Displays the number of matches waiting to be submitted and provides a retry button
 */

import { memo } from 'react';

interface PendingMatchesIndicatorProps {
  /** Number of matches pending submission */
  pendingCount: number;
  /** Whether a retry operation is in progress */
  isRetrying: boolean;
  /** Callback function to retry submitting pending matches */
  onRetry: () => void;
}

/**
 * Component to show pending matches count and allow retry
 * Memoized to prevent unnecessary re-renders when props haven't changed
 * @param props - Component props
 * @returns Pending matches indicator or null if no pending matches
 */
export const PendingMatchesIndicator = memo(({
  pendingCount,
  isRetrying,
  onRetry,
}: PendingMatchesIndicatorProps) => {
  if (pendingCount === 0) {
    return null;
  }

  return (
    <div className="pending-matches-indicator">
      <span className="pending-matches-count">{pendingCount}</span> pending
      <button 
        type="button" 
        className="retry-submit-button" 
        onClick={onRetry}
        disabled={isRetrying}
        style={{ opacity: isRetrying ? 0.5 : 1 }}
        aria-label="Retry submitting pending matches"
      >
        ↻
      </button>
    </div>
  );
});

PendingMatchesIndicator.displayName = 'PendingMatchesIndicator';
