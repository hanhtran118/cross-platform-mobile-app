import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Link } from 'expo-router';
import { icons } from '@/constants/icons';
import { useState, useEffect } from 'react';
import { saveMovie, unsaveMovie, isMovieSaved } from '@/app/(tabs)/saved';

interface TMDBMovie {
    id: number;
    poster_path?: string;
    title: string;
    vote_average?: number;
    release_date?: string;
}

interface TrendingMovie {
    movie_id: number;
    poster_url: string;
    title: string;
    searchTerm: string;
    count: number;
    $id?: string;
}

type MovieCardProps = TMDBMovie | TrendingMovie;

// Type guard to check if it's a trending movie
const isTrendingMovie = (movie: MovieCardProps): movie is TrendingMovie => {
    return 'movie_id' in movie && 'searchTerm' in movie;
};

const MovieCard = (movie: MovieCardProps) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [savingState, setSavingState] = useState(false);

    // Extract data based on movie type
    const movieId = isTrendingMovie(movie) ? movie.movie_id : movie.id;

    // For trending movies, show the actual movie title, not the search term
    const title = isTrendingMovie(movie) ? movie.title : movie.title;

    // Check if movie is saved when component mounts
    useEffect(() => {
        checkSavedStatus();
    }, []);

    const checkSavedStatus = async () => {
        try {
            const saved = await isMovieSaved(movieId);
            setIsSaved(saved);
        } catch (error) {
            console.error('Error checking saved status:', error);
        }
    };

    // Handle save/unsave functionality
    const handleSaveToggle = async (e: any) => {
        e.preventDefault(); // Prevent navigation when save button is pressed
        e.stopPropagation(); // Stop event bubbling

        if (savingState) return; // Prevent multiple clicks

        setSavingState(true);

        try {
            if (isSaved) {
                // Unsave movie
                await unsaveMovie(movieId);
                setIsSaved(false);
            } else {
                // Save movie
                const movieData = {
                    id: movieId,
                    title: title,
                    poster_path: isTrendingMovie(movie) ? null : movie.poster_path,
                    release_date: isTrendingMovie(movie) ? null : movie.release_date,
                    vote_average: isTrendingMovie(movie) ? null : movie.vote_average,
                    genre: null // You can add genre detection logic here
                };

                // For trending movies, we need to construct the poster_path from poster_url
                if (isTrendingMovie(movie) && movie.poster_url) {
                    // Extract the poster_path from the full URL
                    const urlParts = movie.poster_url.split('/');
                    const posterPath = urlParts[urlParts.length - 1];
                    movieData.poster_path = `/${posterPath}`;
                }

                await saveMovie(movieData);
                setIsSaved(true);
            }
        } catch (error) {
            console.error('Error saving/unsaving movie:', error);
            Alert.alert(
                'Error',
                isSaved ? 'Failed to remove from saved movies' : 'Failed to save movie',
                [{ text: 'OK' }]
            );
        } finally {
            setSavingState(false);
        }
    };

    // Handle poster URL with better fallback logic
    const getPosterUrl = () => {
        if (isTrendingMovie(movie)) {
            // Use poster_url from trending movie, fallback to placeholder if invalid
            return movie.poster_url && movie.poster_url !== 'https://placehold.co/500x750/1a1a1a/ffffff.png'
                ? movie.poster_url
                : 'https://placehold.co/600x900/2a2a2a/ffffff?text=No+Image';
        } else {
            // Build TMDB poster URL or use placeholder
            return movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : 'https://placehold.co/600x900/2a2a2a/ffffff?text=No+Image';
        }
    };

    const posterUrl = getPosterUrl();
    const rating = isTrendingMovie(movie) ? null : movie.vote_average;
    const year = isTrendingMovie(movie) ? null : movie.release_date?.split('-')[0];

    // Handle image load events
    const handleImageLoad = () => {
        setImageLoading(false);
        setImageError(false);
    };

    const handleImageError = () => {
        setImageLoading(false);
        setImageError(true);
    };

    // Format rating to show stars out of 5 instead of 10
    const formatRating = (rating: number) => {
        return Math.round(rating * 10) / 20; // Convert 10-point scale to 5-point scale with 1 decimal
    };

    return (
        <View className="w-[30%] mb-4">
            <Link href={`/movies/${movieId}`} asChild>
                <TouchableOpacity activeOpacity={0.7}>
                    {/* Poster Image with Loading State */}
                    <View className="relative w-full h-52 rounded-lg overflow-hidden bg-dark-200">
                        <Image
                            source={{ uri: posterUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                        />

                        {/* Loading indicator */}
                        {imageLoading && (
                            <View className="absolute inset-0 justify-center items-center bg-dark-200">
                                <ActivityIndicator size="small" color="#ab8ff8" />
                            </View>
                        )}

                        {/* Error state */}
                        {imageError && (
                            <View className="absolute inset-0 justify-center items-center bg-dark-200">
                                <Image
                                    source={icons.image || icons.film}
                                    className="size-8 opacity-50"
                                    tintColor="#6b7280"
                                />
                                <Text className="text-gray-400 text-xs mt-1">No Image</Text>
                            </View>
                        )}

                        {/* Save Button */}
                        <TouchableOpacity
                            onPress={handleSaveToggle}
                            className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/50 justify-center items-center"
                            disabled={savingState}
                        >
                            {savingState ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Image
                                    source={icons.save}
                                    className="size-5"
                                    tintColor={isSaved ? "#ab8ff8" : "#fff"}
                                />
                            )}
                        </TouchableOpacity>

                        {/* Trending Badge */}
                        {isTrendingMovie(movie) && (
                            <View className="absolute top-2 right-2 bg-accent rounded-full px-2 py-1">
                                <Text className="text-white text-xs font-bold">
                                    #{movie.count}
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Link>

            {/* Movie Title */}
            <Text
                className="text-sm font-bold text-white mt-2 leading-4"
                numberOfLines={2}
                style={{ minHeight: 32 }}
            >
                {title}
            </Text>

            {/* Rating for TMDB movies */}
            {rating && rating > 0 && (
                <View className="flex-row items-center justify-start gap-x-1 mt-1">
                    <Image
                        source={icons.star}
                        className="size-4"
                        tintColor="#fbbf24"
                    />
                    <Text className="text-white text-xs font-bold">
                        {formatRating(rating).toFixed(1)}
                    </Text>
                </View>
            )}

            {/* Additional Info */}
            <View className="flex-row items-center justify-between mt-1">
                <Text className="text-xs text-light-300 font-medium">
                    {isTrendingMovie(movie)
                        ? `${movie.count} search${movie.count !== 1 ? 'es' : ''}`
                        : year || 'N/A'
                    }
                </Text>

                {/* Show search term for trending movies */}
                {isTrendingMovie(movie) && movie.searchTerm !== movie.title && (
                    <Text className="text-xs text-accent font-medium" numberOfLines={1}>
                        "{movie.searchTerm}"
                    </Text>
                )}
            </View>
        </View>
    );
};

export default MovieCard;