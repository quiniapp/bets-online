"use client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useOwnerGuard } from "@/hooks/useOwnerGuard"
import { ThemeGenerator } from "@/components/admin/theme-generator/theme-generator"

export default function ThemeGeneratorPage() {
  useOwnerGuard()

  return (
    <DashboardLayout title="Generador de temas">
      <ThemeGenerator />
    </DashboardLayout>
  )
}
