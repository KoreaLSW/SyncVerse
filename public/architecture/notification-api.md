# 알림 API 구현 정리 (1~7단계)

## 목표

`notifications` 테이블 기반으로 알림 기능의 첫 단계인 **조회/읽음 API**를 구축한다.

이번 단계에서는 아래 3개 API를 구현했다.

- 알림 목록 조회
- 알림 전체 읽음 처리
- 알림 단건 읽음 처리

## 구현 파일

- `app/api/notifications/route.ts`
- `app/api/notifications/read-all/route.ts`
- `app/api/notifications/[id]/read/route.ts`

## 공통 정책

- 인증: `getAuthUserFromRequest(request)` 사용
- 비로그인 사용자: `401 Unauthorized`
- 게스트 사용자: `403 Guest not allowed`
- 서버 에러: `500` 반환 및 서버 로그 출력

## API 상세

### 1) GET `/api/notifications`

알림 목록 조회 API

- 지원 쿼리
    - `limit`: 페이지 크기 (기본 30, 최소 1 / 최대 100)
    - `cursor`: 커서 기반 페이지네이션 (`created_at` 기준)
    - `unreadOnly=true`: 미읽음만 조회
    - `type=FRIEND_REQUEST`: 타입 필터
- 정렬: `created_at DESC`
- 범위: 요청한 사용자 본인의 알림(`user_id = authUser.userId`)만 조회
- 응답 형태
    - `data`: 알림 배열
    - `pageInfo.limit`
    - `pageInfo.nextCursor` (다음 페이지 커서, 없으면 `null`)

### 2) POST `/api/notifications/read-all`

내 미읽음 알림 전체 읽음 처리 API

- 처리 조건
    - `user_id = authUser.userId`
    - `read_at IS NULL`
- 업데이트 값
    - `read_at = 현재 시각(ISO)`
- 응답 형태
    - `success: true`
    - `readCount`: 읽음 처리된 개수
    - `readAt`: 적용된 읽음 시각

### 3) PATCH `/api/notifications/[id]/read`

특정 알림 1건 읽음 처리 API

- 보호 로직
    - 알림이 없거나 내 알림이 아니면 `404`
- 멱등성
    - 이미 읽은 알림이면 `alreadyRead: true`로 성공 응답
    - 아직 안 읽었으면 `read_at` 업데이트 후 `alreadyRead: false` 반환
- 응답 형태
    - `success`
    - `alreadyRead`
    - `data`(해당 알림)

## 설계 포인트

- 기존 친구 API와 동일한 인증/에러 처리 패턴으로 일관성 유지
- 클라이언트가 목록/배지/읽음 상태를 만들기 쉽도록 응답 구조 단순화
- 이후 Realtime 구독(`INSERT/UPDATE`)과 결합하기 쉬운 형태로 준비

## 2단계: 친구 요청 발생 시 알림 row 생성 연동

친구 요청 API(`POST /api/friends/request`)의 신규 요청 생성 분기에 알림 저장 로직을 추가했다.

### 변경 파일

- `app/api/friends/request/route.ts`

### 동작 방식

1. `friendships`에 `PENDING` row 생성 성공
2. 같은 요청 흐름에서 `notifications`에 알림 row insert
3. 알림 저장 실패 시 로그만 남기고, 친구 요청 API 응답은 정상 유지

### 저장되는 알림 데이터

- `user_id`: 요청 수신자(`receiverId`)
- `actor_id`: 요청 발신자(`authUser.userId`)
- `type`: `FRIEND_REQUEST`
- `title`: `새 친구 요청`
- `body`: `"{보낸사람}님이 친구 요청을 보냈습니다."`
- `payload`:
    - `friendshipId`
    - `senderId`
    - `receiverId`
- `source_key`: `FRIENDSHIP:{friendshipId}`

### 예외 처리 원칙

- 친구 요청 생성 실패: 기존과 동일하게 API 에러 처리
- 알림 insert 실패: `console.error` 로그만 기록(친구 요청 성공은 유지)

## 3단계: 클라이언트 스토어 + Realtime + 기본 UI 연동

