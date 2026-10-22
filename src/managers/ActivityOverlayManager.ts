import type { MinigameModule } from './MinigameLoader';

export interface ActiveActivity {
  module: MinigameModule;
  onExit: () => void;
}

type Listener = (activity: ActiveActivity | null) => void;

/**
 * ActivityOverlayManager
 * Coordinates launching and closing React-based preschool activities
 * directly over the Wonder Tree scene, maintaining state and telemetry.
 */
export class ActivityOverlayManager {
  private static instance: ActivityOverlayManager | null = null;
  private currentActivity: ActiveActivity | null = null;
  private listeners: Set<Listener> = new Set();

  public static getInstance(): ActivityOverlayManager {
    if (!ActivityOverlayManager.instance) {
      ActivityOverlayManager.instance = new ActivityOverlayManager();
    }
    return ActivityOverlayManager.instance;
  }

  public launch(activity: ActiveActivity): void {
    this.currentActivity = activity;
    this.notify();
  }

  public close(): void {
    if (!this.currentActivity) return;
    const onExit = this.currentActivity.onExit;
    this.currentActivity = null;
    this.notify();
    onExit();
  }

  public getCurrent(): ActiveActivity | null {
    return this.currentActivity;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.currentActivity);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.currentActivity);
    }
  }
}

export const activityOverlayManager = ActivityOverlayManager.getInstance();
