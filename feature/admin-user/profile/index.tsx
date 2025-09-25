"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"

import { useAuth } from "@/contexts/auth-context"
import { type User } from "@/lib/mock-data"
import { MobileMenuButton } from "@/components/MobileMenuButton"
import { ProfileSidebar } from "./ProfileSidebar"
import { ProfileContent } from "./ProfileContent"
import { UserInfoPanel } from "./UserInfoPanel"
import LoaderPage from "@/components/loader-page"

export default function UserProfileFeature() {
  const { user, isLoading } = useAuth()
  const [activeSection, setActiveSection] = useState("estadisticas")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const currentUser = user as User

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId)
    setIsSidebarOpen(false)
  }

  if(isLoading) return <LoaderPage />

  return (
    <DashboardLayout title="Mi Perfil">
      <div className="min-h-screen bg-background">
        <MobileMenuButton 
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <div className="flex">
          <ProfileSidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          {/* Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <main className="flex-1 flex min-w-0">
            <div className="flex-1 p-4 lg:p-6 min-w-0">
              <ProfileContent 
                activeSection={activeSection}
                user={currentUser}
              />
            </div>

            <UserInfoPanel user={currentUser} />
          </main>
        </div>
      </div>
    </DashboardLayout>
  )
}