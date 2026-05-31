'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ChipMovementsTable } from './chip-movements-table'
import { useChips } from '@/hooks/useChips'
import { useToast } from '@/hooks/use-toast'
import { DollarSign, Minus, History, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from 'helper'

type WalletTab = 'load' | 'withdraw' | 'history'

interface UserWalletDialogProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultTab?: WalletTab
}

export function UserWalletDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
  defaultTab = 'load'
}: UserWalletDialogProps) {
  const [activeTab, setActiveTab] = useState<WalletTab>(defaultTab)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now())
  const { sellChips, withdraw, loading, balance, loadBalance } = useChips(user.id)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadBalance()
      setActiveTab(defaultTab)
    }
  }, [open, defaultTab, loadBalance])

  useEffect(() => {
    if (!open) {
      setAmount('')
      setDescription('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: 'Error', description: 'El monto debe ser un número positivo', variant: 'destructive' })
      return
    }
    try {
      const op = activeTab === 'load' ? sellChips : withdraw
      const res = await op(user.id, numAmount, description || undefined)
      if (res.success) {
        toast({ title: 'Éxito', description: 'Operación realizada correctamente' })
        setAmount('')
        setDescription('')
        setRefreshTimestamp(Date.now())
        loadBalance()
        onSuccess?.()
      } else {
        toast({ title: 'Error', description: res.error?.message || 'Operación fallida', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error inesperado', variant: 'destructive' })
    }
  }

  const tabs: { id: WalletTab; label: string; Icon: typeof DollarSign }[] = [
    { id: 'load', label: 'Cargar', Icon: DollarSign },
    { id: 'withdraw', label: 'Retirar', Icon: Minus },
    { id: 'history', label: 'Historial', Icon: History },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle>{user.username}</DialogTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Balance actual:</span>
            <span className="text-2xl font-bold text-green-500">
              ${balance?.chipBalance.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
            </span>
          </div>
        </DialogHeader>

        <Separator />

        {/* Tab switcher */}
        <div className="flex rounded-lg overflow-hidden border bg-muted/20">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
                activeTab === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Cargar / Retirar */}
        {(activeTab === 'load' || activeTab === 'withdraw') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wallet-amount">Monto *</Label>
              <Input
                id="wallet-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Ingrese el monto"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-desc">Descripción (opcional)</Label>
              <Textarea
                id="wallet-desc"
                placeholder="Descripción opcional"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {activeTab === 'load' ? 'Cargar Saldo' : 'Retirar Saldo'}
              </Button>
            </div>
          </form>
        )}

        {/* Historial */}
        {activeTab === 'history' && (
          <ChipMovementsTable userId={user.id} limit={10} onRefresh={refreshTimestamp} />
        )}
      </DialogContent>
    </Dialog>
  )
}
