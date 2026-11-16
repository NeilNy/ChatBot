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
  /** 开发服务器配置，支持本地接口代理 */
  devServer?: Configuration['devServer']
}

const env = (name: string, fallback: string) => process.env[name] ?? fallback

/** 创建构建配置，支持自定义 API 地址和开发服务器选项 */
export const createConfig = ({
  apiOrigin = env('PA_API_ORIGIN', 'https://api.deepseek.com'),
  apiBasePath = env('PA_API_BASE_PATH', '/anthropic/v1'),
  verifyPath = env('PA_VERIFY_PATH', '/models'),
  apiVendor = env('PA_API_VENDOR', 'deepseek') as ApiVendor,
  proxyMode = env('PA_PROXY_MODE', 'false') === 'true',
  chatModel = env('PA_CHAT_MODEL', 'deepseek-flash'),
  devServer,
}: ConfigOptions = {}): Configuration => ({
  mode: dev ? 'development' : 'production',
  entry: './src/main.tsx',
  output: {
    path: path.resolve(root, 'dist'),
    // 运行时按当前脚本地址推导资源路径，file:// 下异步 chunk、字体都按相对位置加载
    publicPath: 'auto',
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
  devServer: { port: 8090, ...devServer },
})

// eslint-disable-next-line import/no-default-export
export default defineConfig(createConfig())
