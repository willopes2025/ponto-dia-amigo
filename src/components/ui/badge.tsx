import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Adaptado do shadcn/ui em dois pontos, de propósito:
 *
 *  1. Renderiza <span>, não <div>. O badge aparece dentro de <p> e de <label>
 *     por todo o sistema, e um <div> ali é HTML inválido — o React avisa e
 *     alguns navegadores fecham o parágrafo antes do badge, quebrando o layout.
 *  2. Encaminha a ref. Radix passa ref pelo `asChild` (tooltip, popover); sem
 *     forwardRef, o React avisa e o tooltip não ancora no elemento certo.
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  ),
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
