-- 1. UUID 확장 기능 (필수)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. 유저 (Users)
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    avatar_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 유저 테이블 코멘트 등록
COMMENT ON TABLE users IS '사용자 기본 정보 테이블';
COMMENT ON COLUMN users.id IS '사용자 고유 ID (PK)';
COMMENT ON COLUMN users.email IS '구글 로그인 이메일 (Unique)';
COMMENT ON COLUMN users.nickname IS '사용자 닉네임';
COMMENT ON COLUMN users.avatar_config IS '캐릭터 커스터마이징 데이터 (JSONB)';
COMMENT ON COLUMN users.created_at IS '회원가입 일시';

-- username컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE NOT NULL;

COMMENT ON COLUMN users.username IS '사용자 이름 (Unique)';

-- 캐릭터 위치 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS position_x NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS position_y NUMERIC DEFAULT 0;

COMMENT ON COLUMN users.position_x IS '캐릭터 X 좌표';
COMMENT ON COLUMN users.position_y IS '캐릭터 Y 좌표';


-- ==========================================
-- 3. 친구 관계 (Friendships)
-- ==========================================
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(sender_id, receiver_id)
);

COMMENT ON TABLE friendships IS '친구 요청 및 관계 관리 테이블';
COMMENT ON COLUMN friendships.sender_id IS '친구 요청을 보낸 유저 ID';
COMMENT ON COLUMN friendships.receiver_id IS '친구 요청을 받은 유저 ID';
COMMENT ON COLUMN friendships.status IS '상태값 (PENDING: 요청중, ACCEPTED: 친구됨)';


-- ==========================================
-- 4. 차단 목록 (Blocks)
-- ==========================================
CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(blocker_id, blocked_id)
);

COMMENT ON TABLE blocks IS '사용자 차단 목록 테이블';
COMMENT ON COLUMN blocks.blocker_id IS '차단을 실행한 유저 ID (나)';
COMMENT ON COLUMN blocks.blocked_id IS '차단을 당한 유저 ID (상대방)';


-- ==========================================
-- 5. 게시판 (Posts)
-- ==========================================
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    images TEXT[],
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

COMMENT ON TABLE posts IS '게시글 저장 테이블';
COMMENT ON COLUMN posts.title IS '게시글 제목';
COMMENT ON COLUMN posts.content IS '게시글 본문 (HTML or Text)';
COMMENT ON COLUMN posts.images IS '업로드된 이미지 URL 배열 (TEXT Array)';
COMMENT ON COLUMN posts.author_id IS '작성자 ID (탈퇴 시 글 삭제)';


-- ==========================================
-- 6. 댓글 (Comments)
-- ==========================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

COMMENT ON TABLE comments IS '댓글 및 대댓글 테이블';
COMMENT ON COLUMN comments.post_id IS '소속된 게시글 ID';
COMMENT ON COLUMN comments.parent_id IS '대댓글일 경우 부모 댓글 ID (NULL이면 일반 댓글)';


-- ==========================================
-- 7. 채팅방 (Chat Rooms)
-- ==========================================
-- Enum 타입 정의
CREATE TYPE room_type AS ENUM ('DM', 'GROUP', 'SYSTEM');
CREATE TYPE room_category AS ENUM ('MAIN', 'WHITEBOARD', 'FREE', 'NONE');

CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type room_type NOT NULL,
    category room_category DEFAULT 'NONE',
    name VARCHAR(100),
    password VARCHAR(100),
    max_capacity INT DEFAULT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

COMMENT ON TABLE chat_rooms IS '채팅방 메타 정보 테이블';
COMMENT ON COLUMN chat_rooms.type IS '채팅방 유형 (DM: 1:1, GROUP: 유저생성, SYSTEM: 고정방)';
COMMENT ON COLUMN chat_rooms.category IS '시스템 방의 세부 용도 (MAIN, WHITEBOARD 등)';
COMMENT ON COLUMN chat_rooms.max_capacity IS '최대 입장 가능 인원 (NULL: 무제한)';
COMMENT ON COLUMN chat_rooms.last_message_at IS '방 정렬을 위한 마지막 메시지 전송 시간';


-- ==========================================
-- 8. 채팅 참여자 (Chat Participants)
-- ==========================================
CREATE TABLE chat_participants (
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    PRIMARY KEY (room_id, user_id)
);

COMMENT ON TABLE chat_participants IS '채팅방 참여 유저 및 읽음 상태 관리';
COMMENT ON COLUMN chat_participants.joined_at IS '채팅방 입장 시간';
COMMENT ON COLUMN chat_participants.last_read_at IS '마지막으로 메시지를 읽은 시간 (안 읽은 메시지 계산용)';