알림 API/DB를 실제 화면 상태와 연결하기 위해 전역 스토어(Zustand)를 추가하고, 실시간 구독 및 미읽음 카운트 표시를 붙였다.

### 변경 파일

- `stores/notificationsStore.ts`
- `components/MapCanvas.tsx`
- `components/WhiteboardChannelView.tsx`

### 구현 내용

1. `notificationsStore` 추가
    - 상태: `notifications`, `unreadCount`, `isLoading`
    - 액션:
        - `init(userId, isGuest)`: 초기 목록 로드 + Realtime 구독 시작
        - `reset()`: 구독 해제 + 상태 초기화
        - `markRead(id)`: 단건 읽음 API 호출 후 상태 반영
        - `markAllRead()`: 전체 읽음 API 호출 후 상태 반영
2. Realtime 동기화
    - `notifications` 테이블 `INSERT/UPDATE/DELETE` 이벤트 구독
    - `filter: user_id=eq.{현재유저}`로 본인 알림만 반영
    - 이벤트 반영 시 `unreadCount` 재계산
3. 기본 UI 연결
    - `MapCanvas` 상단 영역에 알림 카운트를 표시
    - 미읽음이 1개 이상이면 강조 색상으로 표시
4. 공용 초기화
    - `MapCanvas`, `WhiteboardChannelView` 모두에서 로그인 유저 기준 `initNotifications` 실행
    - 비로그인/게스트/언마운트 시 `resetNotifications` 실행

### 동작 흐름 요약

1. 친구 요청 생성 시 `notifications` row가 insert됨 (2단계)
2. 클라이언트의 `notificationsStore`가 Realtime `INSERT` 이벤트 수신
3. `notifications` 목록과 `unreadCount`가 즉시 갱신
4. 화면의 알림 카운트가 실시간으로 변경

## 4단계: 알림 패널 UI 구현

알림 데이터를 실제로 확인하고 읽음 처리할 수 있도록 공용 알림 패널 컴포넌트를 추가했다.

### 변경 파일

- `components/NotificationPanel.tsx`
- `components/MapCanvas.tsx`
- `components/WhiteboardChannelView.tsx`

### 구현 내용

1. 공용 `NotificationPanel` 컴포넌트 추가
   - 토글 버튼(`알림`) + 미읽음 카운트 배지
   - 패널 헤더에 `모두 읽음` 버튼
   - 최신 알림 20개 렌더링
   - 빈 상태/로딩 상태 UI 제공
2. 읽음 처리 UX
   - 미읽음 알림 클릭 시 `markRead(id)` 호출
   - `모두 읽음` 클릭 시 `markAllRead()` 호출
3. 타입/시간 시각화
   - 알림 타입 라벨(`FRIEND_REQUEST`, `MESSAGE_REQUEST` 등) 표시
   - 생성 시각 포맷 표시
   - 미읽음 항목에 `NEW` 배지 표시
4. 화면 배치
   - `MapCanvas` 우측 상단에 알림 패널 배치
   - `WhiteboardChannelView` 우측 상단에 알림 패널 배치
   - 두 화면에서 동일 컴포넌트를 공유해 일관된 UX 유지

### 동작 흐름 요약

1. 친구 요청 시 서버가 `notifications` row를 생성 (2단계)
2. `notificationsStore`가 Realtime으로 목록/카운트를 동기화 (3단계)
3. 사용자가 패널에서 알림 목록을 확인하고 개별/전체 읽음 처리 (4단계)

## 5단계: 알림 항목 액션(친구 수락/거절) 연동

친구 요청 알림에서 바로 수락/거절할 수 있도록 API와 패널 액션을 연동했다.

### 변경 파일

- `app/api/notifications/[id]/act/route.ts`
- `stores/notificationsStore.ts`
- `components/NotificationPanel.tsx`

### 구현 내용

1. 알림 액션 API 추가
   - `POST /api/notifications/[id]/act`
   - 본인 알림 검증 후 `acted_at`, `read_at`를 현재 시각으로 업데이트
2. 스토어 액션 확장
   - `markActed(id)` 추가
   - 액션 API 호출 후 해당 알림 row를 최신 상태로 교체
