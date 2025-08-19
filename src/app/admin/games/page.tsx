// Admin game management page
import AdminSidebar from '@/components/admin/AdminSidebar';
import GameManagement from '@/components/admin/GameManagement';

export default function AdminGamesPage() {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">Game Management</h1>
        <GameManagement />
      </main>
    </div>
  );
}