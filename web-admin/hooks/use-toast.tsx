import { toast as sonnerToast } from "sonner"

interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

// A nivel de módulo para que la referencia sea estable: los componentes la usan
// en dependencias de useCallback/useEffect, y una función nueva por render
// dispara esos efectos en bucle (pedidos al API sin fin).
const toast = ({ title, description, variant }: ToastProps) => {
  const message = title || description || ""
  const fullMessage = title && description ? `${title}: ${description}` : message

  if (variant === "destructive") {
    sonnerToast.error(fullMessage)
  } else {
    sonnerToast.success(fullMessage)
  }
}

const toastApi = { toast }

export function useToast() {
  return toastApi
}
