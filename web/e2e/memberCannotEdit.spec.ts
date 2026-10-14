import { expect, test } from '@playwright/test'
import { addMiniature } from './addMiniature'
import { inviteThroughApi } from './inviteThroughApi'
import { adminAccount } from './adminAccount'
import { logIn } from './logIn'

// CLAUDE.md, Testing: a Member cannot edit someone else's mini (Card 4 acceptance criteria 1 and 2).
test("a Member sees someone else's mini without Edit or Delete, and cannot open its edit page", async ({ page, request }) => {
  // The Admin adds a Goblin in the browser.
  await logIn(page, adminAccount.email, adminAccount.password)
  await addMiniature(page, 'Goblin Boss', 'Humanoid', 'Small')
  const miniaturePath = new URL(page.url()).pathname

  // Bea joins through the API, so this test only drives the screens it is about.
  const link = await inviteThroughApi(request, 'bea@example.com')
  const token = new URL(link).pathname.split('/').at(-1) ?? ''
  await request.post(`/api/v1/invites/${token}/accept`, { data: { displayName: 'Bea', password: 'bea password' } })

  await page.context().clearCookies()
  await logIn(page, 'bea@example.com', 'bea password')
  await page.goto(miniaturePath)

  await expect(page.getByRole('heading', { name: 'Goblin Boss' })).toBeVisible()
  await expect(page.getByText(/Only Mateus or an admin can edit or delete it/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0)

  await page.goto(`${miniaturePath}/edit`)
  await expect(page.getByText('Only Mateus or an admin can edit this miniature.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0)
})
