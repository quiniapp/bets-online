// User dashboard page
import UserSidebar from '@/components/user/UserSidebar';

export default function UserDashboard() {
  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        {/* User dashboard content will be implemented here */}
      </main>
    </div>
  );
}