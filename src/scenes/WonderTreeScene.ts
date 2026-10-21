import Phaser from 'phaser';
import { userManager } from '../managers/UserManager';
import { profileManager, ProfileManager } from '../managers/ProfileManager';
import { minigameLoader } from '../managers/MinigameLoader';
import { MinigameActivityScene } from './MinigameActivityScene';

interface WorldNode {
  id: string;
  type: string;
  x: number;
  y: number;
}

interface WorldPortal {
  id: string;
  minigame: string;
  x: number;
  y: number;
}

interface WorldData {
  nodes: WorldNode[];
  portals: WorldPortal[];
}

interface PortalInstance {
  data: WorldPortal;
  normX: number;
  normY: number;
  container: Phaser.GameObjects.Container;
  hitZone: Phaser.GameObjects.Arc;
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
 * WonderTreeScene — Client-only, local-first isometric 2D hub featuring the
 * hand-painted Wonder Tree sanctuary, animated lantern portals aligned with
 * the treehouse nooks, drifting golden fireflies, and native HiDPI rendering.
 */
export class WonderTreeScene extends Phaser.Scene {
  private bgImage!: Phaser.GameObjects.Image;
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
  private cooldownPortalId: string | null = null;
  private readonly baseSpeed = 230;
  private readonly emojis = ['💡', '👍', '👏', '👋'];

  constructor() {
    super({ key: 'WonderTreeScene' });
  }

  private getDpr(): number {
    return Math.min(window.devicePixelRatio || 1, 3);
  }

  public preload(): void {
    this.load.json('worldData', './world.json');
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
    const world: WorldData = this.cache.json.get('worldData') ?? {
      nodes: [
        { id: 'root_01', type: 'BigRoot', x: 640, y: 600 },
        { id: 'branch_left', type: 'Branch', x: 460, y: 460 },
        { id: 'branch_right', type: 'Branch', x: 850, y: 240 }
      ],
      portals: [
        { id: 'portal_math', minigame: 'Acorn Scale', x: 455, y: 470 },
        { id: 'portal_hub', minigame: 'The Clockwork Tower', x: 680, y: 335 },
        { id: 'portal_music', minigame: 'Rhythm in the Branches', x: 865, y: 235 }
      ]
    };

    this.drawForestBackground();
    this.createAmbientFireflies();
    this.createPortals(world.portals);
    this.createPlayer();
    this.setupControls();
    this.layoutScene(this.scale.width, this.scale.height);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      if (this.scene.isActive() && this.scene.isVisible()) {
        this.layoutScene(gameSize.width, gameSize.height);
      }
    });

