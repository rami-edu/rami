import Phaser from 'phaser';
import { SplashScreenScene } from './scenes/SplashScreenScene';
import { WonderTreeScene } from './scenes/WonderTreeScene';
import { userManager } from './managers/UserManager';
import {
  profileManager,
  ProfileManager,
  type AnimalAvatarId
} from './managers/ProfileManager';
import { minigameLoader } from './managers/MinigameLoader';

function setupHudAndGuardianModal(): void {
  const usernameEl = document.getElementById('hud-username');
  const hudAvatarImg = document.getElementById(
    'hud-avatar-img'
  ) as HTMLImageElement | null;
  const avatarGridEl = document.getElementById('avatar-selector-grid');
  const installBtn = document.getElementById('btn-install-pwa');
  const guardianBtn = document.getElementById('btn-guardian');
  const closeGuardianBtn = document.getElementById('btn-close-guardian');
  const cancelGateBtn = document.getElementById('btn-cancel-gate');
  const guardianModal = document.getElementById('guardian-modal');
  const gateStep = document.getElementById('guardian-gate-step');
  const dashboardStep = document.getElementById('guardian-dashboard-step');
  const mathQuestionEl = document.getElementById('math-gate-question');
  const mathAnswerInput = document.getElementById(
    'input-math-answer'
  ) as HTMLInputElement | null;
  const verifyMathBtn = document.getElementById('btn-verify-math');
  const mathErrorEl = document.getElementById('math-gate-error');

  const addChildBtn = document.getElementById('btn-add-child');
  const childNameInput = document.getElementById(
    'input-child-name'
  ) as HTMLInputElement | null;
  const profilesList = document.getElementById('profiles-list');
  const activitiesListEl = document.getElementById('guardian-activities-list');

  // Ensure at least one default local profile exists on-device
  if (profileManager.getAllProfiles().length === 0) {
    profileManager.createProfile(
      'Player 1',
      ProfileManager.AVATARS[0],
      userManager.getUsername()
    );
  }

  let selectedAvatarId: AnimalAvatarId =
    profileManager.getActiveProfile()?.avatarId ?? 'dino';

  const syncHud = () => {
    const active = profileManager.getActiveProfile();
    if (active) {
      selectedAvatarId = active.avatarId;
      const desc = ProfileManager.getAvatarDescriptor(active.avatarId);
      if (hudAvatarImg) {
        hudAvatarImg.src = desc.spritePath;
      }
      if (usernameEl) {
        usernameEl.textContent = `${active.explorerName} (${active.nickname})`;
      }
    } else if (usernameEl) {
      usernameEl.textContent = userManager.getUsername();
    }
    window.dispatchEvent(new CustomEvent('rami:profile-changed'));
  };

  syncHud();

  const renderAvatarSelector = () => {
    if (!avatarGridEl) return;
    const active = profileManager.getActiveProfile();
    const currentId = active?.avatarId ?? selectedAvatarId;

    avatarGridEl.innerHTML = ProfileManager.ANIMAL_AVATARS.map((av) => {
      const isSelected = av.id === currentId;
      return `<div class="avatar-card ${isSelected ? 'selected' : ''}" data-avatar-id="${av.id}">
        <img src="${av.spritePath}" alt="${av.name}" />
        <span>${av.name}</span>
      </div>`;
    }).join('');

    avatarGridEl
      .querySelectorAll<HTMLElement>('[data-avatar-id]')
      .forEach((card) => {
        card.addEventListener('click', () => {
          const id = card.getAttribute('data-avatar-id') as AnimalAvatarId | null;
          if (!id) return;
          selectedAvatarId = id;
          profileManager.setProfileAvatar(id);
          syncHud();
          renderAvatarSelector();
          renderProfiles();
        });
      });
  };

  const renderActivitiesList = async () => {
    if (!activitiesListEl) return;
    const active = profileManager.getActiveProfile();
    const activities = await minigameLoader.loadAllActivities();

    activitiesListEl.innerHTML = activities
      .map((activity) => {
        const details = activity.getActivityDetails(active?.id);
        const recentItems = details.actionHistory.slice(0, 8);
        const logHtml =
          recentItems.length > 0
            ? `<ul class="activity-action-log">
                ${recentItems
                  .map((entry) => {
                    const icon =
                      entry.outcome === 'completed'
                        ? '✨'
                        : entry.outcome === 'mistake'
                          ? '⚠️'
                          : '▸';
                    const timeStr = new Date(
                      entry.timestamp
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });
                    return `<li class="activity-action-item ${entry.outcome}">
                      <span>${icon} ${entry.description}</span>
                      <span style="opacity: 0.7; white-space: nowrap;">${timeStr}</span>
                    </li>`;
                  })
                  .join('')}
              </ul>`
            : `<div style="font-size: 12px; color: #74c69d; font-style: italic;">No actions recorded for ${active?.nickname ?? 'this explorer'} yet.</div>`;

        return `<div class="activity-report-card" data-activity-key="${details.activityKey}">
          <div class="activity-report-header">
            <span class="activity-report-title">${details.activityTitle}</span>
            <span class="activity-report-pillar">${details.pillar}</span>
          </div>
          <div class="activity-report-summary">${details.summaryText}</div>
          ${logHtml}
        </div>`;
      })
      .join('');
  };

  const renderProfiles = () => {
    renderAvatarSelector();
    void renderActivitiesList();
    if (!profilesList) return;
    const profiles = profileManager.getAllProfiles();
    const active = profileManager.getActiveProfile();

    profilesList.innerHTML = profiles
      .map((p) => {
        const isCurrent = active?.id === p.id;
        const desc = ProfileManager.getAvatarDescriptor(p.avatarId);
        const completedTotal = Object.values(p.progress).reduce(
          (acc, item) => acc + item.completedCount,
          0
        );
        return `<div style="padding: 8px 0; border-bottom: 1px solid #2d6a4f; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${desc.spritePath}" alt="${desc.name}" style="width: 38px; height: 38px; object-fit: contain;" />
            <div>
              <strong>${p.nickname}</strong> — <span>${p.explorerName}</span>
              <div style="font-size: 12px; color: #95d5b2;">Avatar: ${desc.name} • Minigames played: ${completedTotal}</div>
            </div>
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

  const openMathGate = () => {
    const challenge = profileManager.generateGuardianChallenge();
    if (mathQuestionEl) {
      mathQuestionEl.textContent = `${challenge.question} = ?`;
    }
    if (mathAnswerInput) {
      mathAnswerInput.value = '';
    }
    if (mathErrorEl) {
      mathErrorEl.textContent = '';
    }
    if (gateStep) gateStep.style.display = 'block';
    if (dashboardStep) dashboardStep.style.display = 'none';
    guardianModal?.classList.add('open');
    window.setTimeout(() => mathAnswerInput?.focus(), 50);
  };

  const tryUnlockDashboard = () => {
    const raw = mathAnswerInput?.value ?? '';
    if (profileManager.verifyGuardianChallenge(raw)) {
      if (gateStep) gateStep.style.display = 'none';
      if (dashboardStep) dashboardStep.style.display = 'block';
      renderProfiles();
    } else {
      const nextChallenge = profileManager.generateGuardianChallenge();
      if (mathQuestionEl) {
        mathQuestionEl.textContent = `${nextChallenge.question} = ?`;
      }
      if (mathAnswerInput) {
        mathAnswerInput.value = '';
        mathAnswerInput.focus();
      }
      if (mathErrorEl) {
        mathErrorEl.textContent = 'Incorrect answer. Try this new puzzle!';
      }
    }
  };

  // Require Triple-Tap (3 quick taps/clicks) to open Guardian Math Gate
  const guardianFill = document.getElementById('btn-guardian-fill');
  const guardianLabel = document.getElementById('btn-guardian-label');
  const TRIPLE_TAP_WINDOW_MS = 1200;
  let tapCount = 0;
  let tapResetTimer: number | null = null;

  const resetGuardianTaps = () => {
    tapCount = 0;
    if (tapResetTimer !== null) {
      window.clearTimeout(tapResetTimer);
      tapResetTimer = null;
    }
    if (guardianFill) guardianFill.style.width = '0%';
    if (guardianLabel) guardianLabel.textContent = '🔒 3× Tap';
  };

  guardianBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    tapCount += 1;

    if (tapResetTimer !== null) {
      window.clearTimeout(tapResetTimer);
    }

    if (tapCount >= 3) {
      resetGuardianTaps();
      openMathGate();
      return;
    }

    if (guardianFill) {
      guardianFill.style.width = `${Math.round((tapCount / 3) * 100)}%`;
    }
    if (guardianLabel) {
      guardianLabel.textContent = `🔒 ${tapCount}/3`;
    }

    tapResetTimer = window.setTimeout(() => {
      resetGuardianTaps();
    }, TRIPLE_TAP_WINDOW_MS);
  });

  // PWA Install Prompt Handling
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }
  let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
    if (installBtn) {
      installBtn.style.display = 'inline-block';
    }
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted' && installBtn) {
      installBtn.style.display = 'none';
    }
    deferredInstallPrompt = null;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  });

  verifyMathBtn?.addEventListener('click', tryUnlockDashboard);

  mathAnswerInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      tryUnlockDashboard();
    }
  });

  cancelGateBtn?.addEventListener('click', () => {
    guardianModal?.classList.remove('open');
  });

  closeGuardianBtn?.addEventListener('click', () => {
    guardianModal?.classList.remove('open');
  });

  addChildBtn?.addEventListener('click', () => {
    const name = childNameInput?.value.trim();
    if (!name) return;
    const created = profileManager.createProfile(name, selectedAvatarId);
    profileManager.setActiveProfile(created.id);
    if (childNameInput) childNameInput.value = '';
    syncHud();
    renderProfiles();
  });
}

setupHudAndGuardianModal();

const dpr = Math.min(window.devicePixelRatio || 1, 3);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: Math.round(window.innerWidth * dpr),
  height: Math.round(window.innerHeight * dpr),
  backgroundColor: '#162418',
  render: {
    antialias: true,
    roundPixels: false
  },
  scale: {
    mode: Phaser.Scale.NONE,
    zoom: 1 / dpr
  },
  scene: [SplashScreenScene, WonderTreeScene]
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  const currentDpr = Math.min(window.devicePixelRatio || 1, 3);
  game.scale.setZoom(1 / currentDpr);
  game.scale.resize(
    Math.round(window.innerWidth * currentDpr),
    Math.round(window.innerHeight * currentDpr)
  );
});
