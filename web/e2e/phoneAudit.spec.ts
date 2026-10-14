import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { adminAccount } from './adminAccount'
import { inviteThroughApi } from './inviteThroughApi'
import { logIn } from './logIn'

// The step 6 phone audit: a screenshot of every screen at 390 × 844, for checking against docs/context.md and the
// design reference. It only runs when asked (PHONE_AUDIT=1 make e2e), and writes to test-results/phone-audit.
test.skip(!process.env.PHONE_AUDIT, 'Run with PHONE_AUDIT=1 to take the phone screenshots.')

const shotsFolder = 'test-results/phone-audit'

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `${shotsFolder}/${name}.png`, fullPage: true })
}

// expectTappable checks a control is at least 44 px tall on a phone (docs/context.md, touch targets).
async function expectTappable(page: Page, name: string): Promise<void> {
  const box = await page.getByRole('button', { name, exact: true }).filter({ visible: true }).first().boundingBox()
  expect(box?.height ?? 0, `${name} is ${box?.height} px tall`).toBeGreaterThanOrEqual(44)
}

async function adminToken(request: APIRequestContext): Promise<string> {
  const login = await request.post('/api/v1/auth/login', { data: adminAccount })
  return ((await login.json()) as { accessToken: string }).accessToken
}

test('every screen at 390 px', async ({ page, request }) => {
  test.setTimeout(120_000)
  // Logged out screens.
  await page.goto('/login')
  await shot(page, '01-login')
  await page.goto('/forgot-password')
  await shot(page, '02-forgot-password')
  await page.goto('/reset-password?token=not-real')
  await shot(page, '03-reset-password')

  const link = await inviteThroughApi(request, 'audit@example.com')
  await page.goto(new URL(link).pathname)
  const asAdmin = { Authorization: `Bearer ${await adminToken(request)}` }
  await shot(page, '04-accept-invite')

  // The Catalog, empty, then with sample minis.
  await logIn(page, adminAccount.email, adminAccount.password)
  await shot(page, '05-catalog-empty')
  const samples = [
    { name: 'Hobgoblin Captain', creatureType: 'humanoid', size: 'medium', challengeRating: 3, tags: ['goblinoid', 'faction:iron-shadows'] },
    { name: 'Goblin', creatureType: 'humanoid', size: 'small', challengeRating: 0.25, quantity: 8, tags: ['goblinoid'] },
    { name: 'Ancient Red Dragon With A Very Long Name', creatureType: 'dragon', size: 'gargantuan', challengeRating: 24 },
    { name: 'Ogre', creatureType: 'giant', size: 'large', challengeRating: 2, paintStatus: 'hand_painted' },
    { name: 'Owlbear', creatureType: 'monstrosity', size: 'large', challengeRating: 3, storageLocation: 'Box 3, shelf 2' },
  ]
  let firstId = ''
  for (const sample of samples) {
    const created = await request.post('/api/v1/miniatures', { headers: asAdmin, data: sample })
    firstId ||= ((await created.json()) as { id: string }).id
  }
  await page.goto('/')
  await shot(page, '06-catalog')
  await page.getByRole('button', { name: 'Filters' }).click()
  await shot(page, '07-filter-sheet')
  await page.goto('/?size=tiny')
  await shot(page, '08-catalog-no-results')
  await expectTappable(page, 'Clear all')

  // One mini: details, edit, add.
  await page.goto(`/minis/${firstId}`)
  await shot(page, '09-details')
  await page.goto(`/minis/${firstId}/edit`)
  await shot(page, '10-edit')
  await page.goto('/minis/new')
  await shot(page, '11-add')

  // Account and Members.
  await page.goto('/profile')
  await shot(page, '12-profile')
  await page.goto('/profile/password')
  await shot(page, '13-change-password')
  await page.goto('/admin/members')
  await shot(page, '14-members')
  await expectTappable(page, 'Make Mateus a member')
  await page.getByRole('button', { name: 'Invite', exact: true }).click()
  await shot(page, '15-invite-sheet')
  const invite = page.getByRole('dialog', { name: 'Invite someone' })
  await invite.getByLabel('Email').fill('rafa@example.com')
  await invite.getByRole('button', { name: 'Send invite' }).click()
  await invite.getByRole('button', { name: 'Done' }).waitFor()
  await shot(page, '16-invite-sent')
})
