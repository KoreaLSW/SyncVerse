## 작업 요약
- 화이트보드 채널 선택 화면 추가(`/whiteboard`)
- 채널별 라우팅 분리(`/whiteboard/[channelId]`)
- 채널 5개 고정, 채널당 정원 5명 상수화
- 채널별 Yjs 문서명 분리(`whiteboard-{channelId}`)
- 채널 목록에서 Yjs awareness로 접속자 수 표시 및 정원 초과 차단
- 화이트보드 채널별 채팅방 조회/생성 및 채팅 UI 추가

## 변경 파일
- `app/whiteboard/page.tsx`
- `app/whiteboard/[channelId]/page.tsx`
- `components/WhiteboardCanvas.tsx`
- `hooks/useWhiteboardSync.ts`
- `lib/whiteboardChannels.ts`
- `app/api/chat/rooms/route.ts`
- `components/WhiteboardChannelView.tsx`

## 주요 구현 내용
- 채널 메타데이터 및 유틸 추가
  - `WHITEBOARD_CHANNELS`, `MAX_USERS_PER_CHANNEL`
  - `getWhiteboardDocName`, `isValidWhiteboardChannel`
- `useWhiteboardSync`에 `docName` 인자 추가 → 채널별 Yjs 분리
- 채널 선택 화면에서 각 채널 Yjs awareness 상태를 구독하여 인원 수 표시
  - 채널 목록 페이지는 로컬 사용자를 카운트하지 않도록 `awareness.setLocalState(null)` 처리
- 채널 상세 라우트에서 유효하지 않은 채널 접근 시 404 처리
- 화이트보드 채널별 채팅방 자동 생성/조회
  - `category=WHITEBOARD`, `name=channelId` 기준으로 방 조회
  - 방이 없으면 `POST /api/chat/rooms`로 생성
- 채널 화면에 채팅 UI 렌더링
  - `WhiteboardChannelView`에서 `ChatLog` 연동
  - 메시지 전송 시 `/api/chat/messages` 사용

## 문제점 및 해결
1) 채널 접근 시 404 발생
- 원인: `params`가 Promise로 전달되는 상황에서 동기 접근
- 증상: `sync-dynamic-apis` 관련 에러 및 404
- 해결: `page.tsx`를 `async`로 변경하고 `const { channelId } = await params;`로 언랩

2) 소스맵 경고 로그
- 원인: Turbopack 개발 서버의 비정상 소스맵 경고
- 영향: 기능 동작에는 직접 영향 없음(경고성 로그)
- 대응: 기능 구현과는 독립이며 필요 시 `.next` 캐시 제거 후 재실행 권장

## 확인 사항
- `/whiteboard`에서 채널 카드 표시 및 인원 수 갱신 확인
- `/whiteboard/channel-1` 등 유효 채널 진입 확인
- 정원(5명) 초과 시 입장 버튼 비활성 확인
- 채널 진입 시 채팅방 자동 생성 및 채팅 UI 표시 확인
- 동일 채널에서 메시지 전송/수신 확인
