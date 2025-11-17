# GitHub Pages Deployment Guide

## Quick Update After Repository Rename

After renaming your repository to `StarField3D`, follow these steps to update GitHub Pages:

### Step 1: Configure GitHub Pages Settings

1. Go to your repository: https://github.com/rootlake/StarField3D
2. Click **Settings** → **Pages** (under "Code and automation")
3. Under **Source**, select **"GitHub Actions"**
4. Save the settings

### Step 2: Trigger a New Deployment

You can trigger a deployment in one of two ways:

**Option A: Manual Trigger (Recommended)**
1. Go to the **Actions** tab in your repository
2. Select "Deploy to GitHub Pages" workflow
3. Click **"Run workflow"** → **"Run workflow"**
4. Wait for deployment to complete (1-2 minutes)

**Option B: Push a Change**
```bash
# Make an empty commit to trigger rebuild
git commit --allow-empty -m "Trigger GitHub Pages rebuild after repo rename"
git push origin main
```

### Step 3: Verify Deployment

1. Wait 1-2 minutes for GitHub Actions to complete
2. Check the **Actions** tab to see deployment status
3. Visit your site: **https://rootlake.github.io/StarField3D/**

### Step 4: Update Local Repository (if needed)

If you have a local clone, update the remote URL:

```bash
git remote set-url origin https://github.com/rootlake/StarField3D.git
git remote -v  # Verify the URL is correct
```

## Troubleshooting

**Workflow not running?**
- Check that GitHub Pages source is set to "GitHub Actions" (not "Deploy from a branch")
- Verify the workflow file exists at `.github/workflows/pages.yml`
- Check repository Settings → Actions → General → ensure workflows are enabled

**Deployment fails?**
- Check the Actions tab for error messages
- Verify `web/` directory exists and contains `index.html`
- Ensure all required files are committed and pushed

**Site not accessible?**
- Verify repository is public (or you have GitHub Pro/Team for private repos)
- Check that deployment completed successfully in Actions tab
- Clear browser cache and try again
- URL should be: `https://rootlake.github.io/StarField3D/`

**Old URL still works?**
- GitHub may cache the old URL temporarily
- The new URL (`https://rootlake.github.io/StarField3D/`) should work within a few minutes
- Old URLs may redirect, but use the new one going forward

## Manual Deployment Commands

If you need to manually trigger a deployment:

```bash
# Make sure you're on the main branch
git checkout main

# Pull latest changes
git pull origin main

# Create empty commit to trigger workflow
git commit --allow-empty -m "Trigger GitHub Pages deployment"
git push origin main
```

## Verification Checklist

- [ ] GitHub Pages source set to "GitHub Actions"
- [ ] Workflow file exists at `.github/workflows/pages.yml`
- [ ] `web/` directory contains `index.html`
- [ ] Actions workflow completed successfully
- [ ] Site accessible at `https://rootlake.github.io/StarField3D/`

## Next Steps

Once deployed:
1. Test the site functionality
2. Share the URL with students: `https://rootlake.github.io/StarField3D/`
3. Verify example CSV files load correctly
4. Test image upload functionality

