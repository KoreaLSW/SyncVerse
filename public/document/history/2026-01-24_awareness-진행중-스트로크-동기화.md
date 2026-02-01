# 2026-01-24 Awareness 기반 진행중 스트로크 동기화

## 목적
상대방이 드로잉 중일 때도 실시간으로 선/도형이 보이도록 하되,
성능 저하를 최소화하기 위해 Yjs CRDT 대신 Awareness를 활용한다.

## 변경 요약
- 로컬 드로잉은 기존처럼 프리뷰 캔버스에 렌더링
- 원격 드로잉은 Awareness의 `inProgress` 데이터로 전달
- 원격 진행중 스트로크는 별도의 원격 프리뷰 캔버스에 렌더링
- 마우스 업 시 확정 데이터만 Yjs `paths`에 저장

## 데이터 흐름
1. 사용자가 마우스 이동
2. 로컬 프리뷰 캔버스에 즉시 그림 렌더링
3. 일정 주기(약 30ms)로 Awareness에 `inProgress` 업데이트
4. 다른 클라이언트가 Awareness 변경을 수신
5. 원격 프리뷰 캔버스에 진행중 스트로크를 실시간 렌더링
6. 마우스 업 시 `paths`에 확정 저장 + `inProgress` 제거

## 핵심 코드 흐름
- `useWhiteboardSync.ts`
  - Awareness 상태에서 `inProgress` 수집 → `remoteStrokes`로 전달
- `WhiteboardCanvas.tsx`
  - 로컬 드로잉 중 `updateMyAwareness({ inProgress })` 호출
  - `remoteStrokes`를 원격 프리뷰 캔버스에 렌더링
  - 마우스 업 시 `updateMyAwareness({ inProgress: null })`

## 기대 효과
- 상대방의 드로잉이 실시간으로 보임
- CRDT에 불필요한 중간 데이터 저장을 피함
- 렌더링 부하를 원격 프리뷰 캔버스에 한정
