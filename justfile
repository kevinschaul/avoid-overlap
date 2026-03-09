# Start the Storybook server
dev:
    npm run dev

# Publish an alpha release: just publish-alpha 0.3.0-alpha.0
publish-alpha version:
    npm version {{version}} --no-git-tag-version
    npm run build
    npm publish --tag alpha
    git checkout package.json
    git checkout package-lock.json
