// sessionFor builds the body of a login or refresh response for a User, with a distinct access token.
export function sessionFor(
  displayName: string,
  { role = 'member', accessToken = `token-for-${displayName}` }: { role?: 'admin' | 'member'; accessToken?: string } = {},
): { accessToken: string; expiresIn: number; user: { id: string; displayName: string; role: 'admin' | 'member' } } {
  return { accessToken, expiresIn: 900, user: { id: `${displayName.toLowerCase()}-id`, displayName, role } }
}
