import { FavoritesProvider } from "@/contexts/favorites-context"
import type { ReactNode } from "react"

export default function UserLayout({ children }: { children: ReactNode }) {
  return <FavoritesProvider>{children}</FavoritesProvider>
}
