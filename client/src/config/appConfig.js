// ─────────────────────────────────────────────────────────────
// EduPoll App Configuration
// Admin can update supportEmail and institutionName via Settings.
// All components should import from here instead of hardcoding.
// ─────────────────────────────────────────────────────────────

const defaults = {
  supportEmail: 'support@edupoll.in',
  institutionName: 'Your Institution',
};

export function getAppConfig() {
  try {
    const stored = localStorage.getItem('edupoll_app_config');
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  } catch {
    return defaults;
  }
}

export function saveAppConfig(config) {
  localStorage.setItem('edupoll_app_config', JSON.stringify({ ...getAppConfig(), ...config }));
}
