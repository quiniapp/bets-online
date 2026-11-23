"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { BetsReport } from "@/components/admin/bets-report"

/** Reporte de apuestas para el admin. El owner lo ve también en Finanzas. */
export default function BetsReportPage() {
  return (
    <DashboardLayout title="Reporte de Apuestas">
      <BetsReport />
    </DashboardLayout>
  )
}
