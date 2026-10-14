import { expect, test } from '@playwright/test'
import { addMiniature } from './addMiniature'
import { adminAccount } from './adminAccount'
import { logIn } from './logIn'

// CLAUDE.md, Testing: accept invite → add mini → find it with two filters, on a phone. It is the MVP's definition of
// done (docs/plan.md), without the photo, which is checked by hand on a real phone.
test('an invited Member signs up on a phone, adds a mini and finds it with two filters combined', async ({ page }) => {
  // The Admin invites Ana from Members, which phones reach from Profile, and copies the link.
  await logIn(page, adminAccount.email, adminAccount.password)
  await page.goto('/profile')
  await page.getByRole('main').getByRole('link', { name: 'Members' }).click()
  await page.getByRole('button', { name: 'Invite', exact: true }).click()
  const invite = page.getByRole('dialog', { name: 'Invite someone' })
  await invite.getByLabel('Email').fill('ana@example.com')
  await invite.getByRole('button', { name: 'Send invite' }).click()
  const inviteLink = await invite.getByTitle(/\/invite\//).getAttribute('title')
  expect(inviteLink).toBeTruthy()
  await invite.getByRole('button', { name: 'Done' }).click()
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Log out' }).click()

  // Ana signs up from the link (Card 1) and lands in the Catalog.
  await page.goto(new URL(inviteLink as string).pathname)
  await expect(page.getByLabel('Email')).toHaveValue('ana@example.com')
  await page.getByLabel('Your name').fill('Ana')
  await page.getByRole('textbox', { name: 'Password' }).fill('a good password')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible()

  // She adds two minis (Card 5) …
  await addMiniature(page, 'Gibbering Mouther', 'Aberration', 'Medium')
  await page.goto('/')
  await addMiniature(page, 'Ogre', 'Giant', 'Large')
  await page.goto('/')

  // … and finds hers with type AND size from the phone filter sheet (Card 6 rules 1 and 2). No other test adds an
  // Aberration, so exactly one mini matches whatever else is in the database.
  await page.getByRole('button', { name: 'Filters' }).click()
  const filters = page.getByRole('dialog', { name: 'Filters' })
  await filters.getByRole('checkbox', { name: /Aberration/ }).check()
  await filters.getByRole('checkbox', { name: /Medium/ }).check()
  await filters.getByRole('button', { name: 'Show 1 mini' }).click()

  // Other tests may have added minis to the shared test database, so only the match count is fixed.
  await expect(page.getByText(/^1 of \d+ minis$/)).toBeVisible()
  await expect(page.getByRole('link', { name: /Gibbering Mouther/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Ogre/ })).toHaveCount(0)
})
