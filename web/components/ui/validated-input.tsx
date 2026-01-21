"use client"

import * as React from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ValidationState = 'neutral' | 'valid' | 'invalid'

interface ValidatedInputProps extends React.ComponentProps<"input"> {
  validationState?: ValidationState
  errorMessage?: string
  successMessage?: string
  showValidationIcon?: boolean
}

function ValidatedInput({
  className,
  validationState = 'neutral',
  errorMessage,
  successMessage,
  showValidationIcon = true,
  ...props
}: ValidatedInputProps) {
  const hasValue = props.value !== undefined && props.value !== ''

  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          data-slot="input"
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-12 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            showValidationIcon && hasValue && "pr-10",
            validationState === 'valid' && hasValue && "border-green-500 focus-visible:border-green-500 focus-visible:ring-green-500/50",
            validationState === 'invalid' && hasValue && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/50",
            className
          )}
          {...props}
        />
        {showValidationIcon && hasValue && validationState !== 'neutral' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {validationState === 'valid' ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-red-500" />
            )}
          </div>
        )}
      </div>
      {validationState === 'invalid' && errorMessage && (
        <p className="text-sm text-red-500">{errorMessage}</p>
      )}
      {validationState === 'valid' && successMessage && (
        <p className="text-sm text-green-500">{successMessage}</p>
      )}
    </div>
  )
}

export { ValidatedInput }
export type { ValidationState }
