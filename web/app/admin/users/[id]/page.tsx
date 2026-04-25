'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChipMovementsTable } from '@/components/admin/chip-movements-table'
import { UserWalletDialog } from '@/components/admin/user-wallet-dialog'
import { ResetPasswordDialog } from '@/components/admin/reset-password-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import {
  User, Mail, Calendar, Clock, DollarSign,
  Ban, CheckCircle, ArrowLeft, Edit, Lock, Wallet
} from 'lucide-react'
import { apiService } from '@/services/api.service'
import { useChips } from '@/hooks/useChips'
import { useUsers } from '@/hooks/useUsers'
import { useToast } from '@/hooks/use-toast'
import { UserStatus } from 'helper'
import type { User as UserType } from 'helper'
import ROUTER from '@/routes'
import { cn } from '@/lib/utils'

function formatDate(date: Date | string | null | undefined, withTime = false) {
  if (!date) return '-'
  const d = new Date(date)
  const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (!withTime) return dateStr
  const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${dateStr} ${timeStr}`
}

interface BlockConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  username: string
  isBlocked: boolean
  onConfirm: () => void
  loading: boolean
}

function BlockConfirmModal({ open, onOpenChange, username, isBlocked, onConfirm, loading }: BlockConfirmModalProps) {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!open) {
      setCountdown(5)
      return
    }
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [open, countdown])

  useEffect(() => {
    if (open) setCountdown(5)
  }, [open])

  const action = isBlocked ? 'desbloquear' : 'bloquear'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isBlocked ? 'Confirmar Desbloqueo' : 'Confirmar Bloqueo'}</DialogTitle>
          <DialogDescription>
            ¿Estás seguro que querés {action} al usuario <strong>{username}</strong>?
            {!isBlocked && ' El usuario no podrá acceder a la plataforma.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-4">
          <div className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full border-4 text-2xl font-bold transition-colors',
            countdown > 0
              ? isBlocked ? 'border-green-500 text-green-500' : 'border-destructive text-destructive'
              : isBlocked ? 'border-green-500 bg-green-500/10' : 'border-destructive bg-destructive/10'
          )}>
            {countdown > 0
              ? countdown
              : isBlocked
                ? <CheckCircle className="h-7 w-7 text-green-500" />
                : <Ban className="h-7 w-7 text-destructive" />
            }
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {countdown > 0
              ? `Podés confirmar en ${countdown} segundo${countdown !== 1 ? 's' : ''}...`
              : 'Ya podés confirmar la acción'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant={isBlocked ? 'default' : 'destructive'}
            onClick={onConfirm}
            disabled={countdown > 0 || loading}
            className="flex-1"
          >
            {isBlocked ? 'Desbloquear' : 'Bloquear'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const userId = params.id as string

  const [user, setUser] = useState<UserType | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [walletOpen, setWalletOpen] = useState(false)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now())

  const { balance, loadBalance } = useChips(userId)
  const { blockUser, unblockUser } = useUsers({ autoLoad: false })

  const loadUser = useCallback(async () => {
    setLoadingUser(true)
    try {
      const res = await apiService.get<UserType>(`/users/${userId}`)
      if (res.success && res.data) setUser(res.data)
    } catch (err) {
      console.error('Failed to load user', err)
    } finally {
      setLoadingUser(false)
    }
  }, [userId])

  useEffect(() => {
    loadUser()
    loadBalance()
  }, [loadUser, loadBalance])

  const handleToggleBlock = async () => {
    if (!user) return
    setBlockLoading(true)
    try {
      const action = user.status === UserStatus.ACTIVE ? blockUser : unblockUser
      const res = await action(userId)
      if (res.success) {
        toast({
          title: 'Éxito',
          description: `Usuario ${user.status === UserStatus.ACTIVE ? 'bloqueado' : 'desbloqueado'} correctamente`
        })
        setBlockModalOpen(false)
        loadUser()
      } else {
        toast({ title: 'Error', description: res.error?.message || 'Error al cambiar estado', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error al cambiar estado', variant: 'destructive' })
    } finally {
      setBlockLoading(false)
    }
  }

  if (loadingUser) {
    return (
      <DashboardLayout title="Perfil de Usuario">
        <div className="py-12 text-center text-muted-foreground">Cargando...</div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return (
      <DashboardLayout title="Perfil de Usuario">
        <div className="py-12 text-center text-muted-foreground">Usuario no encontrado</div>
      </DashboardLayout>
    )
  }

  const isBlocked = user.status !== UserStatus.ACTIVE
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')

  return (
    <DashboardLayout title={`Perfil: ${user.username}`}>
      {/* Header actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTER.ADMIN_USERS)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Volver
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setResetPasswordOpen(true)}>
            <Lock className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Contraseña</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`${ROUTER.EDIT_USER}?id=${userId}`)}>
            <Edit className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
          <Button
            variant={isBlocked ? 'default' : 'destructive'}
            size="sm"
            onClick={() => setBlockModalOpen(true)}
          >
            {isBlocked
              ? <><CheckCircle className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">Desbloquear</span></>
              : <><Ban className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">Bloquear</span></>
            }
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* User info + movements */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <User className="h-5 w-5 shrink-0" />
                    {user.username}
                  </CardTitle>
                  {fullName && <p className="mt-1 text-sm text-muted-foreground">{fullName}</p>}
                </div>
                <Badge variant={isBlocked ? 'secondary' : 'default'} className="shrink-0">
                  {user.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {user.email && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />Email
                    </div>
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" />Rol
                  </div>
                  <Badge variant="outline">{user.role}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />Registro
                  </div>
                  <p className="text-sm font-medium">{formatDate(user.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />Última Conexión
                  </div>
                  <p className="text-sm font-medium">{formatDate(user.lastConnection, true)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimos Movimientos</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <ChipMovementsTable userId={userId} limit={10} onRefresh={refreshTimestamp} />
            </CardContent>
          </Card>
        </div>

        {/* Balance sidebar */}
        <div>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-col items-center gap-1 text-center">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />Balance
                </div>
                <p className="text-4xl font-bold text-green-500">
                  ${balance?.chipBalance.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
                </p>
              </div>
              <Separator />
              <Button onClick={() => setWalletOpen(true)} className="w-full" size="lg">
                <Wallet className="mr-2 h-4 w-4" />
                Gestionar Saldo
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <UserWalletDialog
        user={user}
        open={walletOpen}
        onOpenChange={setWalletOpen}
        onSuccess={() => {
          loadBalance()
          setRefreshTimestamp(Date.now())
        }}
      />

      <ResetPasswordDialog
        user={user}
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        onSuccess={() => {}}
      />

      <BlockConfirmModal
        open={blockModalOpen}
        onOpenChange={setBlockModalOpen}
        username={user.username}
        isBlocked={isBlocked}
        onConfirm={handleToggleBlock}
        loading={blockLoading}
      />
    </DashboardLayout>
  )
}
