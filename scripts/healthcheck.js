// 투밋 자동 점검: 실제 사용자와 같은 권한(공개 키)으로 핵심 흐름을 한 번 실행해보고,
// 끝나면 관리자 키(SUPABASE_SECRET_KEY)로 테스트 데이터를 지운다.
// 하나라도 실패하면 종료 코드 1 → GitHub Actions가 실패 알림을 보낸다.
import { createClient } from '@supabase/supabase-js'

const SITE_URL = 'https://tomeet2.com'
const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY } = process.env

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SUPABASE_SECRET_KEY) {
  console.error('환경변수 SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY가 필요해요')
  process.exit(1)
}

const user = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } })

const failures = []
const check = (ok, label) => {
  console.log(`${ok ? '✅' : '❌'} ${label}`)
  if (!ok) failures.push(label)
  return ok
}

// 1. 사이트 접속
async function checkSite() {
  const home = await fetch(SITE_URL).catch(() => null)
  check(home?.ok && (await home.text()).includes('투밋'), `홈 화면 열림 (${SITE_URL})`)
  const room = await fetch(`${SITE_URL}/room/healthcheck`).catch(() => null)
  check(room?.ok && (await room.text()).includes('id="root"'), '모임 페이지 경로 열림 (/room/…)')
}

// 2. 모임 만들기 → 참여 → 날짜 선택 → 선택 완료 → 결과 확인
async function checkFlow(ids) {
  const code = 'hc' + Math.random().toString(36).substring(2, 8)

  const { error: roomError } = await user.from('rooms')
    .insert({ name: '[자동점검]', code, weekend_only: true })
  if (!check(!roomError, `모임 만들기${roomError ? ': ' + roomError.message : ''}`)) return

  const { data: room } = await user.from('rooms').select('*').eq('code', code).single()
  if (!check(room?.weekend_only === true, '모임 불러오기 (주말·공휴일 옵션 포함)')) return
  ids.roomId = room.id

  const { data: participant, error: joinError } = await user.from('participants')
    .insert({ room_id: room.id, nickname: '점검봇' }).select().single()
  if (!check(!joinError && participant, `모임 참여${joinError ? ': ' + joinError.message : ''}`)) return
  ids.participantId = participant.id

  const { error: deleteError } = await user.from('date_votes').delete().eq('participant_id', participant.id)
  check(!deleteError, `기존 선택 지우기${deleteError ? ': ' + deleteError.message : ''}`)

  const votes = [
    { participant_id: participant.id, room_id: room.id, voted_date: '2099-01-03', status: 'yes' },
    { participant_id: participant.id, room_id: room.id, voted_date: '2099-01-04', status: 'no' },
  ]
  const { error: voteError } = await user.from('date_votes').insert(votes)
  check(!voteError, `날짜 선택 저장 (되는 날·안 되는 날)${voteError ? ': ' + voteError.message : ''}`)

  const { data: updated, error: doneError } = await user.from('participants')
    .update({ is_done: true }).eq('id', participant.id).select()
  check(!doneError && updated?.length === 1, `선택 완료 처리${doneError ? ': ' + doneError.message : updated?.length === 0 ? ': 0건 수정됨 (DB 권한 확인 필요)' : ''}`)

  const { data: doneParts } = await user.from('participants').select('id').eq('room_id', room.id).eq('is_done', true)
  const { data: savedVotes } = await user.from('date_votes').select('status').eq('room_id', room.id)
  check(doneParts?.length === 1 && savedVotes?.length === 2, '결과 화면 데이터 (완료 1명, 선택 2건)')
}

// 3. 테스트 데이터 정리 (관리자 키)
async function cleanup({ roomId, participantId }) {
  if (participantId) await admin.from('date_votes').delete().eq('participant_id', participantId)
  if (roomId) {
    await admin.from('date_votes').delete().eq('room_id', roomId)
    await admin.from('participants').delete().eq('room_id', roomId)
    const { error } = await admin.from('rooms').delete().eq('id', roomId)
    check(!error, `테스트 데이터 정리${error ? ': ' + error.message : ''}`)
  }
  // 이전 실행에서 남은 점검용 모임도 함께 정리
  const { data: leftovers } = await admin.from('rooms').select('id').eq('name', '[자동점검]')
  for (const r of leftovers || []) {
    await admin.from('date_votes').delete().eq('room_id', r.id)
    await admin.from('participants').delete().eq('room_id', r.id)
    await admin.from('rooms').delete().eq('id', r.id)
  }
}

const ids = {}
try {
  await checkSite()
  await checkFlow(ids)
} catch (e) {
  check(false, `예상치 못한 오류: ${e.message}`)
} finally {
  await cleanup(ids).catch(e => check(false, `테스트 데이터 정리: ${e.message}`))
}

if (failures.length) {
  console.error(`\n점검 실패 ${failures.length}건:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log('\n모든 점검 통과')
