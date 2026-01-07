
import { useEffect, useState, useCallback, useRef } from "react";

interface UseFetchOptions {
    autoFetch?: boolean;
    retries?: number;
    retryDelay?: number;
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
}

interface UseFetchState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    isStale: boolean;
}

const useFetch = <T>(
    fetchFunction: () => Promise<T>,
    options: UseFetchOptions = {}
) => {
    const {
        autoFetch = true,
        retries = 0,
        retryDelay = 1000,
        onSuccess,
        onError
    } = options;

    const [state, setState] = useState<UseFetchState<T>>({
        data: null,
        loading: false,
        error: null,
        isStale: false
    });

    // Keep track of the latest fetch request to prevent race conditions
    const requestIdRef = useRef(0);
    const isMountedRef = useRef(true);

    // Cleanup function
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const fetchData = useCallback(async (retryCount = 0): Promise<T | null> => {
        // Generate unique request ID to handle race conditions
        const requestId = ++requestIdRef.current;

        try {
            // Only set loading on first attempt, not retries
            if (retryCount === 0) {
                setState(prev => ({
                    ...prev,
                    loading: true,
                    error: null,
                    isStale: false
                }));
            }

            console.log(`🔄 Fetching data... (attempt ${retryCount + 1})`);
            const result = await fetchFunction();

            // Check if this is still the latest request and component is mounted
            if (requestId === requestIdRef.current && isMountedRef.current) {
                setState(prev => ({
                    ...prev,
                    data: result,
                    loading: false,
                    error: null,
                    isStale: false
                }));

                console.log('✅ Data fetched successfully');
                onSuccess?.(result);
                return result;
            }

            return null;

        } catch (err) {
            const error = err instanceof Error ? err : new Error('An unknown error occurred');

            console.error(`❌ Fetch attempt ${retryCount + 1} failed:`, error.message);

            // Handle retries
            if (retryCount < retries) {
                console.log(`🔄 Retrying in ${retryDelay}ms... (${retryCount + 1}/${retries})`);

                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return fetchData(retryCount + 1);
            }

            // Check if this is still the latest request and component is mounted
            if (requestId === requestIdRef.current && isMountedRef.current) {
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error,
                    isStale: prev.data !== null // Data becomes stale if we had previous data
                }));

                console.error('💥 All fetch attempts failed:', error.message);
                onError?.(error);
            }

            throw error;
        }
    }, [fetchFunction, retries, retryDelay, onSuccess, onError]);

    const reset = useCallback(() => {
        console.log('🔄 Resetting fetch state');
        setState({
            data: null,
            loading: false,
            error: null,
            isStale: false
        });
        // Reset request counter to prevent race conditions
        requestIdRef.current = 0;
    }, []);

    const refetch = useCallback(async () => {
        console.log('🔄 Manual refetch triggered');
        try {
            return await fetchData();
        } catch (error) {
            // Error is already handled in fetchData
            return null;
        }
    }, [fetchData]);

    // Mark data as stale (useful for cache invalidation)
    const markStale = useCallback(() => {
        setState(prev => ({ ...prev, isStale: true }));
    }, []);

    // Auto-fetch effect
    useEffect(() => {
        if (autoFetch) {
            console.log('🚀 Auto-fetching data on mount');
            fetchData();
        }
    }, [autoFetch]); // Remove fetchData from dependencies to prevent unnecessary re-fetches

    return {
        // State
        data: state.data,
        loading: state.loading,
        error: state.error,
        isStale: state.isStale,

        // Actions
        refetch,
        reset,
        markStale,

        // Computed properties
        hasData: state.data !== null,
        hasError: state.error !== null,
        isEmpty: !state.loading && !state.error && state.data === null,

        // Status helpers
        isSuccess: !state.loading && !state.error && state.data !== null,
        isError: !state.loading && state.error !== null,
        isIdle: !state.loading && !state.error && state.data === null
    };
};

export default useFetch;

// Specialized hook for your movie fetching with better defaults
export const useMovieFetch = <T>(
    fetchFunction: () => Promise<T>,
    options: Omit<UseFetchOptions, 'retries' | 'retryDelay'> & {
        retries?: number;
        retryDelay?: number;
    } = {}
) => {
    return useFetch(fetchFunction, {
        retries: 2, // Default 2 retries for movie API
        retryDelay: 1500, // 1.5 second delay between retries
        ...options
    });
};

// Example usage with your movie API:
/*
// Basic usage
const { data: movies, loading, error, refetch } = useFetch(
    () => fetchMovies({ query: 'spider-man' })
);

// With retry logic
const { data: movies, loading, error, refetch } = useFetch(
    () => fetchMovies({ query: 'spider-man' }),
    {
        retries: 2,
        retryDelay: 1000,
        onSuccess: (data) => console.log('Movies loaded:', data.length),
        onError: (error) => console.error('Failed to load movies:', error.message)
    }
);

// Using the specialized movie hook
const { data: movies, loading, error, refetch, isStale } = useMovieFetch(
    () => fetchMovies({ query: 'spider-man' })
);
*/






// import {useEffect, useState} from "react";
//
//
// const useFetch = <T>(fetchFunction: () => Promise<T>, autoFetch = true) => {
//     const [data, setData] = useState<T | null>(null);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState<Error | null>(null);
//
//     const fetchData = async () => {
//         try {
//             setLoading(true);
//             setError(null);
//
//             const result = await fetchFunction();
//             setData(result);
//
//         } catch (err) {
//
//             setError(err instanceof Error ? err : new Error('An error occurred'));
//         } finally {
//             setLoading(false);
//         }
//     }
//
//     const reset = () => {
//         setData(null);
//         setLoading(false);
//         setError(null);
//     }
//
//     useEffect(() => {
//         if (autoFetch) {
//             fetchData();
//         }
//
//     }, []);
//
//   return { data, loading, error, refetch: fetchData, reset };
// }
//
// export default useFetch;