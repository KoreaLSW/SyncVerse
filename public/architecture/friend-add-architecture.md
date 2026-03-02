# 친구 추가 아키텍처

## 목적

맵/채팅/화이트보드에서 사용자 간 친구 관계를 생성, 수락, 해제하고 상태 변화를 실시간으로 UI에 반영한다.

## 핵심 구성요소

- 클라이언트 상태
  - `hooks/useFriendship.ts`: 컨텍스트 메뉴 상태, 친구 상태 조회/요청/수락/해제
  - `stores/friendsStore.ts`: 전역 친구 캐시(`friendsSet`)와 Realtime 동기화
  - `lib/friends.ts`: 친구 API 호출 래퍼와 버튼 라벨 변환
- UI
  - `components/MapCanvas.tsx`: 캐릭터 우클릭 액션 연결, `isFriend` 계산
  - `components/Character.tsx`: 캐릭터 이름 옆 친구 배지 렌더링
  - `components/ChatLog.tsx`: 채팅 닉네임 옆 친구 배지 렌더링
  - `components/RemoteCursors.tsx`: 원격 커서 닉네임 옆 친구 배지 렌더링
- 서버 API
  - `app/api/friends/request/route.ts`
  - `app/api/friends/accept/route.ts`
  - `app/api/friends/remove/route.ts`
  - `app/api/friends/status/route.ts`
  - `app/api/friends/list/route.ts`
- 데이터/실시간
  - Supabase `friendships` 테이블
  - Supabase Realtime(`postgres_changes`) 이벤트

## 상태 모델

- `NONE`: 관계 없음
- `PENDING_SENT`: 내가 요청 보냄
- `PENDING_RECEIVED`: 내가 요청 받음
- `ACCEPTED`: 친구 상태
- `UNAVAILABLE`: 게스트/비로그인 등으로 액션 불가
- `ERROR`: 처리 실패

DB에는 주로 `PENDING`, `ACCEPTED`가 저장되고, 클라이언트는 송신/수신 방향에 따라 `PENDING_SENT`/`PENDING_RECEIVED`로 변환해 사용한다.

## 동작 흐름

### 1) 친구 요청

1. 캐릭터 우클릭 후 `친구추가` 클릭
2. `useFriendship.handleFriendAction()`에서 `/api/friends/request` 호출
3. 서버가 기존 관계를 검사한 뒤
   - 신규면 `PENDING` 생성 후 `PENDING_SENT` 반환
   - 반대 방향 요청이 이미 있으면 `ACCEPTED`로 자동 전환 가능
4. 클라이언트 컨텍스트 메뉴 상태 갱신
5. Realtime 이벤트로 전역 `friendsSet` 동기화

### 2) 친구 수락

1. 상태가 `PENDING_RECEIVED`일 때 `수락하기` 클릭
2. `/api/friends/accept` 호출
3. 서버가 `PENDING -> ACCEPTED`로 업데이트
4. 클라이언트 반영 + Realtime으로 전체 UI 동기화

### 3) 친구 해제/요청 취소

1. 상태가 `ACCEPTED` 또는 `PENDING_SENT`일 때 액션 클릭
2. `/api/friends/remove` 호출
3. 서버에서 관계 row 삭제
4. Realtime `DELETE` 이벤트로 `friendsSet`에서 제거

## 실시간 동기화 설계

`friendsStore.init(userId, isGuest)`에서 아래를 수행한다.

1. 기존 채널 제거(`clearRealtimeChannel`)
2. `/api/friends/list`로 초기 친구 목록 로드
3. `friendships:${userId}` 채널 구독
   - `sender_id = userId`
   - `receiver_id = userId`
4. 이벤트 처리(`handleRealtime`)
   - `DELETE`면 `removeFriend(otherId)`
   - `status === ACCEPTED`면 `addFriend(otherId)`
   - 그 외 상태는 `removeFriend(otherId)`

## UI 반영 규칙

- 캐릭터: `friendsSet.has(playerId)`면 이름 옆 `친구` 배지 표시
- 채팅: `friendsSet.has(sender_id)`면 닉네임 옆 `친구` 배지 표시
- 화이트보드 커서: `friendsSet.has(userId)`면 닉네임 옆 `친구` 배지 표시

즉, 모든 화면은 `friendsSet` 하나를 단일 소스로 사용해 일관된 친구 표시를 유지한다.

## 예외/권한 처리

- 비로그인 사용자: `401`
- 게스트 사용자: `403`
- 자기 자신 요청 차단
- 차단 관계(`blocks`)가 있으면 요청 거부
- 서버 오류는 `500`, 클라이언트는 `ERROR` 상태로 처리

## 요약

이 기능의 핵심은 `friendsSet` 전역 캐시와 Supabase Realtime 이벤트 결합이다.  
초기 목록은 API로 로드하고, 이후 변경은 Realtime으로 받아 캐릭터/채팅/원격커서 UI를 즉시 갱신한다.
