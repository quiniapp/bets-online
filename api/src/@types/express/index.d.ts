import type { User } from "helper"

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export {}
