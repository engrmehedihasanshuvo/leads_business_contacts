import React from 'react';

// Simple, dependency-free animated background using blurred colored blobs
export default function AnimatedBackground() {
  return (
    <div className="animated-bg" aria-hidden="true">
      <div className="bg-blob blob1" />
      {/* pink blob intentionally removed per user request */}
      <div className="bg-blob blob3" />
      <div className="bg-gradient-overlay" />
    </div>
  );
}
