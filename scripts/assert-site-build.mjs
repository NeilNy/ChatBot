import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const marker =
  '{vendor:"opencode",origin:"",apiBasePath:"/api",verifyPath:"/api/models",proxyMode:!0,model:"deepseek-v4.1-flash"}'
const markerUnminified = marker.replace('proxyMode:!0', 'proxyMode:true')

const jsDir = path.join(dist, 'static/js')
const bundles = readdirSync(jsDir).filter((name) => name.endsWith('.js'))
const matched = bundles.some((name) => {
  const text = readFileSync(path.join(jsDir, name), 'utf8')
  return text.includes(marker) || text.includes(markerUnminified)
})
if (!matched) {
  console.error(
    '构建产物不是 OpenCode 同源代理包。拒绝部署：否则站点会弹出 API Key 设置。请保持 rspack.config.ts 的 SITE_BUILD。'
  )
  process.exit(1)
}

const html = readFileSync(path.join(dist, 'index.html'), 'utf8')
if (!html.includes('src="/static/js/')) {
  console.error('index.html 的脚本路径不是 /static/js/，会话深链接会失效。')
  process.exit(1)
}
