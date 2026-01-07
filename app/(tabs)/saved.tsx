import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { View, Text, Image, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useCallback } from "react";
import { Link } from "expo-router";
import { Client, Databases, Query } from 'react-native-appwrite';

// Use your existing environment variables
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const SAVED_MOVIES_COLLECTION_ID = process.env.EXPO_PUBLIC_SAVED_MOVIES_COLLECTION_ID!;

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

const databases = new Databases(client);

// Saved movie interface matching your data structure
interface SavedMovie {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    movie_id: number;
    title: string;
    poster_url: string;
    release_date?: string;
    vote_average?: number;
    savedAt: string;
    watched: boolean;
    notes?: string;
    genre?: string;
}

// Add movie to saved list
export const saveMovie = async (movie: {
    id: number;
    title: string;
    poster_path?: string;
    release_date?: string;
    vote_average?: number;
    genre?: string;
}) => {
    try {
        // Check if movie is already saved
        const existingMovie = await databases.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('movie_id', movie.id)
        ]);

        if (existingMovie.documents.length > 0) {
            throw new Error('Movie is already saved');
        }

        // Create new saved movie document
        const savedMovie = await databases.createDocument(
            DATABASE_ID,
            SAVED_MOVIES_COLLECTION_ID,
            'unique()',
            {
                movie_id: movie.id,
                title: movie.title,
                poster_url: movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : 'https://placehold.co/600x900/2a2a2a/ffffff?text=No+Image',
                release_date: movie.release_date || null,
                vote_average: movie.vote_average || null,
                savedAt: new Date().toISOString(),
                watched: false,
                genre: movie.genre || null
            }
        );

        return savedMovie;
    } catch (error) {
        console.error('Error saving movie:', error);
        throw error;
    }
};

// Remove movie from saved list
export const unsaveMovie = async (movieId: number) => {
    try {
        const savedMovie = await databases.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('movie_id', movieId)
        ]);

        if (savedMovie.documents.length > 0) {
            await databases.deleteDocument(
                DATABASE_ID,
                SAVED_MOVIES_COLLECTION_ID,
                savedMovie.documents[0].$id
            );
        }
    } catch (error) {
        console.error('Error unsaving movie:', error);
        throw error;
    }
};

// Check if movie is saved
export const isMovieSaved = async (movieId: number): Promise<boolean> => {
    try {
        const result = await databases.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('movie_id', movieId)
        ]);
        return result.documents.length > 0;
    } catch (error) {
        console.error('Error checking saved movie:', error);
        return false;
    }
};

// Get all saved movies
export const getSavedMovies = async (): Promise<SavedMovie[]> => {
    try {
        const result = await databases.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.orderDesc('$createdAt'),
            Query.limit(100)
        ]);
        return result.documents as SavedMovie[];
    } catch (error) {
        console.error('Error fetching saved movies:', error);
        return [];
    }
};

// Toggle watched status
export const toggleWatchedStatus = async (savedMovieId: string, watched: boolean) => {
    try {
        await databases.updateDocument(
            DATABASE_ID,
            SAVED_MOVIES_COLLECTION_ID,
            savedMovieId,
            { watched }
        );
    } catch (error) {
        console.error('Error updating watched status:', error);
        throw error;
    }
};

