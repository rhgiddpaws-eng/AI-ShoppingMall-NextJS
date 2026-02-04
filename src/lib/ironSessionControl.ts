'use server'

import { cookies } from 'next/headers'
import { defaultSession, SessionData, sessionOptions } from './session'
import { getIronSession } from 'iron-session'

export const getSession = async () => {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  if (!session.isLoggedIn) {
    session.id = defaultSession.id
    session.email = defaultSession.email
    session.name = defaultSession.name
    session.role = defaultSession.role
    session.isLoggedIn = defaultSession.isLoggedIn
  }

  return session
}

export const logout = async () => {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  session.destroy()
}
