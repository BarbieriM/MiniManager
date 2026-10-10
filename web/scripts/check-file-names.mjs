// Checks the "one export per file" rule from docs/context.md:
// every file under src/ exports a name equal to its file name, and at most one function or component.
// Companion types and constants are allowed. index.ts barrels, main.tsx and the Vitest setup.ts are exempt.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join, relative } from 'node:path'

const sourceRoot = new URL('../src', import.meta.url).pathname
const exemptFileNames = new Set(['index.ts', 'main.tsx', 'setup.ts'])

// listSourceFiles returns every .ts and .tsx file under directory, at any depth.
function listSourceFiles(directory) {
  return readdirSync(directory).flatMap((entryName) => {
    const entryPath = join(directory, entryName)
    if (statSync(entryPath).isDirectory()) return listSourceFiles(entryPath)
    return /\.(ts|tsx)$/.test(entryName) && !entryName.endsWith('.d.ts') ? [entryPath] : []
  })
}

const problems = []
for (const filePath of listSourceFiles(sourceRoot)) {
  const fileName = basename(filePath)
  if (exemptFileNames.has(fileName)) continue
  const source = readFileSync(filePath, 'utf8')
  const stem = basename(fileName, extname(fileName))

  if (stem.endsWith('.test')) {
    const testedStem = stem.slice(0, -'.test'.length)
    const hasTestedFile = ['.ts', '.tsx'].some((extension) => {
      try {
        return statSync(join(filePath, '..', testedStem + extension)).isFile()
      } catch {
        return false
      }
    })
    if (!hasTestedFile) problems.push(`${relative(sourceRoot, filePath)}: test file has no ${testedStem}.ts or ${testedStem}.tsx next to it`)
    continue
  }

  const exportedFunctions = [...source.matchAll(/^export (?:async )?function (\w+)/gm)].map((match) => match[1])
  const otherExports = [...source.matchAll(/^export (?:const|type|interface|class) (\w+)/gm)].map((match) => match[1])
  const allExports = [...exportedFunctions, ...otherExports]
  if (!allExports.includes(stem)) {
    problems.push(`${relative(sourceRoot, filePath)}: exports ${allExports.join(', ') || 'nothing'}, but no ${stem}`)
  }
  if (exportedFunctions.length > 1) {
    problems.push(`${relative(sourceRoot, filePath)}: exports ${exportedFunctions.length} functions (${exportedFunctions.join(', ')}); move all but ${stem} to their own files`)
  }
}

if (problems.length > 0) {
  console.error('File naming rule (docs/context.md, "File naming: one export per file"):')
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}
