// User contact page
import UserSidebar from '@/components/user/UserSidebar';
import GameAccessRequest from '@/components/user/GameAccessRequest';

export default function UserContactPage() {
  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">Contact Admin</h1>
        <GameAccessRequest />
      </main>
    </div>
  );
}