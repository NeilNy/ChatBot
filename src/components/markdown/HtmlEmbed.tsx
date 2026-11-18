import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../../app/theme.js'
import { useTranslate } from '../../i18n/index.js'
import styles from './HtmlEmbed.module.css'

/** 只允许内联样式/脚本和 data: 资源，禁止外链与网络请求 */
const CSP =
  "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:;"

const HEIGHT_SCRIPT = `<script>
(() => {
  const send = () => {
    const height = Math.max(
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0,
    );
    parent.postMessage({ type: 'dsh-html-embed-height', height }, '*');
  };
  addEventListener('load', send);
  if (window.ResizeObserver) new ResizeObserver(send).observe(document.documentElement);
  setTimeout(send, 0);
  setTimeout(send, 300);
})();
</script>`

const baseStyle = (theme: string) =>
  `<style>html,body{margin:0;padding:0;background:transparent;color-scheme:${theme};}*{box-sizing:border-box}</style>`

const buildDocument = (html: string, theme: string): string => {
  const fullDocument = /<html[\s>]/i.test(html)
  if (!fullDocument) {
    return `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}">${baseStyle(theme)}</head><body>${html}${HEIGHT_SCRIPT}</body></html>`
  }

  let document = html.replace(/<html([^>]*)>/i, `<html$1 data-theme="${theme}">`)
  document = document.replace(
    /<head([^>]*)>/i,
    `<head$1><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}">${baseStyle(theme)}`
  )
  if (!/<head[\s>]/i.test(document)) {
    document = document.replace(/<html([^>]*)>/i, `<html$1><head>${baseStyle(theme)}</head>`)
  }
  if (/<\/body>/i.test(document)) {
    document = document.replace(/<\/body>/i, `${HEIGHT_SCRIPT}</body>`)
  } else {
    document += HEIGHT_SCRIPT
  }
  return document
}

export const HtmlEmbed = ({ html, loading }: { html: string; loading: boolean }) => {
  const theme = useTheme()
  const t = useTranslate()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(180)

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) {
        return
      }
      const data = event.data as { type?: unknown; height?: unknown }
      if (data?.type !== 'dsh-html-embed-height' || typeof data.height !== 'number') {
        return
      }
      if (Number.isFinite(data.height)) {
        setHeight(Math.max(120, Math.min(4000, Math.ceil(data.height))))
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    setHeight(180)
  }, [html, theme])

  if (loading) {
    return <div className={styles.generating}>{t('htmlEmbedGenerating')}</div>
  }

  return (
    <iframe
      ref={frameRef}
      className={styles.embed}
      title={t('htmlEmbedTitle')}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      srcDoc={buildDocument(html, theme)}
      style={{ height }}
    />
  )
}