3. 패널 내 친구 요청 액션 버튼 추가
   - `FRIEND_REQUEST` + `acted_at IS NULL` 항목에 `수락` / `거절` 버튼 표시
   - `수락`: `acceptFriend(senderId)` 호출 후 `markActed(id)`
   - `거절`: `removeFriend(senderId)` 호출 후 `markActed(id)`
4. 중복 처리 방지
   - 처리 중 알림 id(`processingId`)를 추적해 버튼 중복 클릭 방지
   - 액션 버튼 클릭 시 이벤트 전파를 막아 row 클릭 읽음 처리와 충돌 방지

### 동작 흐름 요약

1. 사용자가 친구 요청 알림의 `수락` 또는 `거절` 클릭
2. 친구 관계 API(수락/해제) 실행
3. 성공 시 알림 `acted_at/read_at` 업데이트
4. 스토어가 최신 알림 row로 갱신하여 UI에 즉시 반영

## 6단계: 알림 삭제 기능 연동

알림을 직접 정리할 수 있도록 단건 삭제와 읽은 알림 일괄 삭제를 추가했다.

### 변경 파일

- `app/api/notifications/[id]/route.ts`
- `app/api/notifications/route.ts`
- `stores/notificationsStore.ts`
- `components/NotificationPanel.tsx`

### 구현 내용

1. 단건 삭제 API 추가
   - `DELETE /api/notifications/[id]`
   - 본인 알림인지 검증 후 삭제
2. 읽은 알림 일괄 삭제 API 추가
   - `DELETE /api/notifications?readOnly=true`
   - 현재 사용자 기준 `read_at IS NOT NULL`인 row만 삭제
3. 스토어 액션 확장
   - `removeNotification(id)`
   - `clearReadNotifications()`
   - API 성공 시 로컬 목록/미읽음 카운트 즉시 반영
4. 패널 UI 버튼 추가
   - 각 알림 row에 `삭제` 버튼
   - 헤더에 `읽은 알림 삭제` 버튼

### 동작 흐름 요약

1. 사용자가 알림 패널에서 `삭제` 또는 `읽은 알림 삭제` 클릭
2. 삭제 API 실행 후 DB row 제거
3. 스토어가 로컬 목록과 `unreadCount`를 즉시 갱신
4. Realtime `DELETE` 이벤트와 함께 화면 상태 일관성 유지

## 7단계: 친구 요청 수락 알림 발송

상대방이 친구 요청을 수락했을 때, 기존 요청자에게도 수락 알림이 전달되도록 서버 로직을 확장했다.

### 변경 파일

- `app/api/friends/accept/route.ts`
- `app/api/friends/request/route.ts` (자동 수락 분기)

### 구현 내용

1. 일반 수락 API 확장
   - `POST /api/friends/accept` 성공 시, 요청자(`senderId`)에게 알림 insert
   - 메시지: `"{닉네임}님이 친구요청을 수락했습니다."`
2. 자동 수락 분기 확장
   - `/api/friends/request`의 `autoAccepted` 분기에서도 동일 알림 insert
   - 어느 경로로 수락되든 요청자에게 일관되게 알림 전달
3. 알림 데이터 구성
   - `type`: `SYSTEM`
   - `title`: `친구 요청 수락`
   - `payload`: `friendshipId`, `accepterId`, `accepterNickname`, `senderId`
   - `source_key`: `FRIEND_ACCEPTED:{friendshipId}` (중복 방지)
4. 실패 분리 처리
   - 알림 insert 실패는 `console.error`로만 처리
   - 친구 수락 비즈니스 결과는 정상 유지

### 동작 흐름 요약

1. 상대가 친구 요청 수락(또는 자동 수락)
2. 서버가 friendships 상태를 `ACCEPTED`로 변경
3. 기존 요청자에게 수락 알림 row 생성
4. 요청자는 Realtime/스토어를 통해 즉시 수락 알림 확인

## 다음 단계

1. 메시지 요청 알림 액션(수락/거절) 동일 패턴 적용
2. 알림 항목 클릭 시 대상 화면 이동(친구 목록/DM 방 등)
3. 목록 페이징/필터 고도화(무한 스크롤, 타입별 필터)
