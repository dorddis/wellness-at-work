import { Check, X } from 'lucide-react';

interface Feature {
  name: string;
  starter: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

const features: Feature[] = [
  { name: 'Blink detection & alerts', starter: true, pro: true, enterprise: true },
  { name: 'Basic analytics dashboard', starter: true, pro: true, enterprise: true },
  { name: 'Email support', starter: true, pro: true, enterprise: true },
  { name: 'Posture monitoring', starter: false, pro: true, enterprise: true },
  { name: 'Fatigue detection', starter: false, pro: true, enterprise: true },
  { name: 'Team challenges', starter: false, pro: true, enterprise: true },
  { name: 'Calendar integration', starter: false, pro: true, enterprise: true },
  { name: 'Priority support', starter: false, pro: true, enterprise: true },
  { name: 'Slack/Teams integration', starter: false, pro: true, enterprise: true },
  { name: 'Custom privacy policies', starter: false, pro: false, enterprise: true },
  { name: 'SSO / SAML', starter: false, pro: false, enterprise: true },
  { name: 'Dedicated success manager', starter: false, pro: false, enterprise: true },
  { name: 'Custom SLA', starter: false, pro: false, enterprise: true },
  { name: 'On-premise deployment', starter: false, pro: false, enterprise: true },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm">{value}</span>;
  }
  return value ? (
    <Check className="w-5 h-5 text-primary mx-auto" />
  ) : (
    <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
  );
}

export function FeatureComparison() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-4 font-semibold">Feature</th>
            <th className="pb-4 text-center font-semibold">Starter</th>
            <th className="pb-4 text-center font-semibold">Pro</th>
            <th className="pb-4 text-center font-semibold">Enterprise</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature.name} className="border-b border-border">
              <td className="py-4 text-sm">{feature.name}</td>
              <td className="py-4 text-center">
                <FeatureCell value={feature.starter} />
              </td>
              <td className="py-4 text-center">
                <FeatureCell value={feature.pro} />
              </td>
              <td className="py-4 text-center">
                <FeatureCell value={feature.enterprise} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
