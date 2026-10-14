import type { Page } from '@playwright/test'

// pickOption chooses optionName in the form's Select labelled fieldLabel (a combobox with a listbox).
export async function pickOption(page: Page, fieldLabel: string, optionName: string): Promise<void> {
  await page.getByRole('combobox', { name: fieldLabel }).click()
  await page.getByRole('option', { name: optionName }).click()
}
