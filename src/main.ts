import Phaser from 'phaser';
import { SplashScreenScene } from './scenes/SplashScreenScene';
import { WonderTreeScene } from './scenes/WonderTreeScene';
import { userManager } from './managers/UserManager';
import {
  profileManager,
  ProfileManager,
  type AnimalAvatarId
} from './managers/ProfileManager';
import {
  minigameLoader,
  calculateGeneralStats
} from './managers/MinigameLoader';
import {
  KNOWLEDGE_TAGS,
  type KnowledgeTagId
} from './objects/ActivityKnowledgeTags';

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
  const generalStatsEl = document.getElementById('guardian-general-stats');
  const generalStatsChildNameEl = document.getElementById(
    'guardian-stats-child-name'
  );
  const activitiesListEl = document.getElementById('guardian-activities-list');
  let editingProfileId: string | null = null;

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
        usernameEl.textContent = active.nickname || active.explorerName;
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

    if (generalStatsChildNameEl) {
      generalStatsChildNameEl.textContent =
        active?.nickname || active?.explorerName || 'Active Explorer';
    }

    if (generalStatsEl) {
      const stats = calculateGeneralStats(activities, active?.id);

      const domainBadgesHtml = (
        Object.entries(stats.domainStats) as [
          KnowledgeTagId,
          (typeof stats.domainStats)[KnowledgeTagId]
        ][]
      )
        .filter(([, stat]) => stat.totalInDomain > 0)
        .map(([tagId, stat]) => {
          const def = KNOWLEDGE_TAGS[tagId];
          if (!def) return '';
          return `<div class="general-domain-chip" style="border-left: 3px solid ${def.colorHex};">
            <div class="general-domain-name">
              <span>${def.iconSymbol}</span>
              <span>${def.name}</span>
            </div>
            <div class="general-domain-score">
              ${stat.solves} ${stat.solves === 1 ? 'solve' : 'solves'} • ${stat.stars}★
            </div>
          </div>`;
        })
        .join('');

      generalStatsEl.innerHTML = `
        <div class="general-stats-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #2d6a4f; padding-bottom: 8px;">
            <div>
              <span style="font-size: 15px; font-weight: 800; color: #ffd166;">
                ${active?.nickname ?? 'Explorer'}'s Learning Progress
              </span>
              <span style="font-size: 12px; color: #95d5b2; margin-left: 8px;">
                ${active?.explorerName ? `(${active.explorerName})` : ''}
              </span>
            </div>
            <div style="font-size: 12px; color: #74c69d; font-weight: 600;">
              🌱 ${stats.activitiesExploredCount} / ${stats.totalActivitiesCount} Activities Explored
            </div>
          </div>

          <div class="general-stats-grid">
            <div class="general-stat-tile">
              <div class="general-stat-value">⭐ ${stats.totalStarsEarned} / ${stats.totalPossibleStars}</div>
              <div class="general-stat-label">Total Stars</div>
              <div class="general-stat-subtext">${stats.starsPercentage}% of all stars</div>
            </div>
            <div class="general-stat-tile">
              <div class="general-stat-value">🎯 ${stats.activitiesExploredCount} / ${stats.totalActivitiesCount}</div>
              <div class="general-stat-label">Activities Played</div>
              <div class="general-stat-subtext">${stats.totalActivitiesCount - stats.activitiesExploredCount} unplayed</div>
            </div>
            <div class="general-stat-tile">
              <div class="general-stat-value">🏆 ${stats.totalSolves}</div>
              <div class="general-stat-label">Total Solves</div>
              <div class="general-stat-subtext">Puzzles completed</div>
            </div>
            <div class="general-stat-tile">
              <div class="general-stat-value">💡 ${stats.totalActions}</div>
              <div class="general-stat-label">Learning Actions</div>
              <div class="general-stat-subtext">${stats.totalActions > 0 ? `${stats.accuracyRate}% accuracy` : 'Ready to begin'}</div>
            </div>
          </div>

          <div class="star-meter-box" style="margin-bottom: 12px;">
            <div class="star-meter-header">
              <span style="color:#ffd166; font-weight:700;">Overall World Star Mastery</span>
              <span style="color:#b7e4c7; font-size:12px;">${stats.totalStarsEarned} of ${stats.totalPossibleStars} Stars (${stats.starsPercentage}%)</span>
            </div>
            <div class="star-meter-track" style="height: 10px;">
              <div class="star-meter-fill" style="width: ${stats.starsPercentage}%; background: linear-gradient(90deg, #ffd166, #52b788);"></div>
            </div>
          </div>

          <div>
            <div style="font-size: 11.5px; font-weight: 700; color: #95d5b2; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
              Knowledge Areas Explored:
            </div>
            <div class="general-domains-grid">
              ${domainBadgesHtml}
            </div>
          </div>
        </div>
      `;
    }

    activitiesListEl.innerHTML = activities
      .map((activity) => {
        const details = activity.getActivityDetails(active?.id);
        const recentItems = details.actionHistory.slice(0, 8);

        // Standardized Knowledge Area Badges
        const tagsHtml = (details.knowledgeTags || [])
          .map((tagId) => {
            const def = KNOWLEDGE_TAGS[tagId];
            if (!def) return '';
            return `<span class="tag-badge-chip" style="background:${def.bgHex}; border-color:${def.borderHex}; color:${def.colorHex};">
              <span>${def.iconSymbol}</span>
              <span>${def.name}</span>
            </span>`;
          })
          .join('');

        // 5-Star Meter & Progress Bar to next star
        const pct = Math.round(
          (details.starProgress?.progressFraction ?? 0) * 100
        );
        const starMeterHtml = `
          <div class="star-meter-box">
            <div class="star-meter-header">
              <span style="color:#ffd166; font-weight:700;">${details.starsVisual} (${details.starsEarned}/5 Stars)</span>
              <span style="color:#b7e4c7; font-size:12px;">${details.starProgress?.progressBarLabel ?? ''}</span>
            </div>
            <div class="star-meter-track">
              <div class="star-meter-fill" style="width: ${pct}%;"></div>
            </div>
          </div>`;

        // Parent Pedagogical Guide Panel
        const guideHtml = details.parentGuide
          ? `<div class="parent-guide-panel">
              <div class="parent-guide-title">🎯 Pedagogical Goals:</div>
              <div>${details.parentGuide.pedagogicalGoals}</div>
              <div class="parent-guide-title" style="margin-top: 6px;">💡 Parent Recommendation:</div>
              <div>${details.parentGuide.parentRecommendation}</div>
            </div>`
          : '';

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
          <div class="knowledge-tags-row">${tagsHtml}</div>
          ${starMeterHtml}
          ${guideHtml}
          <div class="activity-report-summary">${details.summaryText}</div>
          <div style="margin: 8px 0;">
            <button class="hud-btn btn-play-activity" data-play-title="${details.activityTitle}" style="width: 100%; font-size: 13px; font-weight: bold; background: #2d6a4f; padding: 7px 12px; cursor: pointer;">
              ▶ Play ${details.activityTitle}
            </button>
          </div>
          ${logHtml}
        </div>`;
      })
      .join('');

    activitiesListEl
      .querySelectorAll<HTMLButtonElement>('.btn-play-activity')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const title = btn.getAttribute('data-play-title');
          if (title) {
            guardianModal?.classList.remove('open');
            window.dispatchEvent(
              new CustomEvent('rami:launch-activity', {
                detail: { activityTitle: title }
              })
            );
          }
        });
      });
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
        const isEditing = editingProfileId === p.id;
        const desc = ProfileManager.getAvatarDescriptor(p.avatarId);
        const completedTotal = Object.values(p.progress).reduce(
          (acc, item) => acc + item.completedCount,
          0
        );

        const nameBlockHtml = isEditing
          ? `<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
              <input
                type="text"
                class="profile-rename-input"
                data-rename-id="${p.id}"
                value="${p.nickname}"
                maxlength="24"
                style="padding: 3px 8px; border-radius: 6px; border: 1.5px solid #52b788; background: #0f1c11; color: #ffffff; font-size: 13px; font-weight: 600; width: 120px;"
              />
              <button data-save-profile-name="${p.id}" class="hud-btn" style="padding: 3px 8px; font-size: 11px; background: #2d6a4f;">Save</button>
              <button data-cancel-profile-name="${p.id}" class="hud-btn" style="padding: 3px 8px; font-size: 11px; background: #1b4332;">Cancel</button>
            </div>`
          : `<div style="display: flex; align-items: center; gap: 6px;">
              <strong>${p.nickname}</strong>
              <button data-edit-profile-name="${p.id}" class="hud-btn" title="Rename explorer" style="padding: 2px 7px; font-size: 11px; background: rgba(45, 106, 79, 0.7); border-color: #52b788; line-height: 1.2;">✏️ Rename</button>
              <span style="opacity: 0.85;">— ${p.explorerName}</span>
            </div>`;

        return `<div style="padding: 8px 0; border-bottom: 1px solid #2d6a4f; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${desc.spritePath}" alt="${desc.name}" style="width: 38px; height: 38px; object-fit: contain;" />
            <div>
              ${nameBlockHtml}
              <div style="font-size: 12px; color: #95d5b2;">Avatar: ${desc.name} • Minigames played: ${completedTotal}</div>
            </div>
          </div>
          <button data-select-profile="${p.id}" class="hud-btn" style="padding: 4px 12px; font-size: 12px;">
            ${isCurrent ? '✓ Active' : 'Switch'}
          </button>
        </div>`;
      })
      .join('');

    const saveRename = (profileId: string) => {
      const input = profilesList.querySelector<HTMLInputElement>(
        `.profile-rename-input[data-rename-id="${profileId}"]`
      );
      const newName = input?.value.trim();
      if (newName) {
        profileManager.updateProfileName(profileId, newName);
        syncHud();
      }
      editingProfileId = null;
      renderProfiles();
    };

    profilesList
      .querySelectorAll<HTMLButtonElement>('[data-edit-profile-name]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-edit-profile-name');
          if (id) {
            editingProfileId = id;
            renderProfiles();
          }
        });
      });

    profilesList
      .querySelectorAll<HTMLButtonElement>('[data-save-profile-name]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-save-profile-name');
          if (id) {
            saveRename(id);
          }
        });
      });

    profilesList
      .querySelectorAll<HTMLButtonElement>('[data-cancel-profile-name]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          editingProfileId = null;
          renderProfiles();
        });
      });

    if (editingProfileId) {
      const currentInput = profilesList.querySelector<HTMLInputElement>(
        `.profile-rename-input[data-rename-id="${editingProfileId}"]`
      );
      if (currentInput) {
        currentInput.focus();
        currentInput.select();
        currentInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (editingProfileId) {
              saveRename(editingProfileId);
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            editingProfileId = null;
            renderProfiles();
          }
        });
      }
    }

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
