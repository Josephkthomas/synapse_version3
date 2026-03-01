import { useEffect } from 'react';
import { SYNAPSE_APP_URL } from '../lib/constants';

interface StatusFeedbackProps {
  status: 'success' | 'error';
  capturedTitle: string;
  errorMessage?: string;
  onDismiss: () => void;
}

export function StatusFeedback({
  status,
  capturedTitle,
  errorMessage,
  onDismiss,
}: StatusFeedbackProps) {
  // Auto-dismiss success after 3 seconds
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, onDismiss]);

  if (status === 'success') {
    return (
      <div className="status-feedback status-success">
        <div className="status-icon">✓</div>
        <h3 className="status-heading">Saved to Synapse</h3>
        <p className="status-subtitle">{capturedTitle}</p>
        <a
          className="btn btn-secondary"
          href={SYNAPSE_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          View in Synapse
        </a>
      </div>
    );
  }

  return (
    <div className="status-feedback status-error">
      <div className="status-icon error-icon">✕</div>
      <h3 className="status-heading">Capture failed</h3>
      {errorMessage && <p className="status-subtitle">{errorMessage}</p>}
      <button className="btn btn-primary" onClick={onDismiss}>
        Try Again
      </button>
    </div>
  );
}
