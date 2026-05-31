import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import LoginPageContent from '@/feature/login'

function LoginFallback() {
  return (
    <div className="grid grid-cols-1 h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}