-- ==========================================
-- 9. 메시지 (Messages)
-- ==========================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_name VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

COMMENT ON TABLE messages IS '실제 채팅 메시지 저장 테이블';
COMMENT ON COLUMN messages.sender_name IS '메시지 전송 당시의 작성자 이름';
COMMENT ON COLUMN messages.content IS '메시지 내용';
COMMENT ON COLUMN messages.room_id IS '메시지가 전송된 방 ID';

-- 인덱스
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_room_id ON messages(room_id);



-- ==========================================
-- 10. 화이트보드 Yjs 문서 영구 저장 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS whiteboard_document (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_name VARCHAR(120) NOT NULL UNIQUE,
    yjs_state BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

COMMENT ON TABLE whiteboard_document IS '화이트보드 채널별 Yjs 문서 상태 저장';
COMMENT ON COLUMN whiteboard_document.document_name IS 'Yjs 문서명 (예: whiteboard-channel-1)';
COMMENT ON COLUMN whiteboard_document.yjs_state IS 'Y.encodeStateAsUpdate(document) 바이너리';
COMMENT ON COLUMN whiteboard_document.created_at IS '최초 생성 시각';
COMMENT ON COLUMN whiteboard_document.updated_at IS '마지막 업데이트 시각';

-- 조회 성능 및 정렬 보조 인덱스
CREATE INDEX IF NOT EXISTS idx_whiteboard_document_updated_at
ON whiteboard_document(updated_at DESC);

-- updated_at 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION set_whiteboard_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 재생성 안전 처리
DROP TRIGGER IF EXISTS trg_whiteboard_document_updated_at
ON whiteboard_document;

CREATE TRIGGER trg_whiteboard_document_updated_at
BEFORE UPDATE ON whiteboard_document
FOR EACH ROW
EXECUTE FUNCTION set_whiteboard_document_updated_at();

-- ==========================================
-- 11. 알림 (Notifications)
-- ==========================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 알림 수신자(누가 받는지)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 알림 행위자(누가 발생시켰는지): 시스템 알림 등은 NULL 가능
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- 알림 타입 (확장 가능)
    type VARCHAR(40) NOT NULL CHECK (
        type IN (
            'FRIEND_REQUEST',
            'MESSAGE_REQUEST',
            'SYSTEM',
            'ETC'
        )
    ),

    -- 표시용 텍스트
    title VARCHAR(120) NOT NULL,
    body TEXT,

    -- 화면 전환/버튼 액션 등에 필요한 부가 데이터
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- 중복 방지 키 (예: FRIENDSHIP:{friendship_id}, MSG_REQ:{request_id})
    source_key VARCHAR(120) NOT NULL,

    -- 상태
    read_at TIMESTAMP WITH TIME ZONE,
    acted_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),

    UNIQUE (user_id, source_key)
);

COMMENT ON TABLE notifications IS '사용자 알림 통합 테이블';
COMMENT ON COLUMN notifications.user_id IS '알림 수신자 ID';
COMMENT ON COLUMN notifications.actor_id IS '알림 발생 주체 사용자 ID (시스템 알림은 NULL)';
COMMENT ON COLUMN notifications.type IS '알림 타입 (친구요청, 메시지요청 등)';
COMMENT ON COLUMN notifications.title IS '알림 제목';
COMMENT ON COLUMN notifications.body IS '알림 본문';
COMMENT ON COLUMN notifications.payload IS '화면 이동/행동 처리용 부가 데이터(JSONB)';
COMMENT ON COLUMN notifications.source_key IS '도메인 이벤트 중복 방지 키';
COMMENT ON COLUMN notifications.read_at IS '읽음 처리 시각';
COMMENT ON COLUMN notifications.acted_at IS '수락/거절 등 액션 처리 시각';
COMMENT ON COLUMN notifications.created_at IS '생성 시각';
COMMENT ON COLUMN notifications.updated_at IS '수정 시각';

-- 조회 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
ON notifications(user_id, created_at DESC);

-- 미읽음 목록 조회 최적화
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, created_at DESC)
WHERE read_at IS NULL;

-- 타입별 필터링 최적화
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created_at
ON notifications(user_id, type, created_at DESC);

-- updated_at 자동 갱신 함수/트리거
CREATE OR REPLACE FUNCTION set_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON notifications;

CREATE TRIGGER trg_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION set_notifications_updated_at();

-- (선택) UPDATE/DELETE old row를 Realtime payload에 안정적으로 포함하려면 권장
ALTER TABLE notifications REPLICA IDENTITY FULL;


