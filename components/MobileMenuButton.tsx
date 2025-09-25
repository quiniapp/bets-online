import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

interface MobileMenuButtonProps {
  isOpen: boolean
  onToggle: () => void
}

export function MobileMenuButton({ isOpen, onToggle }: MobileMenuButtonProps) {
  return (
    <div className="lg:hidden p-4 border-b">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="flex items-center gap-2"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        <span>{isOpen ? 'Cerrar' : 'Menú'}</span>
      </Button>
    </div>
  )
}