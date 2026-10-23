import React, { useState, useEffect, useRef, useCallback } from 'react';
import { profileManager } from '../../managers/ProfileManager';
import { audioManager } from '../../managers/AudioManager';

interface ShapeDef {
  id: string;
  name: string;
  color: string;
  renderSvg: (size: number, color: string) => React.ReactNode;
}

const ALL_SHAPES: ShapeDef[] = [
  {
    id: 'circle',
    name: 'Circle',
    color: '#ffbe0b',
    renderSvg: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 100 100" className="shape-svg">
        <circle cx="50" cy="50" r="42" fill={c} stroke="#ffffff" strokeWidth="4" />
      </svg>
    )
  },
  {
    id: 'square',
    name: 'Square',
    color: '#3a86ff',
    renderSvg: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 100 100" className="shape-svg">
        <rect x="12" y="12" width="76" height="76" rx="14" fill={c} stroke="#ffffff" strokeWidth="4" />
      </svg>
    )
  },
  {
    id: 'triangle',
    name: 'Triangle',
    color: '#ff006e',
    renderSvg: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 100 100" className="shape-svg">
        <polygon points="50,10 90,85 10,85" fill={c} stroke="#ffffff" strokeWidth="4" />
      </svg>
    )
  },
  {
    id: 'star',
    name: 'Star',
    color: '#ffd166',
    renderSvg: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 100 100" className="shape-svg">
        <polygon
          points="50,8 63,35 94,37 70,57 78,88 50,71 22,88 30,57 6,37 37,35"
          fill={c}
          stroke="#ffffff"
          strokeWidth="4"
        />
      </svg>
    )
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    color: '#8338ec',
    renderSvg: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 100 100" className="shape-svg">
        <polygon
          points="50,8 88,28 88,72 50,92 12,72 12,28"
          fill={c}
          stroke="#ffffff"
          strokeWidth="4"
        />
      </svg>
    )
  }
];

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

interface DragState {
  shape: ShapeDef;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
}

const TUTORIAL_STORAGE_PREFIX = 'rami_tutorial_completed_shape_nest_';

const checkTutorialCompleted = (): boolean => {
  try {
    const activeProfile = profileManager.getActiveProfile();
    const pid = activeProfile?.id ?? 'guest';
    const completedCount =
      activeProfile?.progress?.['Shape Nest (Geometry)']?.completedCount ??
      activeProfile?.progress?.['geom_shapes']?.completedCount ??
      0;
    if (completedCount > 0) return true;
    return localStorage.getItem(`${TUTORIAL_STORAGE_PREFIX}${pid}`) === 'true';
  } catch {
    return false;
  }
};

const markTutorialCompletedInStorage = (): void => {
  try {
    const activeProfile = profileManager.getActiveProfile();
    const pid = activeProfile?.id ?? 'guest';
    localStorage.setItem(`${TUTORIAL_STORAGE_PREFIX}${pid}`, 'true');
  } catch {
    // Ignore storage issues
  }
};

const getRandomRound = () => {
  const shuffled = [...ALL_SHAPES].sort(() => 0.5 - Math.random());
  const targets = shuffled.slice(0, 3);
  const choices = [...targets].sort(() => 0.5 - Math.random());
  return { targets, choices };
};

