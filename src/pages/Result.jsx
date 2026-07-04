import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const KAKAO_JS_KEY = '65133d3f6b915284e9d3e9ae51522d50'

function Result() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [participants, setParticipants] = useState([])
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const todayDate = new Date(); todayDate.setHours(0,0,0,0)
  const [calYear, setCalYear] = useState(todayDate.getFullYear())
  const [calMonth, setCalMonth] = useState(todayDate.getMonth())

  // 카카오 SDK 초기화
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

  const getTopDateText = () => {
    const top = rankedDates[0]
    if (!top) return null
    const [y, mo, da] = top.dateKey.split('-')
    const date = new Date(Number(y), Number(mo) - 1, Number(da))
    const dow = ['일','월','화','수','목','금','토'][date.getDay()]
    const status = getStatus(top.dateKey)
    const statusText = status === 'possible' ? '전원 가능 ✓' : status === 'maybe' ? '애매 (1명 불가)' : '일부 불가'
    return { text: `${Number(mo)}월 ${Number(da)}일 (${dow}) — ${statusText}`, mo, da, dow, statusText }
  }

  const buildShareText = () => {
    const top = getTopDateText()
    if (!top) return `[${room?.name}] 날짜 조율 결과를 확인해보세요!\n${window.location.href}`
    return `[${room?.name}] 날짜 조율 완료!\n🏆 추천: ${top.text}\n\n결과 보기 👇\n${window.location.href}`
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied('link')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyResult = () => {
    navigator.clipboard.writeText(buildShareText())
    setCopied('text')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKakaoShare = () => {
    if (!window.Kakao || !window.Kakao.isInitialized()) {
      alert('카카오 SDK가 로드되지 않았어요. 잠시 후 다시 시도해주세요.')
      return
    }
    const top = getTopDateText()
    const description = top
      ? `🏆 추천: ${top.text}`
      : '날짜 조율 결과를 확인해보세요!'

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `[${room?.name}] 날짜 조율 완료!`,
        description,
        imageUrl: 'https://to-meet.vercel.app/icons.svg',
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href,
        },
      },
      buttons: [
        {
          title: '결과 보러가기',
          link: {
            mobileWebUrl: window.location.href,
            webUrl: window.location.href,
          },
        },
      ],
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
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: 'sans-serif', padding: '1.5rem 1rem' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '8px' }}>
            ← 돌아가기
          </button>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#534AB7' }}>{room?.name} 결과</h2>
          <div style={{ fontSize: '13px', color: '#aaa', marginTop: '4px' }}>
            총 {participants.length}명 참여 · 완료 {doneParts.length}명
          </div>
        </div>

        {/* 참여자 칩 */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {participants.map(p => (
            <span key={p.id} style={{
              background: p.is_done ? '#E1F5EE' : '#f0f0f0',
              color: p.is_done ? '#085041' : '#888',
              borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: '500'
            }}>
              {p.nickname} {p.is_done ? '✓' : ''}
            </span>
          ))}
        </div>

        {/* 대기 중 안내 */}
        {doneParts.length < participants.length && (
          <div style={{ background: '#fffbeb', border: '0.5px solid #fcd34d', borderRadius: '12px', padding: '12px 16px', marginBottom: '1rem', fontSize: '13px', color: '#92400e' }}>
            ⏳ 아직 {participants.length - doneParts.length}명이 선택 중이에요. 완료하면 결과가 업데이트돼요.
          </div>
        )}

        {/* TOP3 */}
        {doneParts.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', border: '0.5px solid #e0e0e0', marginBottom: '1rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
            아직 완료한 참여자가 없어요
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.25rem', border: '0.5px solid #e0e0e0', marginBottom: '1rem' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>🏆 추천 날짜 TOP 3</div>
            {rankedDates.map((d, i) => {
              const [y, mo, da] = d.dateKey.split('-')
              const date = new Date(Number(y), Number(mo) - 1, Number(da))
              const dow = DOW[date.getDay()]
              const noNames = getNoNames(d.dateKey)
              const possibleCount = doneParts.length - d.noCount
              const status = getStatus(d.dateKey)
              return (
                <div key={d.dateKey} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 0',
                  borderBottom: i < rankedDates.length - 1 ? '0.5px solid #f0f0f0' : 'none'
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: MEDAL_BG[i], color: MEDAL_COLOR[i],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: '700', flexShrink: 0
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>
                        {Number(mo)}월 {Number(da)}일 ({dow})
                      </span>
                      <span style={{
                        fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px',
                        background: status === 'possible' ? '#dcfce7' : status === 'maybe' ? '#fef9c3' : '#fee2e2',
                        color: status === 'possible' ? '#166534' : status === 'maybe' ? '#854d0e' : '#991b1b'
                      }}>
                        {status === 'possible' ? '가능 ✓' : status === 'maybe' ? '애매' : '불가'}
                      </span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: '#f0f0f0', overflow: 'hidden' }}>
                      <div style={{
                        width: `${(possibleCount / doneParts.length) * 100}%`,
                        background: status === 'possible' ? '#16a34a' : status === 'maybe' ? '#eab308' : '#ef4444',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                    {noNames.length > 0 && (
                      <div style={{ fontSize: '11px', color: '#e24b4a', marginTop: '4px' }}>
                        ✕ {noNames.join(', ')}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '22px', flexShrink: 0 }}>{MEDAL_EMOJI[i]}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* 히트맵 달력 */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '1.25rem', border: '0.5px solid #e0e0e0', marginBottom: '1rem' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>📅 날짜별 현황</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button onClick={() => {
              if (!canGoPrev) return
              if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1)
            }} style={{ background: 'none', border: '0.5px solid #e0e0e0', borderRadius: '8px', width: '32px', height: '32px', cursor: canGoPrev ? 'pointer' : 'not-allowed', fontSize: '16px', opacity: canGoPrev ? 1 : 0.3 }}>‹</button>
            <span style={{ fontWeight: '500', color: '#333' }}>{calYear}년 {calMonth + 1}월</span>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
              style={{ background: 'none', border: '0.5px solid #e0e0e0', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
            {DOW.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '500', color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#aaa', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={'e' + i} />)}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
              const dateKey = makeDateKey(calYear, calMonth, day)
              const thisDate = new Date(calYear, calMonth, day)
              const isPast = thisDate < todayDate
              const dow = thisDate.getDay()
              if (isPast) return <div key={day} style={{ aspectRatio: '1' }} />
              const status = doneParts.length > 0 ? getStatus(dateKey) : 'none'
              const { bg, tc } = STATUS_STYLE[status]
              const noCount = getNoCount(dateKey)
              const noNames = getNoNames(dateKey)
              return (
                <div key={day} title={noNames.length > 0 ? `✕ ${noNames.join(', ')}` : '모두 가능'} style={{
                  aspectRatio: '1',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  borderRadius: '8px', background: bg, fontSize: '12px',
                  color: status === 'none' ? (dow === 0 ? '#ef4444' : dow === 6 ? '#3b82f6' : '#333') : tc,
                  cursor: 'default'
                }}>
                  <span style={{ fontWeight: status !== 'none' ? '600' : '400' }}>{day}</span>
                  {status === 'possible' && <span style={{ fontSize: '8px' }}>✓</span>}
                  {status === 'maybe' && <span style={{ fontSize: '8px' }}>△</span>}
                  {status === 'impossible' && <span style={{ fontSize: '8px' }}>✕{noCount}</span>}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '1rem', justifyContent: 'center' }}>
            {[
              { bg: '#16a34a', label: '가능', border: '#16a34a' },
              { bg: '#fef9c3', label: '애매 (1명 불가)', border: '#fde047' },
              { bg: '#fee2e2', label: '불가', border: '#fca5a5' },
            ].map(({ bg, label, border }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: bg, border: `0.5px solid ${border}` }} />
                <span style={{ fontSize: '11px', color: '#888' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 결과 공유 */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '1.25rem', border: '0.5px solid #e0e0e0', marginBottom: '2rem' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>
            📤 결과 공유하기
          </div>

          {/* 링크 박스 */}
          <div style={{ background: '#f0efff', border: '0.5px solid #c5c2f0', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#534AB7', wordBreak: 'break-all', marginBottom: '10px' }}>
            {window.location.href}
          </div>

          {/* 카카오톡 공유 버튼 */}
          <button onClick={handleKakaoShare} style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            border: 'none', background: '#FEE500',
            color: '#191919', fontSize: '14px', fontWeight: '600',
            cursor: 'pointer', marginBottom: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1C4.582 1 1 3.896 1 7.5c0 2.332 1.438 4.376 3.6 5.572L3.75 17l4.418-2.95C8.44 14.08 8.717 14.1 9 14.1c4.418 0 8-2.896 8-6.6S13.418 1 9 1z" fill="#191919"/>
            </svg>
            카카오톡으로 공유하기
          </button>

          {/* 링크/텍스트 복사 버튼 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleCopyLink} style={{
              flex: 1, padding: '11px', borderRadius: '10px',
              border: '0.5px solid #c5c2f0',
              background: copied === 'link' ? '#E1F5EE' : '#f0efff',
              color: copied === 'link' ? '#085041' : '#534AB7',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s'
            }}>
              {copied === 'link' ? '✓ 복사됨!' : '🔗 링크 복사'}
            </button>
            <button onClick={handleCopyResult} style={{
              flex: 1, padding: '11px', borderRadius: '10px',
              border: 'none', background: '#534AB7',
              color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
            }}>
              {copied === 'text' ? '✓ 복사됨!' : '📋 결과 텍스트 복사'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Result