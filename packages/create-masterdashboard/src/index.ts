#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { downloadTemplate } from 'giget'
import prompts from 'prompts'
import pc from 'picocolors'

const TEMPLATE_SOURCE = 'github:AsabiAlgo/masterdashboard'

const FILES_TO_REMOVE = [
  'CLAUDE.md',
  'PLAN.md',
  'QUESTIONS.md',
  'REQUIREMENTS.md',
  '.claude',
  'NOTICE',
]

interface PackageJson {
  readonly name: string
  readonly [key: string]: unknown
}

function readPackageJson(filePath: string): PackageJson {
  const content = readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as PackageJson
}

function writePackageJson(filePath: string, data: PackageJson): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')
}

function updateProjectName(projectDir: string, projectName: string): void {
  const rootPkgPath = resolve(projectDir, 'package.json')
  if (existsSync(rootPkgPath)) {
    const pkg = readPackageJson(rootPkgPath)
    writePackageJson(rootPkgPath, { ...pkg, name: projectName })
  }
}

function cleanupFiles(projectDir: string): void {
  for (const file of FILES_TO_REMOVE) {
    const filePath = resolve(projectDir, file)
    if (existsSync(filePath)) {
      rmSync(filePath, { recursive: true, force: true })
    }
  }
}

function tryExec(command: string, cwd: string): boolean {
  try {
    execSync(command, { cwd, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function initGitRepo(projectDir: string): boolean {
  return tryExec('git init', projectDir) && tryExec('git add -A', projectDir) && tryExec('git commit -m "Initial commit from create-masterdashboard"', projectDir)
}

function installDependencies(projectDir: string): boolean {
  const hasPackageManager = (cmd: string): boolean => {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }

  if (hasPackageManager('pnpm')) {
    console.log(pc.cyan('  Installing dependencies with pnpm...'))
    try {
      execSync('pnpm install', { cwd: projectDir, stdio: 'inherit' })
    } catch {
      return false
    }
    console.log(pc.cyan('  Building packages...'))
    try {
      execSync('pnpm build', { cwd: projectDir, stdio: 'inherit' })
    } catch {
      return false
    }
    return true
  }

  console.log(pc.yellow('  pnpm not found. Please install pnpm and run `pnpm install` manually.'))
  console.log(pc.dim('  Install pnpm: npm install -g pnpm'))
  return false
}

async function main(): Promise<void> {
  console.log()
  console.log(pc.bold(pc.cyan('  Create Master Dashboard')))
  console.log(pc.dim('  A persistent, web-based terminal orchestration platform'))
  console.log()

  let projectName = process.argv[2]

  if (!projectName) {
    const response = await prompts({
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-dashboard',
    })

    if (!response.projectName) {
      console.log(pc.red('  Cancelled.'))
      process.exit(1)
    }

    projectName = response.projectName as string
  }

  const projectDir = resolve(process.cwd(), projectName)

  if (existsSync(projectDir)) {
    console.log(pc.red(`  Directory "${projectName}" already exists.`))
    process.exit(1)
  }

  console.log(pc.cyan(`  Scaffolding project into ${pc.bold(projectName)}...`))
  console.log()

  try {
    await downloadTemplate(TEMPLATE_SOURCE, {
      dir: projectDir,
      force: false,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(pc.red(`  Failed to download template: ${message}`))
    process.exit(1)
  }

  console.log(pc.green('  Template downloaded successfully.'))

  cleanupFiles(projectDir)
  updateProjectName(projectDir, projectName)

  console.log(pc.green('  Project files cleaned up.'))
  console.log()

  installDependencies(projectDir)

  console.log()

  initGitRepo(projectDir)

  console.log()
  console.log(pc.green(pc.bold('  Done!')))
  console.log()
  console.log('  Next steps:')
  console.log()
  console.log(pc.cyan(`  cd ${projectName}`))
  console.log(pc.cyan('  cp .env.example .env'))
  console.log(pc.cyan('  cp apps/web/.env.example apps/web/.env.local'))
  console.log(pc.cyan('  pnpm dev'))
  console.log()
  console.log(pc.dim('  Frontend: http://localhost:3050'))
  console.log(pc.dim('  Backend:  http://localhost:4000'))
  console.log()
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(pc.red(`  Error: ${message}`))
  process.exit(1)
})
