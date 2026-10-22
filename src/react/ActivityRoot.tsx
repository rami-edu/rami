import React, { useState, useEffect } from 'react';
import { activityOverlayManager, type ActiveActivity } from '../managers/ActivityOverlayManager';
import { ActivityShell } from './ActivityShell';
import { ActivityErrorBoundary } from './ActivityErrorBoundary';

export const ActivityRoot: React.FC = () => {
  const [activeActivity, setActiveActivity] = useState<ActiveActivity | null>(null);

  useEffect(() => {
    const rootEl = document.getElementById('react-activity-root');

    const unsubscribe = activityOverlayManager.subscribe((activity) => {
      setActiveActivity(activity);
      const hudOverlay = document.getElementById('hud-overlay');

      if (rootEl) {
        if (activity) {
          rootEl.classList.add('active');
          if (hudOverlay) {
            hudOverlay.style.display = 'none';
          }
        } else {
          rootEl.classList.remove('active');
          if (hudOverlay) {
            hudOverlay.style.display = 'flex';
          }
        }
      }
    });

    return unsubscribe;
  }, []);

  if (!activeActivity) {
    return null;
  }

  return (
    <ActivityErrorBoundary
      fallbackTitle={activeActivity.module.descriptor.title}
      onReset={() => activityOverlayManager.close()}
    >
      <ActivityShell
        module={activeActivity.module}
        onExit={() => activityOverlayManager.close()}
      />
    </ActivityErrorBoundary>
  );
};
