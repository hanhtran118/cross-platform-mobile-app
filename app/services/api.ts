// Correct configuration for Bearer Token (Read Access Token)
export const TMDB_CONFIG = {
    BASE_URL: 'https://api.themoviedb.org/3',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_MOVIE_API_KEY}`,
    }
}

// Environment validation function
const validateEnvironment = () => {
    const apiKey = process.env.EXPO_PUBLIC_MOVIE_API_KEY;

    if (!apiKey) {
        throw new Error('EXPO_PUBLIC_MOVIE_API_KEY is missing from environment variables');
    }

    // Check if it's a valid JWT Bearer token format
    if (!apiKey.startsWith('eyJ')) {
        console.warn('⚠️  API key doesn\'t look like a Bearer token. Expected JWT format starting with "eyJ"');
    }

    console.log('✅ Environment validation passed');
    console.log('🔑 Using Bearer token authentication');
};

export const fetchMovies = async ({ query }: { query: string }) => {
    try {
        // Validate environment on first call
        validateEnvironment();

        const endpoint = query
            ? `${TMDB_CONFIG.BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
            : `${TMDB_CONFIG.BASE_URL}/discover/movie?sort_by=popularity.desc`;

        console.log('🎬 Fetching movies from:', endpoint);
        console.log('🔐 Using Bearer token authentication');

        // Add timeout for network requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            console.log('⏰ Request timeout triggered');
        }, 15000); // 15 second timeout

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: TMDB_CONFIG.headers,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('📡 Response status:', response.status);
        console.log('✅ Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ TMDB API Error Response:', errorText);

            switch (response.status) {
                case 401:
                    throw new Error('Invalid or expired Bearer token. Please check your TMDB Read Access Token.');
                case 404:
                    throw new Error('Movie not found or invalid endpoint.');
                case 429:
                    throw new Error('Too many requests. Please wait and try again.');
                case 500:
                case 502:
                case 503:
                    throw new Error('TMDB server error. Please try again later.');
                default:
                    throw new Error(`TMDB API Error: ${response.status} - ${response.statusText}`);
            }
        }

        const data = await response.json();

        console.log('🎭 Movies data received:');
        console.log('   📊 Total results:', data.total_results || 0);
        console.log('   🎬 Movies in page:', data.results?.length || 0);
        console.log('   🏆 First movie:', data.results?.[0]?.title || 'None');

        return data.results || [];

    } catch (error) {
        if (error.name === 'AbortError') {
            const timeoutError = new Error('Request timeout - please check your network connection');
            console.error('⏰ Request timeout occurred');
            throw timeoutError;
        }

        console.error('💥 Error fetching movies:', error.message);
        throw error;
    }
};

export const fetchMovieDetails = async (
    movieId: string
): Promise<MovieDetails> => {
    try {
        const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/movie/${movieId}?api_key=${TMDB_CONFIG.API_KEY}`,
            {
                method: "GET",
                headers: TMDB_CONFIG.headers,
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch movie details: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching movie details:", error);
        throw error;
    }
};


// Test function specifically for Bearer token
export const testTMDBBearerToken = async () => {
    console.log('\n🧪 Testing TMDB Bearer Token Authentication...\n');

    try {
        validateEnvironment();

        // Test with configuration endpoint
        const testResponse = await fetch(`${TMDB_CONFIG.BASE_URL}/configuration`, {
            headers: TMDB_CONFIG.headers,
            signal: AbortSignal.timeout(10000)
        });

        console.log('📡 Test response status:', testResponse.status);

        if (testResponse.ok) {
            const configData = await testResponse.json();
            console.log('✅ Bearer token authentication: SUCCESS');
            console.log('🔗 Base image URL:', configData.images?.base_url);
            console.log('📐 Available poster sizes:', configData.images?.poster_sizes?.join(', '));
            return true;
        } else {
            const errorText = await testResponse.text();
            console.log('❌ Bearer token authentication: FAILED');
            console.log('💬 Error response:', errorText);
            return false;
        }

    } catch (error) {
        console.log('❌ Bearer token test ERROR:', error.message);
        return false;
    }
};

// Test a simple movie search
export const testMovieSearch = async (query = 'avengers') => {
    console.log(`\n🔍 Testing movie search for: "${query}"\n`);

    try {
        const movies = await fetchMovies({ query });

        if (movies && movies.length > 0) {
            console.log('✅ Movie search: SUCCESS');
            console.log(`🎬 Found ${movies.length} movies`);
            console.log('🏆 First 3 results:');
            movies.slice(0, 3).forEach((movie, index) => {
                console.log(`   ${index + 1}. ${movie.title} (${movie.release_date?.split('-')[0] || 'Unknown year'})`);
            });
            return true;
        } else {
            console.log('⚠️  Movie search returned no results');
            return false;
        }

    } catch (error) {
        console.log('❌ Movie search FAILED:', error.message);
        return false;
    }
};

// Comprehensive test function
export const runFullTMDBTest = async () => {
    console.log('\n🚀 Running Full TMDB API Test Suite...\n');
    console.log('==========================================\n');

    const authTest = await testTMDBBearerToken();
    const searchTest = await testMovieSearch();
    const popularTest = await testMovieSearch(''); // Empty query = popular movies

    console.log('\n📊 Test Results Summary:');
    console.log('==========================================');
    console.log(`🔐 Bearer Token Auth: ${authTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🔍 Movie Search: ${searchTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🌟 Popular Movies: ${popularTest ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = authTest && searchTest && popularTest;
    console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    if (!allPassed) {
        console.log('\n🔧 Troubleshooting Tips:');
        console.log('1. Check if your Bearer token is valid and not expired');
        console.log('2. Verify your internet connection');
        console.log('3. Make sure you\'re using a Read Access Token, not API Key');
        console.log('4. Try regenerating your token from TMDB settings');
    }

    return allPassed;
};
