// track the searches
import 'react-native-url-polyfill/auto';
import { Client, Databases, Query } from 'react-native-appwrite';

interface Movie {
    id: number;
    title: string;
    poster_path?: string;
    release_date?: string;
    vote_average?: number;
}

// Updated interface to support the new structure
interface TrendingMovie {
    $id: string;
    $createdAt?: string;
    $updatedAt?: string;
    $permissions?: string[];
    $collectionId?: string;
    $databaseId?: string;
    searchTerms: string[]; // Array of search terms that led to this movie
    lastSearchTerm: string; // Most recent search term
    count: number;
    movie_id: number;
    poster_url: string;
    title: string;
    release_date?: string;
    vote_average?: number;
    lastSearched: string;
}

// Environment validation
const validateEnvironment = () => {
    const required = [
        'EXPO_PUBLIC_MOVIE_API_KEY',
        'EXPO_PUBLIC_APPWRITE_PROJECT_ID',
        'EXPO_PUBLIC_APPWRITE_DATABASE_ID',
        'EXPO_PUBLIC_APPWRITE_COLLECTION_ID'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('Missing environment variables:', missing);
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log('Environment validation passed ✅');
};

// Validate environment on module load
validateEnvironment();

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

const databases = new Databases(client);

// TMDB Configuration
export const TMDB_CONFIG = {
    BASE_URL: 'https://api.themoviedb.org/3',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_MOVIE_API_KEY}`,
    }
}

// Simple retry function without NetInfo dependency
const retryWithBackoff = async <T>(
    operation: () => Promise<T>,
    retries = 3,
    operationName = 'Operation'
): Promise<T> => {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`${operationName} - Attempt ${i + 1}/${retries}`);
            return await operation();

        } catch (error) {
            const isLastAttempt = i === retries - 1;
            console.log(`${operationName} - Attempt ${i + 1} failed:`, error.message);

            if (isLastAttempt) {
                console.error(`${operationName} - All ${retries} attempts failed`);
                throw error;
            }

            // Exponential backoff: wait 1s, 2s, 4s...
            const waitTime = 1000 * Math.pow(2, i);
            console.log(`${operationName} - Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    throw new Error(`${operationName} failed after ${retries} attempts`);
};

// FIXED: Updated search counting function that groups by movie instead of search term
export const updateSearchCount = async (query: string, movie: Movie) => {
    console.log('updateSearchCount called with:', query, movie.title);

    return retryWithBackoff(async () => {
        // Search by movie_id instead of searchTerm to avoid duplicates
        const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
            Query.equal('movie_id', movie.id)
        ]);

        console.log('Movie search result:', result);

        if (result.documents.length > 0) {
            // Movie already exists, update count and add search term
            const existingDoc = result.documents[0];

            // Handle both old and new data structures
            const currentSearchTerms = existingDoc.searchTerms ||
                (existingDoc.searchTerm ? [existingDoc.searchTerm] : []);

            // Add new search term if it's not already in the array
            const updatedSearchTerms = currentSearchTerms.includes(query)
                ? currentSearchTerms
                : [...currentSearchTerms, query];

            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID,
                existingDoc.$id,
                {
                    count: (existingDoc.count || 0) + 1,
                    searchTerms: updatedSearchTerms,
                    lastSearchTerm: query,
                    lastSearched: new Date().toISOString(),
                    // Update movie details in case they changed
                    title: movie.title,
                    poster_url: movie.poster_path
                        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                        : 'https://placehold.co/500x750/1a1a1a/ffffff.png',
                    release_date: movie.release_date || null,
                    vote_average: movie.vote_average || null
                }
            );
            console.log('Movie search count updated successfully');
        } else {
            // New movie, create document with new structure
            await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID,
                'unique()',
                {
                    searchTerms: [query],
                    lastSearchTerm: query,
                    count: 1,
                    movie_id: movie.id,
                    poster_url: movie.poster_path
                        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                        : 'https://placehold.co/500x750/1a1a1a/ffffff.png',
                    title: movie.title,
                    release_date: movie.release_date || null,
                    vote_average: movie.vote_average || null,
                    lastSearched: new Date().toISOString()
                }
            );
            console.log('New movie search record created successfully');
        }
    }, 3, 'UpdateSearchCount');
};

export const getTrendingMovies = async (): Promise<TrendingMovie[]> => {
    console.log('getTrendingMovies called');

    try {
        return await retryWithBackoff(async () => {
            console.log('Querying Appwrite for trending movies...');
            console.log('Database ID:', DATABASE_ID);
            console.log('Collection ID:', COLLECTION_ID);

            const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
                Query.limit(10), // Get more movies to filter duplicates
                Query.orderDesc('count'),
            ]);

            console.log('Trending movies result:', result.documents?.length || 0, 'movies found');

            // Filter out any remaining duplicates (shouldn't happen with new logic, but just in case)
            const uniqueMovies = result.documents.reduce((unique, movie) => {
                const exists = unique.find(m => m.movie_id === movie.movie_id);
                if (!exists) {
                    unique.push(movie);
                }
                return unique;
            }, []);

            // Return top 5 unique movies
            return uniqueMovies.slice(0, 5) as TrendingMovie[];
        }, 3, 'GetTrendingMovies');
    } catch (error) {
        console.error('Error getting trending movies:', error);
        return [];
    }
}

