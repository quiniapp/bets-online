// Admin management page
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminManagement from '@/components/admin/AdminManagement';

export default function AdminManagementPage() {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">Admin Management</h1>
        <AdminManagement />
      </main>
    </div>
  );
}