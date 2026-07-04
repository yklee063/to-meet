import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'

function ShareRoom() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  console.log('code:', code)

  const link = `${window.location.origin}/room/${code}`

  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          아래 링크를 친구들에게 공유하세요
        </p>

        {/* 링크 박스 */}
        <div style={{
          background: '#f0efff',
          border: '0.5px solid #c5c2f0',
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '13px',
          color: '#534AB7',
          wordBreak: 'break-all',
          marginBottom: '1rem',
          textAlign: 'left'
        }}>
          {link}
        </div>

        {/* 링크 복사 버튼 */}
        <button
          onClick={handleCopy}
          style={{
            width: '100%',
            background: copied ? '#22c55e' : '#534AB7',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '13px',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer',
            marginBottom: '0.75rem',
            transition: 'background 0.2s'
          }}
        >
          {copied ? '✓ 복사됐어요!' : '링크 복사하기'}
        </button>

        {/* 방장도 입장하기 */}
        <button
          onClick={() => navigate(`/room/${code}`)}
          style={{
            width: '100%',
            background: '#fff',
            color: '#534AB7',
            border: '0.5px solid #534AB7',
            borderRadius: '10px',
            padding: '13px',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          나도 입장하기 →
        </button>
      </div>
    </div>
  )
}

export default ShareRoom