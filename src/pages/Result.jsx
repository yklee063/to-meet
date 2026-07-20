import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const KAKAO_JS_KEY = '65133d3f6b915284e9d3e9ae51522d50'

const HOLIDAYS = {
  '2026-01-01': '신정',
  '2026-02-14': '설연휴',
  '2026-02-16': '설날',
  '2026-02-17': '설연휴',
  '2026-02-18': '설연휴',
  '2026-03-01': '삼일절',
  '2026-03-02': '대체공휴일',
  '2026-05-01': '노동절',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일',
  '2026-06-03': '지방선거',
  '2026-06-06': '현충일',
  '2026-07-17': '제헌절',
  '2026-08-15': '광복절',
  '2026-08-17': '대체공휴일',
  '2026-09-24': '추석연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석연휴',
  '2026-10-03': '개천절',
  '2026-10-05': '대체공휴일',
  '2026-10-09': '한글날',
  '2026-12-25': '성탄절',
}

function Result() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [participants, setParticipants] = useState([])
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)

  const todayDate = new Date(); todayDate.setHours(0,0,0,0)
  const [calYear, setCalYear] = useState(todayDate.getFullYear())
  const [calMonth, setCalMonth] = useState(todayDate.getMonth())

  useEffect(() => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(KAKAO_JS_KEY)
    }
  }, [])

  useEffect(() => {
    const fetchAll = async () => {
      const { data: roomData } = await supabase
        .from('rooms').select('*').eq('code', code).single()
      if (!roomData) { setLoading(false); return }
      setRoom(roomData)
      const { data: partData } = await supabase
        .from('participants').select('*').eq('room_id', roomData.id)
      setParticipants(partData || [])
      const { data: voteData } = await supabase
        .from('date_votes').select('*').eq('room_id', roomData.id)
      setVotes(voteData || [])
      setLoading(false)
    }
    fetchAll()
    const channel = supabase.channel('result-' + code)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'date_votes' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => fetchAll())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [code])

  const makeDateKey = (year, month, day) => {
    const m = String(month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${year}-${m}-${d}`
  }

  const doneParts = participants.filter(p => p.is_done)
  const doneIds = doneParts.map(p => p.id)
  const doneVotes = votes.filter(v => doneIds.includes(v.participant_id))

  const getNoCount = (dateKey) =>
    doneVotes.filter(v => v.voted_date === dateKey && v.status === 'no').length

  const getNoNames = (dateKey) => {
    const noIds = doneVotes.filter(v => v.voted_date === dateKey && v.status === 'no').map(v => v.participant_id)
    return doneParts.filter(p => noIds.includes(p.id)).map(p => p.nickname)
  }

  const getStatus = (dateKey) => {
    if (doneParts.length === 0) return 'none'
    const noCount = getNoCount(dateKey)
    if (noCount === 0) return 'possible'
    if (noCount === 1) return 'maybe'
    return 'impossible'
  }

  const STATUS_STYLE = {
    none:       { bg: '#f8f7ff', tc: '#333' },
    possible:   { bg: '#16a34a', tc: '#fff' },
    maybe:      { bg: '#fef9c3', tc: '#854d0e' },
    impossible: { bg: '#fee2e2', tc: '#991b1b' },
  }

  const canGoPrev = calYear > todayDate.getFullYear() ||
    (calYear === todayDate.getFullYear() && calMonth > todayDate.getMonth())

  const rankedDates = (() => {
    if (doneParts.length === 0) return []
    const noCounts = {}
    doneVotes.forEach(v => {
      if (v.status === 'no') noCounts[v.voted_date] = (noCounts[v.voted_date] || 0) + 1
    })
    const candidates = []
    for (let m = 0; m < 3; m++) {
      const year = calYear + Math.floor((calMonth + m) / 12)
      const month = (calMonth + m) % 12
      const days = new Date(year, month + 1, 0).getDate()
      for (let d = 1; d <= days; d++) {
        const dateKey = makeDateKey(year, month, d)
        const thisDate = new Date(year, month, d)
        if (thisDate >= todayDate) {
          candidates.push({ dateKey, noCount: noCounts[dateKey] || 0 })
        }
      }
    }
    return candidates.sort((a, b) => a.noCount - b.noCount).slice(0, 3)
  })()

  const handleKakaoShare = () => {
    if (!window.Kakao || !window.Kakao.isInitialized()) {
      alert('카카오 SDK가 로드되지 않았어요.')
      return
    }
    const resultUrl = window.location.href
    const top = rankedDates[0]
    const description = top ? (() => {
      const [y, mo, da] = top.dateKey.split('-')
      const date = new Date(Number(y), Number(mo) - 1, Number(da))
      const dow = ['일','월','화','수','목','금','토'][date.getDay()]
      return `🏆 추천: ${Number(mo)}월 ${Number(da)}일 (${dow})`
    })() : '날짜 조율 결과를 확인해보세요!'
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `[${room?.name}] 날짜 조율 완료!`,
        description,
        imageUrl: 'https://to-meet.vercel.app/og-image.png',
        link: { mobileWebUrl: resultUrl, webUrl: resultUrl },
      },
      buttons: [{ title: '결과 보러가기', link: { mobileWebUrl: resultUrl, webUrl: resultUrl } }],
    })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#888' }}>
      불러오는 중...
    </div>
  )

  const totalDays = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  const MEDAL_BG = ['#FEF9C3', '#F1F0F0', '#FAEEDA']
  const MEDAL_COLOR = ['#CA8A04', '#5F5E5A', '#854F0B']
  const MEDAL_EMOJI = ['🥇', '🥈', '🥉']

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: 'sans-serif', padding: '0.75rem', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>

        <div style={{ marginBottom: '1rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '8px' }}>
            ← 돌아가기
          </button>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#534AB7', margin: 0 }}>{room?.name} 결과</h2>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>총 {participants.length}명 참여 · 완료 {doneParts.length}명</div>
        </div>

        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {participants.map(p => (
            <span key={p.id} style={{ background: p.is_done ? '#E1F5EE' : '#f0f0f0', color: p.is_done ? '#085041' : '#888', borderRadius: '999px', padding: '3px 10px', fontSize: '11px', fontWeight: '500' }}>
              {p.nickname} {p.is_done ? '✓' : ''}
            </span>
          ))}
        </div>

        {doneParts.length < participants.length && (
          <div style={{ background: '#fffbeb', border: '0.5px solid #fcd34d', borderRadius: '12px', padding: '10px 14px', marginBottom: '0.75rem', fontSize: '12px', color: '#92400e', boxSizing: 'border-box' }}>
            ⏳ 아직 {participants.length - doneParts.length}명이 선택 중이에요.
          </div>
        )}

        {doneParts.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '0.5px solid #e0e0e0', marginBottom: '0.75rem', textAlign: 'center', color: '#aaa', fontSize: '14px', boxSizing: 'border-box' }}>
            아직 완료한 참여자가 없어요
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '0.75rem', border: '0.5px solid #e0e0e0', marginBottom: '0.75rem', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '0.75rem' }}>🏆 추천 날짜 TOP 3</div>
            {rankedDates.map((d, i) => {
              const [y, mo, da] = d.dateKey.split('-')
              const date = new Date(Number(y), Number(mo) - 1, Number(da))
              const dow = DOW[date.getDay()]
              const noNames = getNoNames(d.dateKey)
              const possibleCount = doneParts.length - d.noCount
              const status = getStatus(d.dateKey)
              const holiday = HOLIDAYS[d.dateKey]
              return (
                <div key={d.dateKey} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < rankedDates.length - 1 ? '0.5px solid #f0f0f0' : 'none' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: MEDAL_BG[i], color: MEDAL_COLOR[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>
                          {Number(mo)}월 {Number(da)}일 ({dow})
                        </span>
                        {holiday && (
                          <span style={{ fontSize: '10px', color: '#ef4444', marginLeft: '5px' }}>{holiday}</span>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: '500', padding: '2px 7px', borderRadius: '999px', flexShrink: 0, background: status === 'possible' ? '#dcfce7' : status === 'maybe' ? '#fef9c3' : '#fee2e2', color: status === 'possible' ? '#166634' : status === 'maybe' ? '#854d0e' : '#991b1b' }}>
                        {status === 'possible' ? '가능 ✓' : status === 'maybe' ? '애매' : '불가'}
                      </span>
                    </div>
                    <div style={{ height: '5px', borderRadius: '3px', background: '#f0f0f0', overflow: 'hidden' }}>
                      <div style={{ width: `${(possibleCount / doneParts.length) * 100}%`, background: status === 'possible' ? '#16a34a' : status === 'maybe' ? '#eab308' : '#ef4444', height: '100%' }} />
                    </div>
                    {noNames.length > 0 && (
                      <div style={{ fontSize: '10px', color: '#e24b4a', marginTop: '3px' }}>✕ {noNames.join(', ')}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '20px', flexShrink: 0 }}>{MEDAL_EMOJI[i]}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* 히트맵 달력 */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '0.5rem', border: '0.5px solid #e0e0e0', marginBottom: '0.75rem', boxSizing: 'border-box', width: '100%', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '0.5rem', padding: '0 0.25rem' }}>📅 날짜별 현황</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', padding: '0 0.25rem' }}>
            <button onClick={() => { if (!canGoPrev) return; if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
              style={{ background: 'none', border: '0.5px solid #e0e0e0', borderRadius: '6px', width: '28px', height: '28px', cursor: canGoPrev ? 'pointer' : 'not-allowed', fontSize: '14px', opacity: canGoPrev ? 1 : 0.3, flexShrink: 0 }}>‹</button>
            <span style={{ fontWeight: '500', color: '#333', fontSize: '13px' }}>{calYear}년 {calMonth + 1}월</span>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
              style={{ background: 'none', border: '0.5px solid #e0e0e0', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
            {DOW.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: '500', color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#aaa', padding: '3px 0' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={'e' + i} style={{ aspectRatio: '1' }} />)}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
              const dateKey = makeDateKey(calYear, calMonth, day)
              const thisDate = new Date(calYear, calMonth, day)
              const isPast = thisDate < todayDate
              const dow = thisDate.getDay()
              const holiday = HOLIDAYS[dateKey]
              const isHoliday = !!holiday
              if (isPast) return <div key={day} style={{ aspectRatio: '1' }} />
              const status = doneParts.length > 0 ? getStatus(dateKey) : 'none'
              const { bg, tc } = STATUS_STYLE[status]
              const noCount = getNoCount(dateKey)
              const noNames = getNoNames(dateKey)

              const dayColor = status !== 'none' ? tc
                : dow === 0 || isHoliday ? '#ef4444'
                : dow === 6 ? '#3b82f6'
                : '#333'

              return (
                <div key={day} title={noNames.length > 0 ? `✕ ${noNames.join(', ')}` : holiday || '모두 가능'} style={{
                  aspectRatio: '1',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  borderRadius: '6px', background: bg,
                  color: dayColor, minWidth: 0, overflow: 'hidden'
                }}>
                  <span style={{ fontSize: '11px', fontWeight: status !== 'none' || isHoliday ? '600' : '400', lineHeight: 1 }}>{day}</span>
                  {status === 'none' && holiday && (
                    <span style={{ fontSize: '6px', color: '#ef4444', lineHeight: 1.1, textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 1px' }}>
                      {holiday.length > 3 ? holiday.slice(0, 3) : holiday}
                    </span>
                  )}
                  {status === 'possible' && <span style={{ fontSize: '8px', lineHeight: 1 }}>✓</span>}
                  {status === 'maybe' && <span style={{ fontSize: '8px', lineHeight: 1 }}>△</span>}
                  {status === 'impossible' && <span style={{ fontSize: '8px', lineHeight: 1 }}>✕{noCount}</span>}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', padding: '0 0.25rem' }}>
            {[
              { bg: '#16a34a', label: '가능', border: '#16a34a' },
              { bg: '#fef9c3', label: '애매', border: '#fde047' },
              { bg: '#fee2e2', label: '불가', border: '#fca5a5' },
            ].map(({ bg, label, border }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: bg, border: `0.5px solid ${border}`, flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: '#888' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 결과 공유 */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '0.75rem', border: '0.5px solid #e0e0e0', marginBottom: '1.5rem', boxSizing: 'border-box' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '0.75rem' }}>📤 결과 공유하기</div>
          <div style={{ background: '#f0efff', border: '0.5px solid #c5c2f0', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: '#534AB7', wordBreak: 'break-all', marginBottom: '8px', boxSizing: 'border-box' }}>
            {window.location.href}
          </div>
          <button onClick={handleKakaoShare} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#FEE500', color: '#191919', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1C4.582 1 1 3.896 1 7.5c0 2.332 1.438 4.376 3.6 5.572L3.75 17l4.418-2.95C8.44 14.08 8.717 14.1 9 14.1c4.418 0 8-2.896 8-6.6S13.418 1 9 1z" fill="#191919"/>
            </svg>
            카카오톡으로 공유하기
          </button>
        </div>

      </div>
    </div>
  )
}

export default Result