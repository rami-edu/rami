import Phaser from 'phaser';
import { userManager } from '../managers/UserManager';
import { profileManager, ProfileManager } from '../managers/ProfileManager';
import { minigameLoader, formatStarsVisual } from '../managers/MinigameLoader';
import {
  DynamicWonderTree,
  TIER_ACTIVITIES,
  type TreeHollowAnchor
} from '../objects/DynamicWonderTree';
import { ActivityLogoLibrary } from '../objects/ActivityLogoLibrary';
import { audioManager } from '../managers/AudioManager';
import { activityOverlayManager } from '../managers/ActivityOverlayManager';
import { navigationManager } from '../managers/NavigationManager';

const UI_FONT_FAMILY =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

interface PortalInstance {
  anchor: TreeHollowAnchor;
  worldX: number;
  worldY: number;
  container: Phaser.GameObjects.Container;
  diskContainer?: Phaser.GameObjects.Container;
  staticLogoImg?: Phaser.GameObjects.Image;
  hitZone: Phaser.GameObjects.Arc;
  subLabel?: Phaser.GameObjects.Text;
}

interface Firefly {
  dot: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  normX: number;
  normY: number;
  speedX: number;
  speedY: number;
  phase: number;
}

/**
 * WonderTreeScene — Features a static enchanted forest backdrop (scrollFactor 0)
 * and an explicit, dynamically rendered hand-drawn Wonder Tree (`DynamicWonderTree`)
 * that grows upwards by generating new branch tiers and placing interactive
 * tree-hollow activity portals dynamically along its trunk and branches.
 */
export class WonderTreeScene extends Phaser.Scene {
  private bgImage!: Phaser.GameObjects.Image;
  private wonderTree!: DynamicWonderTree;
  private playerContainer!: Phaser.GameObjects.Container;
  private avatarSprite!: Phaser.GameObjects.Image;
  private nameLabel!: Phaser.GameObjects.Text;
  private emojiLabel!: Phaser.GameObjects.Text;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private targetPos: Phaser.Math.Vector2 | null = null;
  private portals: PortalInstance[] = [];
  private fireflies: Firefly[] = [];
  private activeMinigame = false;
  private isDashboardOpen = false;
  private isMovingToPortal = false;
  private readonly baseSpeed = 250;
  private readonly emojis = ['💡', '👍', '👏', '👋'];
  private stepSoundTimer = 0.2;

  constructor() {
    super({ key: 'WonderTreeScene' });
  }

  private getDpr(): number {
    if (this.scale && window.innerWidth > 0) {
      return this.scale.width / window.innerWidth;
    }
    return Math.min(window.devicePixelRatio || 1, 3);
  }

