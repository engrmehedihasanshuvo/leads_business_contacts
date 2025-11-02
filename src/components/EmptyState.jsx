import React from 'react';

export default function EmptyState({
  title = 'No data found',
  message = 'Try a different search, or adjust your filters.',
  children,
}) {
  return (
    <div className="empty-card" role="status" aria-live="polite">
      <div className="empty-anim" aria-hidden="true">
        <svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="28" cy="28" r="16" stroke="#60a5fa" strokeWidth="3" fill="rgba(96,165,250,0.12)" />
          <path d="M42 42 L58 58" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" />
          <circle cx="24" cy="24" r="3" fill="#3b82f6" />
          <circle cx="32" cy="24" r="3" fill="#22c55e" />
          <circle cx="28" cy="32" r="3" fill="#a78bfa" />
        </svg>
      </div>
      <div className="empty-text">
        <div className="empty-title">{title}</div>
        <div className="empty-sub">{message}</div>
        {children}
      </div>
    </div>
  );
}
