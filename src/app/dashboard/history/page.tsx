// User history page
import UserSidebar from '@/components/user/UserSidebar';
import AccountHistory from '@/components/user/AccountHistory';

export default function UserHistoryPage() {
  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">Account History</h1>
        <AccountHistory />
      </main>
    </div>
  );
}