'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface GameIframeProps {
  gameStartUrl: string;
  lobbyUrl: string;
  depositUrl: string;
}

export function GameIframe({ gameStartUrl, lobbyUrl, depositUrl }: GameIframeProps) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Format A: { type: 'rgs-backToHome' | 'rgs-deposit' }
      if (event.data?.type === 'rgs-backToHome') {
        router.push(lobbyUrl);
        return;
      }
      if (event.data?.type === 'rgs-deposit') {
        router.push(depositUrl);
        return;
      }

      // Format B: { exi_fMessageType_str: 'exi_onHomeUserAction' | 'exi_onCashierUserAction' }
      if (event.data?.exi_fMessageType_str === 'exi_onHomeUserAction') {
        router.push(lobbyUrl);
        return;
      }
      if (event.data?.exi_fMessageType_str === 'exi_onCashierUserAction') {
        router.push(depositUrl);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [lobbyUrl, depositUrl, router]);

  return (
    <iframe
      ref={iframeRef}
      src={gameStartUrl}
      className="w-full h-full border-0"
      allow="fullscreen"
      title="Game"
    />
  );
}
