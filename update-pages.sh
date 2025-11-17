#!/bin/bash
# Script to trigger GitHub Pages deployment after repository rename

echo "🚀 Updating GitHub Pages for StarField3D..."
echo ""

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: Not on main branch. Current branch: $CURRENT_BRANCH"
    echo "   Switching to main branch..."
    git checkout main
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Check remote URL
REMOTE_URL=$(git remote get-url origin)
echo "🔗 Current remote URL: $REMOTE_URL"

if [[ ! "$REMOTE_URL" == *"StarField3D"* ]]; then
    echo "⚠️  Remote URL doesn't match new repository name"
    echo "   Updating remote URL..."
    git remote set-url origin https://github.com/rootlake/StarField3D.git
    echo "✅ Remote URL updated"
fi

# Create empty commit to trigger workflow
echo ""
echo "🔄 Creating empty commit to trigger GitHub Pages deployment..."
git commit --allow-empty -m "Trigger GitHub Pages rebuild after repo rename to StarField3D"

# Push to trigger deployment
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Deployment triggered!"
echo ""
echo "Next steps:"
echo "1. Go to: https://github.com/rootlake/StarField3D/settings/pages"
echo "2. Ensure 'Source' is set to 'GitHub Actions'"
echo "3. Check Actions tab: https://github.com/rootlake/StarField3D/actions"
echo "4. Wait 1-2 minutes for deployment"
echo "5. Visit: https://rootlake.github.io/StarField3D/"
echo ""

