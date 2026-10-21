import Phaser from 'phaser';
import { userManager } from '../managers/UserManager';
import { profileManager } from '../managers/ProfileManager';
import { minigameLoader } from '../managers/MinigameLoader';

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
  platform: Phaser.GameObjects.Polygon;
  zone: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
}

/**
 * WonderTreeScene — Client-only, local-first isometric 2D hub occupying 100% of
 * the screen in both horizontal (landscape) and vertical (portrait) modes.
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
  private readonly speed = 220;
  private readonly emojis = ['💡', '👍', '👏', '👋'];

  constructor() {
    super({ key: 'WonderTreeScene' });
  }

  public preload(): void {
    this.load.json('worldData', './world.json');
    if (!this.textures.exists('forestBackground')) {
      this.load.image('forestBackground', './forest-background.jpg');
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
      if (this.scene.isActive()) {
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

      const platform = this.add
        .polygon(p.x, p.y + 18, [0, -24, 48, 0, 0, 24, -48, 0], 0x2d6a4f, 0.85)
        .setStrokeStyle(2, 0x95d5b2)
        .setDepth(5);

      const zone = this.add
        .circle(p.x, p.y - 6, 34, 0x52b788, 0.4)
        .setStrokeStyle(3, 0xb7e4c7)
        .setDepth(6)
        .setInteractive({ useHandCursor: true });

      this.tweens.add({
        targets: zone,
        scale: 1.12,
        duration: 1100,
        yoyo: true,
        repeat: -1
      });

      const label = this.add
        .text(p.x, p.y - 54, `🌀 ${p.minigame}`, {
          fontSize: '15px',
          color: '#ffffff',
          backgroundColor: '#1b4332dd',
          padding: { x: 8, y: 4 }
        })
        .setOrigin(0.5)
        .setDepth(7);

      const instance: PortalInstance = {
        data: { ...p },
        normX,
        normY,
        platform,
        zone,
        label
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
          align: 'center',
          wordWrap: { width: width - 24 }
        }
      )
      .setOrigin(0.5)
      .setDepth(30);
  }

  private layoutScene(width: number, height: number): void {
    if (this.bgImage) {
      const scaleX = width / this.bgImage.width;
      const scaleY = height / this.bgImage.height;
      this.bgImage
        .setPosition(width / 2, height / 2)
        .setScale(Math.max(scaleX, scaleY));
    }

    for (const p of this.portals) {
      const px = Phaser.Math.Clamp(p.normX * width, 75, width - 75);
      const py = Phaser.Math.Clamp(p.normY * height, 110, height - 110);
      p.data.x = px;
      p.data.y = py;
      p.platform.setPosition(px, py + 18);
      p.zone.setPosition(px, py - 6);
      p.label.setPosition(px, py - 54);
    }

    if (this.playerContainer) {
      this.playerContainer.x = Phaser.Math.Clamp(
        this.playerContainer.x,
        40,
        width - 40
      );
      this.playerContainer.y = Phaser.Math.Clamp(
        this.playerContainer.y,
        75,
        height - 65
      );
    }

    if (this.footerHint) {
      this.footerHint
        .setPosition(width / 2, height - 24)
        .setWordWrapWidth(width - 24);
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
      this.playerContainer.x += (vx / len) * this.speed * dt;
      this.playerContainer.y += (vy / len) * this.speed * dt;
    } else if (this.targetPos) {
      const dx = this.targetPos.x - this.playerContainer.x;
      const dy = this.targetPos.y - this.playerContainer.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        this.playerContainer.x += (dx / dist) * this.speed * dt;
        this.playerContainer.y += (dy / dist) * this.speed * dt;
      } else {
        this.targetPos = null;
      }
    }

    this.playerContainer.x = Phaser.Math.Clamp(
      this.playerContainer.x,
      40,
      width - 40
    );
    this.playerContainer.y = Phaser.Math.Clamp(
      this.playerContainer.y,
      75,
      height - 65
    );

    let insideAnyPortal = false;
    for (const p of this.portals) {
      const dist = Phaser.Math.Distance.Between(
        this.playerContainer.x,
        this.playerContainer.y,
        p.data.x,
        p.data.y
      );
      if (dist < 42) {
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

  private async enterPortal(portal: WorldPortal): Promise<void> {
    this.activeMinigame = true;
    this.targetPos = null;

    const { width, height } = this.scale;
    const loadingText = this.add
      .text(width / 2, height / 2, `📦 Loading "${portal.minigame}"...`, {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#1b4332',
        padding: { x: 16, y: 10 }
      })
      .setOrigin(0.5)
      .setDepth(90);

    try {
      const mod = await minigameLoader.loadMinigame(portal.minigame);
      loadingText.destroy();
      mod.launch(this, () => {
        profileManager.recordMinigameCompletion(portal.minigame);
        this.activeMinigame = false;
      });
    } catch (err) {
      console.error('Failed to load minigame:', err);
      loadingText.destroy();
      this.activeMinigame = false;
    }
  }
}
