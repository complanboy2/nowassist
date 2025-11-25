import { copyFileSync } from 'fs'

copyFileSync('public/manifest.json', 'dist/manifest.json')
console.log('Manifest copied to dist/')