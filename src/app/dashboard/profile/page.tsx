// User profile page
import UserSidebar from '@/components/user/UserSidebar';
import ProfileSettings from '@/components/user/ProfileSettings';

export default function UserProfilePage() {
  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
        <ProfileSettings />
      </main>
    </div>
  );
}