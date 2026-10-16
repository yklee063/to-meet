// vite build 후 실행: 홈 화면을 HTML로 미리 그려 넣고, 구조화 데이터와 llms.txt를 만든다.
// - dist/index.html : 홈("/") 전용. 미리 그린 홈 화면 + JSON-LD 포함
// - dist/app.html   : 그 외 경로용 빈 껍데기 (vercel.json rewrite 대상)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const server = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href)
const { renderHome, SITE_URL, STEPS, FEATURES, FAQS } = server

const MARKER = '<!--app-html-->'
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf-8')
if (!template.includes(MARKER)) throw new Error(`index.html에 ${MARKER} 표시가 없어요`)

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '투밋',
    alternateName: 'tomeet',
    url: SITE_URL,
    description: '링크 하나로 여러 사람의 되는 날과 안 되는 날을 모아 모두 만날 수 있는 모임 날짜를 추천해주는 무료 일정 조율 서비스',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    inLanguage: 'ko',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: FEATURES.map(f => f.title),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  },
]
const jsonLdTag = `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`

fs.writeFileSync(path.join(dist, 'app.html'), template.replace(MARKER, ''))
fs.writeFileSync(
  path.join(dist, 'index.html'),
  template.replace(MARKER, renderHome()).replace('</head>', `    ${jsonLdTag}\n  </head>`)
)

const llms = `# 투밋 (tomeet)

> 투밋은 링크 하나로 여러 사람의 일정을 모아 모임 날짜를 정해주는 무료 웹 서비스입니다. 회원가입과 앱 설치 없이 쓸 수 있고, 참여자들이 달력에서 되는 날과 안 되는 날을 표시하면 모두가 만날 수 있는 추천 날짜 TOP 3를 보여줍니다.

- 사이트: ${SITE_URL}
- 모임 만들기: ${SITE_URL}/create
- 언어: 한국어
- 가격: 무료

## 이런 때 쓰면 좋아요
친구 모임, 동창회, 회식, 스터디, 팀 회의처럼 여러 사람의 약속 날짜나 일정을 맞춰야 할 때. 단톡방 날짜 투표 대신 쓸 수 있습니다.

## 사용 방법
${STEPS.map((s, i) => `${i + 1}. ${s.title}: ${s.desc}`).join('\n')}

## 특징
${FEATURES.map(f => `- ${f.title}: ${f.desc}`).join('\n')}

## 자주 묻는 질문
${FAQS.map(f => `### ${f.q}\n${f.a}`).join('\n\n')}
`
fs.writeFileSync(path.join(dist, 'llms.txt'), llms)

console.log('prerender: dist/index.html, dist/app.html, dist/llms.txt 생성 완료')
