# Publishing to npm

Step-by-step guide to publish `@asabialgo/create-masterdashboard` to npm.

## One-Time Setup

### 1. Log in to npm from your terminal

```bash
npm login
```

Enter your npm username (`asabialgo`), password, and email when prompted.

### 2. Add NPM_TOKEN to GitHub (for automated releases)

1. Generate a token: https://www.npmjs.com/settings/asabialgo/tokens
   - Click "Generate New Token" > "Classic Token"
   - Select type: **Automation** (best for CI)
   - Copy the token
2. Add to GitHub repo secrets:
   - Go to https://github.com/AsabiAlgo/masterdashboard/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: paste your token

## Publishing (Manual)

### First-time publish

```bash
# 1. Make sure you're logged in
npm whoami
# Should show: asabialgo

# 2. Build everything
pnpm build

# 3. Publish the CLI package
cd packages/create-masterdashboard
npm publish --access public

# 4. Verify it worked
npm view @asabialgo/create-masterdashboard
```

### Subsequent releases with Changesets

```bash
# 1. Create a changeset (describes what changed)
pnpm changeset
# Follow the prompts: select packages, bump type, description

# 2. Apply version bumps
pnpm version-packages

# 3. Build and publish
pnpm release

# 4. Commit and push the version changes
git add .
git commit -m "chore: version packages"
git push
```

## Publishing (Automated via GitHub Actions)

Once `NPM_TOKEN` is added to GitHub secrets, the release workflow handles everything:

1. Create a changeset locally:
   ```bash
   pnpm changeset
   git add .
   git commit -m "chore: add changeset"
   git push
   ```

2. The GitHub Action will open a **"chore: version packages"** PR automatically

3. Review and merge that PR -- this triggers the publish to npm

## Testing Before Publishing

```bash
# Dry run (shows what would be published, doesn't actually publish)
cd packages/create-masterdashboard
npm pack --dry-run

# Test the CLI locally
node dist/index.js test-project
```

## After Publishing

Users can create new projects with:

```bash
npx @asabialgo/create-masterdashboard my-dashboard
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm ERR! 403` | Run `npm login` again, ensure you have publish access |
| `npm ERR! 402` | Add `--access public` flag (scoped packages default to private) |
| `npm ERR! 404` | The scope `@asabialgo` must match your npm username |
| `.npmrc` warning locally | Normal -- `NPM_TOKEN` is only set in CI, not locally |
