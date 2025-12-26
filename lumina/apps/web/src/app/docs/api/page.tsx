import Link from 'next/link';
import { ArrowLeft, Code, Key, Lock, Server, Clock, CheckCircle, Copy } from 'lucide-react';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';

const endpoints = [
  {
    method: 'GET',
    path: '/api/v1/users/{user_id}/metrics',
    description: 'Retrieve wellness metrics for a specific user',
    params: [
      { name: 'user_id', type: 'string', required: true, description: 'The unique user identifier' },
      { name: 'start_date', type: 'ISO 8601', required: false, description: 'Start of date range (default: 7 days ago)' },
      { name: 'end_date', type: 'ISO 8601', required: false, description: 'End of date range (default: now)' },
      { name: 'granularity', type: 'enum', required: false, description: 'minute | hour | day (default: hour)' },
    ],
    response: `{
  "user_id": "usr_abc123",
  "period": {
    "start": "2025-12-01T00:00:00Z",
    "end": "2025-12-08T00:00:00Z"
  },
  "metrics": {
    "blink_rate": {
      "average": 14.2,
      "min": 8.1,
      "max": 22.4,
      "unit": "blinks_per_minute"
    },
    "break_compliance": {
      "taken": 42,
      "suggested": 48,
      "rate": 0.875
    },
    "posture_score": {
      "average": 82,
      "trend": "improving"
    }
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/organizations/{org_id}/summary',
    description: 'Get aggregated wellness summary for an organization',
    params: [
      { name: 'org_id', type: 'string', required: true, description: 'The organization identifier' },
      { name: 'period', type: 'enum', required: false, description: 'day | week | month (default: week)' },
    ],
    response: `{
  "org_id": "org_xyz789",
  "period": "week",
  "employee_count": 150,
  "summary": {
    "avg_blink_rate": 13.8,
    "break_compliance_rate": 0.72,
    "avg_posture_score": 78,
    "active_users": 142
  },
  "trends": {
    "blink_rate": "+5.2%",
    "break_compliance": "+12.1%",
    "posture_score": "+3.4%"
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/alerts/configure',
    description: 'Configure alert settings for a user or organization',
    params: [
      { name: 'target_type', type: 'enum', required: true, description: 'user | organization' },
      { name: 'target_id', type: 'string', required: true, description: 'User or organization ID' },
      { name: 'alert_type', type: 'enum', required: true, description: 'blink | posture | break | fatigue' },
      { name: 'threshold', type: 'number', required: false, description: 'Custom threshold value' },
      { name: 'enabled', type: 'boolean', required: true, description: 'Enable or disable the alert' },
    ],
    response: `{
  "success": true,
  "config": {
    "target_type": "user",
    "target_id": "usr_abc123",
    "alert_type": "blink",
    "threshold": 10,
    "enabled": true,
    "updated_at": "2025-12-08T14:30:00Z"
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/events',
    description: 'Stream real-time wellness events (WebSocket)',
    params: [
      { name: 'user_id', type: 'string', required: false, description: 'Filter events for a specific user' },
      { name: 'event_types', type: 'array', required: false, description: 'Filter by event type: blink, break, posture, yawn' },
    ],
    response: `// WebSocket message format
{
  "type": "wellness_event",
  "timestamp": "2025-12-08T14:32:15Z",
  "user_id": "usr_abc123",
  "event": {
    "type": "break_taken",
    "duration_seconds": 45,
    "prompted": true
  }
}`,
  },
];

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="pt-24 pb-16">
        <div className="container max-w-5xl">
          <Link href="/docs" className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to documentation
          </Link>

          {/* Hero */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
              <Code className="w-4 h-4" />
              API Reference
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Lumina API
            </h1>
            <p className="text-xl text-muted-foreground">
              Integrate Lumina wellness data with your enterprise systems using our REST API.
            </p>
          </div>

          {/* Quick Info */}
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <div className="p-4 rounded-xl border border-border">
              <Server className="w-6 h-6 text-muted-foreground mb-2" />
              <h3 className="font-semibold text-sm mb-1">Base URL</h3>
              <code className="text-xs text-primary">https://api.getlumina.io</code>
            </div>
            <div className="p-4 rounded-xl border border-border">
              <Lock className="w-6 h-6 text-muted-foreground mb-2" />
              <h3 className="font-semibold text-sm mb-1">Authentication</h3>
              <code className="text-xs text-primary">Bearer token</code>
            </div>
            <div className="p-4 rounded-xl border border-border">
              <Clock className="w-6 h-6 text-muted-foreground mb-2" />
              <h3 className="font-semibold text-sm mb-1">Rate Limit</h3>
              <code className="text-xs text-primary">1000 req/min</code>
            </div>
          </div>

          {/* Authentication */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Authentication</h2>
            <div className="p-6 rounded-xl border border-border">
              <p className="text-muted-foreground mb-4">
                All API requests require a Bearer token in the Authorization header. You can generate API keys from the admin dashboard under Settings &gt; API Keys.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-xs">Request Header</span>
                  <button className="p-1 hover:bg-muted rounded" title="Copy">
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <code>Authorization: Bearer lum_sk_your_api_key_here</code>
              </div>
              <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-start gap-2">
                  <Key className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Keep your API keys secure</p>
                    <p className="text-sm text-muted-foreground">Never expose API keys in client-side code. Use environment variables and server-side requests only.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Endpoints */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Endpoints</h2>
            <div className="space-y-8">
              {endpoints.map((endpoint, index) => (
                <div key={index} className="rounded-xl border border-border overflow-hidden">
                  {/* Endpoint Header */}
                  <div className="p-4 bg-muted/30 border-b border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        endpoint.method === 'GET'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-blue-500/20 text-blue-500'
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono">{endpoint.path}</code>
                    </div>
                    <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                  </div>

                  {/* Parameters */}
                  <div className="p-4 border-b border-border">
                    <h4 className="text-sm font-semibold mb-3">Parameters</h4>
                    <div className="space-y-2">
                      {endpoint.params.map((param, pIndex) => (
                        <div key={pIndex} className="flex items-start gap-4 text-sm">
                          <div className="w-32 flex-shrink-0">
                            <code className="text-primary">{param.name}</code>
                            {param.required && (
                              <span className="ml-1 text-red-500 text-xs">*</span>
                            )}
                          </div>
                          <div className="w-24 flex-shrink-0 text-muted-foreground font-mono text-xs">
                            {param.type}
                          </div>
                          <div className="text-muted-foreground">
                            {param.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Response */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">Response</h4>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-muted-foreground">200 OK</span>
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                      <pre className="text-muted-foreground">{endpoint.response}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Error Handling */}
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-4">Error Handling</h2>
            <div className="p-6 rounded-xl border border-border">
              <p className="text-muted-foreground mb-4">
                The API uses standard HTTP status codes. Errors include a JSON body with details.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <code className="w-16 text-yellow-500">400</code>
                  <span className="text-muted-foreground">Bad Request - Invalid parameters</span>
                </div>
                <div className="flex items-center gap-4">
                  <code className="w-16 text-red-500">401</code>
                  <span className="text-muted-foreground">Unauthorized - Invalid or missing API key</span>
                </div>
                <div className="flex items-center gap-4">
                  <code className="w-16 text-red-500">403</code>
                  <span className="text-muted-foreground">Forbidden - Insufficient permissions</span>
                </div>
                <div className="flex items-center gap-4">
                  <code className="w-16 text-orange-500">429</code>
                  <span className="text-muted-foreground">Rate Limited - Too many requests</span>
                </div>
                <div className="flex items-center gap-4">
                  <code className="w-16 text-red-500">500</code>
                  <span className="text-muted-foreground">Server Error - Something went wrong</span>
                </div>
              </div>
              <div className="mt-4 bg-muted/50 rounded-lg p-4 font-mono text-xs">
                <pre className="text-muted-foreground">{`{
  "error": {
    "code": "invalid_parameter",
    "message": "The 'start_date' parameter must be a valid ISO 8601 date",
    "param": "start_date"
  }
}`}</pre>
              </div>
            </div>
          </section>

          {/* SDKs */}
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-4">SDKs & Libraries</h2>
            <p className="text-muted-foreground mb-6">
              Official client libraries for popular languages. Coming soon.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border opacity-60">
                <h3 className="font-semibold mb-1">JavaScript / TypeScript</h3>
                <code className="text-xs text-muted-foreground">npm install @lumina/sdk</code>
                <p className="text-xs text-muted-foreground mt-2">Coming Q1 2026</p>
              </div>
              <div className="p-4 rounded-xl border border-border opacity-60">
                <h3 className="font-semibold mb-1">Python</h3>
                <code className="text-xs text-muted-foreground">pip install lumina-sdk</code>
                <p className="text-xs text-muted-foreground mt-2">Coming Q1 2026</p>
              </div>
              <div className="p-4 rounded-xl border border-border opacity-60">
                <h3 className="font-semibold mb-1">Go</h3>
                <code className="text-xs text-muted-foreground">go get lumina.io/sdk</code>
                <p className="text-xs text-muted-foreground mt-2">Coming Q2 2026</p>
              </div>
            </div>
          </section>

          {/* Support */}
          <section className="mt-16 p-8 rounded-xl bg-muted/50 border border-border text-center">
            <h3 className="text-xl font-bold mb-2">Need API Support?</h3>
            <p className="text-muted-foreground mb-6">
              Our developer relations team is here to help you integrate Lumina.
            </p>
            <a href="mailto:developers@getlumina.io" className="btn btn-primary">
              Contact Developer Support
            </a>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
