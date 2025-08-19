// Admin login page
import AdminLoginForm from '@/components/auth/AdminLoginForm';
import LoginLayout from '@/components/auth/LoginLayout';

export default function AdminLoginPage() {
  return (
    <LoginLayout>
      <AdminLoginForm />
    </LoginLayout>
  );
}