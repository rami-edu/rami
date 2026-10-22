import Phaser from 'phaser';

export type ActivityPillarId = 'solving' | 'logic' | 'creativity';

export type ActivityTopicId =
  // Solving (7 topics)
  | 'balance_equations'
  | 'arithmetic_harvest'
  | 'fractions_honeycomb'
  | 'geometry_tangram'
  | 'measurement_vines'
  | 'time_sundial'
  | 'physics_pulleys'
  // Logic (7 topics)
  | 'memory_echoes'
  | 'pattern_runes'
  | 'maze_roots'
  | 'sorting_taxonomy'
  | 'deduction_tracks'
  | 'coding_fireflies'
  | 'symmetry_butterflies'
  // Creativity (6 topics)
  | 'rhythm_melody'
  | 'harmony_chimes'
  | 'color_alchemy'
  | 'constellation_myths'
  | 'origami_flora'
  | 'botanical_weaving';

export interface PillarDefinition {
  id: ActivityPillarId;
  title: string;
  primaryHex: string;
  secondaryHex: string;
  rimColor: number;
  glowColor: number;
}

export interface TopicLogoDefinition {
  id: ActivityTopicId;
  index: number; // 1..20
  title: string;
  pillar: ActivityPillarId;
  accentHex: string;
}

export const PILLAR_DEFINITIONS: Record<ActivityPillarId, PillarDefinition> = {
  solving: {
    id: 'solving',
    title: 'Solving',
    primaryHex: '#ffd166',
    secondaryHex: '#f4a261',
    rimColor: 0xffd166,
    glowColor: 0xf4a261
  },
  logic: {
    id: 'logic',
    title: 'Logic',
    primaryHex: '#90e0ef',
    secondaryHex: '#48cae4',
    rimColor: 0x90e0ef,
    glowColor: 0x48cae4
  },
  creativity: {
    id: 'creativity',
    title: 'Creativity',
    primaryHex: '#80ed99',
    secondaryHex: '#52b788',
    rimColor: 0x80ed99,
    glowColor: 0x52b788
  }
};

/**
 * Complete library of 20 educational topics organized across the three main
 * areas: Solving (1–7), Logic (8–14), and Creativity (15–20).
 */
export const TOPIC_LOGO_DEFINITIONS: Record<
  ActivityTopicId,
  TopicLogoDefinition
> = {
  // === SOLVING (7) ===
  balance_equations: {
    id: 'balance_equations',
    index: 1,
    title: 'Balance & Equations',
    pillar: 'solving',
    accentHex: '#ffd166'
  },
  arithmetic_harvest: {
    id: 'arithmetic_harvest',
    index: 2,
    title: 'Arithmetic Harvest',
    pillar: 'solving',
    accentHex: '#f4a261'
  },
  fractions_honeycomb: {
    id: 'fractions_honeycomb',
    index: 3,
    title: 'Honeycomb Fractions',
    pillar: 'solving',
    accentHex: '#ffbe0b'
  },
  geometry_tangram: {
    id: 'geometry_tangram',
    index: 4,
    title: 'Tangram Geometry',
    pillar: 'solving',
    accentHex: '#fb8500'
  },
  measurement_vines: {
    id: 'measurement_vines',
    index: 5,
    title: 'Vine Measurement',
    pillar: 'solving',
    accentHex: '#e9c46a'
  },
  time_sundial: {
    id: 'time_sundial',
    index: 6,
    title: 'Sundial & Cycles',
    pillar: 'solving',
    accentHex: '#ffd166'
  },
  physics_pulleys: {
    id: 'physics_pulleys',
    index: 7,
    title: 'Treehouse Pulleys',
    pillar: 'solving',
    accentHex: '#f4a261'
  },

  // === LOGIC (7) ===
  memory_echoes: {
    id: 'memory_echoes',
    index: 8,
    title: 'Crystal Memory Echoes',
    pillar: 'logic',
    accentHex: '#90e0ef'
  },
  pattern_runes: {
    id: 'pattern_runes',
    index: 9,
    title: 'Bark Rune Patterns',
    pillar: 'logic',
    accentHex: '#48cae4'
  },
  maze_roots: {
    id: 'maze_roots',
    index: 10,
    title: 'Root Labyrinth',
    pillar: 'logic',
    accentHex: '#00b4d8'
  },
  sorting_taxonomy: {
    id: 'sorting_taxonomy',
    index: 11,
    title: 'Botanical Taxonomy',
    pillar: 'logic',
    accentHex: '#ade8f4'
  },
  deduction_tracks: {
    id: 'deduction_tracks',
    index: 12,
    title: 'Forest Track Deduction',
    pillar: 'logic',
    accentHex: '#90e0ef'
  },
  coding_fireflies: {
    id: 'coding_fireflies',
    index: 13,
    title: 'Firefly Sequences',
    pillar: 'logic',
    accentHex: '#4cc9f0'
  },
  symmetry_butterflies: {
    id: 'symmetry_butterflies',
    index: 14,
    title: 'Wing Symmetry',
    pillar: 'logic',
    accentHex: '#72efdd'
  },

  // === CREATIVITY (6) ===
  rhythm_melody: {
    id: 'rhythm_melody',
    index: 15,
    title: 'Canopy Rhythm & Melody',
    pillar: 'creativity',
    accentHex: '#80ed99'
  },
  harmony_chimes: {
    id: 'harmony_chimes',
    index: 16,
    title: 'Bough Wind Chimes',
    pillar: 'creativity',
    accentHex: '#52b788'
  },
  color_alchemy: {
    id: 'color_alchemy',
    index: 17,
    title: 'Dewdrop Color Alchemy',
    pillar: 'creativity',
    accentHex: '#ff99c8'
  },
  constellation_myths: {
    id: 'constellation_myths',
    index: 18,
    title: 'Starlight Constellations',
    pillar: 'creativity',
    accentHex: '#c77dff'
  },
  origami_flora: {
    id: 'origami_flora',
    index: 19,
    title: 'Origami Forest Flora',
    pillar: 'creativity',
    accentHex: '#95d5b2'
  },
  botanical_weaving: {
    id: 'botanical_weaving',
    index: 20,
    title: 'Vine Tapestry Weaving',
    pillar: 'creativity',
    accentHex: '#74c69d'
  }
};

