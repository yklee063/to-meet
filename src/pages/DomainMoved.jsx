import { SITE_URL } from '../content/seo'

// 옛 주소(to-meet.vercel.app)로 접속했을 때 보여주는 도메인 변경 안내
function DomainMoved() {
  const { pathname, search, hash } = window.location
  const newUrl = SITE_URL + pathname + search + hash
  const isRoomLink = pathname.startsWith('/room/') || pathname.startsWith('/share/')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7ff', fontFamily: 'sans-serif', padding: '1rem', boxSizing: 'border-box', wordBreak: 'keep-all' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem 1.5rem', width: '100%', maxWidth: '360px', border: '0.5px solid #e0e0e0', textAlign: 'center', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '2.5rem', lineHeight: 1, marginBottom: '1rem' }}>📦</div>
        <h1 style={{ fontSize: '1.15rem', fontWeight: '600', color: '#534AB7', margin: '0 0 0.5rem', letterSpacing: 0 }}>
          투밋 주소가 바뀌었어요
        </h1>
        <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
          이제 아래 새 주소에서 이용해주세요.<br />
          {isRoomLink ? '만들어둔 모임과 선택한 날짜는 그대로 있어요.' : '기존 모임도 그대로 이용할 수 있어요.'}
        </p>
        <div style={{ background: '#f0efff', border: '0.5px solid #c5c2f0', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', fontWeight: '600', color: '#534AB7', marginBottom: '1rem' }}>
          tomeet2.com
        </div>
        <a href={newUrl} style={{ display: 'block', background: '#534AB7', color: '#fff', borderRadius: '10px', padding: '13px', fontSize: '15px', fontWeight: '500', textDecoration: 'none' }}>
          {isRoomLink ? '새 주소에서 모임 열기 →' : '새 주소로 이동하기 →'}
        </a>
      </div>
    </div>
  )
}

export default DomainMoved
