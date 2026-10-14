import { expect, type Page } from '@playwright/test'
import { pickOption } from './pickOption'

// addMiniature adds a mini with only Card 5's required fields, from the phone's bottom bar, and waits for its
// details page.
export async function addMiniature(page: Page, name: string, creatureType: string, size: string): Promise<void> {
  await page.getByRole('link', { name: 'Add miniature' }).click()
  await page.getByLabel('Name').fill(name)
  await pickOption(page, 'Type', creatureType)
  await pickOption(page, 'Size', size)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}
