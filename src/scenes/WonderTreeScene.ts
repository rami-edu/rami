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

/**
 * WonderTreeScene — Client-only, local-first isometric 2D hub.
 * The child navigates with keyboard or touch/click, triggers expressive emotes,
 * and enters on-demand minigame portals whose progress is saved locally on-device.
 */
export class WonderTreeScene extends Phaser.Scene {
  private playerContainer!: Phaser.GameObjects.Container;
  private avatarIcon!: Phaser.GameObjects.Text;
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
  private portals: Array<{
    data: WorldPortal;
    zone: Phaser.GameObjects.Arc;
  }> = [];
  private activeMinigame = false;
  private cooldownPortalId: string | null = null;
  private readonly speed = 220;
  private readonly emojis = ['💡', '👍', '👏', '👋'];

  constructor() {
    super({ key: 'WonderTreeScene' });
  }

  public preload(): void {
    this.load.json('worldData', './world.json');
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

    this.drawIsometricGrid();
    this.drawTreeStructure(world);
    this.createPortals(world.portals);
    this.createPlayer();
    this.setupControls();
    this.createFooterHint();

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

  private drawIsometricGrid(): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x2d6a4f, 0.28);

    const tileW = 64;
    const tileH = 32;
    for (let r = -12; r <= 24; r++) {
      for (let c = -12; c <= 24; c++) {
        const isoX = 640 + (c - r) * (tileW / 2);
        const isoY = 120 + (c + r) * (tileH / 2);
        grid.strokePoints(
          [
            { x: isoX, y: isoY },
            { x: isoX + tileW / 2, y: isoY + tileH / 2 },
            { x: isoX, y: isoY + tileH },
            { x: isoX - tileW / 2, y: isoY + tileH / 2 }
          ],
          true
        );
      }
    }
  }

  private drawTreeStructure(world: WorldData): void {
    const treeGraphics = this.add.graphics();

    const root = world.nodes[0] ?? { x: 640, y: 600 };
    treeGraphics.lineStyle(18, 0x5c4033, 0.9);
    for (const node of world.nodes) {
      treeGraphics.lineBetween(root.x, root.y, node.x, node.y);
      this.add.circle(node.x, node.y, 28, 0x3a5a40).setStrokeStyle(3, 0x74c69d);
    }

    treeGraphics.lineStyle(10, 0x7f5539, 0.75);
    for (const portal of world.portals) {
      treeGraphics.lineBetween(640, 480, portal.x, portal.y);
    }
  }

  private createPortals(portalDefs: WorldPortal[]): void {
    for (const p of portalDefs) {
      this.add
        .polygon(p.x, p.y + 18, [0, -24, 48, 0, 0, 24, -48, 0], 0x2d6a4f, 0.9)
        .setStrokeStyle(2, 0x95d5b2);

      const zone = this.add
        .circle(p.x, p.y - 6, 34, 0x52b788, 0.35)
        .setStrokeStyle(3, 0xb7e4c7)
        .setInteractive({ useHandCursor: true });

      this.tweens.add({
        targets: zone,
        scale: 1.12,
        duration: 1100,
        yoyo: true,
        repeat: -1
      });

      this.add
        .text(p.x, p.y - 54, `🌀 ${p.minigame}`, {
          fontSize: '15px',
          color: '#ffffff',
          backgroundColor: '#1b4332cc',
          padding: { x: 8, y: 4 }
        })
        .setOrigin(0.5);

      zone.on('pointerdown', () => {
        if (!this.activeMinigame) {
          this.targetPos = new Phaser.Math.Vector2(p.x, p.y);
        }
      });

      this.portals.push({ data: p, zone });
    }
  }

  private createPlayer(): void {
    const activeProfile = profileManager.getActiveProfile();
    this.playerContainer = this.add.container(640, 480).setDepth(20);

    const shadow = this.add.ellipse(0, 20, 38, 16, 0x000000, 0.4);
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
        backgroundColor: '#081c15cc',
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
    this.add
      .text(
        640,
        695,
        'Move: Arrow Keys / WASD / Tap or Click • Emotes: Keys 1-4 (💡 👍 👏 👋) • Walk into a Portal to load Minigame locally',
        {
          fontSize: '14px',
          color: '#b7e4c7',
          backgroundColor: '#0f1c11cc',
          padding: { x: 12, y: 6 }
        }
      )
      .setOrigin(0.5)
      .setDepth(30);
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

    this.playerContainer.x = Phaser.Math.Clamp(this.playerContainer.x, 60, 1220);
    this.playerContainer.y = Phaser.Math.Clamp(this.playerContainer.y, 80, 650);

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

    const loadingText = this.add
      .text(640, 360, `📦 Loading "${portal.minigame}"...`, {
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
