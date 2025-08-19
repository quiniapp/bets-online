// User games page
import UserSidebar from '@/components/user/UserSidebar';
import BettingInterface from '@/components/user/BettingInterface';

export default function UserGamesPage() {
  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">Available Games</h1>
        <BettingInterface />
      </main>
    </div>
  );
}