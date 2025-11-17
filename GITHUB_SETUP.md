# GitHub Setup Checklist

## Pre-Deployment Checklist

Before pushing to GitHub, ensure:

- [x] GitHub Actions workflow created (`.github/workflows/pages.yml`)
- [x] Documentation updated (README.md, STUDENT_GUIDE.md)
- [x] .gitignore configured properly
- [ ] Example CSV files ready in `web/assets/Examples/`
- [ ] Example images ready in `web/assets/images/`
- [ ] Standard frame size documented

## Deployment Steps

### 1. Initial GitHub Setup

```bash
# If not already a git repository
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: StarField3D 3D Visualization"

# Add remote (replace with your GitHub username/repo)
git remote add origin https://github.com/rootlake/StarField3D.git

# Push to GitHub
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **"GitHub Actions"**
4. The workflow will automatically deploy on the next push

### 3. Verify Deployment

1. Wait 1-2 minutes for GitHub Actions to complete
2. Check the **Actions** tab to see deployment status
3. Visit `https://rootlake.github.io/StarField3D/`

### 4. Share with Students

Share the GitHub Pages URL with your students. They can:
- Access the tool from any device
- Upload their CSV files and images
- Generate 3D visualizations

## Troubleshooting

**Workflow fails:**
- Check Actions tab for error messages
- Verify `.github/workflows/pages.yml` syntax is correct
- Ensure `web/` directory exists and contains `index.html`

**Pages not updating:**
- Check Actions tab - deployment may still be in progress
- Verify you pushed to the `main` branch
- Clear browser cache

**Students can't access:**
- Verify GitHub Pages is enabled in Settings
- Check repository visibility (public repos work best)
- Ensure URL matches your repository name

## Updating the Site

Simply push changes to the `main` branch:

```bash
git add .
git commit -m "Update: description of changes"
git push
```

GitHub Actions will automatically redeploy the site.

## File Structure for GitHub

```
StarField3D/
├── .github/
│   └── workflows/
│       └── pages.yml          # GitHub Pages deployment
├── web/                        # Source directory for Pages
│   ├── index.html
│   ├── js/
│   ├── css/
│   └── assets/
│       ├── Examples/          # Example CSV files
│       └── images/            # Example images
├── README.md
├── STUDENT_GUIDE.md
├── CONFIGURATION.md
└── .gitignore
```

## Next Steps

1. **Add Example Data**: Place example CSV files and images in `web/assets/Examples/` and `web/assets/images/`
2. **Document Standard Frame Size**: Update `STUDENT_GUIDE.md` with your observatory's standard dimensions
3. **Test Deployment**: Upload a test CSV and verify visualization works
4. **Share URL**: Provide GitHub Pages URL to students

