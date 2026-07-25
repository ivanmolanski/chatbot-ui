"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ComponentProps, FC } from "react"

export const Providers: FC<ComponentProps<typeof NextThemesProvider>> = ({
  children,
  ...props
}) => {
  return (
    <NextThemesProvider {...props}>
      <TooltipProvider>{children}</TooltipProvider>
    </NextThemesProvider>
  )
}
