import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#f8f7ff',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '600', color: '#534AB7', marginBottom: '0.5rem' }}>
        투밋
      </h1>
      <p style={{ color: '#888', marginBottom: '2rem', fontSize: '1rem' }}>
        모임 날짜를 쉽게 정해요
      </p>
      <button
        onClick={() => navigate('/create')}
        style={{
          background: '#534AB7',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          padding: '14px 36px',
          fontSize: '1rem',
          fontWeight: '500',
          cursor: 'pointer'
        }}
      >
        모임 만들기
      </button>
    </div>
  )
}

export default Home