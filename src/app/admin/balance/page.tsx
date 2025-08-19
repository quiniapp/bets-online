// Admin balance management page
import AdminSidebar from '@/components/admin/AdminSidebar';
import BalanceManagement from '@/components/admin/BalanceManagement';

export default function AdminBalancePage() {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">Balance Management</h1>
        <BalanceManagement />
      </main>
    </div>
  );
}