/**
 * High-resolution (256x256) vector/canvas logo generator for all 3 Main Areas
 * (Solving, Logic, Creativity) and all 20 Topics.
 */
export class ActivityLogoLibrary {
  private static readonly ICON_SIZE = 256;

  /**
   * Maps a minigame title to its Topic ID and Pillar ID.
   */
  public static resolveMinigameTopic(minigameTitle: string): {
    topic: TopicLogoDefinition;
    pillar: PillarDefinition;
  } {
    if (minigameTitle.includes('Acorn')) {
      const topic = TOPIC_LOGO_DEFINITIONS.balance_equations;
      return { topic, pillar: PILLAR_DEFINITIONS[topic.pillar] };
    }
    if (minigameTitle.includes('Rhythm')) {
      const topic = TOPIC_LOGO_DEFINITIONS.rhythm_melody;
      return { topic, pillar: PILLAR_DEFINITIONS[topic.pillar] };
    }
    const topic = TOPIC_LOGO_DEFINITIONS.memory_echoes;
    return { topic, pillar: PILLAR_DEFINITIONS[topic.pillar] };
  }

  public static getActivityLogoTexture(
    scene: Phaser.Scene,
    activityId: string
  ): string {
    const texKey = `logo_activity_${activityId}`;
    if (scene.textures.exists(texKey)) {
      return texKey;
    }

    const size = ActivityLogoLibrary.ICON_SIZE;
    const canvasTex = scene.textures.createCanvas(texKey, size, size);
    const ctx = canvasTex?.getContext();

    if (ctx && canvasTex) {
      ctx.save();
      this.drawMedallionBase(ctx, size, '#52b788', '#2d6a4f');
      this.drawActivityArtwork(ctx, size, activityId);
      ctx.restore();
      canvasTex.refresh();
    }

    return texKey;
  }

