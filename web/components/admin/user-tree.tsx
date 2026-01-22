"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, User, Users, Ban, CheckCircle, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { UserTreeNode } from "helper"
import { UserStatus } from "helper"

interface UserTreeProps {
  node: UserTreeNode
  level?: number
  onEditUser?: (userId: string) => void
  onToggleStatus?: (userId: string, currentStatus: UserStatus) => void
}

function UserTreeItem({ node, level = 0, onEditUser, onToggleStatus }: UserTreeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2)
  const hasChildren = node.children && node.children.length > 0

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'CASHIER':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'PLAYER':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      default:
        return ''
    }
  }

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors",
          level > 0 && "ml-6"
        )}
        style={{ marginLeft: level * 24 }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "p-1 rounded hover:bg-muted",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* User icon */}
        {hasChildren ? (
          <Users className="h-4 w-4 text-muted-foreground" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Username */}
        <span className="font-medium">{node.user.username}</span>

        {/* Full name if available */}
        {(node.user.firstName || node.user.lastName) && (
          <span className="text-sm text-muted-foreground">
            ({[node.user.firstName, node.user.lastName].filter(Boolean).join(' ')})
          </span>
        )}

        {/* Role badge */}
        <Badge variant="outline" className={cn("text-xs", getRoleBadgeColor(node.user.role))}>
          {node.user.role}
        </Badge>

        {/* Status badge */}
        <Badge variant={node.user.status === UserStatus.ACTIVE ? "default" : "secondary"}>
          {node.user.status}
        </Badge>

        {/* Balance */}
        <span className="text-sm text-muted-foreground ml-auto mr-4">
          ${node.balance?.chipBalance?.toFixed(2) || '0.00'}
        </span>

        {/* Last connection */}
        <span className="text-xs text-muted-foreground w-36">
          {formatDate(node.user.lastConnection)}
        </span>

        {/* Actions */}
        <div className="flex gap-1">
          {onEditUser && (
            <Button variant="ghost" size="sm" onClick={() => onEditUser(node.user.id)}>
              <Edit className="h-3 w-3" />
            </Button>
          )}
          {onToggleStatus && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStatus(node.user.id, node.user.status)}
            >
              {node.user.status === UserStatus.ACTIVE ? (
                <Ban className="h-3 w-3 text-red-500" />
              ) : (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="border-l border-muted ml-4">
          {node.children.map((child) => (
            <UserTreeItem
              key={child.user.id}
              node={child}
              level={level + 1}
              onEditUser={onEditUser}
              onToggleStatus={onToggleStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface UserTreeViewProps {
  tree: UserTreeNode | null
  onEditUser?: (userId: string) => void
  onToggleStatus?: (userId: string, currentStatus: UserStatus) => void
}

export function UserTreeView({ tree, onEditUser, onToggleStatus }: UserTreeViewProps) {
  if (!tree) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay datos para mostrar
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center gap-2 py-2 px-2 text-sm font-medium text-muted-foreground border-b">
        <div className="w-5" /> {/* Spacer for expand button */}
        <div className="w-4" /> {/* Spacer for icon */}
        <span className="flex-1">Usuario</span>
        <span className="w-20">Rol</span>
        <span className="w-20">Estado</span>
        <span className="w-24 text-right">Balance</span>
        <span className="w-36 text-center">Ultima Conexion</span>
        <span className="w-20">Acciones</span>
      </div>

      {/* Tree */}
      <UserTreeItem
        node={tree}
        onEditUser={onEditUser}
        onToggleStatus={onToggleStatus}
      />
    </div>
  )
}

export { UserTreeItem }
