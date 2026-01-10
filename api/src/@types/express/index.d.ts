import { User } from "helper"

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export {}
