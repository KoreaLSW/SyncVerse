import axios from 'axios';

// Next.js API Routes용 기본 fetcher
export const fetcher = async <T = any>(url: string): Promise<T> => {
    const response = await axios.get<T>(url);
    return response.data;
};

// API route의 { data: ... } 구조를 처리하는 fetcher
export const dataFetcher = async <T = any>(url: string): Promise<T> => {
    const response = await axios.get<{ data: T }>(url);
    return response.data.data;
};

// 에러 처리가 포함된 fetcher
export const fetcherWithError = async <T = any>(url: string): Promise<T> => {
    try {
        const response = await axios.get<T>(url);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.error || error.message);
        }
        throw error;
    }
};
