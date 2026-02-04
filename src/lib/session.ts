import { SessionOptions } from 'iron-session'

export interface SessionData {
  id?: number
  email?: string
  name?: string
  role?: string
  isLoggedIn?: boolean
}

export const defaultSession: SessionData = {
  id: undefined,
  email: undefined,
  name: undefined,
  role: undefined,
  isLoggedIn: false,
}

export const sessionOptions: SessionOptions = {
  password: {
    1: process.env.SESSION_SECRET_1!,
    2: process.env.SESSION_SECRET_2!,
  },
  cookieName: 'ecommerce-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
}
