import { useNavigate } from 'react-router-dom'
import { STEPS, FEATURES, FAQS } from '../content/seo'

const sectionStyle = { width: '100%', maxWidth: '480px', margin: '0 auto 2.5rem', padding: '0 1rem', boxSizing: 'border-box', textAlign: 'left' }
const sectionTitleStyle = { fontSize: '1.1rem', fontWeight: '600', color: '#333', margin: '0 0 1rem', letterSpacing: 0 }
const cardStyle = { background: '#fff', borderRadius: '12px', border: '0.5px solid #e0e0e0', padding: '0.9rem 1rem', marginBottom: '8px' }

function Home() {
  const navigate = useNavigate()

  const ctaButton = (
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
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f7ff',
      fontFamily: 'sans-serif',
      color: '#555'
    }}>
      <header style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        boxSizing: 'border-box',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', fontWeight: '600', color: '#534AB7', marginBottom: '0.5rem' }}>
          투밋
        </div>
        <h1 style={{ color: '#888', margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: '400', letterSpacing: 0 }}>
          모임 날짜, 약속 잡기를 쉽게 정해요
        </h1>
        <p style={{ color: '#aaa', marginBottom: '2rem', fontSize: '13px', lineHeight: 1.6, maxWidth: '320px' }}>
          링크 하나로 되는 날과 안 되는 날을 모아<br />모두 만날 수 있는 날짜를 찾아드려요.<br />회원가입 없이 무료로 쓸 수 있어요.
        </p>
        {ctaButton}
      </header>

      <main>
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>이렇게 사용해요</h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {STEPS.map((s, i) => (
              <li key={s.title} style={{ ...cardStyle, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#EEEDFE', color: '#534AB7', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#333', margin: '2px 0 4px' }}>{s.title}</h3>
                  <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>투밋이 편한 이유</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {FEATURES.map(f => (
              <li key={f.title} style={cardStyle}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#534AB7', margin: '0 0 4px' }}>{f.title}</h3>
                <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
              </li>
            ))}
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>자주 묻는 질문</h2>
          {FAQS.map(f => (
            <div key={f.q} style={cardStyle}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#333', margin: '0 0 6px' }}>Q. {f.q}</h3>
              <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.6, margin: 0 }}>{f.a}</p>
            </div>
          ))}
        </section>

        <section style={{ ...sectionStyle, textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#555', marginBottom: '1rem' }}>지금 바로 모임 날짜를 정해보세요</p>
          {ctaButton}
        </section>
      </main>

      <footer style={{ textAlign: 'center', fontSize: '11px', color: '#bbb', padding: '1rem 0 2rem' }}>
        © 투밋 · 모임 날짜 조율 서비스
      </footer>
    </div>
  )
}

export default Home
