import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@rspack/cli'
import { rspack, type Configuration } from '@rspack/core'

const dev = process.env.NODE_ENV !== 'production'
const targets = ['chrome >= 105', 'edge >= 105', 'safari >= 16', 'firefox >= 110']
const root = path.dirname(fileURLToPath(import.meta.url))
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
) as { version: string }

const cssLoader = {
  loader: 'builtin:lightningcss-loader',
  options: { targets },
}

/** API 服务类型：deepseek 为原生兼容接口，opencode 为 OpenCode Go 网关 */
type ApiVendor = 'deepseek' | 'opencode'

type ConfigOptions = {
  /** 公开 API 的地址，注入为 __API_PROVIDER__.origin */
  apiOrigin?: string
  /** API 路径前缀：DeepSeek 为 /anthropic/v1，OpenCode Go 为 /v1（或同源代理的 /api） */
  apiBasePath?: string
  /** 校验 API Key 的路径：DeepSeek 为 /models，OpenCode Go 为 /v1/models */
  verifyPath?: string
  /** 网关类型，决定请求头与是否剥离 DeepSeek 扩展字段 */
  apiVendor?: ApiVendor
  /** 由同源反向代理注入密钥时，前端使用占位 Key 且不要求用户填写 */
  proxyMode?: boolean
  /** 默认聊天模型 */
  chatModel?: string
  /** 静态资源前缀；默认 auto 以兼容 file://，路径路由部署时设为 / */
  publicPath?: string
  /** 开发服务器配置，支持本地接口代理 */
  devServer?: Configuration['devServer']
}

/**
 * agent.cornhub.art 的线上配置。`pnpm build` 与 `pnpm dev` 都用这一份，不读 PA_* 环境变量。
 * 密钥由 nginx 注入；proxyMode 必须打开，否则前端会弹出 API Key 设置。
 */
const SITE_BUILD = {
  apiOrigin: '',
  apiBasePath: '/api',
  verifyPath: '/api/models',
  apiVendor: 'opencode' as ApiVendor,
  proxyMode: true,
  chatModel: 'deepseek-v4.1-flash',
  publicPath: '/',
}

/** 创建构建配置。生产模式只接受 SITE_BUILD，避免打出 DeepSeek 直连包。 */
export const createConfig = ({
  apiOrigin = SITE_BUILD.apiOrigin,
  apiBasePath = SITE_BUILD.apiBasePath,
  verifyPath = SITE_BUILD.verifyPath,
  apiVendor = SITE_BUILD.apiVendor,
  proxyMode = SITE_BUILD.proxyMode,
  chatModel = SITE_BUILD.chatModel,
  publicPath = SITE_BUILD.publicPath,
  devServer,
}: ConfigOptions = {}): Configuration => {
  if (!dev) {
    const actual = {
      apiOrigin,
      apiBasePath,
      verifyPath,
      apiVendor,
      proxyMode,
      chatModel,
      publicPath,
    }
    const mismatches = (Object.keys(SITE_BUILD) as (keyof typeof SITE_BUILD)[]).filter(
      (key) => actual[key] !== SITE_BUILD[key]
    )
    if (mismatches.length > 0) {
      throw new Error(
        `生产构建必须使用 OpenCode 同源代理，不能退回 DeepSeek 直连。不一致字段：${mismatches.join(', ')}。配置在 rspack.config.ts 的 SITE_BUILD。`
      )
    }
  }
  return {
    mode: dev ? 'development' : 'production',
    entry: './src/main.tsx',
    output: {
      path: path.resolve(root, 'dist'),
      // 绝对前缀 /，配合 nginx 的 try_files 支持会话深链接 /a/chat/s/<id>
      publicPath,
      filename: 'static/js/[name].[contenthash:8].js',
      chunkFilename: 'static/js/async/[name].[contenthash:8].js',
      cssFilename: 'static/css/[name].[contenthash:8].css',
      cssChunkFilename: 'static/css/async/[name].[contenthash:8].css',
      assetModuleFilename: 'static/media/[name].[contenthash:8][ext]',
      clean: true,
    },
    devtool: dev ? 'cheap-module-source-map' : false,
    // 开发模式预编译异步模块，保持首次加载代码高亮和公式时的页面状态
    lazyCompilation: false,
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      // 将 .js 导入路径解析到同名 .ts、.tsx 或 .js 文件
      extensionAlias: { '.js': ['.ts', '.tsx', '.js'] },
    },
    module: {
      // CSS Modules 使用默认导出：`import styles from './x.module.css'`
      parser: { 'css/module': { namedExports: false } },
      generator: { 'css/module': { localIdentName: '[local]-[hash:6]' } },
      rules: [
        { test: /\.module\.css$/, type: 'css/module', use: [cssLoader] },
        { test: /\.css$/, exclude: /\.module\.css$/, type: 'css', use: [cssLoader] },
        {
          test: /\.(j|t)sx?$/,
          exclude: /[\\/]node_modules[\\/]/,
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: { react: { runtime: 'automatic', development: dev } },
              externalHelpers: true,
            },
            env: { targets },
          },
          type: 'javascript/auto',
        },
        { test: /\.(woff2?|ttf)$/, type: 'asset/resource' },
      ],
    },
    plugins: [
      // 经典 defer 脚本支持 file:// 页面的资源加载
      new rspack.HtmlRspackPlugin({
        template: './src/index.html',
        favicon: './src/favicon.svg',
        scriptLoading: 'defer',
        meta: { 'application-version': version },
      }),
      new rspack.DefinePlugin({
        __API_PROVIDER__: JSON.stringify({
          vendor: apiVendor,
          origin: apiOrigin,
          apiBasePath,
          verifyPath,
          proxyMode,
          model: chatModel,
        }),
      }),
      new rspack.CopyRspackPlugin({
        patterns: [{ from: path.resolve(root, 'LICENSE'), to: 'LICENSE', toType: 'file' }],
      }),
    ],
    performance: { hints: false },
    devServer: {
      port: 8090,
      // 与线上一致：/api 走 nginx 注入密钥，搜索和文档提取走本机服务
      proxy: [
        {
          context: ['/api'],
          target: 'https://agent.cornhub.art',
          changeOrigin: true,
          secure: true,
        },
        {
          context: ['/search', '/extract', '/sts2'],
          target: 'http://127.0.0.1:8790',
          changeOrigin: true,
        },
      ],
      ...devServer,
    },
  }
}

// eslint-disable-next-line import/no-default-export
export default defineConfig(createConfig(SITE_BUILD))