    window.addEventListener('rami:profile-changed', (() => {
      const active = profileManager.getActiveProfile();
      if (this.nameLabel) {
        this.nameLabel.setText(active?.explorerName ?? userManager.getUsername());
      }
      if (this.avatarSprite && active) {
        const desc = ProfileManager.getAvatarDescriptor(active.avatarId);
        this.avatarSprite.setTexture(desc.textureKey);
      }
    }) as EventListener);
  }

  private drawForestBackground(): void {
    const { width, height } = this.scale;
    this.bgImage = this.add
      .image(width / 2, height / 2, 'forestBackground')
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
        .setDepth(3);
      const dot = this.add
        .circle(normX * width, normY * height, 3.2, 0xfff3b0, 0.9)
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
    subtitle: string;
  } {
    if (minigame.includes('Acorn')) {
      return {
        icon: '⚖️',
        ringColor: 0xffd166,
        glowColor: 0xf4a261,
        subtitle: 'Math Cottage'
      };
    }
    if (minigame.includes('Rhythm')) {
      return {
        icon: '🎵',
        ringColor: 0x80ed99,
        glowColor: 0x52b788,
        subtitle: 'Canopy Stage'
      };
    }
    return {
      icon: '🔮',
      ringColor: 0x90e0ef,
      glowColor: 0x48cae4,
      subtitle: 'Memory Hollow'
    };
  }

  private createPortals(portalDefs: WorldPortal[]): void {
    this.portals = [];
    for (const p of portalDefs) {
      const normX = p.x / 1280;
      const normY = p.y / 720;
      const theme = this.getPortalTheme(p.minigame);

      const container = this.add.container(p.x, p.y).setDepth(10);

      // Soft outer golden-emerald aura
      const outerAura = this.add.circle(0, 0, 44, theme.glowColor, 0.22);

      // Rotating ornate rune ring
      const runeRing = this.add.graphics();
      runeRing.lineStyle(2.5, theme.ringColor, 0.85);
      runeRing.strokeCircle(0, 0, 34);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        runeRing.fillStyle(0xfff3b0, 0.95);
        runeRing.fillCircle(Math.cos(angle) * 34, Math.sin(angle) * 34, 3);
      }

      // Warm lantern medallion core
      const hitZone = this.add
        .circle(0, 0, 27, 0x162418, 0.78)
        .setStrokeStyle(3, theme.ringColor)
        .setInteractive({ useHandCursor: true });

      const iconText = this.add
        .text(0, 0, theme.icon, { fontSize: '26px' })
        .setOrigin(0.5);

      // Storybook wooden sign banner above the portal
      const bannerBg = this.add
        .rectangle(0, -56, 195, 38, 0x1b2e1e, 0.92)
        .setStrokeStyle(2, theme.ringColor);

      const titleLabel = this.add
        .text(0, -62, p.minigame, {
          fontSize: '13px',
          color: '#fff3b0',
          fontStyle: 'bold'
        })
        .setOrigin(0.5);

      const subLabel = this.add
        .text(0, -47, `✨ ${theme.subtitle}`, {
          fontSize: '10px',
          color: '#b7e4c7'
        })
        .setOrigin(0.5);

      // Gentle breathing & rotation tweens
      this.tweens.add({
        targets: outerAura,
        scale: 1.24,
        alpha: 0.42,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.tweens.add({
        targets: runeRing,
        rotation: Math.PI * 2,
        duration: 14000,
        repeat: -1
      });

      container.add([
        outerAura,
        runeRing,
        hitZone,
        iconText,
        bannerBg,
        titleLabel,
        subLabel
      ]);

      const instance: PortalInstance = {
        data: { ...p },
        normX,
        normY,
        container,
        hitZone
      };

      hitZone.on('pointerdown', () => {
        if (!this.activeMinigame) {
          this.targetPos = new Phaser.Math.Vector2(
            instance.data.x,
            instance.data.y
          );
        }
      });

      this.portals.push(instance);
    }
  }

  private createPlayer(): void {
    const activeProfile = profileManager.getActiveProfile();
    const avatarDesc = ProfileManager.getAvatarDescriptor(
      activeProfile?.avatarId ?? activeProfile?.avatarEmoji
    );
    const { width, height } = this.scale;
    this.playerContainer = this.add
      .container(width * 0.5, height * 0.78)
      .setDepth(20);

    const shadow = this.add.ellipse(0, 38, 62, 20, 0x000000, 0.42);
    const outerGlow = this.add.circle(0, -4, 42, 0xffd166, 0.16);

    this.avatarSprite = this.add
      .image(0, -6, avatarDesc.textureKey)
      .setScale(0.38)
      .setOrigin(0.5, 0.5);

    // Subtle idle breathing animation on the sprite
    this.tweens.add({
      targets: this.avatarSprite,
      scaleY: 0.4,
      scaleX: 0.37,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.nameLabel = this.add
      .text(0, 54, activeProfile?.explorerName ?? userManager.getUsername(), {
        fontSize: '13px',
        color: '#fff3b0',
        fontStyle: 'bold',
        backgroundColor: '#162418dd',
        padding: { x: 8, y: 3 }
      })
      .setOrigin(0.5);

    this.emojiLabel = this.add
      .text(0, -64, '', {
        fontSize: '28px'
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

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.activeMinigame) return;
      this.targetPos = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });
  }

  /**
   * Computes background image placement and maps normalized (0..1) tree coordinates
   * directly onto the rendered Wonder Tree artwork so portals stay anchored to the
   * treehouse nooks across both landscape and portrait screens.
   */
  private layoutScene(width: number, height: number): void {
    const dpr = this.getDpr();

    let bgLeft = 0;
    let bgTop = 0;
    let renderedW = width;
    let renderedH = height;

    if (this.bgImage) {
      const scaleX = width / this.bgImage.width;
      const scaleY = height / this.bgImage.height;
      const coverScale = Math.max(scaleX, scaleY);
      this.bgImage.setPosition(width / 2, height / 2).setScale(coverScale);

      renderedW = this.bgImage.width * coverScale;
      renderedH = this.bgImage.height * coverScale;
      bgLeft = width / 2 - renderedW / 2;
      bgTop = height / 2 - renderedH / 2;
    }

    for (const p of this.portals) {
      // Anchor portals to the Wonder Tree nooks, clamped safely inside the screen
      const rawX = bgLeft + p.normX * renderedW;
      const rawY = bgTop + p.normY * renderedH;
      const px = Phaser.Math.Clamp(rawX, 95 * dpr, width - 95 * dpr);
      const py = Phaser.Math.Clamp(rawY, 115 * dpr, height - 110 * dpr);
      p.data.x = px;
      p.data.y = py;
      p.container.setPosition(px, py).setScale(dpr);
    }

    for (const f of this.fireflies) {
      f.dot.setScale(dpr);
      f.glow.setScale(dpr);
    }

    if (this.playerContainer) {
      this.playerContainer.setScale(dpr);
      this.playerContainer.x = Phaser.Math.Clamp(
        this.playerContainer.x,
        40 * dpr,
        width - 40 * dpr
      );
      this.playerContainer.y = Phaser.Math.Clamp(
        this.playerContainer.y,
        75 * dpr,
        height - 65 * dpr
      );
    }
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

    // Animate drifting golden forest fireflies
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

    if (vx !== 0 || vy !== 0) {
      this.targetPos = null;
      const len = Math.hypot(vx, vy);
      this.playerContainer.x += (vx / len) * speed * dt;
      this.playerContainer.y += (vy / len) * speed * dt;
      if (vx < -0.05) this.avatarSprite.setFlipX(true);
      else if (vx > 0.05) this.avatarSprite.setFlipX(false);
    } else if (this.targetPos) {
      const dx = this.targetPos.x - this.playerContainer.x;
      const dy = this.targetPos.y - this.playerContainer.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6 * dpr) {
        this.playerContainer.x += (dx / dist) * speed * dt;
        this.playerContainer.y += (dy / dist) * speed * dt;
        if (dx < -2) this.avatarSprite.setFlipX(true);
        else if (dx > 2) this.avatarSprite.setFlipX(false);
      } else {
        this.targetPos = null;
      }
    }

    this.playerContainer.x = Phaser.Math.Clamp(
      this.playerContainer.x,
      40 * dpr,
      width - 40 * dpr
    );
    this.playerContainer.y = Phaser.Math.Clamp(
      this.playerContainer.y,
      75 * dpr,
      height - 65 * dpr
    );

    let insideAnyPortal = false;
    for (const p of this.portals) {
      const dist = Phaser.Math.Distance.Between(
        this.playerContainer.x,
        this.playerContainer.y,
        p.data.x,
        p.data.y
      );
      if (dist < 42 * dpr) {
        insideAnyPortal = true;
        if (this.cooldownPortalId !== p.data.id) {
          this.cooldownPortalId = p.data.id;
          this.enterPortal(p.data);
        }
        break;
      }
    }

    if (!insideAnyPortal) {
      this.cooldownPortalId = null;
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

  private async enterPortal(portal: WorldPortal): Promise<void> {
    this.activeMinigame = true;
    this.targetPos = null;

    const [swirlOverlay, mod] = await Promise.all([
      this.playSwirlingPortalTransition(portal.x, portal.y),
      minigameLoader.loadMinigame(portal.minigame)
    ]);

    swirlOverlay.destroy();
    const dpr = this.getDpr();
    this.playerContainer.setRotation(0).setScale(dpr);

    const dynamicSceneKey = `MinigameActivity_${portal.id}_${Date.now()}`;

    const activityScene = new MinigameActivityScene({
      sceneKey: dynamicSceneKey,
      module: mod,
      onExit: () => {
        profileManager.recordMinigameCompletion(portal.minigame);

        this.scene.wake('WonderTreeScene');
        this.scene.remove(dynamicSceneKey);

        this.layoutScene(this.scale.width, this.scale.height);
        this.cameras.main.fadeIn(350, 11, 22, 14);
        this.activeMinigame = false;
      }
    });

    this.scene.sleep('WonderTreeScene');
    this.scene.add(dynamicSceneKey, activityScene, true);
  }
}
