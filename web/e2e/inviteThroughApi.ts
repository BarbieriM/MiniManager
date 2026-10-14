import type { APIRequestContext } from '@playwright/test'
import { adminAccount } from './adminAccount'

// inviteThroughApi logs in as the test Admin through the API, invites email as a Member, and returns the invite
// link, so a test prepares its people without driving screens it is not about.
export async function inviteThroughApi(request: APIRequestContext, email: string): Promise<string> {
  const login = await request.post('/api/v1/auth/login', { data: adminAccount })
  const { accessToken } = (await login.json()) as { accessToken: string }
  const sent = await request.post('/api/v1/admin/invites', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { email, role: 'member' },
  })
  return ((await sent.json()) as { link: string }).link
}
