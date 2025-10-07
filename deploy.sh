npx vite build
cp vercel.json dist/vercel.json
cd dist
git add .
git commit -m "chore: deploy"
git push
cd ..