export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 bg-secondary rounded" />
          <div className="h-4 w-48 bg-secondary rounded mt-2" />
        </div>
        <div className="h-10 w-32 bg-secondary rounded" />
      </div>

      {/* Profile card skeleton */}
      <div className="card">
        <div className="card-header">
          <div className="h-6 w-24 bg-secondary rounded" />
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-secondary rounded" />
              <div className="h-10 w-full bg-secondary rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 bg-secondary rounded" />
              <div className="h-10 w-full bg-secondary rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications card skeleton */}
      <div className="card">
        <div className="card-header">
          <div className="h-6 w-32 bg-secondary rounded" />
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 bg-secondary rounded" />
            <div className="h-4 w-48 bg-secondary rounded" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 bg-secondary rounded" />
            <div className="h-4 w-48 bg-secondary rounded" />
          </div>
        </div>
      </div>

      {/* DnD card skeleton */}
      <div className="card">
        <div className="card-header">
          <div className="h-6 w-36 bg-secondary rounded" />
        </div>
        <div className="card-body space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 bg-secondary rounded" />
            <div className="h-4 w-56 bg-secondary rounded" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 bg-secondary rounded" />
            <div className="h-4 w-48 bg-secondary rounded" />
          </div>
        </div>
      </div>

      {/* Data & Privacy card skeleton */}
      <div className="card">
        <div className="card-header">
          <div className="h-6 w-32 bg-secondary rounded" />
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-secondary rounded" />
              <div className="h-3 w-48 bg-secondary rounded" />
            </div>
            <div className="h-10 w-24 bg-secondary rounded" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-secondary rounded" />
              <div className="h-3 w-48 bg-secondary rounded" />
            </div>
            <div className="h-10 w-24 bg-secondary rounded" />
          </div>
        </div>
      </div>

      {/* Account card skeleton */}
      <div className="card">
        <div className="card-header">
          <div className="h-6 w-24 bg-secondary rounded" />
        </div>
        <div className="card-body space-y-4">
          <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
            <div className="h-3 w-24 bg-secondary rounded" />
            <div className="h-4 w-40 bg-secondary rounded" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-secondary rounded" />
              <div className="h-3 w-48 bg-secondary rounded" />
            </div>
            <div className="h-10 w-24 bg-secondary rounded" />
          </div>
        </div>
      </div>

      {/* Danger Zone card skeleton */}
      <div className="card border-red-200">
        <div className="card-header bg-red-50">
          <div className="h-6 w-32 bg-red-200 rounded" />
        </div>
        <div className="card-body">
          <div className="flex items-center justify-between p-4 rounded-lg bg-red-50/50">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-red-200 rounded" />
              <div className="h-3 w-64 bg-red-200 rounded" />
            </div>
            <div className="h-10 w-32 bg-red-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
