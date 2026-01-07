import {
    View,
    Text,
    Image,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { saveMovie, unsaveMovie, isMovieSaved } from '@/app/(tabs)/saved';

import { icons } from "@/constants/icons";
import useFetch from "@/app/services/useFetch";
import { fetchMovieDetails } from "@/app/services/api";

interface MovieInfoProps {
    label: string;
    value?: string | number | null;
}

const MovieInfo = ({ label, value }: MovieInfoProps) => (
    <View className="flex-col items-start justify-center mt-5">
        <Text className="text-light-200 font-normal text-sm">{label}</Text>
        <Text className="text-light-100 font-bold text-sm mt-2">
            {value || "N/A"}
        </Text>
    </View>
);

const Details = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [isSaved, setIsSaved] = useState(false);
    const [savingState, setSavingState] = useState(false);

    const { data: movie, loading } = useFetch(() =>
        fetchMovieDetails(id as string)
    );

    // Check if movie is saved when component mounts and when movie data loads
    useEffect(() => {
        if (movie?.id) {
            checkSavedStatus();
        }
    }, [movie?.id]);

    const checkSavedStatus = async () => {
        try {
            const saved = await isMovieSaved(movie.id);
            setIsSaved(saved);
        } catch (error) {
            console.error('Error checking saved status:', error);
        }
    };

    // Handle save/unsave functionality
    const handleSaveToggle = async () => {
        if (!movie || savingState) return;

        setSavingState(true);

        try {
            if (isSaved) {
                // Unsave movie
                await unsaveMovie(movie.id);
                setIsSaved(false);
                Alert.alert('Success', 'Movie removed from saved list');
            } else {
                // Save movie
                const movieData = {
                    id: movie.id,
                    title: movie.title,
                    poster_path: movie.poster_path,
                    release_date: movie.release_date,
                    vote_average: movie.vote_average,
                    genre: movie.genres?.[0]?.name || null // Use first genre if available
                };

                await saveMovie(movieData);
                setIsSaved(true);
                Alert.alert('Success', 'Movie saved to your collection');
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

    if (loading)
        return (
            <SafeAreaView className="bg-primary flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#ab8ff8" />
                <Text className="text-white mt-4">Loading movie details...</Text>
            </SafeAreaView>
        );

    return (
        <View className="bg-primary flex-1">
            <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
                <View className="relative">
                    <Image
                        source={{
                            uri: `https://image.tmdb.org/t/p/w500${movie?.poster_path}`,
                        }}
                        className="w-full h-[550px]"
                        resizeMode="stretch"
                    />

                    {/* Play Button */}
                    <TouchableOpacity className="absolute bottom-5 right-5 rounded-full size-14 bg-white flex items-center justify-center">
                        <Image
                            source={icons.play}
                            className="w-6 h-7 ml-1"
                            resizeMode="stretch"
                        />
                    </TouchableOpacity>

                    {/* Save Button */}
                    <TouchableOpacity
                        onPress={handleSaveToggle}
                        className="absolute top-12 right-5 w-12 h-12 rounded-full bg-black/50 flex items-center justify-center"
                        disabled={savingState}
                    >
                        {savingState ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Image
                                source={icons.save}
                                className="size-6"
                                tintColor={isSaved ? "#ab8ff8" : "#fff"}
                            />
                        )}
                    </TouchableOpacity>

                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={router.back}
                        className="absolute top-12 left-5 w-12 h-12 rounded-full bg-black/50 flex items-center justify-center"
                    >
                        <Image
                            source={icons.arrow}
                            className="size-6 rotate-180"
                            tintColor="#fff"
                        />
                    </TouchableOpacity>
                </View>

                <View className="flex-col items-start justify-center mt-5 px-5">
                    <View className="flex-row items-center justify-between w-full">
                        <Text className="text-white font-bold text-xl flex-1 mr-4">
                            {movie?.title}
                        </Text>

                        {/* Save Status Indicator */}
                        {isSaved && (
                            <View className="bg-accent/20 px-3 py-1 rounded-full">
                                <Text className="text-accent text-xs font-semibold">
                                    ✓ Saved
                                </Text>
                            </View>
                        )}
                    </View>

                    <View className="flex-row items-center gap-x-1 mt-2">
                        <Text className="text-light-200 text-sm">
                            {movie?.release_date?.split("-")[0]} •
                        </Text>
                        <Text className="text-light-200 text-sm">{movie?.runtime}m</Text>
                    </View>

                    <View className="flex-row items-center bg-dark-100 px-2 py-1 rounded-md gap-x-1 mt-2">
                        <Image source={icons.star} className="size-4" />

                        <Text className="text-white font-bold text-sm">
                            {Math.round(movie?.vote_average ?? 0)}/10
                        </Text>

                        <Text className="text-light-200 text-sm">
                            ({movie?.vote_count} votes)
                        </Text>
                    </View>

                    <MovieInfo label="Overview" value={movie?.overview} />
                    <MovieInfo
                        label="Genres"
                        value={movie?.genres?.map((g) => g.name).join(" • ") || "N/A"}
                    />

                    <View className="flex flex-row justify-between w-1/2">
                        <MovieInfo
                            label="Budget"
                            value={`$${(movie?.budget ?? 0) / 1_000_000} million`}
                        />
                        <MovieInfo
                            label="Revenue"
                            value={`$${Math.round(
                                (movie?.revenue ?? 0) / 1_000_000
                            )} million`}
                        />
                    </View>

                    <MovieInfo
                        label="Production Companies"
                        value={
                            movie?.production_companies?.map((c) => c.name).join(" • ") ||
                            "N/A"
                        }
                    />

                    {/* Save Button Alternative - Large CTA */}
                    <TouchableOpacity
                        onPress={handleSaveToggle}
                        className={`w-full mt-6 py-4 rounded-lg flex-row items-center justify-center ${
                            isSaved ? 'bg-green-600' : 'bg-accent'
                        }`}
                        disabled={savingState}
                    >
                        {savingState ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Image
                                    source={icons.save}
                                    className="size-5 mr-2"
                                    tintColor="#fff"
                                />
                                <Text className="text-white font-semibold text-base">
                                    {isSaved ? 'Remove from Saved' : 'Save to Collection'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Bottom Go Back Button */}
            <TouchableOpacity
                className="absolute bottom-5 left-0 right-0 mx-5 bg-dark-100 rounded-lg py-3.5 flex flex-row items-center justify-center z-50"
                onPress={router.back}
            >
                <Image
                    source={icons.arrow}
                    className="size-5 mr-1 mt-0.5 rotate-180"
                    tintColor="#fff"
                />
                <Text className="text-white font-semibold text-base">Go Back</Text>
            </TouchableOpacity>
        </View>
    );
};

export default Details;