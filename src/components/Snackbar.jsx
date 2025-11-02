import React, { useEffect } from 'react';

export default function Snackbar({ message, duration = 3500, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose && onClose(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="snackbar" role="status" aria-live="polite">
      <div className="snackbar-inner">
        <span className="snackbar-message">{message}</span>
        <button className="snackbar-close" onClick={() => onClose && onClose()} aria-label="Close">✕</button>
      </div>
    </div>
  );
}
