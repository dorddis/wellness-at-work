'use client';

import { useEffect, useState } from 'react';
import { Monitor, Apple, Download } from 'lucide-react';

interface DownloadButtonsProps {
  windowsUrl: string | null;
  windowsSize: string | null;
  macosUrl: string | null;
  macosSize: string | null;
}

type Platform = 'windows' | 'macos' | 'other';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'other';

  const userAgent = window.navigator.userAgent.toLowerCase();

  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'macos';

  return 'other';
}

export function DownloadButtons({
  windowsUrl,
  windowsSize,
  macosUrl,
  macosSize,
}: DownloadButtonsProps) {
  const [platform, setPlatform] = useState<Platform>('other');

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  // Determine button order based on detected platform
  const buttons = [
    {
      platform: 'windows' as const,
      label: 'Windows',
      icon: Monitor,
      url: windowsUrl,
      size: windowsSize,
    },
    {
      platform: 'macos' as const,
      label: 'macOS',
      icon: Apple,
      url: macosUrl,
      size: macosSize,
    },
  ];

  // Move user's platform to first position
  if (platform === 'macos') {
    buttons.reverse();
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      {buttons.map((button, index) => {
        const Icon = button.icon;
        const isPrimary = index === 0;
        const isDisabled = !button.url;

        return (
          <a
            key={button.platform}
            href={button.url || '#'}
            className={`
              flex items-center justify-center gap-3 px-8 py-4 rounded-xl
              w-full sm:w-auto min-w-[200px]
              transition-all duration-200
              ${
                isDisabled
                  ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                  : isPrimary
                    ? 'btn btn-primary'
                    : 'btn btn-outline'
              }
            `}
            onClick={(e) => {
              if (isDisabled) {
                e.preventDefault();
              }
            }}
            aria-disabled={isDisabled}
          >
            <Icon className="w-5 h-5" />
            <div className="text-left">
              <div className="font-semibold">
                {isDisabled ? 'Coming Soon' : `Download for ${button.label}`}
              </div>
              {button.size && !isDisabled && (
                <div className="text-xs opacity-75">{button.size}</div>
              )}
            </div>
            {!isDisabled && <Download className="w-4 h-4 ml-2" />}
          </a>
        );
      })}
    </div>
  );
}
