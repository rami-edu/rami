import Phaser from 'phaser';

export type KnowledgeTagId =
  | 'mathematics'
  | 'music'
  | 'language'
  | 'painting'
  | 'science'
  | 'logic'
  | 'motor_skills';

export interface KnowledgeTagDefinition {
  id: KnowledgeTagId;
  name: string;
  shortName: string;
  description: string;
  colorHex: string;
  bgHex: string;
  borderHex: string;
  iconSymbol: string;
}

export const KNOWLEDGE_TAGS: Record<KnowledgeTagId, KnowledgeTagDefinition> = {
  mathematics: {
    id: 'mathematics',
    name: 'Mathematics',
    shortName: 'Math',
    description: 'Shapes, quantities, counting, and early geometric thinking.',
    colorHex: '#ffd166',
    bgHex: '#3d2c06',
    borderHex: '#f59e0b',
    iconSymbol: '📐'
  },
  music: {
    id: 'music',
    name: 'Music & Rhythm',
    shortName: 'Music',
    description: 'Auditory discrimination, melodic echoes, and rhythmic timing.',
    colorHex: '#80ed99',
    bgHex: '#083319',
    borderHex: '#10b981',
    iconSymbol: '🎵'
  },
  language: {
    id: 'language',
    name: 'Language & Phonics',
    shortName: 'Language',
    description: 'Pre-reading phonological awareness, animal calls, and sound cues.',
    colorHex: '#90e0ef',
    bgHex: '#0b2b3a',
    borderHex: '#0ea5e9',
    iconSymbol: '🗣️'
  },
  painting: {
    id: 'painting',
    name: 'Painting & Colors',
    shortName: 'Art',
    description: 'Color theory, chromatic mixing, bilateral symmetry, and visual art.',
    colorHex: '#ff99c8',
    bgHex: '#3b0d23',
    borderHex: '#ec4899',
    iconSymbol: '🎨'
  },
  science: {
    id: 'science',
    name: 'Natural Science',
    shortName: 'Science',
    description: 'Flora, fauna, habitats, weather, shadows, and living organisms.',
    colorHex: '#48cae4',
    bgHex: '#04282e',
    borderHex: '#06b6d4',
    iconSymbol: '🌿'
  },
  logic: {
    id: 'logic',
    name: 'Logic & Reasoning',
    shortName: 'Logic',
    description: 'Seriation, classification, ABAB sequencing, and form constancy.',
    colorHex: '#c77dff',
    bgHex: '#250c38',
    borderHex: '#8b5cf6',
    iconSymbol: '🧩'
  },
  motor_skills: {
    id: 'motor_skills',
    name: 'Fine Motor Skills',
    shortName: 'Motor',
    description: 'Coordination, drag-and-drop precision, rotation, and spatial control.',
    colorHex: '#a7c957',
    bgHex: '#1f2d08',
    borderHex: '#84cc16',
    iconSymbol: '✋'
  }
};

/**
 * Generator for circular, iconic knowledge area badges (64x64 vector/canvas textures).
 */
export class ActivityBadgeLibrary {
  private static readonly BADGE_SIZE = 64;

