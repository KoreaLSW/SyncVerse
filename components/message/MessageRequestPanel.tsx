import type { DmRequestItem, SearchUserItem } from '@/lib/message/types';
import { MessageRequestSearchSection } from './MessageRequestSearchSection';
import { MessageRequestFriendSection } from './MessageRequestFriendSection';
import { MessageRequestStatusSection } from './MessageRequestStatusSection';

type MessageRequestPanelProps = {
    searchKeyword: string;
    searchedUsers: SearchUserItem[];
    isSearchLoading?: boolean;
    isSearchLoadingMore?: boolean;
    hasMoreSearchedUsers?: boolean;
    searchErrorMessage?: string | null;
    onLoadMoreSearchedUsers?: () => void;
    friendIds?: string[];
    friends: SearchUserItem[];
    isFriendLoading?: boolean;
    isFriendLoadingMore?: boolean;
    hasMoreFriends?: boolean;
    friendErrorMessage?: string | null;
    onLoadMoreFriends?: () => void;
    requests: DmRequestItem[];
    isRequestingDm?: boolean;
    isRespondingDm?: boolean;
    isDeletingDm?: boolean;
    requestStatusErrorMessage?: string | null;
    statusClassName: (status: DmRequestItem['status']) => string;
    onSearchChange: (value: string) => void;
    onRequestDm?: (receiverId: string) => void;
    onRespondDm?: (
        requestId: string,
        action: 'accept' | 'reject' | 'cancel',
    ) => void;
    onDeleteDm?: (requestId: string) => void;
};

export function MessageRequestPanel({
    searchKeyword,
    searchedUsers,
    isSearchLoading,
    isSearchLoadingMore,
    hasMoreSearchedUsers,
    searchErrorMessage,
    onLoadMoreSearchedUsers,
    friendIds,
    friends,
    isFriendLoading,
    isFriendLoadingMore,
    hasMoreFriends,
    friendErrorMessage,
    onLoadMoreFriends,
    requests,
    isRequestingDm,
    isRespondingDm,
    isDeletingDm,
    requestStatusErrorMessage,
    statusClassName,
    onSearchChange,
    onRequestDm,
    onRespondDm,
    onDeleteDm,
}: MessageRequestPanelProps) {
    return (
        <section className='rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-md'>
            {/* 1:1 대화 요청 검색 섹션 */}
            <MessageRequestSearchSection
                searchKeyword={searchKeyword}
                searchedUsers={searchedUsers}
                isSearchLoading={isSearchLoading}
                isSearchLoadingMore={isSearchLoadingMore}
                hasMoreSearchedUsers={hasMoreSearchedUsers}
                searchErrorMessage={searchErrorMessage}
                onSearchChange={onSearchChange}
                onRequestDm={onRequestDm}
                onLoadMoreSearchedUsers={onLoadMoreSearchedUsers}
                isRequestingDm={isRequestingDm}
                friendIds={friendIds}
            />
            {/* 1:1 대화 요청 친구 섹션 */}
            <MessageRequestFriendSection
                friends={friends}
                isFriendLoading={isFriendLoading}
                isFriendLoadingMore={isFriendLoadingMore}
                hasMoreFriends={hasMoreFriends}
                friendErrorMessage={friendErrorMessage}
                onLoadMoreFriends={onLoadMoreFriends}
            />
            {/* 1:1 대화 요청 상태 섹션 */}
            <MessageRequestStatusSection
                requests={requests}
                isRespondingDm={isRespondingDm}
                isDeletingDm={isDeletingDm}
                requestStatusErrorMessage={requestStatusErrorMessage}
                statusClassName={statusClassName}
                onRespondDm={onRespondDm}
                onDeleteDm={onDeleteDm}
            />
        </section>
    );
}
