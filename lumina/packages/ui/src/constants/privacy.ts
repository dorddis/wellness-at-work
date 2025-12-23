/**
 * Privacy Policy Version Tracking
 *
 * GDPR requires tracking which version of the privacy policy users consented to.
 * This file maintains the current version and changelog for audit purposes.
 *
 * When updating the privacy policy:
 * 1. Increment CURRENT_VERSION
 * 2. Add an entry to VERSION_HISTORY
 * 3. Update the privacy policy page content
 * 4. Users will see a consent banner on next login
 */

export const CURRENT_PRIVACY_POLICY_VERSION = '1.0.0';
export const CURRENT_PRIVACY_POLICY_DATE = '2024-12-22';

export interface PolicyVersion {
  version: string;
  date: string;
  summary: string;
  changes: string[];
}

export const VERSION_HISTORY: PolicyVersion[] = [
  {
    version: '1.0.0',
    date: '2024-12-22',
    summary: 'Initial privacy policy',
    changes: [
      'Initial privacy policy for Lumina wellness platform',
      'Privacy-by-design architecture documented',
      'Local-only mode option added for GDPR compliance',
      'Data retention and deletion policies defined',
      'User rights and data portability outlined',
    ],
  },
];

/**
 * Check if user needs to re-consent to updated policy
 */
export function needsPrivacyConsent(
  lastConsentedVersion: string | null | undefined
): boolean {
  if (!lastConsentedVersion) return true;

  // Compare versions - any version less than current needs re-consent
  const lastParts = lastConsentedVersion.split('.').map(Number);
  const currentParts = CURRENT_PRIVACY_POLICY_VERSION.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if ((currentParts[i] || 0) > (lastParts[i] || 0)) {
      return true;
    }
    if ((currentParts[i] || 0) < (lastParts[i] || 0)) {
      return false;
    }
  }

  return false;
}

/**
 * Get changes since user's last consented version
 */
export function getChangesSinceVersion(
  lastVersion: string | null | undefined
): PolicyVersion[] {
  if (!lastVersion) return VERSION_HISTORY;

  const lastParts = lastVersion.split('.').map(Number);

  return VERSION_HISTORY.filter((v) => {
    const vParts = v.version.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((vParts[i] || 0) > (lastParts[i] || 0)) return true;
      if ((vParts[i] || 0) < (lastParts[i] || 0)) return false;
    }
    return false;
  });
}
