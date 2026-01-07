import {ActivityIndicator, FlatList, Image, ScrollView, Text, View, Alert, TouchableOpacity} from 'react-native';
import {images} from "@/constants/images";
import {icons} from "@/constants/icons";
import SearchBar1 from "../components/SearchBar1";
import { useRouter } from "expo-router"
import useFetch from "@/app/services/useFetch";
import {fetchMovies, getTrendingMovies, testConnectivity, cleanupDuplicateMovies} from "@/app/services/appwrite";
import MovieCard from "@/app/components/MovieCard";
import { useEffect, useState } from 'react';
import TrendingCard from "@/app/components/TrendingCard";

export default function Index() {
    const router = useRouter();
    const [connectivityTested, setConnectivityTested] = useState(false);
    const [cleanupCompleted, setCleanupCompleted] = useState(false);

    // Run cleanup function
    const runCleanup = async () => {
        console.log('🧹 Starting cleanup...');
        try {
            const result = await cleanupDuplicateMovies();
            console.log('Cleanup completed:', result);

            if (result.duplicatesFound > 0) {
                Alert.alert(
                    'Cleanup Completed!',
                    `Removed ${result.duplicatesRemoved} duplicate entries from ${result.duplicatesFound} movies.`,
                    [{ text: 'OK', onPress: () => {
                            // Refresh trending movies after cleanup
                            refetchTrending();
                        }}]
                );
            } else {
                console.log('No duplicates found to clean up');
            }
            setCleanupCompleted(true);
        } catch (error) {
            console.error('Cleanup failed:', error);
            Alert.alert(
                'Cleanup Error',
                'Failed to clean up duplicate movies. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

    // Test connectivity and run cleanup on component mount
    useEffect(() => {
        const runInitialSetup = async () => {
            try {
                // Test connectivity first
                const results = await testConnectivity();
                setConnectivityTested(true);

                // Show alert if there are connectivity issues
                if (!results.tmdb && !results.appwrite) {
                    Alert.alert(
                        'Connection Error',
                        'Both TMDB and Appwrite services are unreachable. Please check your internet connection.',
                        [{ text: 'OK' }]
                    );
                } else if (!results.tmdb) {
                    Alert.alert(
                        'TMDB Service Error',
                        'Cannot connect to movie database. Some features may not work.',
                        [{ text: 'OK' }]
                    );
                } else if (!results.appwrite) {
                    Alert.alert(
                        'Trending Data Unavailable',
                        'Cannot connect to trending movies service.',
                        [{ text: 'OK' }]
                    );
                } else {
                    // Both services working, run cleanup
                    console.log('All services connected, running cleanup...');
                    await runCleanup();
                }
            } catch (error) {
                console.error('Initial setup failed:', error);
                setConnectivityTested(true);
            }
        };

        runInitialSetup();
    }, []);

    const {
        data: trendingMovies,
        loading: trendingLoading,
        error: trendingError,
        refetch: refetchTrending
    } = useFetch(getTrendingMovies);

    const {
        data: movies,
        loading: moviesLoading,
        error: moviesError,
        refetch: refetchMovies
    } = useFetch(() => fetchMovies({
        query: ''
    }));

    // Enhanced logging with better error handling
    useEffect(() => {
        if (trendingMovies && trendingMovies.length > 0) {
            console.log('Trending movie poster URLs:');
            trendingMovies.forEach((movie, index) => {
                const posterUrl = movie.poster_url ||
                    (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null);
                console.log(`${index}: ${posterUrl || 'No poster available'}`);
            });
        } else if (trendingMovies && trendingMovies.length === 0) {
            console.log('No trending movies found');
        }
    }, [trendingMovies]);

    useEffect(() => {
        if (movies && movies.length > 0) {
            console.log('Regular movie poster paths:');
            movies.slice(0, 3).forEach((movie, index) => {
                const posterPath = movie.poster_path ?
                    `https://image.tmdb.org/t/p/w500${movie.poster_path}` :
                    'No poster available';
                console.log(`${index}: ${posterPath}`);
            });
        } else if (movies && movies.length === 0) {
            console.log('No movies found');
        }
    }, [movies]);

    // Show loading while connectivity test and cleanup are running
    if (!connectivityTested) {
        return (
            <View className="flex-1 bg-primary justify-center items-center">
                <Image source={images.bg} className="absolute w-full z-0" />
                <ActivityIndicator size="large" color="#ab8ff8" />
                <Text className="text-white mt-4">Testing connectivity...</Text>
                <Text className="text-white mt-2 text-sm text-center px-8">
                    Checking TMDB and Appwrite connections
                </Text>
            </View>
        );
    }

    // Enhanced error handling
    const handleRetry = async () => {
        console.log('Retrying data fetch...');
        try {
            await Promise.all([
                refetchTrending?.(),
                refetchMovies?.()
            ]);
        } catch (error) {
            console.error('Retry failed:', error);
        }
    };

    const renderError = (error: Error | null) => {
        if (!error) return null;

        return (
            <View className="mt-10 px-4">
                <Text className="text-white text-center text-lg font-semibold mb-2">
                    Connection Error
                </Text>
                <Text className="text-white text-center mb-4">
                    {error.message || 'Failed to load data. Please check your internet connection.'}
                </Text>
                <TouchableOpacity
                    onPress={handleRetry}
                    className="bg-accent rounded-lg py-2 px-4 self-center"
                >
                    <Text className="text-white font-semibold">Tap to retry</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-primary">
            <Image source={images.bg} className="absolute w-full z-0" />
            <ScrollView
                className="flex-1 px-5"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    minHeight: "100%",
                    paddingBottom: 10
                }}
            >
                {/* Header with centered logo and positioned Clean DB button */}
                <View className="mt-20 mb-5 relative">
                    <Image source={icons.logo} className="w-12 h-10 mx-auto" />

                    {/* Clean DB button positioned in top-right */}
                    {!cleanupCompleted && (
                        <TouchableOpacity
                            onPress={runCleanup}
                            className="bg-accent/20 rounded-lg py-2 px-3 absolute top-0 right-0"
                        >
                            <Text className="text-accent text-xs font-semibold">
                                Clean DB
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Loading State */}
                {(moviesLoading || trendingLoading) && (
                    <View className="mt-10">
                        <ActivityIndicator
                            size="large"
                            color="#ab8ff8"
                            className="self-center"
                        />
                        <Text className="text-white text-center mt-4">
                            Loading movies...
                        </Text>
                    </View>
                )}

                {/* Error State */}
                {(moviesError || trendingError) && !moviesLoading && !trendingLoading &&
                    renderError(moviesError || trendingError)
                }

                {/* Success State */}
                {!moviesLoading && !trendingLoading && !moviesError && !trendingError && (
                    <View className="flex-1 mt-5">
                        <SearchBar1
                            onPress={() => router.push("/search")}
                            placeholder="Search for a movie"
                            editable={false}
                        />

                        {/* Trending Movies Section */}
                        {trendingMovies && trendingMovies.length > 0 && (
                            <View className="mt-10">
                                <View className="flex-row justify-between items-center mb-3">
                                    <Text className="text-lg text-white font-bold">
                                        Trending Movies ({trendingMovies.length})
                                    </Text>
                                    {cleanupCompleted && (
                                        <Text className="text-green-400 text-xs">
                                            ✓ Cleaned
                                        </Text>
                                    )}
                                </View>

                                <FlatList
                                    data={trendingMovies.slice(0, 6)}
                                    renderItem={({ item, index }) => (
                                        <TrendingCard
                                            movie={{
                                                ...item,
                                                searchTerm: item.lastSearchTerm || item.searchTerms?.[0] || ''
                                            }}
                                            index={index}
                                        />
                                    )}
                                    keyExtractor={(item) =>
                                        item.$id ||
                                        item.id?.toString() ||
                                        item.movie_id?.toString() ||
                                        Math.random().toString()
                                    }
                                    horizontal={true}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{
                                        paddingHorizontal: 20
                                    }}
                                    ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                                    className="mt-2"
                                />
                            </View>
                        )}

                        {/* No Trending Movies Message */}
                        {trendingMovies && trendingMovies.length === 0 && (
                            <View className="mt-10">
                                <Text className="text-gray-400 text-center">
                                    No trending movies yet. Start searching to see trends!
                                </Text>
                            </View>
                        )}

                        {/* Latest Movies Section - FIXED TypeScript issues */}
                        {movies && movies.length > 0 && (
                            <View className="mt-8">
                                <Text className="text-lg text-white font-bold mt-5 mb-3">
                                    Latest Movies ({movies.length})
                                </Text>
                                <FlatList
                                    data={movies}
                                    renderItem={({ item }) => (
                                        <MovieCard
                                            id={item.id}
                                            poster_path={item.poster_path}
                                            title={item.title}
                                            vote_average={item.vote_average}
                                            release_date={item.release_date}
                                        />
                                    )}
                                    keyExtractor={(item) =>
                                        item.id?.toString() || Math.random().toString()
                                    }
                                    numColumns={3}
                                    columnWrapperStyle={{
                                        justifyContent: "flex-start",
                                        gap: 20,
                                        paddingRight: 5,
                                        marginBottom: 10
                                    }}
                                    className="mt-2 pb-32"
                                    scrollEnabled={false}
                                />
                            </View>
                        )}

                        {/* No Movies Message */}
                        {movies && movies.length === 0 && (
                            <View className="mt-8">
                                <Text className="text-gray-400 text-center">
                                    No movies found. Please check your connection.
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};
