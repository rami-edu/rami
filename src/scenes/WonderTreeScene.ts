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

const UI_FONT_FAMILY =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

interface PortalInstance {
  anchor: TreeHollowAnchor;
  worldX: number;
  worldY: number;
  container: Phaser.GameObjects.Container;
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
  private pendingClickedPortal: PortalInstance | null = null;
  private readonly baseSpeed = 250;
  private readonly emojis = ['💡', '👍', '👏', '👋'];
  private stepSoundTimer = 0.2;

  constructor() {
    super({ key: 'WonderTreeScene' });
  }

  private getDpr(): number {
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
      if (!title || this.activeMinigame) return;

      const portal = this.portals.find((p) => p.anchor.minigame === title);
      if (portal) {
        void this.enterPortal(portal);
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

  /**
   * Dynamically creates and attaches an interactive tree-hole portal to a
   * `TreeHollowAnchor` generated by `DynamicWonderTree`.
   */
  private createDynamicPortalForAnchor(anchor: TreeHollowAnchor): void {
    if (this.portals.some((p) => p.anchor.minigame === anchor.minigame)) {
      return;
    }
    const theme = this.getPortalTheme(anchor.minigame);
    const activityLogoKey = ActivityLogoLibrary.getActivityLogoTexture(
      this,
      anchor.id.replace('portal_', '')
    );

    const container = this.add.container(0, 0).setDepth(15);

    // Warm inner tree-hole glow that blends with the hand-drawn bark cavity
    const innerHollowGlow = this.add
      .ellipse(0, 0, 58, 68, theme.glowColor, 0.28)
      .setStrokeStyle(2, theme.ringColor, 0.78);

    // Swirling portal wisps inside the carved tree hole
    const vortexWisps = this.add.graphics();
    vortexWisps.lineStyle(2, theme.ringColor, 0.75);
    for (let arm = 0; arm < 4; arm++) {
      const startAngle = (arm / 4) * Math.PI * 2;
      vortexWisps.beginPath();
      for (let s = 0; s <= 16; s++) {
        const t = s / 16;
        const r = 6 + t * 18;
        const a = startAngle + t * Math.PI * 1.4;
        const wx = Math.cos(a) * r;
        const wy = Math.sin(a) * r;
        if (s === 0) vortexWisps.moveTo(wx, wy);
        else vortexWisps.lineTo(wx, wy);
      }
      vortexWisps.strokePath();
    }

    const hitZone = this.add
      .circle(0, 0, 52, 0x000000, 0.01)
      .setInteractive({ useHandCursor: true });

    // Rectangular wooden sign on top of the portal (well-proportioned, not oversized)
    const SIGN_Y = -48;
    const SIGN_W = 74;
    const SIGN_H = 46;

    // Hanging twine/posts connecting the sign to the tree hollow rim
    const signHangers = this.add.graphics();
    signHangers.lineStyle(2, 0x8b5a2b, 0.85);
    signHangers.beginPath();
    signHangers.moveTo(-20, SIGN_Y + SIGN_H / 2);
    signHangers.lineTo(-18, -18);
    signHangers.moveTo(20, SIGN_Y + SIGN_H / 2);
    signHangers.lineTo(18, -18);
    signHangers.strokePath();

    // Wooden rectangular sign board
    const signBoard = this.add
      .rectangle(0, SIGN_Y, SIGN_W, SIGN_H, 0x1f2e22, 0.95)
      .setStrokeStyle(2, theme.ringColor, 0.9)
      .setInteractive({ useHandCursor: true });

    // Inner subtle inset border for the sign plate
    const signInner = this.add
      .rectangle(0, SIGN_Y, SIGN_W - 6, SIGN_H - 6)
      .setStrokeStyle(1, 0xd4a373, 0.4);

    // Sized comfortably inside the rectangular sign (48x38px, not oversized)
    const logoImg = this.add
      .image(0, SIGN_Y, activityLogoKey)
      .setDisplaySize(48, 38)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Text placed ABOVE the sign: NO box, NO background color
    const activeProfile = profileManager.getActiveProfile();
    const stats = activeProfile?.progress[anchor.minigame];
    const starsEarned = stats?.highestLevel ?? 0;
    const starsVisual = formatStarsVisual(starsEarned);

    const titleLabel = this.add
      .text(0, -88, anchor.minigame, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: '15px',
        color: '#f0fdf4',
        fontStyle: '700',
        stroke: '#08140c',
        strokeThickness: 3.5,
        shadow: {
          offsetX: 0,
          offsetY: 2,
          color: '#000000',
          blur: 4,
          stroke: true,
          fill: true
        },
        resolution: 2
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const subLabel = this.add
      .text(0, -70, starsVisual, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: '13px',
        color: '#ffd166',
        fontStyle: 'bold',
        stroke: '#08140c',
        strokeThickness: 3,
        shadow: {
          offsetX: 0,
          offsetY: 1,
          color: '#000000',
          blur: 3,
          stroke: true,
          fill: true
        },
        resolution: 2
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: innerHollowGlow,
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: 0.48,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: vortexWisps,
      rotation: Math.PI * 2,
      duration: 10000,
      repeat: -1
    });

    // Subtle gentle swaying for the sign board on top of the portal
    this.tweens.add({
      targets: [signBoard, signInner, logoImg],
      y: SIGN_Y - 3,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    container.add([
      innerHollowGlow,
      vortexWisps,
      hitZone,
      signHangers,
      signBoard,
      signInner,
      logoImg,
      titleLabel,
      subLabel
    ]);

    const instance: PortalInstance = {
      anchor,
      worldX: 0,
      worldY: 0,
      container,
      hitZone,
      subLabel
    };

    const onPortalClick = () => {
      if (!this.activeMinigame) {
        void this.enterPortal(instance);
      }
    };

    hitZone.on('pointerdown', onPortalClick);
    signBoard.on('pointerdown', onPortalClick);
    logoImg.on('pointerdown', onPortalClick);
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
    // Allow the tree to scale up generously to fill 92-95% of screen height and width
    const fitScaleX = (width * 0.95) / 1320;
    const fitScaleY = (height * 0.94) / 780;
    const treeScale = Math.max(0.6 * dpr, Math.min(fitScaleX, fitScaleY));
    const treeBaseX = width / 2;
    const treeBaseY = height - 28 * dpr;
    return { treeBaseX, treeBaseY, treeScale };
  }

  private getHorizontalWorldBounds(
    width: number,
    height: number
  ): { minWorldX: number; maxWorldX: number } {
    const { treeBaseX, treeScale } = this.getTreeTransform(width, height);
    const halfTreeWorldW =
      ((this.wonderTree?.getTotalLogicalWidth() ?? 1840) * 0.5) * treeScale;
    const minWorldX = Math.min(0, treeBaseX - halfTreeWorldW);
    const maxWorldX = Math.max(width, treeBaseX + halfTreeWorldW);
    return { minWorldX, maxWorldX };
  }

  private positionPortalInstance(
    p: PortalInstance,
    width: number,
    height: number
  ): void {
    const dpr = this.getDpr();
    const { treeBaseX, treeBaseY, treeScale } = this.getTreeTransform(
      width,
      height
    );
    const px = treeBaseX + p.anchor.localX * treeScale;
    const py = treeBaseY + p.anchor.localY * treeScale;
    p.worldX = px;
    p.worldY = py;
    // Keep portal badges & titles comfortably readable at native UI scale
    const portalUiScale = Math.max(treeScale, dpr * 1.05);
    p.container.setPosition(px, py).setScale(portalUiScale);
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

    this.nameLabel = this.add
      .text(0, 64, activeProfile?.nickname || activeProfile?.explorerName || userManager.getUsername(), {
        fontFamily: UI_FONT_FAMILY,
        fontSize: '15px',
        color: '#d8f3dc',
        fontStyle: '600',
        backgroundColor: '#162418dd',
        padding: { x: 12, y: 5 },
        resolution: 2
      })
      .setOrigin(0.5);

    this.emojiLabel = this.add
      .text(0, -78, '', {
        fontSize: '34px'
      })
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
        if (this.activeMinigame) return;

        // If the pointer clicked on an interactive object (e.g. a portal or sprout bud),
        // let that object's handler keep `pendingClickedPortal`.
        if (currentlyOver && currentlyOver.length > 0) {
          return;
        }

        // Also check if the tap/click landed inside any portal's tree hollow or emblem radius
        const dpr = this.getDpr();
        for (const p of this.portals) {
          const distToCenter = Phaser.Math.Distance.Between(
            pointer.worldX,
            pointer.worldY,
            p.worldX,
            p.worldY
          );
          const signWorldY = p.worldY - 48 * (p.container.scaleY || dpr);
          const distToSign = Phaser.Math.Distance.Between(
            pointer.worldX,
            pointer.worldY,
            p.worldX,
            signWorldY
          );
          if (distToCenter <= 65 * dpr || distToSign <= 65 * dpr) {
            this.pendingClickedPortal = p;
            this.targetPos = new Phaser.Math.Vector2(p.worldX, p.worldY);
            return;
          }
        }

        this.pendingClickedPortal = null;
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
    return Math.min(0, treeTopY);
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

    if (this.activeMinigame) return;

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
      this.pendingClickedPortal = null;
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

    // Only enter a portal if the user explicitly clicked on that portal
    if (this.pendingClickedPortal) {
      const targetPortal = this.pendingClickedPortal;
      const dist = Phaser.Math.Distance.Between(
        this.playerContainer.x,
        this.playerContainer.y,
        targetPortal.worldX,
        targetPortal.worldY
      );
      if (dist < 42 * dpr) {
        this.pendingClickedPortal = null;
        this.targetPos = null;
        this.enterPortal(targetPortal);
      }
    }
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
        const currentHud = document.getElementById('hud-overlay');
        if (currentHud) {
          currentHud.style.display = 'flex';
        }
        profileManager.recordMinigameCompletion(portal.anchor.minigame);

        const updatedProfile = profileManager.getActiveProfile();
        const pStats = updatedProfile?.progress[portal.anchor.minigame];
        const pStars = pStats?.highestLevel ?? 0;
        portal.subLabel?.setText(formatStarsVisual(pStars));

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
