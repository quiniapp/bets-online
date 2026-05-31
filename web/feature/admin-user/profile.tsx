"use client"

import type React from "react"
import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { useChips } from "@/hooks/useChips"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Shield, Calendar, Coins, ChevronRight, Key, Smartphone } from "lucide-react"
import { formatChips } from "@/lib/utils"

export default function UserProfileFeature() {
  const { user, role } = useAuth()
  const { t } = useLanguage()
  const { balance, loadBalance } = useChips()

  useEffect(() => {
    loadBalance()
  }, [loadBalance])

  if (!user) {
    return (
      <DashboardLayout title={t("profile.title")}>
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  const initials = user.username?.charAt(0).toUpperCase() ?? "?"
  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : "N/A"

  return (
    <DashboardLayout title={t("profile.title")}>
      <div className="space-y-3 pb-4">
        {/* Hero card */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-950/70 via-zinc-900 to-zinc-950" />
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-amber-700/8 blur-2xl pointer-events-none" />

          <div className="relative p-3 sm:p-5">
            <div className="flex items-center gap-3">
              {/* Avatar with gold gradient ring */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-700 blur-[1px] scale-[1.06]" />
                <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-2xl sm:text-3xl font-bold text-black shadow-lg shadow-amber-900/40">
                  {initials}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{user.username}</h2>
                {user.email && <p className="text-xs sm:text-sm text-zinc-400 truncate mt-0.5">{user.email}</p>}
                <div className="mt-1.5">
                  <Badge
                    variant="outline"
                    className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs capitalize"
                  >
                    {role}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Chip balance */}
            {balance !== null && (
              <div className="mt-3 p-2.5 sm:p-3.5 rounded-xl bg-black/30 border border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs sm:text-sm">Saldo de Fichas</span>
                </div>
                <span className="text-lg sm:text-xl font-bold text-amber-400 tabular-nums">
                  {formatChips(balance.chipBalance)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Personal info */}
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {t("profile.personalInfo")}
            </p>
          </div>

          <InfoRow icon={<User className="w-4 h-4" />} label={t("profile.username")} value={user.username ?? "—"} />
          <InfoRow icon={<Mail className="w-4 h-4" />} label={t("profile.email")} value={user.email ?? "—"} />
          <InfoRow icon={<Shield className="w-4 h-4" />} label={t("profile.role")} value={role ?? "—"} capitalize />
          <InfoRow icon={<Calendar className="w-4 h-4" />} label={t("profile.createdAt")} value={joinDate} />
        </div>

        {/* Account settings */}
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {t("profile.accountSettings")}
            </p>
          </div>

          <ActionRow icon={<Key className="w-4 h-4 text-amber-400" />} label={t("profile.changePassword")} />
          <ActionRow icon={<Smartphone className="w-4 h-4 text-amber-400" />} label={t("profile.twoFactor")} />
        </div>
      </div>
    </DashboardLayout>
  )
}

function InfoRow({
  icon,
  label,
  value,
  capitalize
}: {
  icon: React.ReactNode
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className={`text-sm font-medium text-white truncate mt-0.5 ${capitalize ? "capitalize" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

function ActionRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors group border-b border-zinc-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium text-white text-left">{label}</span>
      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
    </button>
  )
}
