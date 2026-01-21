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
import { Search, Edit, Ban, CheckCircle, TreePine, Table, ChevronDown, ChevronRight } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { UserStatus } from "helper"
import type { User, UserTreeNode } from "helper"
import ROUTER from "@/routes"
import { cn } from "@/lib/utils"

type ViewMode = 'table' | 'tree'

interface CollapsibleRowProps {
  user: User
  level: number
  children?: User[]
  allUsers: User[]
  onEdit: (userId: string) => void
  onToggleStatus: (userId: string, status: UserStatus) => void
}

function CollapsibleRow({ user, level, allUsers, onEdit, onToggleStatus }: CollapsibleRowProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2)

  const directChildren = allUsers.filter(u => u.parentUserId === user.id)
  const hasChildren = directChildren.length > 0

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-12 gap-4 p-4 transition-colors hover:bg-muted/50",
          level > 0 && "bg-muted/20"
        )}
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        <div className="col-span-2 flex items-center gap-2">
          {hasChildren ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-muted"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          <div>
            <div className="font-semibold">{user.username}</div>
            {(user.firstName || user.lastName) && (
              <div className="text-xs text-muted-foreground">
                {[user.firstName, user.lastName].filter(Boolean).join(' ')}
              </div>
            )}
          </div>
        </div>
        <div className="col-span-3">
          <div className="text-sm text-gray-600">{user.email || '-'}</div>
        </div>
        <div className="col-span-1">
          <Badge variant="outline">{user.role}</Badge>
        </div>
        <div className="col-span-1">
          <Badge variant={user.status === UserStatus.ACTIVE ? "default" : "secondary"}>
            {user.status}
          </Badge>
        </div>
        <div className="col-span-2">
          <div className="text-sm text-gray-600">
            {formatDate(user.createdAt)}
          </div>
        </div>
        <div className="col-span-2">
          <div className="text-sm text-gray-600">
            {formatDate(user.lastConnection)}
          </div>
        </div>
        <div className="col-span-1">
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => onEdit(user.id)}>
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant={user.status === UserStatus.ACTIVE ? "destructive" : "default"}
              size="sm"
              onClick={() => onToggleStatus(user.id, user.status)}
            >
              {user.status === UserStatus.ACTIVE ?
                <Ban className="h-3 w-3" /> :
                <CheckCircle className="h-3 w-3" />
              }
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <>
          {directChildren.map((child) => (
            <CollapsibleRow
              key={child.id}
              user={child}
              level={level + 1}
              allUsers={allUsers}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
            />
          ))}
        </>
      )}
    </>
  )
}

function UsersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [showAllDescendants, setShowAllDescendants] = useState(true)
  const { users, loading, blockUser, unblockUser, reload, getUserTree } = useUsers()
  const [userTree, setUserTree] = useState<UserTreeNode | null>(null)
  const [loadingTree, setLoadingTree] = useState(false)

  useEffect(() => {
    if (searchParams.get('refresh') === 'true') {
      reload()
      router.replace('/admin/users')
    }
  }, [searchParams, reload, router])

  useEffect(() => {
    if (viewMode === 'tree') {
      loadUserTree()
    }
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

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Get root users (users without parent or whose parent is the current user)
  const rootUsers = showAllDescendants
    ? filteredUsers.filter(u => !filteredUsers.some(p => p.id === u.parentUserId))
    : filteredUsers.filter(u => !u.parentUserId || !filteredUsers.some(p => p.id === u.parentUserId))

  const handleToggleUserStatus = async (userId: string, currentStatus: UserStatus) => {
    try {
      if (currentStatus === UserStatus.ACTIVE) {
        await blockUser(userId)
      } else {
        await unblockUser(userId)
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error)
    }
  }

  const handleEditUser = (userId: string) => {
    router.push(`${ROUTER.EDIT_USER}?id=${userId}`)
  }

  if (loading) {
    return (
      <DashboardLayout title="Lista de Usuarios">
        <div className="text-center py-8">Cargando usuarios...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Lista de Usuarios">
      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar usuarios por nombre, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 border rounded-md p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <Table className="h-4 w-4 mr-2" />
              Tabla
            </Button>
            <Button
              variant={viewMode === 'tree' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('tree')}
            >
              <TreePine className="h-4 w-4 mr-2" />
              Arbol
            </Button>
          </div>

          {/* Show All Toggle */}
          {viewMode === 'table' && (
            <div className="flex items-center space-x-2">
              <Switch
                id="show-all"
                checked={showAllDescendants}
                onCheckedChange={setShowAllDescendants}
              />
              <Label htmlFor="show-all" className="text-sm">
                Mostrar jerarquia
              </Label>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'table' ? (
        <Card>
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm">
            <div className="col-span-2">Usuario</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-1">Rol</div>
            <div className="col-span-1">Estado</div>
            <div className="col-span-2">Registro</div>
            <div className="col-span-2">Ultima Conexion</div>
            <div className="col-span-1">Acciones</div>
          </div>

          {/* Table Body */}
          <div className="divide-y">
            {showAllDescendants ? (
              rootUsers.map((user) => (
                <CollapsibleRow
                  key={user.id}
                  user={user}
                  level={0}
                  allUsers={filteredUsers}
                  onEdit={handleEditUser}
                  onToggleStatus={handleToggleUserStatus}
                />
              ))
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="grid grid-cols-12 gap-4 p-4 transition-colors hover:bg-muted/50">
                  <div className="col-span-2">
                    <div className="font-semibold">{user.username}</div>
                    {(user.firstName || user.lastName) && (
                      <div className="text-xs text-muted-foreground">
                        {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                      </div>
                    )}
                  </div>
                  <div className="col-span-3">
                    <div className="text-sm text-gray-600">{user.email || '-'}</div>
                  </div>
                  <div className="col-span-1">
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                  <div className="col-span-1">
                    <Badge variant={user.status === UserStatus.ACTIVE ? "default" : "secondary"}>
                      {user.status}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600">
                      {user.lastConnection ? new Date(user.lastConnection).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(user.id)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={user.status === UserStatus.ACTIVE ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleToggleUserStatus(user.id, user.status)}
                      >
                        {user.status === UserStatus.ACTIVE ?
                          <Ban className="h-3 w-3" /> :
                          <CheckCircle className="h-3 w-3" />
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            {loadingTree ? (
              <div className="text-center py-8">Cargando arbol de usuarios...</div>
            ) : (
              <UserTreeView
                tree={userTree}
                onEditUser={handleEditUser}
                onToggleStatus={handleToggleUserStatus}
              />
            )}
          </CardContent>
        </Card>
      )}

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No se encontraron usuarios que coincidan con la busqueda.
            </p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  )
}

export default function AdminUsers() {
  return (
    <Suspense fallback={
      <DashboardLayout title="Lista de Usuarios">
        <div className="text-center py-8">Cargando usuarios...</div>
      </DashboardLayout>
    }>
      <UsersPageContent />
    </Suspense>
  )
}
