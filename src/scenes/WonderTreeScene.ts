import Phaser from 'phaser';
import { userManager } from '../managers/UserManager';
import { profileManager } from '../managers/ProfileManager';
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
  zone: Phaser.GameObjects.Arc;
}

/**
 * WonderTreeScene — Client-only, local-first isometric 2D hub rendered at
 * native Retina/HiDPI physical pixel resolution in both landscape and portrait.
 */
export class WonderTreeScene extends Phaser.Scene {
  private bgImage!: Phaser.GameObjects.Image;
  private playerContainer!: Phaser.GameObjects.Container;
  private avatarIcon!: Phaser.GameObjects.Text;
  private nameLabel!: Phaser.GameObjects.Text;
  private emojiLabel!: Phaser.GameObjects.Text;
  private footerHint!: Phaser.GameObjects.Text;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private targetPos: Phaser.Math.Vector2 | null = null;
  private portals: PortalInstance[] = [];
  private activeMinigame = false;
  private cooldownPortalId: string | null = null;
  private readonly baseSpeed = 220;
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
  }

  public create(): void {
    const world: WorldData = this.cache.json.get('worldData') ?? {
      nodes: [
        { id: 'root_01', type: 'BigRoot', x: 640, y: 600 },
        { id: 'branch_left', type: 'Branch', x: 400, y: 400 },
        { id: 'branch_right', type: 'Branch', x: 880, y: 400 }
      ],
      portals: [
        { id: 'portal_math', minigame: 'Acorn Scale', x: 350, y: 350 },
        { id: 'portal_music', minigame: 'Rhythm in the Branches', x: 930, y: 350 },
        { id: 'portal_hub', minigame: 'The Clockwork Tower', x: 640, y: 300 }
      ]
    };

    this.drawForestBackground();
    this.createPortals(world.portals);
    this.createPlayer();
    this.setupControls();
    this.createFooterHint();
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
      if (this.avatarIcon && active?.avatarEmoji) {
        this.avatarIcon.setText(active.avatarEmoji);
      }
    }) as EventListener);
  }

  private drawForestBackground(): void {
    const { width, height } = this.scale;
    this.bgImage = this.add
      .image(width / 2, height / 2, 'forestBackground')
      .setDepth(0);
  }

  private createPortals(portalDefs: WorldPortal[]): void {
    this.portals = [];
    for (const p of portalDefs) {
      const normX = p.x / 1280;
      const normY = p.y / 720;

      const container = this.add.container(p.x, p.y).setDepth(6);

      const platform = this.add
        .polygon(0, 18, [0, -24, 48, 0, 0, 24, -48, 0], 0x2d6a4f, 0.85)
        .setStrokeStyle(2, 0x95d5b2);

      const zone = this.add
        .circle(0, -6, 34, 0x52b788, 0.4)
        .setStrokeStyle(3, 0xb7e4c7)
        .setInteractive({ useHandCursor: true });

      this.tweens.add({
        targets: zone,
        scale: 1.12,
        duration: 1100,
        yoyo: true,
        repeat: -1
      });

      const label = this.add
        .text(0, -54, `🌀 ${p.minigame}`, {
          fontSize: '15px',
          color: '#ffffff',
          backgroundColor: '#1b4332dd',
          padding: { x: 8, y: 4 }
        })
        .setOrigin(0.5);

      container.add([platform, zone, label]);

      const instance: PortalInstance = {
        data: { ...p },
        normX,
        normY,
        container,
        zone
      };

      zone.on('pointerdown', () => {
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
    const { width, height } = this.scale;
    this.playerContainer = this.add
      .container(width * 0.5, height * 0.68)
      .setDepth(20);

    const shadow = this.add.ellipse(0, 20, 38, 16, 0x000000, 0.45);
    const body = this.add
      .circle(0, 0, 20, 0x80ed99)
      .setStrokeStyle(3, 0x1b4332);
    this.avatarIcon = this.add
      .text(0, 0, activeProfile?.avatarEmoji ?? '🦕', { fontSize: '24px' })
      .setOrigin(0.5);

    this.nameLabel = this.add
      .text(0, 34, activeProfile?.explorerName ?? userManager.getUsername(), {
        fontSize: '14px',
        color: '#d8f3dc',
        backgroundColor: '#081c15dd',
        padding: { x: 6, y: 2 }
      })
      .setOrigin(0.5);

    this.emojiLabel = this.add
      .text(0, -40, '', {
        fontSize: '28px'
      })
      .setOrigin(0.5);

    this.playerContainer.add([
      shadow,
      body,
      this.avatarIcon,
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

  private createFooterHint(): void {
    const { width, height } = this.scale;
    this.footerHint = this.add
      .text(
        width / 2,
        height - 24,
        'Move: Arrow Keys / WASD / Tap or Click • Emotes: Keys 1-4 (💡 👍 👏 👋) • Walk into a Portal to play',
        {
          fontSize: '13px',
          color: '#b7e4c7',
          backgroundColor: '#0f1c11dd',
          padding: { x: 10, y: 6 },
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setDepth(30);
  }

  private layoutScene(width: number, height: number): void {
    const dpr = this.getDpr();

    if (this.bgImage) {
      const scaleX = width / this.bgImage.width;
      const scaleY = height / this.bgImage.height;
      this.bgImage
        .setPosition(width / 2, height / 2)
        .setScale(Math.max(scaleX, scaleY));
    }

    for (const p of this.portals) {
      const px = Phaser.Math.Clamp(p.normX * width, 75 * dpr, width - 75 * dpr);
      const py = Phaser.Math.Clamp(
        p.normY * height,
        110 * dpr,
        height - 110 * dpr
      );
      p.data.x = px;
      p.data.y = py;
      p.container.setPosition(px, py).setScale(dpr);
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

    if (this.footerHint) {
      this.footerHint
        .setPosition(width / 2, height - 24 * dpr)
        .setFontSize(13 * dpr)
        .setPadding(10 * dpr, 6 * dpr, 10 * dpr, 6 * dpr)
        .setWordWrapWidth(width - 24 * dpr);
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

  public update(_time: number, delta: number): void {
    if (this.activeMinigame) return;

    const { width, height } = this.scale;
    const dpr = this.getDpr();
    const speed = this.baseSpeed * dpr;
    const dt = delta / 1000;
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
    } else if (this.targetPos) {
      const dx = this.targetPos.x - this.playerContainer.x;
      const dy = this.targetPos.y - this.playerContainer.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6 * dpr) {
        this.playerContainer.x += (dx / dist) * speed * dt;
        this.playerContainer.y += (dy / dist) * speed * dt;
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

      // Full-screen dark forest backdrop fade
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

      // Concentric spiral arms & glowing runes rotating and expanding
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

        // Glowing orb particles along the spiral
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

      // Spin and expand the swirling vortex to engulf the screen
      this.tweens.add({
        targets: swirlContainer,
        rotation: Math.PI * 3.5,
        scale: (maxDim / (220 * dpr)) * 1.15,
        duration: 950,
        ease: 'Cubic.easeIn'
      });

      // Pull and spin the player into the center of the portal
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

    // Run both the swirling portal animation and on-demand module fetch
    const [swirlOverlay, mod] = await Promise.all([
      this.playSwirlingPortalTransition(portal.x, portal.y),
      minigameLoader.loadMinigame(portal.minigame)
    ]);

    // Clean up swirl and restore player transform before sleeping the hub scene
    swirlOverlay.destroy();
    const dpr = this.getDpr();
    this.playerContainer.setRotation(0).setScale(dpr);

    // Create a brand-new dedicated Phaser.Scene for the portal activity
    const dynamicSceneKey = `MinigameActivity_${portal.id}_${Date.now()}`;

    const activityScene = new MinigameActivityScene({
      sceneKey: dynamicSceneKey,
      module: mod,
      onExit: () => {
        profileManager.recordMinigameCompletion(portal.minigame);

        // Wake the WonderTreeScene hub and completely destroy the activity scene
        this.scene.wake('WonderTreeScene');
        this.scene.remove(dynamicSceneKey);

        this.layoutScene(this.scale.width, this.scale.height);
        this.cameras.main.fadeIn(350, 11, 22, 14);
        this.activeMinigame = false;
      }
    });

    // Sleep the main hub scene so it is completely hidden and inactive
    this.scene.sleep('WonderTreeScene');
    this.scene.add(dynamicSceneKey, activityScene, true);
  }
}
