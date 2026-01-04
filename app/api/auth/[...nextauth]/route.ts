import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { supabase } from '@/app/lib/supabase';

const handler = NextAuth({
    secret: process.env.NEXTAUTH_SECRET,

    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],

    callbacks: {
        async signIn({ user, account, profile }) {
            // 구글 로그인인 경우에만 users 테이블에 데이터 생성
            if (account?.provider === 'google' && user.email) {
                try {
                    // 닉네임 생성: 이름이 있으면 사용, 없으면 이메일 앞부분 사용
                    const nickname =
                        user.name || user.email.split('@')[0] || 'User';

                    // 🚀 username 생성: 이메일의 @ 앞부분 추출
                    const username = user.email.split('@')[0] || 'user';

                    // users 테이블에 사용자 데이터 생성 (이미 존재하면 에러 무시)
                    // avatar_config는 upsert에서 제외하여 기존 설정을 유지함
                    const { error } = await supabase.from('users').upsert(
                        {
                            email: user.email,
                            nickname: nickname,
                            username: username, // 🚀 username 추가
                        },
                        {
                            onConflict: 'email', // email이 중복이면 업데이트
                        }
                    );

                    // 에러가 있으면 로그만 남기고 계속 진행 (이미 존재하는 사용자일 수 있음)
                    if (error && error.code !== '23505') {
                        // 23505는 UNIQUE 제약 조건 위반 (이미 존재하는 경우)
                        console.error('Failed to create/update user:', error);
                    }
                } catch (error) {
                    console.error('Error in signIn callback:', error);
                    // 에러가 발생해도 로그인은 계속 진행
                }
            }

            return true; // 로그인 허용
        },

        async jwt({ token, account, user }) {
            // 최초 로그인 시 providerAccountId(구글 sub)를 저장
            if (account?.provider === 'google' && account.providerAccountId) {
                token.userId = `google_${account.providerAccountId}`;
                token.username = user?.email ? user.email.split('@')[0] : null;
                token.email = user?.email ?? null;
            }
            return token;
        },

        async session({ session, token }) {
            // session.user.id로 접근 가능하게
            if (session.user) {
                (session.user as any).id = (token as any).userId ?? null;
                (session.user as any).email = token.email ?? session.user.email;
                (session.user as any).username =
                    (token as any).username ?? null;
            }
            return session;
        },
    },
});

export { handler as GET, handler as POST };