  public static getKnowledgeTagBadgeTexture(
    scene: Phaser.Scene,
    tagId: KnowledgeTagId
  ): string {
    const texKey = `badge_tag_${tagId}`;
    if (scene.textures.exists(texKey)) {
      return texKey;
    }

    const size = ActivityBadgeLibrary.BADGE_SIZE;
    const canvasTex = scene.textures.createCanvas(texKey, size, size);
    const ctx = canvasTex?.getContext();
    const tag = KNOWLEDGE_TAGS[tagId];

    if (ctx && canvasTex && tag) {
      ctx.save();
      const center = size / 2;
      const radius = size * 0.45;

      // Outer glow & circular rim
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = tag.bgHex;
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = tag.borderHex;
      ctx.stroke();

      // Inner decorative ring
      ctx.beginPath();
      ctx.arc(center, center, radius - 4, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = tag.colorHex;
      ctx.stroke();

      // Iconic symbol
      this.drawBadgeSymbol(ctx, center, center, tagId, tag.colorHex);

      ctx.restore();
      canvasTex.refresh();
    }

    return texKey;
  }

  private static drawBadgeSymbol(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    tagId: KnowledgeTagId,
    colorHex: string
  ): void {
    ctx.save();
    ctx.fillStyle = colorHex;
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (tagId) {
      case 'mathematics': {
        // Triangle & Square geometric shapes
        ctx.beginPath();
        ctx.moveTo(cx, cy - 13);
        ctx.lineTo(cx + 12, cy + 8);
        ctx.lineTo(cx - 12, cy + 8);
        ctx.closePath();
        ctx.stroke();

        ctx.fillRect(cx - 4, cy - 2, 8, 8);
        break;
      }
      case 'music': {
        // Dual musical eighth notes with beam
        ctx.beginPath();
        ctx.arc(cx - 7, cy + 6, 4.5, 0, Math.PI * 2);
        ctx.arc(cx + 7, cy + 3, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx - 3, cy + 6);
        ctx.lineTo(cx - 3, cy - 8);
        ctx.lineTo(cx + 11, cy - 11);
        ctx.lineTo(cx + 11, cy + 3);
        ctx.stroke();

        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 8);
        ctx.lineTo(cx + 11, cy - 11);
        ctx.stroke();
        break;
      }
      case 'language': {
        // Open book with speech ripple
        ctx.beginPath();
        ctx.moveTo(cx, cy - 5);
        ctx.quadraticCurveTo(cx - 6, cy - 10, cx - 12, cy - 8);
        ctx.lineTo(cx - 12, cy + 7);
        ctx.quadraticCurveTo(cx - 6, cy + 5, cx, cy + 10);
        ctx.quadraticCurveTo(cx + 6, cy + 5, cx + 12, cy + 7);
        ctx.lineTo(cx + 12, cy - 8);
        ctx.quadraticCurveTo(cx + 6, cy - 10, cx, cy - 5);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, cy - 5);
        ctx.lineTo(cx, cy + 10);
        ctx.stroke();
        break;
      }
      case 'painting': {
        // Painter palette with brush
        ctx.beginPath();
        ctx.arc(cx - 2, cy - 2, 12, 0.4, Math.PI * 1.8);
        ctx.quadraticCurveTo(cx + 10, cy + 6, cx - 2, cy + 10);
        ctx.stroke();

        // 3 paint dabs
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 5, 2.5, 0, Math.PI * 2);
        ctx.arc(cx, cy - 8, 2.5, 0, Math.PI * 2);
        ctx.arc(cx + 5, cy - 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'science': {
        // Sprouting nature leaf with atom orb
        ctx.beginPath();
        ctx.moveTo(cx, cy + 11);
        ctx.quadraticCurveTo(cx - 10, cy + 2, cx - 1, cy - 11);
        ctx.quadraticCurveTo(cx + 10, cy + 2, cx, cy + 11);
        ctx.fill();

        ctx.strokeStyle = '#04282e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy + 9);
        ctx.lineTo(cx, cy - 6);
        ctx.stroke();
        break;
      }
      case 'logic': {
        // Puzzle piece with interlocking tab
        const s = 9;
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s);
        ctx.lineTo(cx - 2, cy - s);
        ctx.arc(cx, cy - s, 3.5, Math.PI, 0, false);
        ctx.lineTo(cx + s, cy - s);
        ctx.lineTo(cx + s, cy - 2);
        ctx.arc(cx + s, cy, 3.5, -Math.PI / 2, Math.PI / 2, false);
        ctx.lineTo(cx + s, cy + s);
        ctx.lineTo(cx - s, cy + s);
        ctx.closePath();
        ctx.stroke();
        break;
      }
      case 'motor_skills': {
        // Hand with outstretched fingertips
        ctx.beginPath();
        ctx.arc(cx, cy + 4, 7, 0, Math.PI);
        ctx.stroke();

        // 4 fingers
        const fingers = [-6, -2, 2, 6];
        fingers.forEach((fx, i) => {
          const h = i === 1 || i === 2 ? 14 : 10;
          ctx.beginPath();
          ctx.moveTo(cx + fx, cy + 3);
          ctx.lineTo(cx + fx, cy + 3 - h);
          ctx.stroke();
        });
        break;
      }
    }

    ctx.restore();
  }

  /**
   * Pre-registers all knowledge tag badge textures in Phaser's texture cache.
   */
  public static ensureAllBadgesRegistered(scene: Phaser.Scene): void {
    (Object.keys(KNOWLEDGE_TAGS) as KnowledgeTagId[]).forEach((tagId) => {
      this.getKnowledgeTagBadgeTexture(scene, tagId);
    });
  }
}
