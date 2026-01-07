import {View, Text, FlatList, Image, ActivityIndicator, Alert} from 'react-native'
import React, {useState, useEffect, useCallback, useRef} from 'react'
import {images} from "@/constants/images";
import MovieCard from "@/app/components/MovieCard";
import useFetch from "@/app/services/useFetch";
import {fetchMovies} from "@/app/services/appwrite"; // Fixed import - should be from appwrite, not api
import {icons} from "@/constants/icons";
import SearchBar1 from "@/app/components/SearchBar1";
import { updateSearchCount } from "../services/appwrite";

const Search = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasInitialLoad = useRef(false);

    // Fetch movies based on debounced query
    const {
        data: movies,
        loading,
        error,
        refetch
    } = useFetch(() => fetchMovies({
        query: debouncedQuery,
    }), true); // Always enable fetching

    // Debounce search query
    useEffect(() => {
        // Clear existing timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Set new timeout
        debounceTimeoutRef.current = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            setIsSearching(false);
        }, 500);

        // Set searching state immediately when user types
        if (searchQuery.trim() && searchQuery !== debouncedQuery) {
            setIsSearching(true);
        }

        // Cleanup function
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [searchQuery, debouncedQuery]);

    // Track search counts when movies are loaded and query exists
    useEffect(() => {
        const trackSearch = async () => {
            if (debouncedQuery.trim() && movies?.length > 0 && movies[0] && !loading) {
                try {
                    console.log('Tracking search for:', debouncedQuery, 'First movie:', movies[0].title);
                    await updateSearchCount(debouncedQuery, movies[0]);
                    console.log('Search tracked successfully');
                } catch (error) {
                    console.error('Failed to track search:', error);
                    // Don't show user-facing error for tracking failures
                }
            }
        };

        trackSearch();
    }, [movies, debouncedQuery, loading]);

    // Handle manual search submission
    const handleSearchSubmit = useCallback((query: string) => {
        const trimmedQuery = query.trim();
        if (trimmedQuery) {
            setSearchQuery(trimmedQuery);
            setDebouncedQuery(trimmedQuery);
            setIsSearching(false);
        }
    }, []);

    // Handle search input change
    const handleSearchChange = useCallback((text: string) => {
        setSearchQuery(text);
    }, []);

    // Retry function for error handling
    const handleRetry = useCallback(async () => {
        try {
            console.log('Retrying search...');
            await refetch();
        } catch (error) {
            console.error('Retry failed:', error);
            Alert.alert(
                'Search Error',
                'Failed to search movies. Please check your connection and try again.',
                [{ text: 'OK' }]
            );
        }
    }, [refetch]);

    // Clear search
    const handleClearSearch = useCallback(() => {
        setSearchQuery("");
        setDebouncedQuery("");
        setIsSearching(false);
    }, []);

    // Show loading state for both initial loading and searching
    const showLoading = loading || isSearching;

    // Determine what content to show
    const getHeaderTitle = () => {
        if (showLoading) return null;

        if (error) return null;

        if (debouncedQuery.trim()) {
            if (movies?.length > 0) {
                return (
                    <Text className="text-xl text-white font-bold px-5 mb-3">
                        Search Results for{` `}
                        <Text className="text-accent">"{debouncedQuery}"</Text>
                        {` `}({movies.length} found)
                    </Text>
                );
            } else {
                return (
                    <Text className="text-white text-center my-3 px-5">
                        No movies found for "{debouncedQuery}"
                        {error ? '. Please try again.' : ''}
                    </Text>
                );
            }
        } else if (movies?.length > 0) {
            return (
                <Text className="text-xl text-white font-bold px-5 mb-3">
                    Popular Movies ({movies.length})
                </Text>
            );
        }

        return null;
    };

    const renderError = () => {
        if (!error) return null;

        return (
            <View className="px-5 my-3">
                <Text className="text-red-400 text-center text-lg font-semibold mb-2">
                    Search Error
                </Text>
                <Text className="text-white text-center mb-4">
                    {error.message || 'Failed to search movies. Please check your connection.'}
                </Text>
                <Text
                    className="text-blue-400 text-center underline"
                    onPress={handleRetry}
                >
                    Tap to retry
                </Text>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-primary">
            <Image
                source={images.bg}
                className="flex-1 absolute w-full z-0"
                resizeMode="cover"
            />
            <FlatList
                data={movies || []}
                renderItem={({ item }) => <MovieCard {...item} />}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                className="px-5"
                numColumns={3}
                columnWrapperStyle={{
                    justifyContent: 'center',
                    gap: 16,
                    marginVertical: 16
                }}
                contentContainerStyle={{
                    paddingBottom: 100,
                    flexGrow: 1
                }}
                ListEmptyComponent={
                    !showLoading && !error && debouncedQuery.trim() ? (
                        <View className="flex-1 justify-center items-center py-20">
                            <Text className="text-white text-center text-lg">
                                No movies found for "{debouncedQuery}"
                            </Text>
                            <Text className="text-gray-400 text-center mt-2">
                                Try a different search term
                            </Text>
                        </View>
                    ) : !showLoading && !error && !debouncedQuery.trim() && (!movies || movies.length === 0) ? (
                        <View className="flex-1 justify-center items-center py-20">
                            <Text className="text-white text-center text-lg">
                                Start typing to search for movies
                            </Text>
                        </View>
                    ) : null
                }
                ListHeaderComponent={
                    <>
                        <View className="w-full flex-row justify-center mt-20 items-center">
                            <Image source={icons.logo} className="w-12 h-10" />
                        </View>

                        <View className="my-5">
                            <SearchBar1
                                placeholder="Search movies..."
                                value={searchQuery}
                                onChangeText={handleSearchChange}
                                onSubmitEditing={handleSearchSubmit}
                                autoFocus={false}
                            />
                        </View>

                        {/* Loading State */}
                        {showLoading && (
                            <View className="my-5">
                                <ActivityIndicator
                                    size="large"
                                    color="#ab8ff8"
                                    className="self-center"
                                />
                                <Text className="text-white text-center mt-2">
                                    {isSearching ? 'Searching...' : 'Loading movies...'}
                                </Text>
                            </View>
                        )}

                        {/* Error State */}
                        {error && renderError()}

                        {/* Header Title */}
                        {getHeaderTitle()}
                    </>
                }
            />
        </View>
    )
}

export default Search;


