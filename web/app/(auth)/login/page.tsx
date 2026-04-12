import { Suspense } from 'react'
import LoginPageContent from '@/feature/login'

export default function LoginPage(){
    return (
        <Suspense>
            <LoginPageContent />
        </Suspense>
    )
}