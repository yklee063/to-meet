import { useNavigate } from 'react-router-dom'
import { STEPS, FEATURES, FAQS } from '../content/seo'

const sectionStyle = { width: '100%', maxWidth: '480px', margin: '0 auto 1.75rem', padding: '0 1rem', boxSizing: 'border-box', textAlign: 'left' }
const sectionTitleStyle = { fontSize: '15px', fontWeight: '600', color: '#333', margin: '0 0 0.6rem', letterSpacing: 0 }
const cardStyle = { background: '#fff', borderRadius: '12px', border: '0.5px solid #e0e0e0' }

function Home() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f7ff',
      fontFamily: 'sans-serif',
      color: '#555',
      wordBreak: 'keep-all'
    }}>
      <header style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '3.5rem 1rem 2rem',
        boxSizing: 'border-box',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', fontWeight: '600', color: '#534AB7', marginBottom: '0.5rem' }}>
          투밋
        </div>
        <h1 style={{ color: '#888', margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: '400', letterSpacing: 0 }}>
          모임 날짜, 약속 잡기를 쉽게 정해요
        </h1>
        <p style={{ color: '#aaa', marginBottom: '1rem', fontSize: '13px', lineHeight: 1.6, maxWidth: '320px' }}>
          링크 하나로 되는 날과 안 되는 날을 모아<br />모두 만날 수 있는 날짜를 찾아드려요.
        </p>
        <ul style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px', listStyle: 'none', padding: 0, margin: '0 0 1.5rem' }}>
          {FEATURES.map(f => (
            <li key={f} style={{ background: '#EEEDFE', color: '#534AB7', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: '500' }}>{f}</li>
          ))}
        </ul>
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
      </header>

      <main>
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>이렇게 사용해요</h2>
          <ol style={{ ...cardStyle, listStyle: 'none', padding: '0.25rem 1rem', margin: 0 }}>
            {STEPS.map((s, i) => (
              <li key={s.title} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '0.7rem 0', borderBottom: i < STEPS.length - 1 ? '0.5px solid #f0f0f0' : 'none' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#EEEDFE', color: '#534AB7', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#333', margin: '2px 0 2px' }}>{s.title}</h3>
                  <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>자주 묻는 질문</h2>
          <div style={{ ...cardStyle, padding: '0 1rem' }}>
            {FAQS.map((f, i) => (
              <details key={f.q} style={{ padding: '0.75rem 0', borderBottom: i < FAQS.length - 1 ? '0.5px solid #f0f0f0' : 'none' }}>
                <summary style={{ fontSize: '13px', fontWeight: '600', color: '#333', cursor: 'pointer' }}>{f.q}</summary>
                <p style={{ fontSize: '12px', color: '#777', lineHeight: 1.6, margin: '0.5rem 0 0' }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ textAlign: 'center', fontSize: '11px', color: '#bbb', padding: '0 0 2rem' }}>
        © 투밋 · 모임 날짜 조율 서비스
      </footer>
    </div>
  )
}

export default Home
