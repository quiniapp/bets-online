"use client"

import * as React from "react"
import { Eye, EyeOff, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface PasswordRequirement {
  label: string
  met: boolean
}

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  showRequirements?: boolean
  onValidationChange?: (isValid: boolean) => void
}

function PasswordInput({
  className,
  showRequirements = false,
  onValidationChange,
  value,
  onChange,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)

  const password = typeof value === 'string' ? value : ''

  const requirements: PasswordRequirement[] = [
    { label: "Al menos 8 caracteres", met: password.length >= 8 },
    { label: "Al menos 1 mayuscula", met: /[A-Z]/.test(password) },
    { label: "Al menos 1 numero", met: /[0-9]/.test(password) },
  ]

  const allRequirementsMet = requirements.every(r => r.met)

  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange(allRequirementsMet)
    }
  }, [allRequirementsMet, onValidationChange])

  const getValidationState = () => {
    if (!password) return 'neutral'
    return allRequirementsMet ? 'valid' : 'invalid'
  }

  const validationState = getValidationState()

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          data-slot="input"
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-12 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 pr-10 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            validationState === 'valid' && password && "border-green-500 focus-visible:border-green-500 focus-visible:ring-green-500/50",
            validationState === 'invalid' && password && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/50",
            className
          )}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="sr-only">
            {showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
          </span>
        </Button>
      </div>

      {showRequirements && (isFocused || password) && (
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground font-medium">Requisitos:</p>
          <ul className="space-y-1">
            {requirements.map((req, index) => (
              <li
                key={index}
                className={cn(
                  "flex items-center gap-2",
                  req.met ? "text-green-600" : "text-muted-foreground"
                )}
              >
                {req.met ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                {req.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export { PasswordInput }
