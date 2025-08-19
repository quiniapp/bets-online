// User login page
import UserLoginForm from '@/components/auth/UserLoginForm';
import LoginLayout from '@/components/auth/LoginLayout';

export default function UserLoginPage() {
  return (
    <LoginLayout>
      <UserLoginForm />
    </LoginLayout>
  );
}