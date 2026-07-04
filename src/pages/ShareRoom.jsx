import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

const KAKAO_JS_KEY = '65133d3f6b915284e9d3e9ae51522d50'

function ShareRoom() {
  const { code } = useParams()
  const navigate = useNavigate()
  const link = `${window.location.origin}/room/${code}`

  useEffect(() => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(KAKAO_JS_KEY)
    }
  }, [])

  const handleKakaoShare = () => {
    if (!window.Kakao || !window.Kakao.isInitialized()) {
      alert('카카오 SDK가 로드되지 않았어요. 잠시 후 다시 시도해주세요.')
      return
    }
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: '투밋 — 날짜 조율 초대',
        description: '링크를 눌러 가능한 날짜를 선택해주세요!',
        imageUrl: 'https://to-meet.vercel.app/icons.svg',
        link: {
          mobileWebUrl: link,
          webUrl: link,
        },
      },
      buttons: [
        {
          title: '날짜 선택하러 가기',
          link: {
            mobileWebUrl: link,
            webUrl: link,
          },
        },
      ],
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8f7ff',
      fontFamily: 'sans-serif',
      padding: '1rem'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '2rem',
        width: '100%',
        maxWidth: '400px',
        border: '0.5px solid #e0e0e0',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#534AB7', marginBottom: '0.5rem' }}>
          모임이 만들어졌어요!
        </h2>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '2rem' }}>
          친구들에게 공유하고 날짜를 정해보세요
        </p>

        {/* 카카오톡 공유 버튼 */}
        <button onClick={handleKakaoShare} style={{
          width: '100%', padding: '13px', borderRadius: '10px',
          border: 'none', background: '#FEE500',
          color: '#191919', fontSize: '15px', fontWeight: '600',
          cursor: 'pointer', marginBottom: '0.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}>
          <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
            <path d="M9 1C4.582 1 1 3.896 1 7.5c0 2.332 1.438 4.376 3.6 5.572L3.75 17l4.418-2.95C8.44 14.08 8.717 14.1 9 14.1c4.418 0 8-2.896 8-6.6S13.418 1 9 1z" fill="#191919"/>
          </svg>
          카카오톡으로 공유하기
        </button>

        {/* 나도 입장하기 */}
        <button onClick={() => navigate(`/room/${code}`)} style={{
          width: '100%',
          background: '#fff',
          color: '#534AB7',
          border: '0.5px solid #534AB7',
          borderRadius: '10px',
          padding: '13px',
          fontSize: '15px',
          fontWeight: '500',
          cursor: 'pointer'
        }}>
          나도 입장하기 →
        </button>
      </div>
    </div>
  )
}

export default ShareRoom