const Save = () => {
    const [savedMovies, setSavedMovies] = useState<SavedMovie[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterBy, setFilterBy] = useState<'all' | 'watched' | 'unwatched'>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'title' | 'rating'>('recent');
    const [refreshing, setRefreshing] = useState(false);

    // Load saved movies from Appwrite
    const loadSavedMovies = useCallback(async () => {
        try {
            setLoading(true);
            const movies = await getSavedMovies();
            setSavedMovies(movies);
        } catch (error) {
            console.error('Error loading saved movies:', error);
            Alert.alert('Error', 'Failed to load saved movies. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Refresh saved movies
    const refreshSavedMovies = useCallback(async () => {
        try {
            setRefreshing(true);
            const movies = await getSavedMovies();
            setSavedMovies(movies);
        } catch (error) {
            console.error('Error refreshing saved movies:', error);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadSavedMovies();
    }, [loadSavedMovies]);

    // Filter and sort movies
    const filteredAndSortedMovies = savedMovies
        .filter(movie => {
            const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filterBy === 'all' ||
                (filterBy === 'watched' && movie.watched) ||
                (filterBy === 'unwatched' && !movie.watched);
            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'rating':
                    return (b.vote_average || 0) - (a.vote_average || 0);
                case 'recent':
                default:
                    return new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime();
            }
        });

    // Remove movie from saved list
    const removeMovie = (movieId: number, title: string) => {
        Alert.alert(
            "Remove Movie",
            `Are you sure you want to remove "${title}" from your saved list?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await unsaveMovie(movieId);
                            setSavedMovies(prev => prev.filter(movie => movie.movie_id !== movieId));
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove movie. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    // Toggle watched status
    const toggleWatched = async (movieId: string, currentWatched: boolean) => {
        try {
            const newWatchedStatus = !currentWatched;
            await toggleWatchedStatus(movieId, newWatchedStatus);
            setSavedMovies(prev =>
                prev.map(movie =>
                    movie.$id === movieId
                        ? { ...movie, watched: newWatchedStatus }
                        : movie
                )
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to update watched status. Please try again.');
        }
    };

    // Clear all saved movies
    const clearAllMovies = () => {
        Alert.alert(
            "Clear All Movies",
            "Are you sure you want to remove all saved movies? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Delete all saved movies
                            const deletePromises = savedMovies.map(movie =>
                                databases.deleteDocument(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, movie.$id)
                            );
                            await Promise.all(deletePromises);
                            setSavedMovies([]);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to clear all movies. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    // Render individual movie card
    const renderMovieCard = ({ item }: { item: SavedMovie }) => {
        return (
            <View className="bg-dark-100 rounded-lg p-3 mb-3 flex-row">
                <Link href={`/movies/${item.movie_id}`} asChild>
                    <TouchableOpacity className="flex-row flex-1">
                        <Image
                            source={{ uri: item.poster_url }}
                            className="w-16 h-24 rounded-lg"
                            resizeMode="cover"
                        />

                        <View className="flex-1 ml-3 justify-between">
                            <View>
                                <Text className="text-white font-bold text-base" numberOfLines={2}>
                                    {item.title}
                                </Text>

                                <View className="flex-row items-center mt-1">
                                    <Text className="text-gray-400 text-sm">
                                        {item.release_date?.split('-')[0] || 'N/A'}
                                    </Text>
                                    {item.genre && (
                                        <>
                                            <Text className="text-gray-400 text-sm mx-2">•</Text>
                                            <Text className="text-gray-400 text-sm">{item.genre}</Text>
                                        </>
                                    )}
                                </View>

                                {item.vote_average && (
                                    <View className="flex-row items-center mt-1">
                                        <Image source={icons.star} className="size-4" tintColor="#fbbf24" />
                                        <Text className="text-white text-sm ml-1">
                                            {item.vote_average.toFixed(1)}/10
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <Text className="text-gray-500 text-xs mt-1">
                                Saved {new Date(item.$createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </Link>

                <View className="justify-between items-center ml-2">
                    <TouchableOpacity
                        onPress={() => toggleWatched(item.$id, item.watched)}
                        className={`p-2 rounded-full ${item.watched ? 'bg-green-600' : 'bg-gray-600'}`}
                    >
                        <Image
                            source={item.watched ? icons.check || icons.star : icons.clock || icons.time}
                            className="size-4"
                            tintColor="#fff"
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => removeMovie(item.movie_id, item.title)}
                        className="p-2 rounded-full bg-red-600 mt-2"
                    >
                        <Image source={icons.trash || icons.delete} className="size-4" tintColor="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Empty state
    const renderEmptyState = () => (
        <View className="flex-1 justify-center items-center py-20">
            <Image source={icons.save} className="size-16 mb-4" tintColor="#6b7280" />
            <Text className="text-white text-xl font-bold mb-2">No Saved Movies</Text>
            <Text className="text-gray-400 text-center text-base mb-4">
                {searchQuery ?
                    `No movies found matching "${searchQuery}"` :
                    "Start saving movies to build your personal collection"
                }
            </Text>
            {searchQuery && (
                <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    className="bg-accent rounded-lg px-4 py-2"
                >
                    <Text className="text-white font-semibold">Clear Search</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView className="bg-primary flex-1 justify-center items-center">
                <Image source={images.bg} className="absolute w-full h-full" />
                <ActivityIndicator size="large" color="#ab8ff8" />
                <Text className="text-white mt-4">Loading saved movies...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="bg-primary flex-1">
            <Image source={images.bg} className="absolute w-full h-full" />

            <View className="flex-1 px-5">
                {/* Header */}
                <View className="flex-row justify-between items-center mt-12 mb-6">
                    <Text className="text-white text-2xl font-bold">Saved Movies</Text>
                    {savedMovies.length > 0 && (
                        <TouchableOpacity
                            onPress={clearAllMovies}
                            className="bg-red-600 rounded-lg px-3 py-1"
                        >
                            <Text className="text-white text-sm font-semibold">Clear All</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {savedMovies.length > 0 && (
                    <>
                        {/* Search Bar */}
                        <View className="bg-dark-100 rounded-lg flex-row items-center px-4 py-3 mb-4">
                            <Image source={icons.search} className="size-5 mr-3" tintColor="#6b7280" />
                            <TextInput
                                placeholder="Search saved movies..."
                                placeholderTextColor="#6b7280"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                className="flex-1 text-white text-base"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery("")}>
                                    <Image source={icons.close || icons.x} className="size-5" tintColor="#6b7280" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Filter and Sort Options */}
                        <View className="flex-row justify-between mb-4">
                            <View className="flex-row">
                                <TouchableOpacity
                                    onPress={() => setFilterBy('all')}
                                    className={`px-3 py-1 rounded-full mr-2 ${filterBy === 'all' ? 'bg-accent' : 'bg-dark-100'}`}
                                >
                                    <Text className={`text-sm ${filterBy === 'all' ? 'text-white' : 'text-gray-400'}`}>
                                        All ({savedMovies.length})
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setFilterBy('watched')}
                                    className={`px-3 py-1 rounded-full mr-2 ${filterBy === 'watched' ? 'bg-accent' : 'bg-dark-100'}`}
                                >
                                    <Text className={`text-sm ${filterBy === 'watched' ? 'text-white' : 'text-gray-400'}`}>
                                        Watched ({savedMovies.filter(m => m.watched).length})
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setFilterBy('unwatched')}
                                    className={`px-3 py-1 rounded-full ${filterBy === 'unwatched' ? 'bg-accent' : 'bg-dark-100'}`}
                                >
                                    <Text className={`text-sm ${filterBy === 'unwatched' ? 'text-white' : 'text-gray-400'}`}>
                                        To Watch ({savedMovies.filter(m => !m.watched).length})
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={() => {
                                    const sortOptions = ['recent', 'title', 'rating'] as const;
                                    const currentIndex = sortOptions.indexOf(sortBy);
                                    const nextIndex = (currentIndex + 1) % sortOptions.length;
                                    setSortBy(sortOptions[nextIndex]);
                                }}
                                className="bg-dark-100 px-3 py-1 rounded-full flex-row items-center"
                            >
                                <Image source={icons.filter || icons.sort} className="size-4 mr-1" tintColor="#6b7280" />
                                <Text className="text-gray-400 text-sm capitalize">{sortBy}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Results count */}
                        <Text className="text-gray-400 text-sm mb-3">
                            {filteredAndSortedMovies.length} movie{filteredAndSortedMovies.length !== 1 ? 's' : ''}
                            {searchQuery && ` matching "${searchQuery}"`}
                        </Text>
                    </>
                )}

                {/* Movies List */}
                <FlatList
                    data={filteredAndSortedMovies}
                    renderItem={renderMovieCard}
                    keyExtractor={(item) => item.$id}
                    ListEmptyComponent={renderEmptyState}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={refreshSavedMovies}
                            colors={["#ab8ff8"]}
                            tintColor="#ab8ff8"
                        />
                    }
                    contentContainerStyle={{
                        paddingBottom: 100,
                        flexGrow: 1
                    }}
                />
            </View>
        </SafeAreaView>
    );
};

export default Save;