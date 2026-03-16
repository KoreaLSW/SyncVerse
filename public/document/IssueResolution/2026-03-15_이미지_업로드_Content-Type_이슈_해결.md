# 이미지 업로드 Content-Type 이슈 해결 (2026-03-15)

## 발생 이슈

- 증상
  - 이미지 전송 시 서버에서 아래 에러가 발생하며 업로드 실패
  - `Failed to upload image message`
  - `Content-Type was not one of "multipart/form-data" or "application/x-www-form-urlencoded".`

- 영향
  - 채팅 사진 전송 API(`POST /api/chat/messages/image`) 호출 실패
  - 메시지/첨부 저장 로직이 실행되지 않음

## 원인 분석

- 클라이언트 공통 API 인스턴스(`lib/api.ts`)가 전역 헤더로 `Content-Type: application/json`을 고정하고 있었음.
- 이미지 업로드는 `FormData` 기반 요청이어야 하며, 이 경우 브라우저가 `multipart/form-data; boundary=...`를 자동 설정해야 함.
- 전역 JSON 헤더가 우선 적용되어 서버의 `request.formData()` 파싱 조건과 충돌함.

## 해결 방법

- `apiClient` 요청 인터셉터에서 `config.data instanceof FormData`인 경우 `Content-Type` 헤더를 제거하도록 수정.
- 결과적으로 업로드 요청은 브라우저 기본 동작으로 `multipart/form-data`가 자동 설정됨.

## 수정 파일

- `syncverse/lib/api.ts`

## 적용 코드 요약

- 요청 인터셉터에 아래 로직 추가:
  - `FormData` 요청이면 `Content-Type` 제거

## 검증 포인트

- 이미지 전송 시 네트워크 요청 헤더 확인
  - `Content-Type: multipart/form-data; boundary=...` 형태인지 확인
- 서버 응답 확인
  - `201` 생성 성공
  - `messages` 및 `message_attachments` 데이터 저장 확인
- 기존 JSON API 영향 확인
  - 일반 `apiClient.post/patch` 요청 정상 동작 확인

## 재발 방지 포인트

- 파일 업로드는 항상 `FormData`를 사용하고, 전역 `Content-Type` 고정이 업로드를 깨뜨릴 수 있음을 팀 규칙으로 공유
- 신규 업로드 API 추가 시 동일 인터셉터 정책 재사용
