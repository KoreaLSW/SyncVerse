import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const handler = NextAuth({
    secret: process.env.NEXTAUTH_SECRET,

    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],

    // 세션에서 구글 유저 식별자를 꺼내 쓰기 좋게 넣어둠
    callbacks: {
        async jwt({ token, account }) {
            // 최초 로그인 시 providerAccountId(구글 sub)를 저장
            if (account?.provider === 'google' && account.providerAccountId) {
                token.userId = `google_${account.providerAccountId}`;
            }
            return token;
        },
        async session({ session, token }) {
            // session.user.id로 접근 가능하게
            if (session.user) {
                (session.user as any).id = (token as any).userId ?? null;
            }
            return session;
        },
    },
});

export { handler as GET, handler as POST };
