import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    Alert,
    Switch,
    ActivityIndicator,
    Share
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Client, Databases, Query } from 'react-native-appwrite';

// Use your existing environment variables
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;
const SAVED_MOVIES_COLLECTION_ID = process.env.EXPO_PUBLIC_SAVED_MOVIES_COLLECTION_ID!;

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

const databases = new Databases(client);

interface UserStats {
    totalSearches: number;
    savedMovies: number;
    watchedMovies: number;
    favoriteGenre: string;
    totalWatchTime: number; // in minutes
    joinedDate: string;
}

const Profile = () => {
    const router = useRouter();
    const [userStats, setUserStats] = useState<UserStats>({
        totalSearches: 0,
        savedMovies: 0,
        watchedMovies: 0,
        favoriteGenre: "Action",
        totalWatchTime: 0,
        joinedDate: new Date().toISOString()
    });
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(true);
    const [notifications, setNotifications] = useState(true);
    const [autoPlay, setAutoPlay] = useState(false);

    // Mock user data - replace with actual user management
    const userData = {
        name: "Movie Enthusiast",
        email: "user@movieapp.com",
        avatar: null,
        memberSince: "2024"
    };

    // Load user statistics
    const loadUserStats = async () => {
        try {
            setLoading(true);

            // Get trending movies data for search stats
            const trendingResult = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
                Query.limit(100)
            ]);

            const totalSearches = trendingResult.documents.reduce((sum, doc) => sum + (doc.count || 0), 0);

            // Get saved movies data
            const savedResult = await databases.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
                Query.limit(100)
            ]);

            const savedMovies = savedResult.documents.length;
            const watchedMovies = savedResult.documents.filter(doc => doc.watched).length;

            // Calculate estimated watch time (assume 120 minutes per movie)
            const totalWatchTime = watchedMovies * 120;

            // Find most common genre (mock data)
            const genres = ["Action", "Comedy", "Drama", "Sci-Fi", "Horror", "Romance"];
            const favoriteGenre = genres[Math.floor(Math.random() * genres.length)];

            setUserStats({
                totalSearches,
                savedMovies,
                watchedMovies,
                favoriteGenre,
                totalWatchTime,
                joinedDate: "2024-01-01T00:00:00Z"
            });

        } catch (error) {
            console.error('Error loading user stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUserStats();
    }, []);

    // Format watch time
    const formatWatchTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m`;
        }
    };

    // Settings actions
    const clearCache = () => {
        Alert.alert(
            "Clear Cache",
            "This will clear all cached movie data. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: () => {
                        // Implement cache clearing logic
                        Alert.alert("Success", "Cache cleared successfully!");
                    }
                }
            ]
        );
    };

    const exportData = async () => {
        try {
            const exportData = {
                userStats,
                exportDate: new Date().toISOString(),
                version: "1.0"
            };

            await Share.share({
                message: `My Movie App Stats:\n\n` +
                    `🎬 Movies Searched: ${userStats.totalSearches}\n` +
                    `💾 Movies Saved: ${userStats.savedMovies}\n` +
                    `✅ Movies Watched: ${userStats.watchedMovies}\n` +
                    `🎭 Favorite Genre: ${userStats.favoriteGenre}\n` +
                    `⏱️ Total Watch Time: ${formatWatchTime(userStats.totalWatchTime)}\n\n` +
                    `Downloaded from Movie App`,
                title: "My Movie Stats"
            });
        } catch (error) {
            console.error('Error sharing data:', error);
        }
    };

    const resetStats = () => {
        Alert.alert(
            "Reset Statistics",
            "This will reset all your movie statistics. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: () => {
                        setUserStats({
                            totalSearches: 0,
                            savedMovies: 0,
                            watchedMovies: 0,
                            favoriteGenre: "Action",
                            totalWatchTime: 0,
                            joinedDate: new Date().toISOString()
                        });
                        Alert.alert("Success", "Statistics reset successfully!");
                    }
                }
            ]
        );
    };

    // Render stat card
    const StatCard = ({ title, value, subtitle, icon }: {
        title: string;
        value: string;
        subtitle?: string;
        icon: any;
    }) => (
        <View className="bg-dark-100 rounded-lg p-4 flex-1 mx-1">
            <View className="flex-row items-center justify-between mb-2">
                <Image source={icon} className="size-6" tintColor="#ab8ff8" />
            </View>
            <Text className="text-white text-2xl font-bold">{value}</Text>
            <Text className="text-gray-400 text-sm">{title}</Text>
            {subtitle && (
                <Text className="text-gray-500 text-xs mt-1">{subtitle}</Text>
            )}
        </View>
    );

    // Render setting row
    const SettingRow = ({ title, subtitle, rightContent, onPress }: {
        title: string;
        subtitle?: string;
        rightContent: React.ReactNode;
        onPress?: () => void;
    }) => (
        <TouchableOpacity
            className="flex-row items-center justify-between py-4 px-1"
            onPress={onPress}
            disabled={!onPress}
        >
            <View className="flex-1">
                <Text className="text-white text-base font-medium">{title}</Text>
                {subtitle && (
                    <Text className="text-gray-400 text-sm mt-1">{subtitle}</Text>
                )}
            </View>
            {rightContent}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView className="bg-primary flex-1 justify-center items-center">
                <Image source={images.bg} className="absolute w-full h-full" />
                <ActivityIndicator size="large" color="#ab8ff8" />
                <Text className="text-white mt-4">Loading profile...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="bg-primary flex-1">
            <Image source={images.bg} className="absolute w-full h-full" />

            <ScrollView
                className="flex-1 px-5"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Header */}
                <View className="flex-row justify-between items-center mt-5 mb-6">
                    <Text className="text-white text-2xl font-bold">Profile</Text>
                    <TouchableOpacity
                        className="bg-dark-100 p-2 rounded-full"
                        onPress={() => Alert.alert("Settings", "More settings coming soon!")}
                    >
                        <Image source={icons.settings || icons.gear} className="size-6" tintColor="#ab8ff8" />
                    </TouchableOpacity>
                </View>

                {/* User Info */}
                <View className="bg-dark-100 rounded-lg p-6 mb-6">
                    <View className="flex-row items-center">
                        <View className="w-16 h-16 bg-accent rounded-full justify-center items-center">
                            <Image source={icons.person} className="size-8" tintColor="#fff" />
                        </View>
                        <View className="ml-4 flex-1">
                            <Text className="text-white text-xl font-bold">{userData.name}</Text>
                            <Text className="text-gray-400 text-sm">{userData.email}</Text>
                            <Text className="text-gray-500 text-xs mt-1">
                                Member since {userData.memberSince}
                            </Text>
                        </View>
                        <TouchableOpacity
                            className="bg-accent px-4 py-2 rounded-lg"
                            onPress={() => Alert.alert("Edit Profile", "Profile editing coming soon!")}
                        >
                            <Text className="text-white text-sm font-semibold">Edit</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Statistics */}
                <View className="mb-6">
                    <Text className="text-white text-lg font-bold mb-4">Your Movie Stats</Text>

                    <View className="flex-row mb-3">
                        <StatCard
                            title="Total Searches"
                            value={userStats.totalSearches.toString()}
                            subtitle="All time"
                            icon={icons.search}
                        />
                        <StatCard
                            title="Saved Movies"
                            value={userStats.savedMovies.toString()}
                            subtitle="In your collection"
                            icon={icons.save}
                        />
                    </View>

                    <View className="flex-row mb-3">
                        <StatCard
                            title="Movies Watched"
                            value={userStats.watchedMovies.toString()}
                            subtitle="Completed"
                            icon={icons.check || icons.star}
                        />
                        <StatCard
                            title="Watch Time"
                            value={formatWatchTime(userStats.totalWatchTime)}
                            subtitle="Total estimated"
                            icon={icons.clock || icons.time}
                        />
                    </View>

                    <View className="bg-dark-100 rounded-lg p-4">
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-white text-base font-medium">Favorite Genre</Text>
                                <Text className="text-gray-400 text-sm">Most watched category</Text>
                            </View>
                            <View className="bg-accent px-3 py-1 rounded-full">
                                <Text className="text-white text-sm font-semibold">{userStats.favoriteGenre}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <View className="mb-6">
                    <Text className="text-white text-lg font-bold mb-4">Quick Actions</Text>
                    <View className="bg-dark-100 rounded-lg p-4">
                        <TouchableOpacity
                            className="flex-row items-center justify-between py-3"
                            onPress={() => router.push('/saved')}
                        >
                            <View className="flex-row items-center">
                                <Image source={icons.save} className="size-5 mr-3" tintColor="#ab8ff8" />
                                <Text className="text-white text-base">View Saved Movies</Text>
                            </View>
                            <Image source={icons.arrow} className="size-4" tintColor="#6b7280" />
                        </TouchableOpacity>

                        <View className="border-t border-gray-700 my-2" />

                        <TouchableOpacity
                            className="flex-row items-center justify-between py-3"
                            onPress={() => router.push('/search')}
                        >
                            <View className="flex-row items-center">
                                <Image source={icons.search} className="size-5 mr-3" tintColor="#ab8ff8" />
                                <Text className="text-white text-base">Search Movies</Text>
                            </View>
                            <Image source={icons.arrow} className="size-4" tintColor="#6b7280" />
                        </TouchableOpacity>

                        <View className="border-t border-gray-700 my-2" />

                        <TouchableOpacity
                            className="flex-row items-center justify-between py-3"
                            onPress={exportData}
                        >
                            <View className="flex-row items-center">
                                <Image source={icons.download || icons.share} className="size-5 mr-3" tintColor="#ab8ff8" />
                                <Text className="text-white text-base">Export My Data</Text>
                            </View>
                            <Image source={icons.arrow} className="size-4" tintColor="#6b7280" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Settings */}
                <View className="mb-6">
                    <Text className="text-white text-lg font-bold mb-4">Settings</Text>
                    <View className="bg-dark-100 rounded-lg p-4">
                        <SettingRow
                            title="Dark Mode"
                            subtitle="Use dark theme"
                            rightContent={
                                <Switch
                                    value={darkMode}
                                    onValueChange={setDarkMode}
                                    trackColor={{ false: '#374151', true: '#ab8ff8' }}
                                    thumbColor={darkMode ? '#ffffff' : '#f3f4f6'}
                                />
                            }
                        />

                        <View className="border-t border-gray-700 my-2" />

                        <SettingRow
                            title="Notifications"
                            subtitle="Get updates about new movies"
                            rightContent={
                                <Switch
                                    value={notifications}
                                    onValueChange={setNotifications}
                                    trackColor={{ false: '#374151', true: '#ab8ff8' }}
                                    thumbColor={notifications ? '#ffffff' : '#f3f4f6'}
                                />
                            }
                        />

                        <View className="border-t border-gray-700 my-2" />

                        <SettingRow
                            title="Auto-play Trailers"
                            subtitle="Automatically play movie trailers"
                            rightContent={
                                <Switch
                                    value={autoPlay}
                                    onValueChange={setAutoPlay}
                                    trackColor={{ false: '#374151', true: '#ab8ff8' }}
                                    thumbColor={autoPlay ? '#ffffff' : '#f3f4f6'}
                                />
                            }
                        />
                    </View>
                </View>

                {/* Data Management */}
                <View className="mb-6">
                    <Text className="text-white text-lg font-bold mb-4">Data Management</Text>
                    <View className="bg-dark-100 rounded-lg p-4">
                        <TouchableOpacity
                            className="flex-row items-center justify-between py-3"
                            onPress={clearCache}
                        >
                            <View className="flex-row items-center">
                                <Image source={icons.refresh || icons.reload} className="size-5 mr-3" tintColor="#fbbf24" />
                                <View>
                                    <Text className="text-white text-base">Clear Cache</Text>
                                    <Text className="text-gray-400 text-sm">Free up storage space</Text>
                                </View>
                            </View>
                            <Image source={icons.arrow} className="size-4" tintColor="#6b7280" />
                        </TouchableOpacity>

                        <View className="border-t border-gray-700 my-2" />

                        <TouchableOpacity
                            className="flex-row items-center justify-between py-3"
                            onPress={resetStats}
                        >
                            <View className="flex-row items-center">
                                <Image source={icons.trash || icons.delete} className="size-5 mr-3" tintColor="#ef4444" />
                                <View>
                                    <Text className="text-white text-base">Reset Statistics</Text>
                                    <Text className="text-gray-400 text-sm">Clear all movie stats</Text>
                                </View>
                            </View>
                            <Image source={icons.arrow} className="size-4" tintColor="#6b7280" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* About */}
                <View className="mb-6">
                    <Text className="text-white text-lg font-bold mb-4">About</Text>
                    <View className="bg-dark-100 rounded-lg p-4">
                        <TouchableOpacity
                            className="flex-row items-center justify-between py-3"
                            onPress={() => Alert.alert("Privacy Policy", "Privacy policy details coming soon!")}
                        >
                            <View className="flex-row items-center">
                                <Image source={icons.shield || icons.lock} className="size-5 mr-3" tintColor="#6b7280" />
                                <Text className="text-white text-base">Privacy Policy</Text>
                            </View>
                            <Image source={icons.arrow} className="size-4" tintColor="#6b7280" />
                        </TouchableOpacity>

                        <View className="border-t border-gray-700 my-2" />

                        <TouchableOpacity
                            className="flex-row items-center justify-between py-3"
                            onPress={() => Alert.alert("Terms of Service", "Terms of service details coming soon!")}
                        >
                            <View className="flex-row items-center">
                                <Image source={icons.document || icons.file} className="size-5 mr-3" tintColor="#6b7280" />
                                <Text className="text-white text-base">Terms of Service</Text>
                            </View>
                            <Image source={icons.arrow} className="size-4" tintColor="#6b7280" />
                        </TouchableOpacity>

                        <View className="border-t border-gray-700 my-2" />

                        <View className="flex-row items-center justify-between py-3">
                            <View className="flex-row items-center">
                                <Image source={icons.info || icons.help} className="size-5 mr-3" tintColor="#6b7280" />
                                <Text className="text-white text-base">App Version</Text>
                            </View>
                            <Text className="text-gray-400 text-sm">1.0.0</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Profile;