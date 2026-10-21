import Phaser from 'phaser';
import { SplashScreenScene } from './scenes/SplashScreenScene';
import { WonderTreeScene } from './scenes/WonderTreeScene';
import { userManager } from './managers/UserManager';
import { profileManager, ProfileManager } from './managers/ProfileManager';

function setupHudAndGuardianModal(): void {
  const usernameEl = document.getElementById('hud-username');
  const guardianBtn = document.getElementById('btn-guardian');
  const closeGuardianBtn = document.getElementById('btn-close-guardian');
  const guardianModal = document.getElementById('guardian-modal');
  const addChildBtn = document.getElementById('btn-add-child');
  const childNameInput = document.getElementById(
    'input-child-name'
  ) as HTMLInputElement | null;
  const profilesList = document.getElementById('profiles-list');

  // Ensure at least one default local profile exists on-device
  if (profileManager.getAllProfiles().length === 0) {
    profileManager.createProfile(
      'Player 1',
      ProfileManager.AVATARS[0],
      userManager.getUsername()
    );
  }

  const syncHud = () => {
    const active = profileManager.getActiveProfile();
    if (usernameEl) {
      usernameEl.textContent = active
        ? `${active.avatarEmoji} ${active.explorerName} (${active.nickname})`
        : userManager.getUsername();
    }
    window.dispatchEvent(new CustomEvent('rami:profile-changed'));
  };

  syncHud();

  const renderProfiles = () => {
    if (!profilesList) return;
    const profiles = profileManager.getAllProfiles();
    const active = profileManager.getActiveProfile();

    profilesList.innerHTML = profiles
      .map((p) => {
        const isCurrent = active?.id === p.id;
        const completedTotal = Object.values(p.progress).reduce(
          (acc, item) => acc + item.completedCount,
          0
        );
        return `<div style="padding: 8px 0; border-bottom: 1px solid #2d6a4f; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${p.avatarEmoji} ${p.nickname}</strong> — <span>${p.explorerName}</span>
            <div style="font-size: 12px; color: #95d5b2;">Minigames played: ${completedTotal}</div>
          </div>
          <button data-select-profile="${p.id}" class="hud-btn" style="padding: 4px 12px; font-size: 12px;">
            ${isCurrent ? '✓ Active' : 'Switch'}
          </button>
        </div>`;
      })
      .join('');

    profilesList
      .querySelectorAll<HTMLButtonElement>('[data-select-profile]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-select-profile');
          if (id) {
            profileManager.setActiveProfile(id);
            syncHud();
            renderProfiles();
          }
        });
      });
  };

  guardianBtn?.addEventListener('click', () => {
    renderProfiles();
    guardianModal?.classList.add('open');
  });

  closeGuardianBtn?.addEventListener('click', () => {
    guardianModal?.classList.remove('open');
  });

  addChildBtn?.addEventListener('click', () => {
    const name = childNameInput?.value.trim();
    if (!name) return;
    const avatarIdx =
      profileManager.getAllProfiles().length % ProfileManager.AVATARS.length;
    const created = profileManager.createProfile(
      name,
      ProfileManager.AVATARS[avatarIdx]
    );
    profileManager.setActiveProfile(created.id);
    if (childNameInput) childNameInput.value = '';
    syncHud();
    renderProfiles();
  });
}

setupHudAndGuardianModal();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#162418',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [SplashScreenScene, WonderTreeScene]
};

new Phaser.Game(config);