-- ==========================================
-- 12. 채팅 요청 (Chat Requests)
-- DM/그룹 초대/그룹 가입요청 통합 관리
-- ==========================================

CREATE TABLE IF NOT EXISTS chat_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 요청 생성자 (요청을 보낸 사용자)
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 요청 수신자 (DM 상대 / 그룹 초대 대상 / 그룹 가입요청 처리자(방장/관리자))
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 요청 유형
    request_type VARCHAR(30) NOT NULL CHECK (
        request_type IN (
            'DM_INVITE',          -- 1:1 대화 요청
            'GROUP_INVITE',       -- 그룹 채팅 초대
            'GROUP_JOIN_REQUEST'  -- 그룹 채팅 가입 요청
        )
    ),

    -- 요청 상태
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN (
            'PENDING',
            'ACCEPTED',
            'REJECTED',
            'CANCELED',
            'EXPIRED'
        )
    ),

    -- 그룹 관련 요청 시 대상 채팅방
    target_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,

    -- 요청 메시지(선택)
    request_message TEXT,

    -- 수락 후 연결된 방 (DM 생성/기존 그룹 입장 승인 시 기록 가능)
    resolved_room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL,

    -- 처리 시각(수락/거절/취소/만료)
    responded_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),

    -- 자기 자신에게 요청 금지
    CONSTRAINT chk_chat_requests_not_self CHECK (sender_id <> receiver_id),

    -- 요청 유형별 필수 필드 제약
    -- DM: target_room_id 없어야 함
    -- GROUP_INVITE / GROUP_JOIN_REQUEST: target_room_id 필수
    CONSTRAINT chk_chat_requests_type_target CHECK (
        (request_type = 'DM_INVITE' AND target_room_id IS NULL)
        OR
        (request_type IN ('GROUP_INVITE', 'GROUP_JOIN_REQUEST') AND target_room_id IS NOT NULL)
    )
);

COMMENT ON TABLE chat_requests IS 'DM/그룹 채팅 요청 통합 관리 테이블';
COMMENT ON COLUMN chat_requests.sender_id IS '요청을 보낸 사용자 ID';
COMMENT ON COLUMN chat_requests.receiver_id IS '요청을 받은 사용자 ID';
COMMENT ON COLUMN chat_requests.request_type IS '요청 유형 (DM_INVITE, GROUP_INVITE, GROUP_JOIN_REQUEST)';
COMMENT ON COLUMN chat_requests.status IS '요청 상태 (PENDING/ACCEPTED/REJECTED/CANCELED/EXPIRED)';
COMMENT ON COLUMN chat_requests.target_room_id IS '그룹 관련 요청의 대상 채팅방 ID';
COMMENT ON COLUMN chat_requests.request_message IS '요청 메시지(선택)';
COMMENT ON COLUMN chat_requests.resolved_room_id IS '요청 수락 후 연결된 채팅방 ID';
COMMENT ON COLUMN chat_requests.responded_at IS '요청 처리 시각';
COMMENT ON COLUMN chat_requests.created_at IS '요청 생성 시각';
COMMENT ON COLUMN chat_requests.updated_at IS '요청 수정 시각';

-- 조회 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_requests_receiver_status_created_at
ON chat_requests(receiver_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_requests_sender_status_created_at
ON chat_requests(sender_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_requests_type_status_created_at
ON chat_requests(request_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_requests_target_room_status_created_at
ON chat_requests(target_room_id, status, created_at DESC);

-- 중복 요청 방지 인덱스
-- 1) DM 요청: 동일 사용자 쌍(방향 무관) PENDING 1건만 허용
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_requests_pending_dm_pair
ON chat_requests (
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id)
)
WHERE request_type = 'DM_INVITE' AND status = 'PENDING';

-- 2) 그룹 초대: 동일 room + 동일 대상(receiver) PENDING 1건만 허용
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_requests_pending_group_invite
ON chat_requests (target_room_id, receiver_id)
WHERE request_type = 'GROUP_INVITE' AND status = 'PENDING';

-- 3) 그룹 가입요청: 동일 room + 동일 요청자(sender) PENDING 1건만 허용
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_requests_pending_group_join
ON chat_requests (target_room_id, sender_id)
WHERE request_type = 'GROUP_JOIN_REQUEST' AND status = 'PENDING';

-- updated_at 자동 갱신 함수/트리거
CREATE OR REPLACE FUNCTION set_chat_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_requests_updated_at ON chat_requests;

CREATE TRIGGER trg_chat_requests_updated_at
BEFORE UPDATE ON chat_requests
FOR EACH ROW
EXECUTE FUNCTION set_chat_requests_updated_at();