// Function to clean up existing duplicate entries
export const cleanupDuplicateMovies = async () => {
    try {
        console.log('🧹 Starting cleanup of duplicate movies...');

        // Get all documents
        const allDocs = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
            Query.limit(100)
        ]);

        console.log(`Found ${allDocs.documents.length} documents to check`);

        // Group by movie_id
        const movieGroups = {};
        allDocs.documents.forEach(doc => {
            const movieId = doc.movie_id;
            if (!movieGroups[movieId]) {
                movieGroups[movieId] = [];
            }
            movieGroups[movieId].push(doc);
        });

        let duplicatesFound = 0;
        let duplicatesRemoved = 0;

        // Process duplicates
        for (const [movieId, docs] of Object.entries(movieGroups)) {
            if (docs.length > 1) {
                duplicatesFound++;
                console.log(`Found ${docs.length} duplicates for movie ID: ${movieId} (${docs[0].title})`);

                // Combine data from all duplicates
                const totalCount = docs.reduce((sum, doc) => sum + (doc.count || 0), 0);
                const allSearchTerms = docs.reduce((terms, doc) => {
                    // Handle both old and new data structures
                    const docTerms = doc.searchTerms ||
                        (doc.searchTerm ? [doc.searchTerm] : []);
                    return [...new Set([...terms, ...docTerms])]; // Remove duplicates
                }, []);

                // Keep the most recent document
                const sortedDocs = docs.sort((a, b) =>
                    new Date(b.$updatedAt || b.$createdAt).getTime() -
                    new Date(a.$updatedAt || a.$createdAt).getTime()
                );
                const keepDoc = sortedDocs[0];

                // Update the kept document with combined data
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTION_ID,
                    keepDoc.$id,
                    {
                        count: totalCount,
                        searchTerms: allSearchTerms,
                        lastSearchTerm: allSearchTerms[allSearchTerms.length - 1] || '',
                        lastSearched: new Date().toISOString()
                    }
                );

                // Delete the duplicate documents
                for (let i = 1; i < sortedDocs.length; i++) {
                    await databases.deleteDocument(
                        DATABASE_ID,
                        COLLECTION_ID,
                        sortedDocs[i].$id
                    );
                    duplicatesRemoved++;
                    console.log(`Deleted duplicate document: ${sortedDocs[i].$id}`);
                }
            }
        }

        console.log(`✅ Cleanup completed: ${duplicatesFound} movies had duplicates, ${duplicatesRemoved} duplicate documents removed`);
        return { duplicatesFound, duplicatesRemoved };
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        return { duplicatesFound: 0, duplicatesRemoved: 0, error: error.message };
    }
};

// Main TMDB fetch function
export const fetchMovies = async ({ query }: { query: string }): Promise<Movie[]> => {
    console.log('fetchMovies called with query:', query);

    try {
        // Validate API key
        if (!process.env.EXPO_PUBLIC_MOVIE_API_KEY) {
            throw new Error('TMDB API key is missing from environment variables');
        }

        return await retryWithBackoff(async () => {
            const endpoint = query
                ? `${TMDB_CONFIG.BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
                : `${TMDB_CONFIG.BASE_URL}/discover/movie?sort_by=popularity.desc`;

            console.log('🎬 Fetching movies from:', endpoint);

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.log('Request timeout triggered');
            }, 15000); // 15 second timeout

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: TMDB_CONFIG.headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('TMDB API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });

                if (response.status === 401) {
                    throw new Error('Invalid TMDB Bearer token. Please check your Read Access Token.');
                } else if (response.status === 404) {
                    throw new Error('TMDB API endpoint not found. Check the URL.');
                } else if (response.status >= 500) {
                    throw new Error('TMDB server error. Please try again later.');
                }

                throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Movies data received:');
            console.log('- Total results:', data.total_results);
            console.log('- Results array length:', data.results?.length);
            console.log('- First movie:', data.results?.[0]?.title);

            return data.results || [];

        }, 3, 'FetchMovies');

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Request timeout - check your network connection');
            throw new Error('Request timeout - please check your network connection');
        }

        console.error('Error fetching movies:', error);
        throw error;
    }
};

// Test function to validate API connectivity
export const testTMDBConnection = async (): Promise<boolean> => {
    try {
        console.log('Testing TMDB API connection...');

        const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/configuration`,
            {
                method: 'GET',
                headers: TMDB_CONFIG.headers,
                signal: AbortSignal.timeout(10000)
            }
        );

        const success = response.ok;
        console.log('TMDB API Test:', success ? 'SUCCESS ✅' : `FAILED ❌ (${response.status})`);

        if (!success) {
            const errorText = await response.text();
            console.error('TMDB Test Error:', errorText);
        }

        return success;
    } catch (error) {
        console.error('TMDB Test FAILED ❌:', error.message);
        return false;
    }
};

// Test function for Appwrite connectivity
export const testAppwriteConnection = async (): Promise<boolean> => {
    try {
        console.log('Testing Appwrite connection...');

        const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
            Query.limit(1)
        ]);

        console.log('Appwrite Test: SUCCESS ✅');
        return true;
    } catch (error) {
        console.error('Appwrite Test FAILED ❌:', error.message);
        return false;
    }
};

// Combined connectivity test
export const testConnectivity = async () => {
    console.log('\n🔄 Running connectivity tests...\n');

    const [tmdbResult, appwriteResult] = await Promise.all([
        testTMDBConnection(),
        testAppwriteConnection()
    ]);

    console.log('\n📊 Connectivity Test Results:');
    console.log(`TMDB API: ${tmdbResult ? '✅ Connected' : '❌ Failed'}`);
    console.log(`Appwrite: ${appwriteResult ? '✅ Connected' : '❌ Failed'}`);

    return { tmdb: tmdbResult, appwrite: appwriteResult };
};


