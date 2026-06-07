'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameIframe } from '@/components/games/GameIframe';
import { useGameLaunch } from '@/hooks/useGameLaunch';
import { useAuth } from '@/contexts/auth-context';
import { UserRole } from 'helper';

const GAME_KEEPALIVE_INTERVAL = 5 * 60 * 1000

export default function PlayGamePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { role, keepAlive } = useAuth();
  const { launchGame, loading, error } = useGameLaunch();
  const [gameStartUrl, setGameStartUrl] = useState<string | null>(null);

  const lobbyUrl = `/user/games`;
  const depositUrl = `/user/dashboard`;

  // Iframe captures all user events so the parent window sees no activity.
  // While the tab is visible the user is actively gaming → reset inactivity timer
  // and refresh the session (the iframe talks to 21viral, not our API, so the
  // backend sliding window never sees a request here).
  // While the tab is hidden the user is away → let the 30-min timer expire normally.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        keepAlive()
      }
    }, GAME_KEEPALIVE_INTERVAL)
    return () => clearInterval(interval)
  }, [keepAlive])

  useEffect(() => {
    if (role !== null && role !== UserRole.PLAYER) {
      router.replace(lobbyUrl);
      return;
    }
    if (!id || role !== UserRole.PLAYER) return;
    launchGame({
      gameId: id,
      playerDeviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      gameMode: 'Real',
      lobbyUrl: `${window.location.origin}${lobbyUrl}`,
      depositUrl: `${window.location.origin}${depositUrl}`
    }).then(url => {
      if (url) setGameStartUrl(url);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Iniciando juego...</p>
        </div>
      </div>
    );
  }

  if (error || (!loading && !gameStartUrl)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-destructive font-medium">{error || 'No se pudo iniciar el juego'}</p>
          <Button variant="outline" onClick={() => router.push(lobbyUrl)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al lobby
          </Button>
        </div>
      </div>
    );
  }

  if (!gameStartUrl) return null;

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      <div className="flex items-center gap-2 px-3 py-2 bg-background/90 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(lobbyUrl)}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Salir
        </Button>
      </div>
      <div className="flex-1">
        <GameIframe
          gameStartUrl={gameStartUrl}
          lobbyUrl={`${window.location.origin}${lobbyUrl}`}
          depositUrl={`${window.location.origin}${depositUrl}`}
        />
      </div>
    </div>
  );
}
