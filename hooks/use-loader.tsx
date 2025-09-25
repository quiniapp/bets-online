 
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoaderConfig {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "overlay" | "inline"
  text?: string
  className?: string
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6", 
  lg: "h-8 w-8",
  xl: "h-12 w-12"
}

export function useLoader(config: LoaderConfig = {}) {
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    size = "md",
    variant = "default", 
    text,
    className
  } = config

  const showLoader = () => setIsLoading(true)
  const hideLoader = () => setIsLoading(false)

  
  const LoaderComponent = () => {
    if (!isLoading) return null

    const spinner = (
      <Loader2 
        className={cn(
          "animate-spin text-primary", 
          sizeClasses[size], 
          className
        )} 
      />
    )

  
    if (variant === "inline") {
      return spinner
    }

  
    if (variant === "overlay") {
      return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            {spinner}
            {text && (
              <p className="text-sm text-muted-foreground animate-pulse">
                {text}
              </p>
            )}
          </div>
        </div>
      )
    }

    // Variante default - contenedor centrado
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        {spinner}
        {text && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {text}
          </p>
        )}
      </div>
    )
  }

  return {
    isLoading,
    showLoader,
    hideLoader,
    setIsLoading,
    Loader: LoaderComponent
  }
}
