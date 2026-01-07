import { Link } from "expo-router";
import MaskedView from "@react-native-masked-view/masked-view";
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { images } from "@/constants/images";
import { icons } from "@/constants/icons";
import { useState, useEffect } from "react";
import { saveMovie, unsaveMovie, isMovieSaved } from '@/app/(tabs)/saved';

const TrendingCard = ({
                          movie,
                          index,
                      }: TrendingCardProps) => {
    const { movie_id, title, poster_url } = movie;
    const [isSaved, setIsSaved] = useState(false);
    const [savingState, setSavingState] = useState(false);

    // Check if movie is saved when component mounts
    useEffect(() => {
        checkSavedStatus();
    }, []);

    const checkSavedStatus = async () => {
        try {
            const saved = await isMovieSaved(movie_id);
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
                await unsaveMovie(movie_id);
                setIsSaved(false);
            } else {
                // Save movie - construct data from trending movie
                const movieData = {
                    id: movie_id,
                    title: title,
                    poster_path: extractPosterPath(poster_url),
                    release_date: movie.release_date || null,
                    vote_average: movie.vote_average || null,
                    genre: null // You can add genre detection logic here
                };

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

    // Extract poster_path from full poster_url
    const extractPosterPath = (posterUrl: string) => {
        if (!posterUrl) return null;

        // Extract the filename from the URL
        const urlParts = posterUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        return `/${filename}`;
    };

    return (
        <View className="w-32 relative">
            <Link href={`/movies/${movie_id}`} asChild>
                <TouchableOpacity className="w-32 relative">
                    <Image
                        source={{ uri: poster_url }}
                        className="w-32 h-48 rounded-lg"
                        resizeMode="cover"
                    />

                    {/* Ranking Number */}
                    <View className="absolute bottom-9 left-0 px-2 py-1 rounded-full">
                        <MaskedView
                            style={{ width: 56, height: 56 }}
                            maskElement={
                                <View style={{
                                    backgroundColor: 'transparent',
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                    <Text
                                        style={{
                                            fontSize: 48,
                                            fontWeight: 'bold',
                                            color: 'black',
                                        }}
                                    >
                                        {index + 1}
                                    </Text>
                                </View>
                            }
                        >
                            <Image
                                source={images.rankingGradient}
                                style={{ width: 56, height: 56 }}
                                resizeMode="cover"
                            />
                        </MaskedView>
                    </View>
                </TouchableOpacity>
            </Link>

            {/* Save Button - Outside the Link to prevent navigation conflicts */}
            <TouchableOpacity
                onPress={handleSaveToggle}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 justify-center items-center"
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

            {/* Movie Title */}
            <Text
                className="text-sm font-bold mt-2 text-white"
                numberOfLines={2}
            >
                {title}
            </Text>
        </View>
    );
};

export default TrendingCard;