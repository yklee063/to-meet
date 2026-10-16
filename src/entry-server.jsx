// 빌드 시 홈 화면을 미리 HTML로 만들기 위한 진입점 (scripts/prerender.js에서 사용)
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import Home from './pages/Home.jsx'

export { SITE_URL, STEPS, FEATURES, FAQS } from './content/seo.js'

export function renderHome() {
  return renderToString(
    <StaticRouter location="/">
      <Home />
    </StaticRouter>
  )
}
