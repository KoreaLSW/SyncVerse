import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const apiClient = axios.create({
    baseURL: '',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// 요청 인터셉터
apiClient.interceptors.request.use(
    (config) => {
        // 필요시 토큰 추가 등
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // 공통 에러 처리
        if (error.response?.status === 401) {
            // 로그인 페이지로 리다이렉트
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
