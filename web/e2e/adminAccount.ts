// readSetting returns the environment variable name, which scripts/e2e.sh sets; the tests cannot run without it.
function readSetting(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set: run the end-to-end tests with make e2e`)
  return value
}

// adminAccount is the test Admin scripts/e2e.sh seeds into the throwaway database.
export const adminAccount = { email: readSetting('E2E_ADMIN_EMAIL'), password: readSetting('E2E_ADMIN_PASSWORD') }
