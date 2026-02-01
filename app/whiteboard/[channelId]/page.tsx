import { notFound } from 'next/navigation';
import { WhiteboardChannelView } from '@/components/WhiteboardChannelView';
import { isValidWhiteboardChannel } from '@/lib/whiteboardChannels';

type WhiteboardChannelPageProps = {
    params: Promise<{ channelId: string }>;
};

export default async function WhiteboardChannelPage({
    params,
}: WhiteboardChannelPageProps) {
    const { channelId } = await params;

    if (!isValidWhiteboardChannel(channelId)) {
        notFound();
    }

    return (
        <main className='w-full h-screen'>
            <WhiteboardChannelView channelId={channelId} />
        </main>
    );
}
