import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Room() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [nickname, setNickname] = useState('')
  const [participant, setParticipant] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  const todayDate = new Date(); todayDate.setHours(0,0,0,0)
  const [calYear, setCalYear] = useState(todayDate.getFullYear())
  const [calMonth, setCalMonth] = useState(todayDate.getMonth())

  const [tempVotes, setTempVotes] = useState({})
  const [myVotes, setMyVotes] = useState({})
  const [othersVotes, setOthersVotes] = useState([])
  const [isDone, setIsDone] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const makeDateKey = (year, month, day) => {
    const m = String(month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${year}-${m}-${d}`
  }

  useEffect(() => {
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('rooms').select('*').eq('code', code).single()
      if (error || !data) { setError('존재하지 않는 방이에요'); setLoading(false); return }
      setRoom(data)
      fetchParticipants(data.id)

      const saved = localStorage.getItem(`room_${code}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const { data: existingPart } = await supabase
            .from('participants').select('*').eq('id', parsed.id).single()
          if (existingPart) {
            setParticipant(existingPart)
            setIsDone(existingPart.is_done || false)
            await fetchMyVotes(existingPart.id)
            await fetchOthersVotes(data.id, existingPart.id)
          } else {
            localStorage.removeItem(`room_${code}`)
          }
        } catch (e) {
          localStorage.removeItem(`room_${code}`)
        }
      }
      setLoading(false)
    }
    fetchRoom()
  }, [code])

  const fetchParticipants = async (roomId) => {
    const { data } = await supabase
      .from('participants').select('*').eq('room_id', roomId).order('joined_at')
    setParticipants(data || [])
  }

  const fetchMyVotes = async (participantId) => {
    const { data } = await supabase
      .from('date_votes').select('*').eq('participant_id', participantId)
    const map = {}
    data?.forEach(v => { map[v.voted_date] = v.status })
    setMyVotes(map)
    setTempVotes(map)
  }

  const fetchOthersVotes = async (roomId, myParticipantId) => {
    const { data: doneParts } = await supabase
      .from('participants').select('*')
      .eq('room_id', roomId).eq('is_done', true)
      .neq('id', myParticipantId)
    if (!doneParts || doneParts.length === 0) { setOthersVotes([]); return }
    const doneIds = doneParts.map(p => p.id)
    const { data: voteData } = await supabase
      .from('date_votes').select('*').in('participant_id', doneIds)
    const grouped = doneParts.map(p => ({
      ...p,
      votes: voteData?.filter(v => v.participant_id === p.id) || []
    }))
    setOthersVotes(grouped)
  }

  useEffect(() => {
    if (!room || !participant) return
    const ch1 = supabase.channel('participants-' + room.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: 'room_id=eq.' + room.id },
        () => { fetchParticipants(room.id); fetchOthersVotes(room.id, participant.id) })
      .subscribe()
    const ch2 = supabase.channel('votes-' + room.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'date_votes', filter: 'room_id=eq.' + room.id },
        () => fetchOthersVotes(room.id, participant.id))
      .subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [room, participant])

  const handleJoin = async () => {
    if (!nickname.trim()) { setError('이름을 입력해주세요'); return }
    setJoining(true); setError('')

    const { data: existing } = await supabase
      .from('participants')
      .select('*')
      .eq('room_id', room.id)
      .eq('nickname', nickname.trim())
      .single()

    if (existing) {
      localStorage.setItem(`room_${code}`, JSON.stringify({ id: existing.id, nickname: existing.nickname }))
      setParticipant(existing)
      setIsDone(existing.is_done || false)
      fetchMyVotes(existing.id)
      fetchOthersVotes(room.id, existing.id)
      setJoining(false)
      return
    }

    const { data, error } = await supabase
      .from('participants')
      .insert({ room_id: room.id, nickname: nickname.trim() })
      .select().single()

    if (error) {
      setError('입장 실패: ' + error.message)
      setJoining(false); return
    }
    localStorage.setItem(`room_${code}`, JSON.stringify({ id: data.id, nickname: data.nickname }))
    setParticipant(data)
    setIsDone(data.is_done || false)
    fetchMyVotes(data.id)
    fetchOthersVotes(room.id, data.id)
    setJoining(false)
  }

  const handleTempVote = (dateKey) => {
    if (isDone && !isEditing) return
    setTempVotes(prev => {
      const n = { ...prev }
      if (n[dateKey] === 'no') delete n[dateKey]
      else n[dateKey] = 'no'
      return n
    })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    await supabase.from('date_votes').delete().eq('participant_id', participant.id)
    const insertData = Object.entries(tempVotes).map(([date, status]) => ({
      participant_id: participant.id,
      room_id: room.id,
      voted_date: date,
      status
    }))
    if (insertData.length > 0) await supabase.from('date_votes').insert(insertData)
    await supabase.from('participants').update({ is_done: true }).eq('id', participant.id)
    setMyVotes(tempVotes)
    setIsDone(true)
    setIsEditing(false)
    setSubmitting(false)
    fetchParticipants(room.id)
    fetchOthersVotes(room.id, participant.id)
  }

  const handleEdit = async () => {
    await supabase.from('participants').update({ is_done: false }).eq('id', participant.id)
    setIsDone(false)
    setIsEditing(true)
    fetchParticipants(room.id)
  }

  const canGoPrev = calYear > todayDate.getFullYear() ||
    (calYear === todayDate.getFullYear() && calMonth > todayDate.getMonth())

  const handlePrevMonth = () => {
    if (!canGoPrev) return
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }

  const handleNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#888' }}>
      불러오는 중...
    </div>
  )

  if (error && !room) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#e24b4a' }}>
      {error}
    </div>
  )

  if (!participant) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8f7ff', fontFamily: 'sans-serif', padding: '1rem', boxSizing: 'border-box' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '400px', border: '0.5px solid #e0e0e0', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>초대받은 모임</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#534AB7', marginBottom: '0.5rem' }}>{room.name}</h2>
        <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '1.5rem' }}>현재 {participants.length}명 참여 중</div>
        <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>내 이름 입력</label>
        <input
          value={nickname} onChange={e => setNickname(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          placeholder="예: 김철수"
          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #ddd', fontSize: '14px', marginBottom: '1rem', boxSizing: 'border-box' }}
        />
        {error && <div style={{ color: '#e24b4a', fontSize: '13px', marginBottom: '1rem' }}>{error}</div>}
        <button onClick={handleJoin} disabled={joining} style={{ width: '100%', background: joining ? '#aaa' : '#534AB7', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '15px', fontWeight: '500', cursor: joining ? 'not-allowed' : 'pointer' }}>
          {joining ? '확인 중...' : '입장하기 →'}
        </button>
        {participants.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>참여자</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {participants.map(p => (
                <span key={p.id} style={{ background: '#EEEDFE', color: '#534AB7', borderRadius: '999px', padding: '4px 12px', fontSize: '13px' }}>
                  {p.nickname}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const totalDays = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const doneParts = participants.filter(p => p.is_done)
  const allDone = room.max_members && doneParts.length >= room.max_members

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: 'sans-serif', padding: '0.75rem', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>

        {/* 헤더 */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>{room.name}</div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#534AB7', margin: 0 }}>
            {isDone ? `${participant.nickname}님, 선택 완료!` : `${participant.nickname}님, 안 되는 날짜를 선택해주세요`}
          </h2>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
            날짜를 클릭하면 X 표시돼요 · 다시 클릭하면 해제
          </div>
        </div>

        {/* 계주 진행바 */}
        {room.max_members && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '0.5rem', border: '0.5px solid #e0e0e0', marginBottom: '0.75rem', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '500', color: '#534AB7' }}>완료 현황</span>
              <span style={{ fontSize: '11px', color: '#888' }}>{doneParts.length} / {room.max_members}명</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {Array.from({ length: room.max_members }).map((_, i) => {
                const done = i < doneParts.length
                const isLast = i === doneParts.length - 1 && done
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: done ? '#534AB7' : '#f0f0f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', transition: 'all 0.3s',
                      border: isLast ? '2px solid #22c55e' : 'none'
                    }}>
                      {done ? '🏃' : '👤'}
                    </div>
                    <div style={{ height: '3px', width: '100%', background: done ? '#534AB7' : '#f0f0f0', borderRadius: '2px' }} />
                    <div style={{ fontSize: '8px', color: done ? '#534AB7' : '#ccc', textAlign: 'center', maxWidth: '32px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doneParts[i]?.nickname || ''}
                    </div>
                  </div>
                )
              })}
              <div style={{ fontSize: '16px' }}>🏁</div>
            </div>
          </div>
        )}

        {/* 참여자 목록 */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {participants.map(p => (
            <span key={p.id} style={{
              background: p.id === participant.id ? '#EEEDFE' : p.is_done ? '#E1F5EE' : '#f0f0f0',
              color: p.id === participant.id ? '#534AB7' : p.is_done ? '#085041' : '#888',
              borderRadius: '999px', padding: '3px 10px', fontSize: '11px', fontWeight: '500'
            }}>
              {p.nickname} {p.id === participant.id ? '(나)' : p.is_done ? '✓' : ''}
            </span>
          ))}
        </div>

        {/* 달력 */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '0.75rem', border: '0.5px solid #e0e0e0', marginBottom: '0.75rem', boxSizing: 'border-box', width: '100%', overflow: 'hidden' }}>

          {/* 달력 네비 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <button onClick={handlePrevMonth} style={{
              background: 'none', border: '0.5px solid #e0e0e0', borderRadius: '6px',
              width: '28px', height: '28px', cursor: canGoPrev ? 'pointer' : 'not-allowed',
              fontSize: '14px', opacity: canGoPrev ? 1 : 0.3, flexShrink: 0
            }}>‹</button>
            <span style={{ fontWeight: '500', color: '#333', fontSize: '14px' }}>{calYear}년 {calMonth + 1}월</span>
            <button onClick={handleNextMonth} style={{ background: 'none', border: '0.5px solid #e0e0e0', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>›</button>
          </div>

          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
            {['일','월','화','수','목','금','토'].map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: '500', color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#aaa', padding: '3px 0' }}>{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={'e' + i} style={{ aspectRatio: '1' }} />)}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
              const dateKey = makeDateKey(calYear, calMonth, day)
              const thisDate = new Date(calYear, calMonth, day)
              const isPast = thisDate < todayDate
              const dow = thisDate.getDay()
              const myTemp = tempVotes[dateKey]
              const othersNo = othersVotes.filter(p =>
                p.votes.some(v => v.voted_date === dateKey && v.status === 'no')
              )
              const isClickable = !isPast && (!isDone || isEditing)

              if (isPast) return <div key={day} style={{ aspectRatio: '1' }} />

              return (
                <div key={day} onClick={() => isClickable && handleTempVote(dateKey)} style={{
                  aspectRatio: '1',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  borderRadius: '6px',
                  background: myTemp === 'no' ? '#fee2e2' : othersNo.length > 0 ? '#fff5f5' : '#f8f7ff',
                  border: myTemp === 'no' ? '0.5px solid #fca5a5' : othersNo.length > 0 ? '0.5px solid #fecaca' : '0.5px solid transparent',
                  cursor: isClickable ? 'pointer' : 'default',
                  transition: 'all 0.1s',
                  minWidth: 0
                }}>
                  <span style={{ fontSize: '11px', color: dow === 0 ? '#ef4444' : dow === 6 ? '#3b82f6' : '#333', fontWeight: myTemp === 'no' ? '600' : '400', lineHeight: 1 }}>
                    {day}
                  </span>
                  {myTemp === 'no' && <span style={{ fontSize: '9px', fontWeight: '700', color: '#dc2626', lineHeight: 1 }}>✕</span>}
                  {othersNo.length > 0 && !myTemp && (
                    <span style={{ fontSize: '7px', color: '#e24b4a', lineHeight: 1.1, textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 1px' }}>
                      {othersNo.length > 1 ? `${othersNo[0].nickname.slice(0,2)}+${othersNo.length-1}` : othersNo[0].nickname.slice(0,3)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* 범례 */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fee2e2', border: '0.5px solid #fca5a5', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: '#888' }}>내가 선택한 불가</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fff5f5', border: '0.5px solid #fecaca', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: '#888' }}>다른 사람 불가</span>
            </div>
          </div>
        </div>

        {/* 완료/수정 버튼 */}
        {!isDone ? (
          <button onClick={handleSubmit} disabled={submitting} style={{
            width: '100%', background: submitting ? '#aaa' : '#22c55e',
            color: '#fff', border: 'none', borderRadius: '10px',
            padding: '12px', fontSize: '14px', fontWeight: '500',
            cursor: submitting ? 'not-allowed' : 'pointer', marginBottom: '8px',
            boxSizing: 'border-box'
          }}>
            {submitting ? '저장 중...' : '선택 완료하기 ✓'}
          </button>
        ) : (
          <button onClick={handleEdit} style={{
            width: '100%', background: '#fff', color: '#534AB7',
            border: '0.5px solid #534AB7', borderRadius: '10px',
            padding: '12px', fontSize: '14px', fontWeight: '500',
            cursor: 'pointer', marginBottom: '8px', boxSizing: 'border-box'
          }}>
            수정하기 ✎
          </button>
        )}

        <button onClick={() => navigate(`/room/${code}/result`)} style={{
          width: '100%', background: '#534AB7', color: '#fff',
          border: 'none', borderRadius: '10px', padding: '12px',
          fontSize: '14px', fontWeight: '500', cursor: 'pointer',
          boxSizing: 'border-box', marginBottom: '1rem'
        }}>
          결과 보기 →
        </button>

        {/* 전원 완료 팝업 */}
        {allDone && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem', boxSizing: 'border-box' }}>
            <div style={{ background: '#fff', borderRadius: '20px', padding: '2rem', maxWidth: '320px', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#534AB7', marginBottom: '0.5rem' }}>모두 완료했어요!</h3>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '1.5rem' }}>{room.max_members}명 모두 날짜를 선택했어요</p>
              <button onClick={() => navigate(`/room/${code}/result`)} style={{
                width: '100%', background: '#534AB7', color: '#fff',
                border: 'none', borderRadius: '10px', padding: '12px',
                fontSize: '14px', fontWeight: '500', cursor: 'pointer'
              }}>
                결과 보러 가기 →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Room