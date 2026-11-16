declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

declare module '*.css' {}

/** 构建期注入的 API 服务配置，见 rspack.config.ts 的 createConfig */
declare const __API_PROVIDER__: {
  vendor: 'deepseek' | 'opencode'
  origin: string
  apiBasePath: string
  verifyPath: string
  proxyMode: boolean
  model: string
}

/** Prism 语言包通过副作用注册到全局 Prism */
declare module 'prismjs/components/*' {}

/** KaTeX 化学公式扩展通过副作用注册到 KaTeX */
declare module 'katex/contrib/mhchem' {}
