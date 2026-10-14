import { expect, type Page } from '@playwright/test'

// logIn logs in through the login page and waits for the Catalog.
export async function logIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible()
}
