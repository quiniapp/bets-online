import { Metadata } from 'next'
import UserProfileFeature from "@/feature/admin-user/profile"

export const metadata: Metadata = {
  title: 'Mi Perfil - Usuario',
  description: 'Gestiona tu perfil, estadísticas y configuración de usuario',
  keywords: ['perfil', 'usuario', 'estadísticas', 'gaming'],
}

export default function UserProfile() {

  return (

    <UserProfileFeature />

  )
}