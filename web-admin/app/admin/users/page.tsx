"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { DashboardLayout } from "@/components/dashboard-layout"
import { UserTreeView } from "@/components/admin/user-tree"
import { useUsers } from "@/hooks/useUsers"
import { useDebounce } from "@/hooks/useDebounce"
import {
  Search, Edit, TreePine, Table,
  ChevronDown, ChevronRight, ChevronLeft,
  Lock, Unlock, DollarSign, Key, UserPlus
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { UserStatus, UserRole } from "helper"
import type { User, UserTreeNode } from "helper"
import ROUTER from "@/routes"
import { cn } from "@/lib/utils"
import { apiService } from "@/services/api.service"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog"
import { UserDetailDialog } from "@/components/admin/user-detail-dialog"
import { ChipLoadDialog } from "@/components/admin/chip-load-dialog"

const ITEMS_PER_PAGE = 10
type ViewMode = 'table' | 'tree'

const ROLE_LABELS: Record<string, string> = { OWNER: 'Propietario', ADMIN: 'Admin', CASHIER: 'Cajero', PLAYER: 'Jugador' }
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Activo', BLOCKED: 'Bloqueado' }
const roleLabel = (r: string) => ROLE_LABELS[r] ?? r
const statusLabel = (s: string) => STATUS_LABELS[s] ?? s

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
  onWallet: (user: User) => void
  onResetPassword: (user: User) => void
  onToggleBlock: (user: User) => void
}

function ActionButtons({ user, onEdit, onWallet, onResetPassword, onToggleBlock }: ActionButtonsProps) {
  const isBlocked = user.status === UserStatus.BLOCKED
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline" size="sm"
        onClick={() => onWallet(user)}
        title="Gestionar saldo"
        className="text-yellow-600 border-yellow-300 hover:bg-yellow-50 hover:text-yellow-700"
      >
        <DollarSign className="h-3.5 w-3.5" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onResetPassword(user)} title="Cambiar contraseña">
        <Key className="h-3.5 w-3.5" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onEdit(user.id)} title="Editar usuario">
        <Edit className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline" size="sm"
        onClick={() => onToggleBlock(user)}
        title={isBlocked ? "Desbloquear usuario" : "Bloquear usuario"}
        className={isBlocked ? "text-green-600 border-green-300 hover:bg-green-50" : "text-red-600 border-red-300 hover:bg-red-50"}
      >
        {isBlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

interface UserRowProps {
  user: User
  level?: number
  allUsers?: User[]
  onEdit: (id: string) => void
  onWallet: (user: User) => void
  onResetPassword: (user: User) => void
  onViewDetail: (user: User) => void
  onToggleBlock: (user: User) => void
}

function CollapsibleRow({ user, level = 0, allUsers = [], onEdit, onWallet, onResetPassword, onViewDetail, onToggleBlock }: UserRowProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2)
  const directChildren = allUsers.filter(u => u.parentUserId === user.id)
  const hasChildren = directChildren.length > 0

  return (
    <>
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
          <Badge variant="outline" className="text-xs whitespace-nowrap">{roleLabel(user.role)}</Badge>
        </div>

        {/* Estado */}
        <div className="col-span-1">
          <Badge variant={user.status === UserStatus.ACTIVE ? "default" : "secondary"} className="text-xs">
            {statusLabel(user.status)}
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
            onWallet={onWallet}
            onResetPassword={onResetPassword}
            onToggleBlock={onToggleBlock}
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
          onWallet={onWallet}
          onResetPassword={onResetPassword}
          onViewDetail={onViewDetail}
          onToggleBlock={onToggleBlock}
        />
      ))}
    </>
  )
}

function flattenTreeNode(node: UserTreeNode): User[] {
  return [node.user, ...node.children.flatMap(flattenTreeNode)]
}

function UsersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { role } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogType, setDialogType] = useState<'wallet' | 'reset-password' | 'detail' | null>(null)
  const [blockConfirmUser, setBlockConfirmUser] = useState<User | null>(null)
  const [blockLoading, setBlockLoading] = useState(false)

  const debouncedSearch = useDebounce(searchTerm, 300)
  const searchQuery = debouncedSearch.length >= 3 ? debouncedSearch : ""

  const { getUserTree } = useUsers({ autoLoad: false })

  const [allDescendants, setAllDescendants] = useState<User[]>([])
  const [userTree, setUserTree] = useState<UserTreeNode | null>(null)
  const [loadingTree, setLoadingTree] = useState(false)

  useEffect(() => { setCurrentPage(1) }, [searchQuery])

  const loadTree = useCallback(async () => {
    setLoadingTree(true)
    try {
      const response = await getUserTree()
      if (response.success && response.data) {
        const tree = response.data as unknown as UserTreeNode
        setUserTree(tree)
        setAllDescendants(tree.children.flatMap(flattenTreeNode))
      }
    } catch (error) {
      console.error('Error loading user tree:', error)
    } finally {
      setLoadingTree(false)
    }
  }, [getUserTree])

  useEffect(() => { loadTree() }, [loadTree])

  useEffect(() => {
    if (searchParams.get('refresh') === 'true') {
      loadTree()
      router.replace('/admin/users')
    }
  }, [searchParams, loadTree, router])

  const handleConfirmBlock = async () => {
    if (!blockConfirmUser) return
    const isBlocked = blockConfirmUser.status === UserStatus.BLOCKED
    setBlockLoading(true)
    try {
      const endpoint = isBlocked ? `/users/${blockConfirmUser.id}/unblock` : `/users/${blockConfirmUser.id}/block`
      const response = await apiService.post(endpoint, {})
      if (response.success) {
        toast({ title: isBlocked ? "Usuario desbloqueado" : "Usuario bloqueado", description: `${blockConfirmUser.username} fue ${isBlocked ? 'desbloqueado' : 'bloqueado'} correctamente` })
        loadTree()
      } else {
        toast({ variant: "destructive", title: "Error", description: response.error?.message || "No se pudo cambiar el estado" })
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Error inesperado" })
    } finally {
      setBlockLoading(false)
      setBlockConfirmUser(null)
    }
  }

  const getCreateUserHref = () => {
    if (role === UserRole.CASHIER) return ROUTER.CASHIER_CREATE_USER
    return ROUTER.CREATE_USER
  }

  const filteredUsers = searchQuery
    ? allDescendants.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        [u.firstName, u.lastName].filter(Boolean).join(' ').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allDescendants

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)

  const rootUsers = paginatedUsers.filter(u => !paginatedUsers.some(p => p.id === u.parentUserId))

  const handleEditUser = (userId: string) => router.push(`${ROUTER.EDIT_USER}?id=${userId}`)
  const handleWallet = (user: User) => { setSelectedUser(user); setDialogType('wallet') }
  const handleResetPassword = (user: User) => { setSelectedUser(user); setDialogType('reset-password') }
  const handleViewDetail = (user: User) => { setSelectedUser(user); setDialogType('detail') }
  const handleCloseDialog = () => { setSelectedUser(null); setDialogType(null) }
  const handleToggleBlock = (user: User) => setBlockConfirmUser(user)

  const sharedRowProps = {
    onEdit: handleEditUser,
    onWallet: handleWallet,
    onResetPassword: handleResetPassword,
    onViewDetail: handleViewDetail,
    onToggleBlock: handleToggleBlock,
  }

  if (loadingTree && allDescendants.length === 0) {
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
          <div className="relative flex-1 min-w-[200px]">
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

          <Button onClick={() => router.push(getCreateUserHref())} className="ml-auto">
            <UserPlus className="h-4 w-4 mr-2" />Nuevo Usuario
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <Card className="overflow-hidden">
          {/* Mobile: single-column list */}
          <div className="md:hidden divide-y">
            {paginatedUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 px-3 py-2.5">
                <button className="text-left flex-1 min-w-0" onClick={() => handleViewDetail(user)}>
                  <div className="font-semibold text-blue-500 text-sm truncate">{user.username}</div>
                  <div className="flex gap-1 flex-wrap mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{roleLabel(user.role)}</Badge>
                    <Badge variant={user.status === UserStatus.ACTIVE ? "default" : "secondary"} className="text-[10px] px-1 py-0 h-4">
                      {statusLabel(user.status)}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Reg: {formatDate(user.createdAt)}</div>
                </button>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button variant="outline" size="icon" className="h-7 w-7 text-yellow-600 border-yellow-300 hover:bg-yellow-50" onClick={() => handleWallet(user)} title="Fichas">
                    <DollarSign className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleResetPassword(user)} title="Contraseña">
                    <Key className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleEditUser(user.id)} title="Editar">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline" size="icon"
                    className={cn("h-7 w-7", user.status === UserStatus.BLOCKED ? "text-green-600 border-green-300" : "text-red-600 border-red-300")}
                    onClick={() => handleToggleBlock(user)}
                    title={user.status === UserStatus.BLOCKED ? "Desbloquear" : "Bloquear"}
                  >
                    {user.status === UserStatus.BLOCKED ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
            <div className="col-span-3">Usuario</div>
            <div className="col-span-1">Rol</div>
            <div className="col-span-1">Estado</div>
            <div className="col-span-2">Registro</div>
            <div className="col-span-2">Última Conexión</div>
            <div className="col-span-3">Acciones</div>
          </div>

          <div className="hidden md:block">
            {rootUsers.map(user => (
              <CollapsibleRow key={user.id} user={user} level={0} allUsers={paginatedUsers} {...sharedRowProps} />
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            {loadingTree ? (
              <div className="text-center py-8 text-muted-foreground">Cargando árbol de usuarios...</div>
            ) : (
              <UserTreeView tree={userTree} onEditUser={handleEditUser} onViewProfile={(id) => router.push(`${ROUTER.ADMIN_USERS}/${id}`)} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {viewMode === 'table' && totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-sm text-muted-foreground">
            {filteredUsers.length} de {allDescendants.length} usuarios
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />Anterior
            </Button>
            <span className="text-sm px-2">
              {currentPage} / {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
              Siguiente<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {allDescendants.length === 0 && !loadingTree && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No se encontraron usuarios{searchQuery ? " que coincidan con la búsqueda" : ""}.
          </CardContent>
        </Card>
      )}

      {selectedUser && dialogType === 'wallet' && (
        <ChipLoadDialog preselectedUser={selectedUser} open={true}
          onOpenChange={open => { if (!open) handleCloseDialog() }} onSuccess={() => loadTree()} />
      )}
      {selectedUser && dialogType === 'reset-password' && (
        <ResetPasswordDialog user={selectedUser} open={true}
          onOpenChange={open => { if (!open) handleCloseDialog() }} onSuccess={() => loadTree()} />
      )}
      {selectedUser && dialogType === 'detail' && (
        <UserDetailDialog user={selectedUser} open={true}
          onOpenChange={open => { if (!open) handleCloseDialog() }} onOperationSuccess={() => loadTree()} />
      )}

      <AlertDialog open={!!blockConfirmUser} onOpenChange={open => { if (!open) setBlockConfirmUser(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blockConfirmUser?.status === UserStatus.BLOCKED ? "¿Desbloquear usuario?" : "¿Bloquear usuario?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockConfirmUser?.status === UserStatus.BLOCKED
                ? `"${blockConfirmUser?.username}" podrá volver a iniciar sesión.`
                : `"${blockConfirmUser?.username}" no podrá iniciar sesión hasta ser desbloqueado.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blockLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBlock}
              disabled={blockLoading}
              className={blockConfirmUser?.status === UserStatus.BLOCKED ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {blockLoading ? "Procesando..." : blockConfirmUser?.status === UserStatus.BLOCKED ? "Desbloquear" : "Bloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
