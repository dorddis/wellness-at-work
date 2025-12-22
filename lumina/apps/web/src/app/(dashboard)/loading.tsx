/**
 * Fallback loading state for dashboard routes
 * Shows a centered spinner as minimal loading indicator
 */

import { Spinner } from '@lumina/ui';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );
}
