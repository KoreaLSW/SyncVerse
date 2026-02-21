## 작업 요약
- 화이트보드 채널 선택/입장 흐름 안정화
- 채널별 채팅방 조회/생성 및 채팅 UI 연동
- 화이트보드 문서 영속화(DB 저장/복원) 구현
- 채널/목록 화면 이동 버튼(뒤로가기, 메인 이동) UX 개선

## 변경 파일
- `syncverse/app/whiteboard/page.tsx`
- `syncverse/app/whiteboard/[channelId]/page.tsx`
- `syncverse/components/WhiteboardChannelView.tsx`
- `syncverse/app/api/chat/rooms/route.ts`
- `syncverse_server/src/services/hocuspocusService.ts`
- `syncverse_server/src/services/whiteboardPersistence.ts`
- `syncverse/public/document/DB구조.sql`

## 주요 구현 내용

### 1) 화이트보드 채널 라우팅/접근
- `/whiteboard` 채널 선택 화면 유지
- `/whiteboard/[channelId]` 진입 시 유효 채널 검사
- 동적 라우트 `params` Promise 언랩 이슈 대응 (`await params`)

### 2) 채널별 채팅 연동
- `category=WHITEBOARD`, `name=channelId` 기준으로 채팅방 조회
- 채팅방이 없으면 생성 후 `roomId`를 `ChatLog`에 전달
- 채널별 메시지 분리 저장/조회 구조로 동작

### 3) 화이트보드 영속화(DB)
- `whiteboard_document` 테이블 생성 및 인덱스/트리거 적용
- Hocuspocus 서버에서 문서 저장/복원 로직 구현
  - `onStoreDocument`: Yjs 문서를 인코딩해 upsert 저장
  - `onLoadDocument`: DB에서 상태를 읽어 Yjs 문서에 apply
- `whiteboard-*` 문서만 영속화 대상으로 제한

### 4) 네비게이션 UX 개선
- 채널 상세 화면에 `채널 목록으로` 버튼 추가
- 채널 선택 화면에 `메인으로` 버튼 추가

## 이슈 및 해결

### 1) 채널 접근 시 404
- 원인: Next.js 동적 라우트에서 `params`를 동기 접근
- 해결: `await params`로 언랩 후 `channelId` 사용

### 2) Source Map 경고
- 현상: Turbopack 환경에서 `Invalid source map` 경고
- 판단: 기능과 직접 무관한 개발환경 경고
- 대응: 필요 시 `.next` 캐시 제거 후 재실행

### 3) SQL 실행 시 파괴적 경고
- 원인: `DROP TRIGGER` 등 잠재적 변경 구문 포함
- 대응: 의도 확인 후 실행, 필요 시 단계 분리 실행

## 검증 체크리스트
- [ ] `/whiteboard`에서 채널 카드/정원 표시 확인
- [ ] `/whiteboard/channel-1` 입장 및 화이트보드 렌더 확인
- [ ] 채널별 채팅방 자동 생성 및 채팅 송수신 확인
- [ ] 화이트보드 그림 작성 후 서버 재시작
- [ ] 동일 채널 재접속 시 그림 복원 확인

## 다음 작업 제안
- 서버 키를 `SUPABASE_SERVICE_ROLE_KEY`로 전환(보안 강화)
- 저장 디바운스 도입(쓰기 부하 최적화)
- 스냅샷/버전 복원 기능 추가
- Undo/Redo 및 권한 기반 전체삭제 제한
