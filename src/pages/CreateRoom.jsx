import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function CreateRoom() {
  const navigate = useNavigate()
  const [roomName, setRoomName] = useState('')
  const [maxMembers, setMaxMembers] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generateCode = () => Math.random().toString(36).substring(2, 8)

  const handleCreate = async () => {
    if (!roomName.trim()) { setError('모임 이름을 입력해주세요'); return }
    if (maxMembers !== '' && (isNaN(maxMembers) || Number(maxMembers) < 2 || Number(maxMembers) > 50)) {
      setError('인원은 2명~50명 사이로 입력해주세요'); return
    }
    setLoading(true)
    setError('')

    const code = generateCode()
    const max = maxMembers === '' ? null : Number(maxMembers)

    const { error: roomError } = await supabase
      .from('rooms')
      .insert({ name: roomName.trim(), code, max_members: max })

    if (roomError) { setError('방 만들기 실패: ' + roomError.message); setLoading(false); return }

    navigate(`/share/${code}`)
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
        border: '0.5px solid #e0e0e0'
      }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#534AB7', marginBottom: '1.5rem' }}>
          새 모임 만들기
        </h2>

        {/* 모임 이름 */}
        <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
          모임 이름
        </label>
        <input
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="예: 7월 번개 모임"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '8px',
            border: '0.5px solid #ddd', fontSize: '14px',
            marginBottom: '1rem', boxSizing: 'border-box'
          }}
        />

        {/* 인원수 (선택) */}
        <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
          모임 인원수
          <span style={{
            marginLeft: '6px', fontSize: '11px',
            background: '#f0f0f0', color: '#888',
            borderRadius: '999px', padding: '2px 8px'
          }}>선택</span>
        </label>
        <input
          value={maxMembers}
          onChange={e => setMaxMembers(e.target.value)}
          placeholder="예: 5 (최대 50명)"
          type="number"
          min="2"
          max="50"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '8px',
            border: '0.5px solid #ddd', fontSize: '14px',
            marginBottom: '6px', boxSizing: 'border-box'
          }}
        />
        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '1.5rem' }}>
          설정하면 완료 현황을 계주 진행바로 표시해드려요
        </div>

        {error && (
          <div style={{ color: '#e24b4a', fontSize: '13px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? '#aaa' : '#534AB7',
            color: '#fff', border: 'none', borderRadius: '10px',
            padding: '13px', fontSize: '15px', fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '만드는 중...' : '모임 만들기 →'}
        </button>
      </div>
    </div>
  )
}

export default CreateRoom