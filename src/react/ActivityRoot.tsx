import React, { useState, useEffect } from 'react';
import { activityOverlayManager, type ActiveActivity } from '../managers/ActivityOverlayManager';
import { ActivityShell } from './ActivityShell';

export const ActivityRoot: React.FC = () => {
  const [activeActivity, setActiveActivity] = useState<ActiveActivity | null>(null);

  useEffect(() => {
    const rootEl = document.getElementById('react-activity-root');

    const unsubscribe = activityOverlayManager.subscribe((activity) => {
      setActiveActivity(activity);
      if (rootEl) {
        if (activity) {
          rootEl.classList.add('active');
        } else {
          rootEl.classList.remove('active');
        }
      }
    });

    return unsubscribe;
  }, []);

  if (!activeActivity) {
    return null;
  }

  return (
    <ActivityShell
      module={activeActivity.module}
      onExit={() => activityOverlayManager.close()}
    />
  );
};
