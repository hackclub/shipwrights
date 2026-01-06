import { cookies } from 'next/headers'
import { getSession } from './auth'

export async function getUser() {
  const c = await cookies()
  const token = c.get('session_token')?.value
  return token ? getSession(token) : null
}