export const GeometryShapesActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [initialRound] = useState(() => getRandomRound());
  const [targetShapes, setTargetShapes] = useState<ShapeDef[]>(initialRound.targets);
  const [filledSocketIds, setFilledSocketIds] = useState<Set<string>>(new Set());
  const [availableChoices, setAvailableChoices] = useState<ShapeDef[]>(initialRound.choices);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredSocketId, setHoveredSocketId] = useState<string | null>(null);
  const [justSnappedId, setJustSnappedId] = useState<string | null>(null);
  const [nudgeShapeId, setNudgeShapeId] = useState<string | null>(null);

  // Tutorial tracking
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(checkTutorialCompleted);
  const [owlFlightState, setOwlFlightState] = useState<{
    stage: 'idle' | 'flying_to_piece' | 'carrying_to_socket' | 'dropping' | 'celebrating' | 'perched';
    x: number;
    y: number;
    carriedShape: ShapeDef | null;
    reaction: string | null;
    isFlapping: boolean;
  }>({
    stage: checkTutorialCompleted() ? 'perched' : 'idle',
    x: 0,
    y: 0,
    carriedShape: null,
    reaction: null,
    isFlapping: false
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const socketRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const choiceRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const suppressClickUntilRef = useRef<number>(0);
  const userInteractedRef = useRef<boolean>(false);
  const hasDemonstratedRef = useRef<boolean>(checkTutorialCompleted());

  // Setup a new puzzle round
  const setupRound = useCallback(() => {
    const { targets, choices } = getRandomRound();
    setTargetShapes(targets);
    setFilledSocketIds(new Set());
    setAvailableChoices(choices);
    setDragState(null);
    setHoveredSocketId(null);
    setJustSnappedId(null);
    setNudgeShapeId(null);
  }, []);

  const placePieceInSocket = useCallback(
    (shapeId: string) => {
      setFilledSocketIds((prev) => {
        const nextFilled = new Set(prev);
        nextFilled.add(shapeId);

        setJustSnappedId(shapeId);
        window.setTimeout(() => setJustSnappedId(null), 500);

        // Remove from available choices
        setAvailableChoices((choices) => choices.filter((p) => p.id !== shapeId));

        if (nextFilled.size === targetShapes.length) {
          // Completed the puzzle!
          markTutorialCompletedInStorage();
          setHasCompletedTutorial(true);
          hasDemonstratedRef.current = true;

          // Owl celebrates on perch!
          setOwlFlightState((curr) => ({
            ...curr,
            stage: 'perched',
            reaction: '🌟',
            isFlapping: true
          }));
          window.setTimeout(() => {
            setOwlFlightState((curr) => ({ ...curr, reaction: null, isFlapping: false }));
          }, 1500);

          onSolved();
          window.setTimeout(() => {
            setupRound();
          }, 1100);
        }

        return nextFilled;
      });
    },
    [targetShapes.length, onSolved, setupRound]
  );

  // Owl physical demonstration tutorial on first entry
  useEffect(() => {
    if (hasCompletedTutorial || hasDemonstratedRef.current) {
      setOwlFlightState((prev) => ({ ...prev, stage: 'perched' }));
      return;
    }

    let t1: number | null = null;
    let t2: number | null = null;
    let t3: number | null = null;
    let t4: number | null = null;
    let t5: number | null = null;
    let t6: number | null = null;

    // Wait 500ms for DOM elements to render and position
    t1 = window.setTimeout(() => {
      if (userInteractedRef.current || hasDemonstratedRef.current) return;
      hasDemonstratedRef.current = true;

      if (availableChoices.length === 0) return;
      const demoShape = availableChoices[0];
      const pieceEl = choiceRefs.current[demoShape.id];
      const socketEl = socketRefs.current[demoShape.id];

      if (!pieceEl || !socketEl) {
        setOwlFlightState((prev) => ({ ...prev, stage: 'perched' }));
        return;
      }

      const pRect = pieceEl.getBoundingClientRect();
      const sRect = socketEl.getBoundingClientRect();

      const pieceCenterX = pRect.left + pRect.width / 2;
      const pieceCenterY = pRect.top + pRect.height / 2;
      const socketCenterX = sRect.left + sRect.width / 2;
      const socketCenterY = sRect.top + sRect.height / 2;

      // 1. Owl swoops in from above right to the first piece
      setOwlFlightState({
        stage: 'flying_to_piece',
        x: pieceCenterX,
        y: pieceCenterY - 20,
        carriedShape: null,
        reaction: null,
        isFlapping: true
      });

      // 2. Owl lands on the piece and picks it up
      t2 = window.setTimeout(() => {
        if (userInteractedRef.current) return;
        setOwlFlightState({
          stage: 'flying_to_piece',
          x: pieceCenterX,
          y: pieceCenterY - 8,
          carriedShape: demoShape,
          reaction: '🦉',
          isFlapping: false
        });

        // 3. Owl drags the piece up toward the matching socket
        t3 = window.setTimeout(() => {
          if (userInteractedRef.current) return;
          setHoveredSocketId(demoShape.id);
          setOwlFlightState({
            stage: 'carrying_to_socket',
            x: socketCenterX,
            y: socketCenterY,
            carriedShape: demoShape,
            reaction: null,
            isFlapping: true
          });

          // 4. Owl arrives at socket and drops the piece in!
          t4 = window.setTimeout(() => {
            if (userInteractedRef.current) return;
            setHoveredSocketId(null);
            setOwlFlightState({
              stage: 'dropping',
              x: socketCenterX,
              y: socketCenterY,
              carriedShape: null,
              reaction: '🌟',
              isFlapping: false
            });

            // Snap the demo piece into its nest
            placePieceInSocket(demoShape.id);
            audioManager.playPortalReturn();

            // 5. Celebration flutter & fly to perch
            t5 = window.setTimeout(() => {
              setOwlFlightState((prev) => ({
                ...prev,
                stage: 'celebrating',
                reaction: '✨',
                isFlapping: true
              }));

              t6 = window.setTimeout(() => {
                setOwlFlightState((prev) => ({
                  ...prev,
                  stage: 'perched',
                  reaction: null,
                  isFlapping: false
                }));
              }, 750);
            }, 600);
          }, 1100);
        }, 320);
      }, 700);
    }, 500);

    return () => {
      if (t1) window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
      if (t3) window.clearTimeout(t3);
      if (t4) window.clearTimeout(t4);
      if (t5) window.clearTimeout(t5);
      if (t6) window.clearTimeout(t6);
    };
  }, [availableChoices, hasCompletedTutorial, placePieceInSocket]);

  const handlePointerDown = (shape: ShapeDef, e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // User is interacting! If tutorial was carrying, finish it and let user play
    userInteractedRef.current = true;
    if (owlFlightState.carriedShape) {
      placePieceInSocket(owlFlightState.carriedShape.id);
    }
    setOwlFlightState((prev) => ({
      ...prev,
      stage: 'perched',
      carriedShape: null,
      isFlapping: false
    }));

    setDragState({
      shape,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isDragging: false
    });
  };

  // Find socket closest to (clientX, clientY) within generous toddler hit radius
  const getSocketAtPoint = (x: number, y: number): string | null => {
    for (const target of targetShapes) {
      if (filledSocketIds.has(target.id)) continue;
      const el = socketRefs.current[target.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.hypot(x - centerX, y - centerY);
      const hitRadius = Math.max(rect.width, rect.height) * 0.65 + 24;
      if (dist <= hitRadius) {
        return target.id;
      }
    }
    return null;
  };

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
      const isDragging = dragState.isDragging || dist >= 6;

      const hoveredId = isDragging ? getSocketAtPoint(e.clientX, e.clientY) : null;
      setHoveredSocketId(hoveredId);

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              currentY: e.clientY,
              isDragging
            }
          : null
      );
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
      const wasDragging = dragState.isDragging || dist >= 6;

      suppressClickUntilRef.current = Date.now() + 350;

      if (!wasDragging) {
        // Tap/click: ONLY drag-and-drop allowed!
        // Show gentle hint nudge so the child knows to drag
        setNudgeShapeId(dragState.shape.id);
        window.setTimeout(() => {
          setNudgeShapeId((curr) => (curr === dragState.shape.id ? null : curr));
        }, 600);
      } else {
        // Drag release interaction
        const droppedSocketId = getSocketAtPoint(e.clientX, e.clientY);
        if (droppedSocketId) {
          if (droppedSocketId === dragState.shape.id) {
            // Correct socket match!
            placePieceInSocket(dragState.shape.id);
            // Owl cheers with a star on perch
            setOwlFlightState((curr) => ({ ...curr, reaction: '🌟', isFlapping: true }));
            window.setTimeout(() => {
              setOwlFlightState((curr) => ({ ...curr, reaction: null, isFlapping: false }));
            }, 900);
          } else {
            // Dropped on incorrect socket
            onMistake();
            // Owl tilts head encouragingly
            setOwlFlightState((curr) => ({ ...curr, reaction: '🌱' }));
            window.setTimeout(() => {
              setOwlFlightState((curr) => ({ ...curr, reaction: null }));
            }, 1000);
          }
        }
      }

      setDragState(null);
      setHoveredSocketId(null);
    };

    const handlePointerCancel = () => {
      setDragState(null);
      setHoveredSocketId(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [dragState, targetShapes, filledSocketIds, placePieceInSocket, onMistake]);

  const handleOwlTap = () => {
    audioManager.playPortalReturn();
    setOwlFlightState((curr) => ({
      ...curr,
      reaction: '🌟',
      isFlapping: true
    }));
    window.setTimeout(() => {
      setOwlFlightState((curr) => ({
        ...curr,
        reaction: null,
        isFlapping: false
      }));
    }, 1000);
  };

  return (
    <div className="shape-nest-container" ref={containerRef}>
      {/* Animated Owl Instructor: Explains by moving and perches on stage without any text */}
      <div
        className={`stage-owl-instructor ${owlFlightState.stage === 'perched' ? 'perched' : 'flying'} ${owlFlightState.isFlapping ? 'flapping' : ''}`}
        style={
          owlFlightState.stage === 'perched'
            ? undefined
            : {
                left: `${owlFlightState.x}px`,
                top: `${owlFlightState.y}px`
              }
        }
        onClick={handleOwlTap}
        aria-label="Professor Owl instructor"
      >
        <div className="owl-body-wrapper">
          {/* Mortarboard Graduation Hat */}
          <svg viewBox="0 0 100 60" className="owl-scholar-hat" aria-hidden="true">
            <polygon points="50,6 94,24 50,42 6,24" fill="#1b2a47" stroke="#ffd166" strokeWidth="3.5" />
            <path d="M30,34 Q50,48 70,34 L70,44 Q50,56 30,44 Z" fill="#121b2d" stroke="#ffd166" strokeWidth="2.5" />
            <circle cx="50" cy="24" r="4.5" fill="#ffd166" />
            <path d="M50,24 C56,28 66,32 68,44" fill="none" stroke="#ffd166" strokeWidth="3" strokeLinecap="round" />
            <circle cx="68" cy="44" r="3.5" fill="#f59e0b" />
          </svg>
          <img src="./avatars/owl.png" alt="Professor Owl" className="owl-sprite" />
          {owlFlightState.reaction && (
            <div className="owl-reaction-bubble">{owlFlightState.reaction}</div>
          )}
        </div>

        {/* Branch perch underneath when perched */}
        {owlFlightState.stage === 'perched' && <div className="owl-branch-perch" />}

        {/* Demo Carried Shape under Owl during tutorial drag */}
        {owlFlightState.carriedShape && (
          <div className="owl-carried-shape">
            {owlFlightState.carriedShape.renderSvg(76, owlFlightState.carriedShape.color)}
          </div>
        )}
      </div>

      {/* Sockets Row (Silhouettes in wooden nests) */}
      <div className="shape-sockets-row">
        {targetShapes.map((shape) => {
          const isFilled = filledSocketIds.has(shape.id);
          const isHovered = hoveredSocketId === shape.id;
          const isMatchHover = isHovered && (dragState?.shape.id === shape.id || owlFlightState.carriedShape?.id === shape.id);
          const isWrongHover = isHovered && dragState?.shape.id !== shape.id && !owlFlightState.carriedShape;
          const isJustSnapped = justSnappedId === shape.id;

          const socketClasses = [
            'shape-socket',
            isFilled ? 'filled' : '',
            isMatchHover ? 'drag-hover-match' : '',
            isWrongHover ? 'drag-hover-wrong' : '',
            isJustSnapped ? 'socket-snapped' : ''
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={shape.id}
              ref={(el) => {
                socketRefs.current[shape.id] = el;
              }}
              className={socketClasses}
              aria-label={`${shape.name} socket ${isFilled ? 'filled' : 'empty'}`}
            >
              {isFilled
                ? shape.renderSvg(80, shape.color)
                : shape.renderSvg(76, isMatchHover ? shape.color : 'rgba(149, 213, 178, 0.22)')}
            </div>
          );
        })}
      </div>

      {/* Available choices to drag */}
      <div className="shape-choices-row">
        {availableChoices.map((shape) => {
          const isBeingDragged =
            (dragState?.shape.id === shape.id && dragState.isDragging) ||
            owlFlightState.carriedShape?.id === shape.id;
          const isNudged = nudgeShapeId === shape.id;

          return (
            <button
              key={shape.id}
              ref={(el) => {
                choiceRefs.current[shape.id] = el;
              }}
              type="button"
              className={`shape-piece ${isBeingDragged ? 'is-dragged' : ''} ${isNudged ? 'drag-hint-nudge' : ''}`}
              onPointerDown={(e) => handlePointerDown(shape, e)}
              onClick={() => {
                // Tapping/clicking is disabled - hint to drag
                setNudgeShapeId(shape.id);
                window.setTimeout(() => {
                  setNudgeShapeId((curr) => (curr === shape.id ? null : curr));
                }, 600);
              }}
              aria-label={`Drag ${shape.name} to its matching nest`}
            >
              {shape.renderSvg(82, shape.color)}
            </button>
          );
        })}
      </div>

      {/* Floating Drag Avatar following cursor / finger */}
      {dragState && dragState.isDragging && (
        <div
          className="shape-piece-floating"
          style={{
            left: `${dragState.currentX}px`,
            top: `${dragState.currentY}px`
          }}
        >
          {dragState.shape.renderSvg(90, dragState.shape.color)}
        </div>
      )}
    </div>
  );
};
