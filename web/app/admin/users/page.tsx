"use client"

import { useState, useEffect, Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { DashboardLayout } from "@/components/dashboard-layout"
import { UserTreeView } from "@/components/admin/user-tree"
import { useUsers } from "@/hooks/useUsers"
import { useDebounce } from "@/hooks/useDebounce"
import {
  Search, Edit, Ban, CheckCircle, TreePine, Table,
  ChevronDown, ChevronRight, ChevronLeft, DollarSign,
  Minus, History, Lock
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { UserStatus } from "helper"
import type { User, UserTreeNode } from "helper"
import ROUTER from "@/routes"
import { cn } from "@/lib/utils"
import { ChipOperationDialog } from "@/components/admin/chip-operation-dialog"
import { MovementsHistoryDialog } from "@/components/admin/movements-history-dialog"
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog"
import { UserDetailDialog } from "@/components/admin/user-detail-dialog"

const ITEMS_PER_PAGE = 10
type ViewMode = 'table' | 'tree'

function formatDate(date: Date | string | null | undefined, withTime = false) {
  if (!date) return '-'
  const d = new Date(date)
  const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (!withTime) return dateStr
  const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${dateStr} ${timeStr}`
}

interface ActionButtonsProps {
  user: User
  onEdit: (id: string) => void
  onToggleStatus: (id: string, status: UserStatus) => void
  onSellChips: (user: User) => void
  onWithdraw: (user: User) => void
  onHistory: (user: User) => void
  onResetPassword: (user: User) => void
}

function ActionButtons({ user, onEdit, onToggleStatus, onSellChips, onWithdraw, onHistory, onResetPassword }: ActionButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" onClick={() => onSellChips(user)} title="Carga de fichas">
        <DollarSign className="h-3.5 w-3.5" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onWithdraw(user)} title="Retiro de fichas">
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onHistory(user)} title="Ver historial">
        <History className="h-3.5 w-3.5" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onResetPassword(user)} title="Cambiar contraseña">
        <Lock className="h-3.5 w-3.5" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onEdit(user.id)} title="Editar">
        <Edit className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={user.status === UserStatus.ACTIVE ? "destructive" : "default"}
        size="sm"
        onClick={() => onToggleStatus(user.id, user.status)}
        title={user.status === UserStatus.ACTIVE ? "Bloquear" : "Activar"}
      >
        {user.status === UserStatus.ACTIVE
          ? <Ban className="h-3.5 w-3.5" />
          : <CheckCircle className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

interface UserRowProps {
  user: User
  level?: number
  allUsers?: User[]
  onEdit: (id: string) => void
  onToggleStatus: (id: string, status: UserStatus) => void
  onSellChips: (user: User) => void
  onWithdraw: (user: User) => void
  onHistory: (user: User) => void
  onResetPassword: (user: User) => void
  onViewDetail: (user: User) => void
}

function CollapsibleRow({ user, level = 0, allUsers = [], onEdit, onToggleStatus, onSellChips, onWithdraw, onHistory, onResetPassword, onViewDetail }: UserRowProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2)
  const directChildren = allUsers.filter(u => u.parentUserId === user.id)
  const hasChildren = directChildren.length > 0

  return (
    <>
      {/* Mobile card */}
      <div className="md:hidden border-b last:border-b-0">
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <button onClick={() => onViewDetail(user)} className="text-left">
              <div className="font-semibold text-blue-500 text-sm">{user.username}</div>
              {(user.firstName || user.lastName) && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                </div>
              )}
            </button>
            <div className="flex gap-1 flex-shrink-0">
              <Badge variant="outline" className="text-xs">{user.role}</Badge>
              <Badge variant={user.status === UserStatus.ACTIVE ? "default" : "secondary"} className="text-xs">
                {user.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Registro: {formatDate(user.createdAt)}</span>
            <span>Últ. conexión: {formatDate(user.lastConnection, true)}</span>
          </div>
          <ActionButtons
            user={user}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onSellChips={onSellChips}
            onWithdraw={onWithdraw}
            onHistory={onHistory}
            onResetPassword={onResetPassword}
          />
        </div>
      </div>

      {/* Desktop row */}
      <div
        className={cn(
          "hidden md:grid grid-cols-12 gap-3 px-4 py-3 items-center transition-colors hover:bg-muted/40 border-b last:border-b-0",
          level > 0 && "bg-muted/10"
        )}
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        {/* Usuario */}
        <div className="col-span-3 flex items-center gap-1.5 min-w-0">
          {hasChildren ? (
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-0.5 rounded hover:bg-muted flex-shrink-0">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <div className="w-5 flex-shrink-0" />
          )}
          <button onClick={() => onViewDetail(user)} className="text-left min-w-0">
            <div className="font-semibold text-blue-500 text-sm truncate">{user.username}</div>
            {(user.firstName || user.lastName) && (
              <div className="text-xs text-muted-foreground truncate">
                {[user.firstName, user.lastName].filter(Boolean).join(' ')}
              </div>
            )}
          </button>
        </div>

        {/* Rol */}
        <div className="col-span-1">
          <Badge variant="outline" className="text-xs whitespace-nowrap">{user.role}</Badge>
        </div>

        {/* Estado */}
        <div className="col-span-1">
          <Badge variant={user.status === UserStatus.ACTIVE ? "default" : "secondary"} className="text-xs">
            {user.status}
          </Badge>
        </div>

        {/* Registro */}
        <div className="col-span-2 text-sm text-muted-foreground">
          {formatDate(user.createdAt)}
        </div>

        {/* Ultima Conexion */}
        <div className="col-span-2 text-sm text-muted-foreground">
          {formatDate(user.lastConnection, true)}
        </div>

        {/* Acciones */}
        <div className="col-span-3">
          <ActionButtons
            user={user}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onSellChips={onSellChips}
            onWithdraw={onWithdraw}
            onHistory={onHistory}
            onResetPassword={onResetPassword}
          />
        </div>
      </div>

      {isExpanded && hasChildren && directChildren.map(child => (
        <CollapsibleRow
          key={child.id}
          user={child}
          level={level + 1}
          allUsers={allUsers}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onSellChips={onSellChips}
          onWithdraw={onWithdraw}
          onHistory={onHistory}
          onResetPassword={onResetPassword}
          onViewDetail={onViewDetail}
        />
      ))}
    </>
  )
}

function UsersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [showAllDescendants, setShowAllDescendants] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogType, setDialogType] = useState<'sell' | 'withdraw' | 'history' | 'reset-password' | 'detail' | null>(null)

  const debouncedSearch = useDebounce(searchTerm, 300)
  const searchQuery = debouncedSearch.length >= 3 ? debouncedSearch : ""

  const { users, loading, pagination, blockUser, unblockUser, reload, getUserTree } = useUsers({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: searchQuery
  })

  const [userTree, setUserTree] = useState<UserTreeNode | null>(null)
  const [loadingTree, setLoadingTree] = useState(false)

  useEffect(() => { setCurrentPage(1) }, [searchQuery])

  useEffect(() => {
    if (searchParams.get('refresh') === 'true') {
      reload()
      router.replace('/admin/users')
    }
  }, [searchParams, reload, router])

  useEffect(() => {
    if (viewMode === 'tree') loadUserTree()
  }, [viewMode])

  const loadUserTree = async () => {
    setLoadingTree(true)
    try {
      const response = await getUserTree()
      if (response.success && response.data) {
        setUserTree(response.data as unknown as UserTreeNode)
      }
    } catch (error) {
      console.error('Error loading user tree:', error)
    } finally {
      setLoadingTree(false)
    }
  }

  const rootUsers = showAllDescendants
    ? users.filter(u => !users.some(p => p.id === u.parentUserId))
    : users.filter(u => !u.parentUserId || !users.some(p => p.id === u.parentUserId))

  const handleToggleUserStatus = async (userId: string, currentStatus: UserStatus) => {
    try {
      if (currentStatus === UserStatus.ACTIVE) { await blockUser(userId) } else { await unblockUser(userId) }
    } catch (error) {
      console.error('Failed to toggle user status:', error)
    }
  }

  const handleEditUser = (userId: string) => router.push(`${ROUTER.EDIT_USER}?id=${userId}`)
  const handleSellChips = (user: User) => { setSelectedUser(user); setDialogType('sell') }
  const handleWithdraw = (user: User) => { setSelectedUser(user); setDialogType('withdraw') }
  const handleHistory = (user: User) => { setSelectedUser(user); setDialogType('history') }
  const handleResetPassword = (user: User) => { setSelectedUser(user); setDialogType('reset-password') }
  const handleViewDetail = (user: User) => { setSelectedUser(user); setDialogType('detail') }
  const handleCloseDialog = () => { setSelectedUser(null); setDialogType(null) }

  const sharedRowProps = {
    onEdit: handleEditUser,
    onToggleStatus: handleToggleUserStatus,
    onSellChips: handleSellChips,
    onWithdraw: handleWithdraw,
    onHistory: handleHistory,
    onResetPassword: handleResetPassword,
    onViewDetail: handleViewDetail,
  }

  if (loading) {
    return (
      <DashboardLayout title="Lista de Usuarios">
        <div className="text-center py-8 text-muted-foreground">Cargando usuarios...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Lista de Usuarios">
      {/* Controls */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar usuarios (min. 3 caracteres)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')}>
              <Table className="h-4 w-4 mr-1.5" />Tabla
            </Button>
            <Button variant={viewMode === 'tree' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('tree')}>
              <TreePine className="h-4 w-4 mr-1.5" />Árbol
            </Button>
          </div>

          {viewMode === 'table' && (
            <div className="flex items-center gap-2">
              <Switch id="show-all" checked={showAllDescendants} onCheckedChange={setShowAllDescendants} />
              <Label htmlFor="show-all" className="text-sm cursor-pointer">Mostrar jerarquía</Label>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'table' ? (
        <Card className="overflow-hidden">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
            <div className="col-span-3">Usuario</div>
            <div className="col-span-1">Rol</div>
            <div className="col-span-1">Estado</div>
            <div className="col-span-2">Registro</div>
            <div className="col-span-2">Última Conexión</div>
            <div className="col-span-3">Acciones</div>
          </div>

          <div>
            {showAllDescendants
              ? rootUsers.map(user => (
                <CollapsibleRow key={user.id} user={user} level={0} allUsers={users} {...sharedRowProps} />
              ))
              : users.map(user => (
                <CollapsibleRow key={user.id} user={user} level={0} {...sharedRowProps} />
              ))
            }
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            {loadingTree ? (
              <div className="text-center py-8 text-muted-foreground">Cargando árbol de usuarios...</div>
            ) : (
              <UserTreeView tree={userTree} onEditUser={handleEditUser} onToggleStatus={handleToggleUserStatus} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {viewMode === 'table' && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-sm text-muted-foreground">
            {users.length} de {pagination.total} usuarios
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />Anterior
            </Button>
            <span className="text-sm px-2">
              {currentPage} / {pagination.totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={currentPage >= pagination.totalPages}>
              Siguiente<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {users.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No se encontraron usuarios{searchQuery ? " que coincidan con la búsqueda" : ""}.
          </CardContent>
        </Card>
      )}

      {selectedUser && (dialogType === 'sell' || dialogType === 'withdraw') && (
        <ChipOperationDialog user={selectedUser} operationType={dialogType} open={true}
          onOpenChange={open => { if (!open) handleCloseDialog() }} onSuccess={() => reload()} />
      )}
      {selectedUser && dialogType === 'history' && (
        <MovementsHistoryDialog user={selectedUser} open={true}
          onOpenChange={open => { if (!open) handleCloseDialog() }} />
      )}
      {selectedUser && dialogType === 'reset-password' && (
        <ResetPasswordDialog user={selectedUser} open={true}
          onOpenChange={open => { if (!open) handleCloseDialog() }} onSuccess={() => reload()} />
      )}
      {selectedUser && dialogType === 'detail' && (
        <UserDetailDialog user={selectedUser} open={true}
          onOpenChange={open => { if (!open) handleCloseDialog() }} onOperationSuccess={() => reload()} />
      )}
    </DashboardLayout>
  )
}

export default function AdminUsers() {
  return (
    <Suspense fallback={
      <DashboardLayout title="Lista de Usuarios">
        <div className="text-center py-8 text-muted-foreground">Cargando usuarios...</div>
      </DashboardLayout>
    }>
      <UsersPageContent />
    </Suspense>
  )
}