  private static drawActivityArtwork(
    ctx: CanvasRenderingContext2D,
    size: number,
    activityId: string
  ): void {
    const cx = size / 2;
    const cy = size / 2;

    switch (activityId) {
      case 'geom_shapes':
      case 'Acorn Scale': {
        // Carved wooden board with geometric shapes (Circle, Triangle, Square) in glowing insets
        ctx.fillStyle = '#1e3321';
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(cx - 70, cy - 50, 140, 100, 16);
        ctx.fill();
        ctx.stroke();

        // 3 slots + shapes
        // Circle (left)
        ctx.fillStyle = '#ffbe0b';
        ctx.beginPath();
        ctx.arc(cx - 40, cy, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Triangle (center)
        ctx.fillStyle = '#e63946';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.lineTo(cx + 20, cy + 18);
        ctx.lineTo(cx - 20, cy + 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Square (right)
        ctx.fillStyle = '#4cc9f0';
        ctx.beginPath();
        ctx.rect(cx + 22, cy - 18, 36, 36);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'color_bloom': {
        // Blooming enchanted blossom with red, yellow, blue, and green petals + dripping dew
        const petals = [
          '#e63946',
          '#ffbe0b',
          '#4cc9f0',
          '#2a9d8f',
          '#fb8500',
          '#8338ec'
        ];
        petals.forEach((col, i) => {
          const a = (i / petals.length) * Math.PI * 2;
          const px = cx + Math.cos(a) * 36;
          const py = cy + Math.sin(a) * 36;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.ellipse(px, py, 22, 14, a, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        // Golden center dewdrop
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        break;
      }
      case 'fruit_harvest': {
        // Woven basket brimming with bright apples and counting dots
        ctx.fillStyle = '#8b5a2b';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 28, 56, 34, 0, 0, Math.PI);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#d4a373';
        ctx.stroke();

        // Basket handle
        ctx.beginPath();
        ctx.arc(cx, cy + 10, 48, Math.PI, 0, false);
        ctx.stroke();

        // 3 Red apples
        const apples = [
          { x: cx - 24, y: cy + 12 },
          { x: cx, y: cy },
          { x: cx + 24, y: cy + 12 }
        ];
        apples.forEach((ap, i) => {
          ctx.fillStyle = '#e63946';
          ctx.beginPath();
          ctx.arc(ap.x, ap.y, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Green leaf
          ctx.fillStyle = '#80ed99';
          ctx.beginPath();
          ctx.ellipse(ap.x + 4, ap.y - 18, 6, 4, 0.4, 0, Math.PI * 2);
          ctx.fill();

          // Counting dots on apple
          ctx.fillStyle = '#ffffff';
          for (let d = 0; d <= i; d++) {
            ctx.beginPath();
            ctx.arc(ap.x - 4 + d * 7, ap.y + 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        break;
      }
      case 'forest_symphony':
      case 'Rhythm in the Branches': {
        // Enchanted golden chime bells and rhythmic sound waves
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 3;

        // Concentric acoustic ripples
        [35, 52, 68].forEach((r) => {
          ctx.beginPath();
          ctx.arc(cx, cy, r, -0.8, 0.8);
          ctx.stroke();
        });

        // 3 Hanging golden bells
        [-32, 0, 32].forEach((bx, i) => {
          const by = cy + (i === 1 ? -6 : 6);
          ctx.beginPath();
          ctx.moveTo(cx + bx, cy - 40);
          ctx.lineTo(cx + bx, by - 12);
          ctx.stroke();

          ctx.fillStyle = '#ffd166';
          ctx.beginPath();
          ctx.arc(cx + bx, by, 14, Math.PI, 0);
          ctx.lineTo(cx + bx + 16, by + 10);
          ctx.lineTo(cx + bx - 16, by + 10);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // Clapper
          ctx.fillStyle = '#f4a261';
          ctx.beginPath();
          ctx.arc(cx + bx, by + 14, 4, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      }
      case 'phonics_pond': {
        // Shimmering pond with open oyster shell sounding phonetic ripples
        ctx.fillStyle = '#0f4c5c';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 22, 65, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#48cae4';
        ctx.stroke();

        // Pearl shell
        ctx.fillStyle = '#e2eafc';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 10, 34, 18, 0, Math.PI, 0);
        ctx.fill();
        ctx.stroke();

        // Glowing pearl
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(cx, cy + 8, 10, 0, Math.PI * 2);
        ctx.fill();

        // Sound waves radiating upwards
        ctx.strokeStyle = '#80ed99';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy - 14, 18, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy - 14, 30, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
        break;
      }
      case 'creature_ladder': {
        // 3 stepping stones ascending in size with small, medium, large mushrooms
        const stones = [
          { x: cx - 45, y: cy + 30, rx: 18, ry: 10, mh: 16 },
          { x: cx, y: cy + 10, rx: 24, ry: 13, mh: 28 },
          { x: cx + 45, y: cy - 12, rx: 30, ry: 16, mh: 42 }
        ];

        stones.forEach((st) => {
          // Stone
          ctx.fillStyle = '#5c677d';
          ctx.beginPath();
          ctx.ellipse(st.x, st.y, st.rx, st.ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#a0aec0';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Mushroom stem & cap
          ctx.fillStyle = '#f8f9fa';
          ctx.fillRect(st.x - 3, st.y - st.mh, 6, st.mh - 4);

          ctx.fillStyle = '#e63946';
          ctx.beginPath();
          ctx.arc(st.x, st.y - st.mh, st.rx * 0.55, Math.PI, 0);
          ctx.fill();

          // White dots
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(st.x, st.y - st.mh - 4, 3, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      }
      case 'pattern_path': {
        // S-curved river stepping trail with alternating Leaf -> Acorn -> Leaf -> Acorn
        ctx.strokeStyle = '#52b788';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx - 55, cy + 40);
        ctx.quadraticCurveTo(cx - 15, cy - 30, cx + 55, cy - 40);
        ctx.stroke();

        const items = [
          { x: cx - 45, y: cy + 30, type: 'leaf' },
          { x: cx - 18, y: cy + 8, type: 'acorn' },
          { x: cx + 12, y: cy - 14, type: 'leaf' },
          { x: cx + 42, y: cy - 34, type: 'acorn' }
        ];

        items.forEach((it) => {
          if (it.type === 'leaf') {
            ctx.fillStyle = '#80ed99';
            ctx.beginPath();
            ctx.ellipse(it.x, it.y, 14, 9, 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else {
            ctx.fillStyle = '#8b5a2b';
            ctx.beginPath();
            ctx.arc(it.x, it.y + 4, 9, 0, Math.PI);
            ctx.fill();
            ctx.fillStyle = '#d4a373';
            ctx.fillRect(it.x - 9, it.y - 3, 18, 7);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
        break;
      }
      case 'shadow_match':
      case 'The Clockwork Tower': {
        // Golden lantern casting sharp animal silhouette onto glowing parchment
        ctx.fillStyle = '#fefae0';
        ctx.beginPath();
        ctx.roundRect(cx - 55, cy - 50, 110, 100, 12);
        ctx.fill();
        ctx.strokeStyle = '#d4a373';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Dark silhouette of a butterfly / bird
        ctx.fillStyle = '#162418';
        ctx.beginPath();
        // Wings
        ctx.ellipse(cx - 20, cy - 8, 22, 14, -0.4, 0, Math.PI * 2);
        ctx.ellipse(cx + 20, cy - 8, 22, 14, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.ellipse(cx, cy, 6, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Magic lantern rays
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx - 45, cy - 35, 8, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'nature_sorting': {
        // Twin hollow log bowls with sorted leaves & sparkling crystals
        // Bowl 1 (Left - Leaves)
        ctx.fillStyle = '#3d2614';
        ctx.beginPath();
        ctx.ellipse(cx - 36, cy + 15, 30, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8b5a2b';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#80ed99';
        ctx.beginPath();
        ctx.ellipse(cx - 36, cy + 10, 15, 8, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Bowl 2 (Right - Crystals)
        ctx.fillStyle = '#14293d';
        ctx.beginPath();
        ctx.ellipse(cx + 36, cy + 15, 30, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#48cae4';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#90e0ef';
        ctx.beginPath();
        ctx.moveTo(cx + 36, cy - 4);
        ctx.lineTo(cx + 46, cy + 12);
        ctx.lineTo(cx + 36, cy + 22);
        ctx.lineTo(cx + 26, cy + 12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }
      case 'symmetry_wings': {
        // Enchanted butterfly with mirrored bilateral gemstone wings
        // Center spine
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 5, 28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Left upper wing
        ctx.fillStyle = '#ff99c8';
        ctx.beginPath();
        ctx.ellipse(cx - 32, cy - 14, 28, 18, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Right upper wing (mirror)
        ctx.fillStyle = '#ff99c8';
        ctx.beginPath();
        ctx.ellipse(cx + 32, cy - 14, 28, 18, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Lower wings
        ctx.fillStyle = '#80ed99';
        ctx.beginPath();
        ctx.ellipse(cx - 24, cy + 20, 20, 12, 0.3, 0, Math.PI * 2);
        ctx.ellipse(cx + 24, cy + 20, 20, 12, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Mirrored gems
        ctx.fillStyle = '#4cc9f0';
        ctx.beginPath();
        ctx.arc(cx - 32, cy - 14, 6, 0, Math.PI * 2);
        ctx.arc(cx + 32, cy - 14, 6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      default: {
        // Fallback enchanted star
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(cx, cy, 32, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /**
   * Returns (and lazily generates at 256x256 resolution) the Phaser texture key
   * for any of the 20 topics.
   */
  public static getTopicLogoTexture(
    scene: Phaser.Scene,
    topicId: ActivityTopicId
  ): string {
    const texKey = `logo_topic_${topicId}`;
    if (scene.textures.exists(texKey)) {
      return texKey;
    }

    const size = ActivityLogoLibrary.ICON_SIZE;
    const canvasTex = scene.textures.createCanvas(texKey, size, size);
    const ctx = canvasTex?.getContext();
    const def = TOPIC_LOGO_DEFINITIONS[topicId];
    const pillar = PILLAR_DEFINITIONS[def.pillar];

    if (ctx && canvasTex) {
      ctx.save();
      this.drawMedallionBase(ctx, size, pillar.primaryHex, pillar.secondaryHex);
      this.drawTopicArtwork(ctx, size, topicId, def.accentHex);
      ctx.restore();
      canvasTex.refresh();
    }

    return texKey;
  }

  /**
   * Returns (and lazily generates at 256x256 resolution) the Phaser texture key
   * for any of the 3 main areas: Solving, Logic, or Creativity.
   */
  public static getPillarLogoTexture(
    scene: Phaser.Scene,
    pillarId: ActivityPillarId
  ): string {
    const texKey = `logo_pillar_${pillarId}`;
    if (scene.textures.exists(texKey)) {
      return texKey;
    }

    const size = ActivityLogoLibrary.ICON_SIZE;
    const canvasTex = scene.textures.createCanvas(texKey, size, size);
    const ctx = canvasTex?.getContext();
    const pillar = PILLAR_DEFINITIONS[pillarId];

    if (ctx && canvasTex) {
      ctx.save();
      this.drawMedallionBase(ctx, size, pillar.primaryHex, pillar.secondaryHex);
      this.drawPillarArtwork(ctx, size, pillarId, pillar.primaryHex);
      ctx.restore();
      canvasTex.refresh();
    }

    return texKey;
  }

  /**
   * Pre-generates all 3 pillar emblems and all 20 topic logos into Phaser's texture cache.
   */
  public static ensureAllLogosRegistered(scene: Phaser.Scene): void {
    (Object.keys(PILLAR_DEFINITIONS) as ActivityPillarId[]).forEach((pid) => {
      this.getPillarLogoTexture(scene, pid);
    });
    (Object.keys(TOPIC_LOGO_DEFINITIONS) as ActivityTopicId[]).forEach((tid) => {
      this.getTopicLogoTexture(scene, tid);
    });
  }

  private static drawMedallionBase(
    ctx: CanvasRenderingContext2D,
    size: number,
    primaryHex: string,
    secondaryHex: string
  ): void {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.44;

    // Outer hand-inked dark wood & brass medallion ring
    const rimGrad = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
    rimGrad.addColorStop(0, '#2a3d2e');
    rimGrad.addColorStop(0.75, '#162418');
    rimGrad.addColorStop(1, '#0d170f');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();

    // Pillar-colored double bezel ring
    ctx.lineWidth = 10;
    ctx.strokeStyle = primaryHex;
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1f1209';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r - 8, 0, Math.PI * 2);
    ctx.strokeStyle = secondaryHex;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  private static drawPillarArtwork(
    ctx: CanvasRenderingContext2D,
    size: number,
    pillarId: ActivityPillarId,
    accentHex: string
  ): void {
    const cx = size / 2;
    const cy = size / 2;
    ctx.save();
    ctx.strokeStyle = '#1f1209';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (pillarId === 'solving') {
      // Golden gear + balance acorn emblem
      this.drawVectorGear(ctx, cx, cy, 58, 8, accentHex);
      this.drawVectorAcorn(ctx, cx, cy + 4, 28, '#f4a261');
    } else if (pillarId === 'logic') {
      // Celestial diamond prism + compass star
      this.drawVectorCrystalCluster(ctx, cx, cy + 12, accentHex);
    } else {
      // Singing forest lyre + glowing leaf
      this.drawVectorLyre(ctx, cx, cy, accentHex);
    }

    ctx.restore();
  }

  private static drawTopicArtwork(
    ctx: CanvasRenderingContext2D,
    size: number,
    topicId: ActivityTopicId,
    accentHex: string
  ): void {
    const cx = size / 2;
    const cy = size / 2;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (topicId) {
      case 'balance_equations': {
        // High-res Balance Scale with Acorn & Stone
        ctx.strokeStyle = '#1f1209';
        ctx.lineWidth = 6;
        // Central pillar & base
        ctx.fillStyle = '#e9c46a';
        ctx.beginPath();
        ctx.roundRect(cx - 42, cy + 46, 84, 16, 8);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, cy + 46);
        ctx.lineTo(cx, cy - 36);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 10;
        ctx.stroke();
        ctx.strokeStyle = '#1f1209';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Crossbeam
        ctx.beginPath();
        ctx.moveTo(cx - 58, cy - 26);
        ctx.lineTo(cx + 58, cy - 26);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 9;
        ctx.stroke();

        // Left & right hanging pans
        for (const side of [-1, 1]) {
          const px = cx + side * 52;
          ctx.strokeStyle = '#d8f3dc';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(px, cy - 26);
          ctx.lineTo(px - 18, cy + 14);
          ctx.moveTo(px, cy - 26);
          ctx.lineTo(px + 18, cy + 14);
          ctx.stroke();

          ctx.fillStyle = '#f4a261';
          ctx.strokeStyle = '#1f1209';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(px, cy + 14, 22, 0, Math.PI);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        // Acorn on left pan, crystal stone on right pan
        this.drawVectorAcorn(ctx, cx - 52, cy + 2, 13, '#e76f51');
        ctx.fillStyle = '#90e0ef';
        ctx.strokeStyle = '#1f1209';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx + 52, cy + 4, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'arithmetic_harvest': {
        // Golden Abacus frame with colorful forest berries
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 8;
        ctx.strokeRect(cx - 52, cy - 44, 104, 88);
        for (let row = -1; row <= 1; row++) {
          const ry = cy + row * 26;
          ctx.beginPath();
          ctx.moveTo(cx - 50, ry);
          ctx.lineTo(cx + 50, ry);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#d8f3dc';
          ctx.stroke();
          for (let b = -1; b <= 1; b++) {
            ctx.fillStyle = b === 0 ? '#ffbe0b' : '#e76f51';
            ctx.beginPath();
            ctx.arc(cx + b * 24 + row * 6, ry, 10, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case 'fractions_honeycomb': {
        // Hexagonal Golden Honeycomb cells
        const offsets = [
          [0, -28],
          [-25, 14],
          [25, 14]
        ];
        offsets.forEach(([ox, oy], idx) => {
          this.drawRegularPolygon(
            ctx,
            cx + ox,
            cy + oy,
            26,
            6,
            idx === 0 ? '#ffd166' : '#f4a261'
          );
        });
        break;
      }

      case 'geometry_tangram': {
        // Tangram geometric prism triangles
        this.drawRegularPolygon(ctx, cx - 20, cy + 12, 38, 3, '#ffd166');
        this.drawRegularPolygon(ctx, cx + 22, cy - 12, 32, 4, '#90e0ef');
        break;
      }

      case 'measurement_vines': {
        // Segmented Bamboo Ruler & Sprouting Leaf
        ctx.fillStyle = '#80ed99';
        ctx.strokeStyle = '#1f1209';
        ctx.lineWidth = 5;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.55);
        ctx.beginPath();
        ctx.roundRect(-18, -62, 36, 124, 8);
        ctx.fill();
        ctx.stroke();
        for (let t = -40; t <= 40; t += 20) {
          ctx.beginPath();
          ctx.moveTo(-18, t);
          ctx.lineTo(2, t);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }

      case 'time_sundial': {
        // Ornate Forest Sundial & Sun Rays
        this.drawVectorGear(ctx, cx, cy, 52, 12, '#ffd166');
        ctx.strokeStyle = '#1f1209';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy - 32);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 24, cy + 12);
        ctx.stroke();
        break;
      }

      case 'physics_pulleys': {
        // Pulley Wheel & Rope Lifting Acorn Weight
        this.drawVectorGear(ctx, cx, cy - 22, 30, 8, '#f4a261');
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx - 26, cy - 22);
        ctx.lineTo(cx - 26, cy + 42);
        ctx.moveTo(cx + 26, cy - 22);
        ctx.lineTo(cx + 26, cy + 24);
        ctx.stroke();
        this.drawVectorAcorn(ctx, cx + 26, cy + 36, 16, '#ffd166');
        break;
      }

      case 'memory_echoes': {
        // Three Glowing Cavern Crystals (Emerald, Ruby, Sapphire)
        this.drawVectorCrystalCluster(ctx, cx, cy + 14, accentHex);
        break;
      }

      case 'pattern_runes': {
        // Spiraling Ancient Tree Rune Stone
        this.drawRegularPolygon(ctx, cx, cy, 56, 6, '#48cae4');
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 3.5; a += 0.2) {
          const r = a * 3.2;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        break;
      }

      case 'maze_roots': {
        // Concentric Labyrinth Rings
        ctx.strokeStyle = '#90e0ef';
        ctx.lineWidth = 6;
        for (const rad of [20, 38, 56]) {
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0.3, Math.PI * 1.85);
          ctx.stroke();
        }
        break;
      }

      case 'sorting_taxonomy': {
        // Overlapping Venn Botanical Circles
        const colors = ['#90e0efaa', '#80ed99aa', '#ffd166aa'];
        const pts = [
          [0, -22],
          [-22, 16],
          [22, 16]
        ];
        pts.forEach(([ox, oy], i) => {
          ctx.fillStyle = colors[i];
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cx + ox, cy + oy, 32, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
        break;
      }

      case 'deduction_tracks': {
        // Animal Paw Print inside Magnifying Lens
        ctx.fillStyle = '#90e0ef';
        ctx.beginPath();
        ctx.ellipse(cx - 6, cy + 4, 18, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        for (const [tx, ty] of [
          [-22, -14],
          [-6, -20],
          [10, -14]
        ]) {
          ctx.beginPath();
          ctx.arc(cx + tx, cy + ty, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 4, 42, 0, Math.PI * 2);
        ctx.moveTo(cx + 24, cy + 26);
        ctx.lineTo(cx + 52, cy + 54);
        ctx.stroke();
        break;
      }

      case 'coding_fireflies': {
        // Connected Logic Nodes & Glowing Firefly Path
        const nodes = [
          [cx - 42, cy + 28],
          [cx, cy - 32],
          [cx + 42, cy + 28]
        ];
        ctx.strokeStyle = '#48cae4';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(nodes[0][0], nodes[0][1]);
        ctx.lineTo(nodes[1][0], nodes[1][1]);
        ctx.lineTo(nodes[2][0], nodes[2][1]);
        ctx.stroke();
        for (const [nx, ny] of nodes) {
          ctx.fillStyle = '#ffe66d';
          ctx.beginPath();
          ctx.arc(nx, ny, 15, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'symmetry_butterflies': {
        // Mirrored Butterfly Wings
        for (const side of [-1, 1]) {
          ctx.fillStyle = side < 0 ? '#90e0ef' : '#72efdd';
          ctx.strokeStyle = '#1f1209';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(cx + side * 28, cy - 14, 26, 32, side * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(cx + side * 22, cy + 22, 18, 22, -side * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        break;
      }

      case 'rhythm_melody': {
        // Singing Canopy Leaf & Beamed Eighth Notes
        this.drawVectorLyre(ctx, cx, cy, accentHex);
        break;
      }

      case 'harmony_chimes': {
        // Hanging Forest Wind Chimes
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(cx - 48, cy - 38);
        ctx.lineTo(cx + 48, cy - 38);
        ctx.stroke();
        const lens = [52, 68, 82, 60];
        lens.forEach((l, idx) => {
          const x = cx - 36 + idx * 24;
          ctx.fillStyle = idx % 2 === 0 ? '#80ed99' : '#90e0ef';
          ctx.strokeStyle = '#1f1209';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.roundRect(x - 7, cy - 32, 14, l, 6);
          ctx.fill();
          ctx.stroke();
        });
        break;
      }

      case 'color_alchemy': {
        // Artist Palette with Primary & Secondary Dewdrops
        ctx.fillStyle = '#e9c46a';
        ctx.strokeStyle = '#1f1209';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 56, 44, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const drops = [
          [-26, -12, '#e63946'],
          [0, -22, '#ffd166'],
          [26, -8, '#4cc9f0'],
          [16, 18, '#80ed99']
        ];
        for (const [dx, dy, col] of drops) {
          ctx.fillStyle = col as string;
          ctx.beginPath();
          ctx.arc(cx + (dx as number), cy + (dy as number), 11, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'constellation_myths': {
        // Connected Golden Star Constellation
        const stars = [
          [cx - 42, cy + 18],
          [cx - 12, cy - 28],
          [cx + 28, cy - 14],
          [cx + 44, cy + 26]
        ];
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        stars.forEach(([sx, sy], i) => {
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
        for (const [sx, sy] of stars) {
          this.drawRegularPolygon(ctx, sx, sy, 12, 5, '#ffd166');
        }
        break;
      }

      case 'origami_flora': {
        // Folded Geometric Origami Lotus/Leaf
        this.drawRegularPolygon(ctx, cx, cy + 8, 48, 3, '#80ed99');
        this.drawRegularPolygon(ctx, cx - 26, cy + 14, 34, 3, '#52b788');
        this.drawRegularPolygon(ctx, cx + 26, cy + 14, 34, 3, '#52b788');
        break;
      }

      case 'botanical_weaving': {
        // Interlaced Woven Vine Grid
        ctx.lineWidth = 10;
        for (let i = -1; i <= 1; i++) {
          ctx.strokeStyle = '#80ed99';
          ctx.beginPath();
          ctx.moveTo(cx - 48, cy + i * 26);
          ctx.lineTo(cx + 48, cy + i * 26);
          ctx.stroke();

          ctx.strokeStyle = '#ffd166';
          ctx.beginPath();
          ctx.moveTo(cx + i * 26, cy - 48);
          ctx.lineTo(cx + i * 26, cy + 48);
          ctx.stroke();
        }
        break;
      }
    }

    ctx.restore();
  }

  private static drawVectorAcorn(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    nutHex: string
  ): void {
    ctx.save();
    ctx.fillStyle = nutHex;
    ctx.strokeStyle = '#1f1209';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.2, r * 0.85, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#5c3a21';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.2, r * 0.95, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private static drawVectorGear(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    teeth: number,
    fillHex: string
  ): void {
    ctx.save();
    ctx.fillStyle = fillHex;
    ctx.strokeStyle = '#1f1209';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const steps = teeth * 2;
    for (let i = 0; i < steps; i++) {
      const r = i % 2 === 0 ? radius : radius * 0.78;
      const a = (i / steps) * Math.PI * 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#162418';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private static drawVectorCrystalCluster(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    _accentHex: string
  ): void {
    const crystals = [
      { ox: -34, oy: 6, w: 22, h: 64, rot: -0.24, col: '#52b788' },
      { ox: 34, oy: 6, w: 22, h: 64, rot: 0.24, col: '#e63946' },
      { ox: 0, oy: -6, w: 28, h: 84, rot: 0, col: '#4cc9f0' }
    ];

    for (const c of crystals) {
      ctx.save();
      ctx.translate(cx + c.ox, cy + c.oy);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.col;
      ctx.strokeStyle = '#1f1209';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(0, -c.h * 0.62);
      ctx.lineTo(c.w, -c.h * 0.15);
      ctx.lineTo(c.w * 0.75, c.h * 0.38);
      ctx.lineTo(-c.w * 0.75, c.h * 0.38);
      ctx.lineTo(-c.w, -c.h * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner crystal facet highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.beginPath();
      ctx.moveTo(0, -c.h * 0.56);
      ctx.lineTo(c.w * 0.45, -c.h * 0.12);
      ctx.lineTo(0, c.h * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private static drawVectorLyre(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    accentHex: string
  ): void {
    ctx.save();
    // Glowing emerald canopy leaf backdrop
    ctx.fillStyle = accentHex;
    ctx.strokeStyle = '#1f1209';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 46, cy + 36);
    ctx.quadraticCurveTo(cx - 52, cy - 42, cx + 44, cy - 46);
    ctx.quadraticCurveTo(cx + 42, cy + 44, cx - 46, cy + 36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crisp golden beamed eighth notes in the center
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#1f1209';
    ctx.lineWidth = 4;

    const n1x = cx - 20;
    const n2x = cx + 22;
    const ny = cy + 22;

    // Note stems & beam
    ctx.beginPath();
    ctx.roundRect(n1x + 4, cy - 32, 48, 12, 4);
    ctx.fill();
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(n1x + 8, ny);
    ctx.lineTo(n1x + 8, cy - 28);
    ctx.moveTo(n2x + 8, ny - 6);
    ctx.lineTo(n2x + 8, cy - 28);
    ctx.stroke();

    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#1f1209';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(n1x, ny, 14, 10, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(n2x, ny - 6, 14, 10, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private static drawRegularPolygon(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    sides: number,
    fillHex: string
  ): void {
    ctx.save();
    ctx.fillStyle = fillHex;
    ctx.strokeStyle = '#1f1209';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