  public preload(): void {
    if (!this.textures.exists('forestBackground')) {
      this.load.image('forestBackground', './forest-background.jpg');
    }
    if (!this.textures.exists('minigameBackground')) {
      this.load.image('minigameBackground', './minigame-background.jpg');
    }
    for (const av of ProfileManager.ANIMAL_AVATARS) {
      if (!this.textures.exists(av.textureKey)) {
        this.load.image(av.textureKey, av.spritePath);
      }
    }
    const portalTextures = [
      { key: 'portal_geom_shapes', file: './portal-shape-nest.png' },
      { key: 'portal_color_bloom', file: './portal-color-bloom.png' },
      { key: 'portal_phonics_pond', file: './portal-phonics-pond.png' },
      { key: 'portal_creature_ladder', file: './portal-creature-ladder.png' },
      { key: 'portal_pattern_path', file: './portal-pattern-path.png' },
      { key: 'portal_shadow_match', file: './portal-shadow-match.png' },
      { key: 'portal_nature_sorting', file: './portal-nature-sorting.png' },
      { key: 'portal_symmetry_wings', file: './portal-symmetry-wings.png' }
    ];
    for (const pt of portalTextures) {
      if (!this.textures.exists(pt.key)) {
        this.load.image(pt.key, pt.file);
      }
    }
    for (let i = 1; i <= 10; i++) {
      const key = `tree_stage_${i}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `./tree-stage-${i}.png`);
      }
    }
  }

  public create(): void {
    const hudOverlay = document.getElementById('hud-overlay');
    if (hudOverlay) {
      hudOverlay.style.display = 'flex';
    }
    const playerBadge = document.getElementById('hud-player-badge');
    if (playerBadge) {
      playerBadge.style.display = 'flex';
    }

    // Pre-register all 3 main area emblems and all 20 high-res topic logos
    ActivityLogoLibrary.ensureAllLogosRegistered(this);

    this.portals = [];
    this.drawStaticForestBackground();
    this.createAmbientFireflies();

    // Create the explicit, dynamically rendered hand-drawn Camphor Wonder Tree
    // initialized with the active profile's currently unlocked activity tiers
    this.wonderTree = new DynamicWonderTree(
      this,
      this.getUnlockedActivityCount(),
      (anchor) => {
        this.createDynamicPortalForAnchor(anchor);
      },
      () => {
        this.layoutScene(this.scale.width, this.scale.height);
      }
    );

    // Ensure all stage sockets have their interactive portals created & registered
    for (const anchor of this.wonderTree.getAnchors()) {
      this.createDynamicPortalForAnchor(anchor);
    }

    this.createPlayer();
    this.setupControls();
    this.layoutScene(this.scale.width, this.scale.height);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      if (this.scene.isActive() && this.scene.isVisible()) {
        this.layoutScene(gameSize.width, gameSize.height);
      }
    });

    window.addEventListener('rami:profile-changed', (() => {
      const current = profileManager.getActiveProfile();
      if (this.nameLabel) {
        this.nameLabel.setText(current?.nickname || current?.explorerName || userManager.getUsername());
      }
      if (this.avatarSprite && current) {
        const desc = ProfileManager.getAvatarDescriptor(current.avatarId);
        this.avatarSprite.setTexture(desc.textureKey);
      }
      for (const p of this.portals) {
        const stats = current?.progress[p.anchor.minigame];
        const starsEarned = stats?.highestLevel ?? 0;
        p.subLabel?.setText(formatStarsVisual(starsEarned));
      }
      if (this.wonderTree) {
        this.wonderTree.syncUnlockedTiers(this.getUnlockedActivityCount(), true);
      }
    }) as EventListener);

    window.addEventListener('rami:launch-activity', ((e: Event) => {
      const customEvent = e as CustomEvent<{ activityTitle: string }>;
      const title = customEvent.detail?.activityTitle;
      if (!title || this.activeMinigame || this.isMovingToPortal) return;

      const portal = this.portals.find((p) => p.anchor.minigame === title);
      if (portal) {
        void this.moveToPortalAndEnter(portal);
      } else {
        // Direct launch for activities not yet anchored on current tree tier
        this.activeMinigame = true;
        const hudOverlay = document.getElementById('hud-overlay');
        if (hudOverlay) {
          hudOverlay.style.display = 'none';
        }
        this.scene.sleep('WonderTreeScene');

        void minigameLoader.loadMinigame(title).then((mod) => {
          activityOverlayManager.launch({
            module: mod,
            onExit: () => {
              this.activeMinigame = false;
              const currentHud = document.getElementById('hud-overlay');
              if (currentHud) {
                currentHud.style.display = 'flex';
              }
              profileManager.recordMinigameCompletion(title);
              this.scene.wake('WonderTreeScene');
              const unlockedCount = this.getUnlockedActivityCount();
              this.wonderTree.syncUnlockedTiers(unlockedCount, true);
              this.layoutScene(this.scale.width, this.scale.height);
            }
          });
        });
      }
    }) as EventListener);

    // Completely isolate tree interactions when Parent/Guardian Dashboard is open
    window.addEventListener('rami:dashboard-opened', () => {
      this.isDashboardOpen = true;
      this.isMovingToPortal = false;
      this.targetPos = null;
      this.tweens.killTweensOf(this.playerContainer);
      this.tweens.killTweensOf(this.avatarSprite);
      this.avatarSprite.y = 0;
      if (this.input) {
        this.input.enabled = false;
      }
      this.scene.sleep('WonderTreeScene');
    });

    window.addEventListener('rami:dashboard-closed', () => {
      this.isDashboardOpen = false;
      this.scene.wake('WonderTreeScene');
      if (this.input) {
        this.input.enabled = true;
      }
      const unlockedCount = this.getUnlockedActivityCount();
      this.wonderTree.syncUnlockedTiers(unlockedCount, true);
      this.layoutScene(this.scale.width, this.scale.height);
    });

    navigationManager.markSceneReady();
  }

  /**
   * Determines how many activity tiers are unlocked for the active profile.
   * Tier 0 (Acorn Scale) is always unlocked; each subsequent activity unlocks
   * automatically when the previous activity has been completed or leveled up.
   */
  private getUnlockedActivityCount(): number {
    const active = profileManager.getActiveProfile();
    if (!active) return 1;

    let unlocked = 1;
    for (let i = 0; i < TIER_ACTIVITIES.length - 1; i++) {
      const actName = TIER_ACTIVITIES[i].minigame;
      const stats = active.progress[actName];
      if (stats && (stats.completedCount > 0 || stats.highestLevel > 0)) {
        unlocked = i + 2;
      } else {
        break;
      }
    }
    return unlocked;
  }

  /**
   * Static forest background fixed to the camera viewport (`scrollFactor = 0`).
   */
  private drawStaticForestBackground(): void {
    const { width, height } = this.scale;
    this.bgImage = this.add
      .image(width / 2, height / 2, 'forestBackground')
      .setScrollFactor(0)
      .setDepth(0);
  }

  private createAmbientFireflies(): void {
    this.fireflies = [];
    const { width, height } = this.scale;
    const count = 22;

    for (let i = 0; i < count; i++) {
      const normX = 0.08 + Math.random() * 0.84;
      const normY = 0.12 + Math.random() * 0.78;
      const glow = this.add
        .circle(normX * width, normY * height, 10, 0xffe66d, 0.22)
        .setScrollFactor(0)
        .setDepth(3);
      const dot = this.add
        .circle(normX * width, normY * height, 3.2, 0xfff3b0, 0.9)
        .setScrollFactor(0)
        .setDepth(4);

      this.fireflies.push({
        dot,
        glow,
        normX,
        normY,
        speedX: (Math.random() - 0.5) * 0.018,
        speedY: (Math.random() - 0.5) * 0.014,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private getPortalTheme(minigame: string): {
    icon: string;
    ringColor: number;
    glowColor: number;
  } {
    if (minigame.includes('Shape') || minigame.includes('Acorn')) {
      return {
        icon: '📐',
        ringColor: 0xffd166,
        glowColor: 0xf4a261
      };
    }
    if (minigame.includes('Color')) {
      return {
        icon: '🎨',
        ringColor: 0xff99c8,
        glowColor: 0xec4899
      };
    }
    if (minigame.includes('Fruit') || minigame.includes('Harvest')) {
      return {
        icon: '🍎',
        ringColor: 0xe63946,
        glowColor: 0xf4a261
      };
    }
    if (minigame.includes('Symphony') || minigame.includes('Rhythm')) {
      return {
        icon: '🎵',
        ringColor: 0x80ed99,
        glowColor: 0x52b788
      };
    }
    if (minigame.includes('Phonics') || minigame.includes('Pond')) {
      return {
        icon: '🗣️',
        ringColor: 0x48cae4,
        glowColor: 0x0ea5e9
      };
    }
    if (minigame.includes('Ladder') || minigame.includes('Size')) {
      return {
        icon: '🪜',
        ringColor: 0xa7c957,
        glowColor: 0x84cc16
      };
    }
    if (minigame.includes('Pattern')) {
      return {
        icon: '🐾',
        ringColor: 0xf4a261,
        glowColor: 0xe76f51
      };
    }
    if (minigame.includes('Shadow') || minigame.includes('Clockwork')) {
      return {
        icon: '🔦',
        ringColor: 0x90e0ef,
        glowColor: 0x48cae4
      };
    }
    if (minigame.includes('Nature') || minigame.includes('Sorting')) {
      return {
        icon: '🧺',
        ringColor: 0x52b788,
        glowColor: 0x2a9d8f
      };
    }
    if (minigame.includes('Symmetry')) {
      return {
        icon: '🦋',
        ringColor: 0xc77dff,
        glowColor: 0x8b5cf6
      };
    }
    return {
      icon: '✨',
      ringColor: 0x90e0ef,
      glowColor: 0x48cae4
    };
  }

  private getPortalTextureKey(anchorId: string, minigameTitle: string): string {
    const cleanId = anchorId.replace('portal_', '');
    const directKey = `portal_${cleanId}`;
    if (this.textures.exists(directKey)) {
      return directKey;
    }
    const t = minigameTitle.toLowerCase();
    if (t.includes('shape') || t.includes('geom') || t.includes('acorn')) return 'portal_geom_shapes';
    if (t.includes('color') || t.includes('bloom')) return 'portal_color_bloom';
    if (t.includes('phonics') || t.includes('pond') || t.includes('rhythm')) return 'portal_phonics_pond';
    if (t.includes('creature') || t.includes('ladder') || t.includes('size')) return 'portal_creature_ladder';
    if (t.includes('pattern') || t.includes('path')) return 'portal_pattern_path';
    if (t.includes('shadow') || t.includes('echo') || t.includes('tower')) return 'portal_shadow_match';
    if (t.includes('nature') || t.includes('sort') || t.includes('harvest')) return 'portal_nature_sorting';
    if (t.includes('symmetry') || t.includes('wing') || t.includes('art')) return 'portal_symmetry_wings';
    return 'portal_geom_shapes';
  }

  /**
   * Dynamically creates and attaches an interactive tree-hole portal to a
   * `TreeHollowAnchor` generated by `DynamicWonderTree`.
   */
  private createDynamicPortalForAnchor(anchor: TreeHollowAnchor): void {
    const existing = this.portals.find((p) => p.anchor.minigame === anchor.minigame);
    if (existing) {
      existing.anchor = anchor;
      if (this.scale.width > 0) {
        this.positionPortalInstance(existing, this.scale.width, this.scale.height);
      }
      return;
    }
    const theme = this.getPortalTheme(anchor.minigame);
    const portalTexKey = this.getPortalTextureKey(anchor.id, anchor.minigame);

    const container = this.add.container(0, 0).setDepth(15);
    const diskContainer = this.add.container(0, 0);

    // 1. Ambient tree-hollow background aura / back glow
    const backGlow = this.add
      .ellipse(0, 0, 168, 168, theme.glowColor, 0.35);

    // 2. Carved dark wood / stone cavity rim
    const cavityRim = this.add.graphics();
    cavityRim.fillStyle(0x0f1c11, 0.95);
    cavityRim.fillCircle(0, 0, 80);
    cavityRim.lineStyle(4, 0x5c4033, 0.95);
    cavityRim.strokeCircle(0, 0, 80);
    cavityRim.lineStyle(2, theme.ringColor, 0.8);
    cavityRim.strokeCircle(0, 0, 76);

    // 3. Static round logo image of the activity (Twice as big: 144x144)
    const staticLogoImg = this.add
      .image(0, 0, portalTexKey)
      .setDisplaySize(144, 144)
      .setOrigin(0.5);

    // 4. Portal Light Animation (Placed OVER the static image with delicate transparency so artwork is crisp)
    // a) Swirling ethereal light vortex rays
    const lightVortex = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    lightVortex.lineStyle(1.6, theme.ringColor, 0.24);
    for (let arm = 0; arm < 4; arm++) {
      const startAngle = (arm / 4) * Math.PI * 2;
      lightVortex.beginPath();
      for (let s = 0; s <= 16; s++) {
        const t = s / 16;
        const r = 16 + t * 52;
        const a = startAngle + t * Math.PI * 1.5;
        const wx = Math.cos(a) * r;
        const wy = Math.sin(a) * r;
        if (s === 0) lightVortex.moveTo(wx, wy);
        else lightVortex.lineTo(wx, wy);
      }
      lightVortex.strokePath();
    }
    // Subtle white inner spiral
    lightVortex.lineStyle(1.2, 0xffffff, 0.2);
    for (let arm = 0; arm < 2; arm++) {
      const startAngle = (arm / 2) * Math.PI * 2 + Math.PI / 4;
      lightVortex.beginPath();
      for (let s = 0; s <= 12; s++) {
        const t = s / 12;
        const r = 10 + t * 40;
        const a = startAngle + t * Math.PI * 1.8;
        const wx = Math.cos(a) * r;
        const wy = Math.sin(a) * r;
        if (s === 0) lightVortex.moveTo(wx, wy);
        else lightVortex.lineTo(wx, wy);
      }
      lightVortex.strokePath();
    }

    // b) Ethereal counter-rotating rune ring around the outer rim
    const runeRing = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    runeRing.lineStyle(1.4, theme.ringColor, 0.28);
    const R_RUNE = 70;
    const NUM_SEGMENTS = 16;
    for (let i = 0; i < NUM_SEGMENTS; i += 2) {
      const a1 = (i / NUM_SEGMENTS) * Math.PI * 2;
      const a2 = ((i + 1) / NUM_SEGMENTS) * Math.PI * 2;
      runeRing.beginPath();
      runeRing.arc(0, 0, R_RUNE, a1, a2);
      runeRing.strokePath();
    }
    // Subtle star glints on outer rim
    runeRing.fillStyle(0xffffff, 0.35);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      runeRing.fillCircle(Math.cos(a) * R_RUNE, Math.sin(a) * R_RUNE, 2.5);
    }

    // c) Delicate, transparent radial sheen (keeps artwork completely visible)
    const lightSheen = this.add
      .ellipse(0, 0, 140, 140, theme.ringColor, 0.08)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Text placed cleanly above the round cavity rim: NO wooden box, NO background color
    // 4X super-sampled high-density typography with pristine anti-aliasing
    const TEXT_SUPERSAMPLE = 4;
    const activeProfile = profileManager.getActiveProfile();
    const stats = activeProfile?.progress[anchor.minigame];
    const starsEarned = stats?.highestLevel ?? 0;
    const starsVisual = formatStarsVisual(starsEarned);

    const displayTitle = anchor.minigame.replace(/\s*\(.*?\)/g, '').trim();

    const titleLabel = this.add
      .text(0, -106, displayTitle, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: `${16 * TEXT_SUPERSAMPLE}px`,
        color: '#f0fdf4',
        fontStyle: '700',
        stroke: '#08140c',
        strokeThickness: 3.5 * TEXT_SUPERSAMPLE,
        padding: { x: 10 * TEXT_SUPERSAMPLE, y: 5 * TEXT_SUPERSAMPLE },
        shadow: {
          offsetX: 0,
          offsetY: 2 * TEXT_SUPERSAMPLE,
          color: '#000000',
          blur: 3 * TEXT_SUPERSAMPLE,
          stroke: true,
          fill: true
        },
        resolution: 2
      })
      .setScale(1 / TEXT_SUPERSAMPLE)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const subLabel = this.add
      .text(0, -88, starsVisual, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: `${14 * TEXT_SUPERSAMPLE}px`,
        color: '#ffd166',
        fontStyle: 'bold',
        stroke: '#08140c',
        strokeThickness: 3 * TEXT_SUPERSAMPLE,
        padding: { x: 8 * TEXT_SUPERSAMPLE, y: 4 * TEXT_SUPERSAMPLE },
        shadow: {
          offsetX: 0,
          offsetY: 1 * TEXT_SUPERSAMPLE,
          color: '#000000',
          blur: 2 * TEXT_SUPERSAMPLE,
          stroke: true,
          fill: true
        },
        resolution: 2
      })
      .setScale(1 / TEXT_SUPERSAMPLE)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Full interactive hit area covering the round portal cavity and title
    const fullHitZone = this.add
      .rectangle(0, -15, 170, 200, 0x000000, 0.0001)
      .setInteractive({ useHandCursor: true });

    // Animations:
    // Back glow pulse
    this.tweens.add({
      targets: backGlow,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.52,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Swirling light vortex rotation over static image
    this.tweens.add({
      targets: lightVortex,
      rotation: Math.PI * 2,
      duration: 8500,
      repeat: -1
    });

    // Counter-rotating celestial rune ring over static image
    this.tweens.add({
      targets: runeRing,
      rotation: -Math.PI * 2,
      duration: 13000,
      repeat: -1
    });

    // Pulsing light sheen over static image
    this.tweens.add({
      targets: lightSheen,
      scaleX: 1.08,
      scaleY: 1.08,
      alpha: 0.15,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Interactive hover feedback on portal:
    const onHover = () => {
      this.tweens.killTweensOf(diskContainer);
      this.tweens.add({
        targets: diskContainer,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 180,
        ease: 'Back.easeOut'
      });
      this.tweens.add({
        targets: lightSheen,
        alpha: 0.22,
        duration: 180
      });
    };

    const onOut = () => {
      this.tweens.killTweensOf(diskContainer);
      this.tweens.add({
        targets: diskContainer,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 180,
        ease: 'Quad.easeOut'
      });
      this.tweens.add({
        targets: lightSheen,
        alpha: 0.08,
        duration: 180
      });
    };

    fullHitZone.on('pointerover', onHover);
    fullHitZone.on('pointerout', onOut);

    diskContainer.add([
      backGlow,
      cavityRim,
      staticLogoImg,
      lightVortex,
      runeRing,
      lightSheen
    ]);

    container.add([
      diskContainer,
      titleLabel,
      subLabel,
      fullHitZone
    ]);

    const instance: PortalInstance = {
      anchor,
      worldX: 0,
      worldY: 0,
      container,
      diskContainer,
      staticLogoImg,
      hitZone: fullHitZone as any,
      subLabel
    };

    const onPortalClick = () => {
      audioManager.unlockAudio();
      onOut();
      if (!this.activeMinigame && !this.isMovingToPortal) {
        void this.moveToPortalAndEnter(instance);
      }
    };

    fullHitZone.on('pointerdown', onPortalClick);
    staticLogoImg.setInteractive({ useHandCursor: true }).on('pointerdown', onPortalClick);
    titleLabel.on('pointerdown', onPortalClick);
    subLabel.on('pointerdown', onPortalClick);

    this.portals.push(instance);
    if (this.scale.width > 0) {
      this.positionPortalInstance(
        instance,
        this.scale.width,
        this.scale.height
      );
    }
  }

  private getTreeTransform(width: number, height: number): {
    treeBaseX: number;
    treeBaseY: number;
    treeScale: number;
  } {
    const dpr = this.getDpr();
    // Tree logical dimensions: 1400w x 1600h
    const fitScaleX = (width * 0.94) / DynamicWonderTree.LOGICAL_WIDTH;
    const fitScaleY = (height * 0.94) / DynamicWonderTree.LOGICAL_HEIGHT;
    const treeScale = Math.max(0.48 * dpr, Math.min(fitScaleX * 1.35, fitScaleY));
    const treeBaseX = width / 2;
    const treeBaseY = height - 20 * dpr;
    return { treeBaseX, treeBaseY, treeScale };
  }

  private getHorizontalWorldBounds(
    width: number,
    height: number
  ): { minWorldX: number; maxWorldX: number } {
    const { treeBaseX, treeScale } = this.getTreeTransform(width, height);
    const halfTreeWorldW =
      ((this.wonderTree?.getTotalLogicalWidth() ?? 1400) * 0.5) * treeScale;
    const minWorldX = Math.min(0, treeBaseX - halfTreeWorldW);
    const maxWorldX = Math.max(width, treeBaseX + halfTreeWorldW);
    return { minWorldX, maxWorldX };
  }

  private positionPortalInstance(
    p: PortalInstance,
    width: number,
    height: number
  ): void {
    const activeAnchor = this.wonderTree?.getAnchors().find((a) => a.minigame === p.anchor.minigame);
    if (!activeAnchor) {
      p.container.setVisible(false);
      if (p.hitZone && (p.hitZone as any).input) {
        (p.hitZone as any).input.enabled = false;
      }
      return;
    }
    p.anchor = activeAnchor;
    p.container.setVisible(true);
    if (p.hitZone && (p.hitZone as any).input) {
      (p.hitZone as any).input.enabled = true;
    }

    const dpr = this.getDpr();
    const { treeBaseX, treeBaseY, treeScale } = this.getTreeTransform(
      width,
      height
    );
    const px = treeBaseX + p.anchor.localX * treeScale;
    const py = treeBaseY + p.anchor.localY * treeScale;
    p.worldX = px;
    p.worldY = py;
    // Keep portal badges & hollows scaled proportionally with the tree
    const portalUiScale = Math.min(treeScale * 1.15, Math.max(treeScale * 0.95, dpr * 0.75));
    p.container.setPosition(px, py).setScale(portalUiScale);

    if (p.diskContainer) {
      this.tweens.killTweensOf(p.diskContainer);
      p.diskContainer.setScale(1.0);
    }
    if (p.staticLogoImg && p.staticLogoImg.active) {
      p.staticLogoImg.setDisplaySize(144, 144);
    }
  }

  private createPlayer(): void {
    const activeProfile = profileManager.getActiveProfile();
    const avatarDesc = ProfileManager.getAvatarDescriptor(
      activeProfile?.avatarId ?? activeProfile?.avatarEmoji
    );
    const { width, height } = this.scale;
    this.playerContainer = this.add
      .container(width * 0.5, height * 0.82)
      .setDepth(25);

    const shadow = this.add.ellipse(0, 48, 80, 26, 0x000000, 0.42);
    const outerGlow = this.add.circle(0, -6, 56, 0xffd166, 0.18);

    this.avatarSprite = this.add
      .image(0, -6, avatarDesc.textureKey)
      .setScale(0.52)
      .setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: this.avatarSprite,
      scaleY: 0.53,
      scaleX: 0.51,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const TEXT_SUPERSAMPLE = 4;
    this.nameLabel = this.add
      .text(
        0,
        64,
        activeProfile?.nickname ||
          activeProfile?.explorerName ||
          userManager.getUsername(),
        {
          fontFamily: UI_FONT_FAMILY,
          fontSize: `${15 * TEXT_SUPERSAMPLE}px`,
          color: '#d8f3dc',
          fontStyle: '600',
          backgroundColor: '#162418dd',
          padding: { x: 12 * TEXT_SUPERSAMPLE, y: 5 * TEXT_SUPERSAMPLE },
          resolution: 2
        }
      )
      .setScale(1 / TEXT_SUPERSAMPLE)
      .setOrigin(0.5);

    this.emojiLabel = this.add
      .text(0, -78, '', {
        fontSize: `${34 * TEXT_SUPERSAMPLE}px`,
        resolution: 2
      })
      .setScale(1 / TEXT_SUPERSAMPLE)
      .setOrigin(0.5);

    this.playerContainer.add([
      shadow,
      outerGlow,
      this.avatarSprite,
      this.nameLabel,
      this.emojiLabel
    ]);
  }

  private setupControls(): void {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };

      this.input.keyboard.on('keydown-ONE', () => this.showEmoji(this.emojis[0]));
      this.input.keyboard.on('keydown-TWO', () => this.showEmoji(this.emojis[1]));
      this.input.keyboard.on('keydown-THREE', () => this.showEmoji(this.emojis[2]));
      this.input.keyboard.on('keydown-FOUR', () => this.showEmoji(this.emojis[3]));
    }

    this.input.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[]
      ) => {
        audioManager.unlockAudio();
        if (this.activeMinigame || this.isDashboardOpen || this.isMovingToPortal) return;

        // If the pointer clicked on an interactive object (e.g. a portal or sprout bud),
        // let that object's handler handle it.
        if (currentlyOver && currentlyOver.length > 0) {
          return;
        }

        // Also check if the tap/click landed inside any portal's tree hollow or emblem radius
        const dpr = this.getDpr();
        for (const p of this.portals) {
          if (!p.container.visible) continue;
          const pScale = p.container.scaleY || dpr;
          const distToCenter = Phaser.Math.Distance.Between(
            pointer.worldX,
            pointer.worldY,
            p.worldX,
            p.worldY
          );
          if (distToCenter <= 95 * pScale) {
            void this.moveToPortalAndEnter(p);
            return;
          }
        }

        this.targetPos = new Phaser.Math.Vector2(
          pointer.worldX,
          pointer.worldY
        );
      }
    );
  }

  /**
   * Positions the static background, the explicit dynamic hand-drawn tree,
   * and all dynamically attached tree-hollow portals.
   */
  private layoutScene(width: number, height: number): void {
    const dpr = this.getDpr();

    if (this.bgImage) {
      const scaleX = width / this.bgImage.width;
      const scaleY = height / this.bgImage.height;
      const coverScale = Math.max(scaleX, scaleY);
      this.bgImage.setPosition(width / 2, height / 2).setScale(coverScale);
    }

    const { treeBaseX, treeBaseY, treeScale } = this.getTreeTransform(
      width,
      height
    );

    if (this.wonderTree) {
      this.wonderTree
        .getContainer()
        .setPosition(treeBaseX, treeBaseY)
        .setScale(treeScale);
    }

    for (const p of this.portals) {
      this.positionPortalInstance(p, width, height);
    }

    for (const f of this.fireflies) {
      f.dot.setScale(dpr);
      f.glow.setScale(dpr);
    }

    if (this.playerContainer) {
      this.playerContainer.setScale(dpr);
      const minY = this.getMinWorldY(width, height);
      const { minWorldX, maxWorldX } = this.getHorizontalWorldBounds(
        width,
        height
      );
      this.playerContainer.x = Phaser.Math.Clamp(
        this.playerContainer.x,
        minWorldX + 40 * dpr,
        maxWorldX - 40 * dpr
      );
      this.playerContainer.y = Phaser.Math.Clamp(
        this.playerContainer.y,
        minY + 60 * dpr,
        height - 55 * dpr
      );
    }
  }

  private getMinWorldY(width: number, height: number): number {
    if (!this.wonderTree) return 0;
    const { treeBaseY, treeScale } = this.getTreeTransform(width, height);
    const treeTopY =
      treeBaseY - this.wonderTree.getTotalLogicalHeight() * treeScale;
    return Math.min(0, treeTopY - 45 * this.getDpr());
  }

  public showEmoji(emoji: string): void {
    this.emojiLabel.setText(emoji);
    this.time.delayedCall(2000, () => {
      if (this.emojiLabel.text === emoji) {
        this.emojiLabel.setText('');
      }
    });
  }

  public update(time: number, delta: number): void {
    const { width, height } = this.scale;
    const dpr = this.getDpr();
    const dt = delta / 1000;

    // Animate drifting golden forest fireflies in static screen space
    for (const f of this.fireflies) {
      f.normX += f.speedX * dt;
      f.normY += f.speedY * dt;
      if (f.normX < 0.05 || f.normX > 0.95) f.speedX *= -1;
      if (f.normY < 0.08 || f.normY > 0.9) f.speedY *= -1;

      const fx = f.normX * width;
      const fy = f.normY * height;
      const pulse = 0.55 + 0.45 * Math.sin(time * 0.003 + f.phase);
      f.dot.setPosition(fx, fy).setAlpha(pulse);
      f.glow.setPosition(fx, fy).setAlpha(pulse * 0.28);
    }

    if (this.activeMinigame || this.isDashboardOpen) return;

    if (this.isMovingToPortal) {
      // Smoothly scroll camera to follow the avatar as they move towards the portal
      const minWorldY = this.getMinWorldY(width, height);
      const { minWorldX, maxWorldX } = this.getHorizontalWorldBounds(
        width,
        height
      );
      const desiredScrollX = Phaser.Math.Clamp(
        this.playerContainer.x - width * 0.5,
        minWorldX,
        Math.max(0, maxWorldX - width)
      );
      const desiredScrollY = Phaser.Math.Clamp(
        this.playerContainer.y - height * 0.62,
        minWorldY,
        0
      );
      this.cameras.main.scrollX = Phaser.Math.Linear(
        this.cameras.main.scrollX,
        desiredScrollX,
        Math.min(1, dt * 6)
      );
      this.cameras.main.scrollY = Phaser.Math.Linear(
        this.cameras.main.scrollY,
        desiredScrollY,
        Math.min(1, dt * 6)
      );
      return;
    }

    const speed = this.baseSpeed * dpr;
    let vx = 0;
    let vy = 0;

    if (this.cursors?.left.isDown || this.wasd?.A.isDown) vx -= 1;
    if (this.cursors?.right.isDown || this.wasd?.D.isDown) vx += 1;
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) vy -= 1;
    if (this.cursors?.down.isDown || this.wasd?.S.isDown) vy += 1;

    let isMoving = false;

    if (vx !== 0 || vy !== 0) {
      this.targetPos = null;
      const len = Math.hypot(vx, vy);
      this.playerContainer.x += (vx / len) * speed * dt;
      this.playerContainer.y += (vy / len) * speed * dt;
      if (vx < -0.05) this.avatarSprite.setFlipX(true);
      else if (vx > 0.05) this.avatarSprite.setFlipX(false);
      isMoving = true;
    } else if (this.targetPos) {
      const dx = this.targetPos.x - this.playerContainer.x;
      const dy = this.targetPos.y - this.playerContainer.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6 * dpr) {
        this.playerContainer.x += (dx / dist) * speed * dt;
        this.playerContainer.y += (dy / dist) * speed * dt;
        if (dx < -2) this.avatarSprite.setFlipX(true);
        else if (dx > 2) this.avatarSprite.setFlipX(false);
        isMoving = true;
      } else {
        this.targetPos = null;
      }
    }

    if (isMoving) {
      this.stepSoundTimer += dt;
      if (this.stepSoundTimer >= 0.23) {
        this.stepSoundTimer = 0;
        audioManager.playMoveStep();
      }
    } else {
      this.stepSoundTimer = 0.2;
    }

    const minWorldY = this.getMinWorldY(width, height);
    const { minWorldX, maxWorldX } = this.getHorizontalWorldBounds(
      width,
      height
    );
    this.playerContainer.x = Phaser.Math.Clamp(
      this.playerContainer.x,
      minWorldX + 40 * dpr,
      maxWorldX - 40 * dpr
    );
    this.playerContainer.y = Phaser.Math.Clamp(
      this.playerContainer.y,
      minWorldY + 60 * dpr,
      height - 55 * dpr
    );

    // Smoothly scroll camera horizontally and vertically to view the full sides and crown of the tree
    const desiredScrollX = Phaser.Math.Clamp(
      this.playerContainer.x - width * 0.5,
      minWorldX,
      Math.max(0, maxWorldX - width)
    );
    const desiredScrollY = Phaser.Math.Clamp(
      this.playerContainer.y - height * 0.62,
      minWorldY,
      0
    );
    this.cameras.main.scrollX = Phaser.Math.Linear(
      this.cameras.main.scrollX,
      desiredScrollX,
      Math.min(1, dt * 6)
    );
    this.cameras.main.scrollY = Phaser.Math.Linear(
      this.cameras.main.scrollY,
      desiredScrollY,
      Math.min(1, dt * 6)
    );

  }

  /**
   * Smoothly navigates the player avatar towards the selected activity portal,
   * playing footstep audio and bobbing animations, before entering the portal.
   */
  private async moveToPortalAndEnter(portal: PortalInstance): Promise<void> {
    if (this.activeMinigame || this.isMovingToPortal || this.isDashboardOpen) return;
    this.isMovingToPortal = true;
    this.targetPos = null;

    const dpr = this.getDpr();
    const startX = this.playerContainer.x;
    const startY = this.playerContainer.y;
    const targetX = portal.worldX;
    const targetY = portal.worldY;

    const dist = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);

    // If already right beside the portal cavity, transition immediately
    if (dist < 28 * dpr) {
      this.isMovingToPortal = false;
      await this.enterPortal(portal);
      return;
    }

    // Orient avatar sprite towards the portal
    if (targetX < startX - 2) {
      this.avatarSprite.setFlipX(true);
    } else if (targetX > startX + 2) {
      this.avatarSprite.setFlipX(false);
    }

    // Lively transit duration (between 380ms and 850ms)
    const duration = Phaser.Math.Clamp((dist / (500 * dpr)) * 1000, 380, 850);

    let stepTimer = 0;

    // Cheerful hop/bounce animation while travelling across branches
    const hopTween = this.tweens.add({
      targets: this.avatarSprite,
      y: -12 * dpr,
      duration: 150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: this.playerContainer,
        x: targetX,
        y: targetY,
        duration,
        ease: 'Cubic.easeInOut',
        onUpdate: () => {
          stepTimer += 16;
          if (stepTimer >= 170) {
            stepTimer = 0;
            audioManager.playMoveStep();
          }
        },
        onComplete: () => {
          hopTween.stop();
          this.avatarSprite.y = 0;
          resolve();
        }
      });
    });

    this.isMovingToPortal = false;
    await this.enterPortal(portal);
  }

  /**
   * Plays an expanding, spinning vortex swirl animation centered on the portal
   * while pulling the player avatar into the portal.
   */
  private playSwirlingPortalTransition(
    portalX: number,
    portalY: number
  ): Promise<Phaser.GameObjects.Container> {
    return new Promise((resolve) => {
      const { width, height } = this.scale;
      const dpr = this.getDpr();
      const maxDim = Math.hypot(width, height);

      const swirlContainer = this.add
        .container(portalX, portalY)
        .setDepth(85);

      const veil = this.add
        .circle(0, 0, maxDim, 0x0b160e, 0)
        .setOrigin(0.5);
      swirlContainer.add(veil);

      this.tweens.add({
        targets: veil,
        fillAlpha: 0.96,
        duration: 850,
        ease: 'Sine.easeIn'
      });

      const vortexArms = this.add.graphics();
      const ringColors = [0x95d5b2, 0x52b788, 0x74c69d, 0xffd166, 0x40916c];
      for (let arm = 0; arm < 6; arm++) {
        const baseAngle = (arm / 6) * Math.PI * 2;
        const color = ringColors[arm % ringColors.length];
        vortexArms.lineStyle(5 * dpr, color, 0.85);
        vortexArms.beginPath();
        for (let step = 0; step <= 45; step++) {
          const t = step / 45;
          const r = t * 240 * dpr;
          const theta = baseAngle + t * Math.PI * 3.5;
          const sx = Math.cos(theta) * r;
          const sy = Math.sin(theta) * r;
          if (step === 0) {
            vortexArms.moveTo(sx, sy);
          } else {
            vortexArms.lineTo(sx, sy);
          }
        }
        vortexArms.strokePath();

        const orbDist = (45 + arm * 28) * dpr;
        const orb = this.add.circle(
          Math.cos(baseAngle) * orbDist,
          Math.sin(baseAngle) * orbDist,
          7 * dpr,
          0xffd166,
          0.9
        );
        swirlContainer.add(orb);
      }

      swirlContainer.add(vortexArms);
      swirlContainer.setScale(0.15);

      this.tweens.add({
        targets: swirlContainer,
        rotation: Math.PI * 3.5,
        scale: (maxDim / (220 * dpr)) * 1.15,
        duration: 950,
        ease: 'Cubic.easeIn'
      });

      this.tweens.add({
        targets: this.playerContainer,
        x: portalX,
        y: portalY,
        scale: 0.05,
        rotation: Math.PI * 4,
        duration: 850,
        ease: 'Back.easeIn'
      });

      this.time.delayedCall(950, () => {
        resolve(swirlContainer);
      });
    });
  }

  private async enterPortal(portal: PortalInstance): Promise<void> {
    this.activeMinigame = true;
    this.isMovingToPortal = false;
    this.targetPos = null;

    audioManager.playPortalEnter();

    const [swirlOverlay, mod] = await Promise.all([
      this.playSwirlingPortalTransition(portal.worldX, portal.worldY),
      minigameLoader.loadMinigame(portal.anchor.minigame)
    ]);

    swirlOverlay.destroy();
    const dpr = this.getDpr();
    this.playerContainer.setRotation(0).setScale(dpr);

    // Hide global HUD overlay (no parent dashboard, no player badge) inside activities
    const hudOverlay = document.getElementById('hud-overlay');
    if (hudOverlay) {
      hudOverlay.style.display = 'none';
    }

    this.scene.sleep('WonderTreeScene');

    activityOverlayManager.launch({
      module: mod,
      onExit: () => {
        this.activeMinigame = false;
        this.isMovingToPortal = false;
        const currentHud = document.getElementById('hud-overlay');
        if (currentHud) {
          currentHud.style.display = 'flex';
        }
        profileManager.recordMinigameCompletion(portal.anchor.minigame);

        const updatedProfile = profileManager.getActiveProfile();
        const pStats = updatedProfile?.progress[portal.anchor.minigame];
        const pStars = pStats?.highestLevel ?? 0;
        portal.subLabel?.setText(formatStarsVisual(pStars));

        for (const p of this.portals) {
          if (p.diskContainer) {
            this.tweens.killTweensOf(p.diskContainer);
            p.diskContainer.setScale(1.0);
          }
          if (p.staticLogoImg && p.staticLogoImg.active) {
            p.staticLogoImg.setDisplaySize(144, 144);
          }
        }

        this.scene.wake('WonderTreeScene');

        // Automatically grow the tree upwards if a new activity was unlocked
        const unlockedCount = this.getUnlockedActivityCount();
        this.wonderTree.syncUnlockedTiers(unlockedCount, true);

        this.layoutScene(this.scale.width, this.scale.height);
        this.playReturnPortalArrival(portal.worldX, portal.worldY);
      }
    });
  }

  /**
   * Plays the reverse (collapsing, counter-clockwise) golden-celestial portal
   * vortex on the main WonderTreeScene when the player returns from an activity.
   */
  private playReturnPortalArrival(portalX: number, portalY: number): void {
    audioManager.playPortalReturn();

    const { width, height } = this.scale;
    const dpr = this.getDpr();
    const maxDim = Math.hypot(width, height);

    const swirlContainer = this.add.container(portalX, portalY).setDepth(85);
    const vortexArms = this.add.graphics();
    const returnColors = [0xffd166, 0x48cae4, 0xf4a261, 0x90e0ef, 0xffe66d];

    for (let arm = 0; arm < 6; arm++) {
      const baseAngle = (arm / 6) * Math.PI * 2;
      const color = returnColors[arm % returnColors.length];
      vortexArms.lineStyle(5 * dpr, color, 0.9);
      vortexArms.beginPath();
      for (let step = 0; step <= 45; step++) {
        const t = step / 45;
        const r = t * 240 * dpr;
        const theta = baseAngle - t * Math.PI * 3.5;
        const sx = Math.cos(theta) * r;
        const sy = Math.sin(theta) * r;
        if (step === 0) {
          vortexArms.moveTo(sx, sy);
        } else {
          vortexArms.lineTo(sx, sy);
        }
      }
      vortexArms.strokePath();
    }

    swirlContainer.add(vortexArms);
    swirlContainer.setScale((maxDim / (220 * dpr)) * 0.9);

    this.playerContainer
      .setPosition(portalX, portalY)
      .setScale(0.05)
      .setRotation(-Math.PI * 3);

    this.tweens.add({
      targets: swirlContainer,
      rotation: -Math.PI * 3,
      scale: 0.05,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => swirlContainer.destroy()
    });

    this.tweens.add({
      targets: this.playerContainer,
      scale: dpr,
      rotation: 0,
      duration: 650,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.activeMinigame = false;
      }
    });
  }
}
