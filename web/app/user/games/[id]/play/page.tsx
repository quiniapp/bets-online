'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameIframe } from '@/components/games/GameIframe';
import { useGameLaunch } from '@/hooks/useGameLaunch';

export default function PlayGamePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { launchGame, loading, error } = useGameLaunch();
  const [gameStartUrl, setGameStartUrl] = useState<string | null>(null);

  const lobbyUrl = `/user/games`;
  const depositUrl = `/user/dashboard`;

  useEffect(() => {
    if (!id) return;
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
