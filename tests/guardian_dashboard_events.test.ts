import { describe, it, expect } from 'vitest';

interface MockEvent {
  type: string;
  target: MockNode | null;
  currentTarget: MockNode | null;
  eventPhase: number; // 1: CAPTURE, 2: AT_TARGET, 3: BUBBLE
  propagationStopped: boolean;
  stopPropagation: () => void;
}

class MockNode {
  id: string;
  parent: MockNode | null = null;
  children: MockNode[] = [];
  listeners: { type: string; cb: (e: MockEvent) => void; capture: boolean }[] = [];

  constructor(id: string) {
    this.id = id;
  }

  appendChild(child: MockNode) {
    child.parent = this;
    this.children.push(child);
  }

  addEventListener(type: string, cb: (e: MockEvent) => void, options?: boolean | { capture?: boolean }) {
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    this.listeners.push({ type, cb, capture });
  }

  dispatchEvent(event: MockEvent): boolean {
    event.target = this;
    event.propagationStopped = false;

    // Build path from root to this node
    const path: MockNode[] = [];
    let cur: MockNode | null = this;
    while (cur) {
      path.unshift(cur);
      cur = cur.parent;
    }

    // Capture phase (path except target)
    event.eventPhase = 1;
    for (let i = 0; i < path.length - 1; i++) {
      if (event.propagationStopped) break;
      const node = path[i];
      event.currentTarget = node;
      for (const l of node.listeners) {
        if (l.type === event.type && l.capture) {
          l.cb(event);
          if (event.propagationStopped) break;
        }
      }
    }

    // Target phase
    if (!event.propagationStopped) {
      event.eventPhase = 2;
      event.currentTarget = this;
      for (const l of this.listeners) {
        if (l.type === event.type) {
          l.cb(event);
          if (event.propagationStopped) break;
        }
      }
    }

    // Bubble phase (path in reverse except target)
    event.eventPhase = 3;
    for (let i = path.length - 2; i >= 0; i--) {
      if (event.propagationStopped) break;
      const node = path[i];
      event.currentTarget = node;
      for (const l of node.listeners) {
        if (l.type === event.type && !l.capture) {
          l.cb(event);
          if (event.propagationStopped) break;
        }
      }
    }

    return !event.propagationStopped;
  }
}

function createMockEvent(type: string): MockEvent {
  const ev: MockEvent = {
    type,
    target: null,
    currentTarget: null,
    eventPhase: 0,
    propagationStopped: false,
    stopPropagation() {
      this.propagationStopped = true;
    }
  };
  return ev;
}

describe('Guardian Dashboard Event Isolation Regression Test', () => {
  it('demonstrates that capture: true stops child button clicks from firing', () => {
    const guardianModal = new MockNode('guardian-modal');
    const modalCard = new MockNode('modal-card');
    const unlockBtn = new MockNode('btn-verify-math');

    guardianModal.appendChild(modalCard);
    modalCard.appendChild(unlockBtn);

    let unlockFired = false;
    unlockBtn.addEventListener('click', () => {
      unlockFired = true;
    });

    // BUGGY behavior: capture phase stopPropagation
    guardianModal.addEventListener('click', (e) => e.stopPropagation(), { capture: true });

    unlockBtn.dispatchEvent(createMockEvent('click'));
    // Capture-phase interception stops the event from reaching the child button
    expect(unlockFired).toBe(false);
  });

  it('demonstrates that bubble: false allows child buttons to fire while isolating parent', () => {
    const windowRoot = new MockNode('window');
    const guardianModal = new MockNode('guardian-modal');
    const modalCard = new MockNode('modal-card');
    const unlockBtn = new MockNode('btn-verify-math');
    const closeBtn = new MockNode('btn-close-guardian');

    windowRoot.appendChild(guardianModal);
    guardianModal.appendChild(modalCard);
    modalCard.appendChild(unlockBtn);
    modalCard.appendChild(closeBtn);

    let unlockFired = false;
    let closeFired = false;
    let windowFired = false;

    unlockBtn.addEventListener('click', () => {
      unlockFired = true;
    });

    closeBtn.addEventListener('click', () => {
      closeFired = true;
    });

    windowRoot.addEventListener('click', () => {
      windowFired = true;
    }, { capture: false });

    // FIXED behavior: only bubble-phase stopPropagation on guardianModal
    guardianModal.addEventListener('click', (e) => e.stopPropagation(), { capture: false });

    // Click unlock button
    unlockBtn.dispatchEvent(createMockEvent('click'));
    expect(unlockFired).toBe(true);
    expect(windowFired).toBe(false); // Does not bubble past guardianModal

    // Click close button
    closeBtn.dispatchEvent(createMockEvent('click'));
    expect(closeFired).toBe(true);
    expect(windowFired).toBe(false); // Does not bubble past guardianModal
  });
});
