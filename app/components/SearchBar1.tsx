import {View, Text, Image, TextInput, TouchableOpacity, Keyboard} from 'react-native'
import React, {useRef, useState} from 'react'
import {icons} from "@/constants/icons";

interface Props {
    placeholder?: string;
    onPress?: () => void;
    value?: string;
    onChangeText?: (text: string) => void;
    onSubmitEditing?: (text: string) => void;
    editable?: boolean;
    autoFocus?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
}

const SearchBar1 = ({
                        placeholder = "Search...",
                        onPress,
                        value,
                        onChangeText,
                        onSubmitEditing,
                        editable = true,
                        autoFocus = false,
                        onFocus,
                        onBlur
                    }: Props) => {
    const inputRef = useRef<TextInput>(null);
    const [isFocused, setIsFocused] = useState(false);

    const handleContainerPress = () => {
        if (onPress) {
            // If onPress is provided, call it (for navigation to search screen)
            onPress();
        } else if (editable && inputRef.current) {
            // Otherwise, focus the input
            inputRef.current.focus();
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
        onFocus?.();
    };

    const handleBlur = () => {
        setIsFocused(false);
        onBlur?.();
    };

    const handleSubmit = () => {
        if (value && onSubmitEditing) {
            onSubmitEditing(value);
        }
        Keyboard.dismiss();
    };

    const handleClear = () => {
        onChangeText?.('');
        inputRef.current?.focus();
    };

    return (
        <TouchableOpacity
            onPress={handleContainerPress}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress && !editable}
        >
            <View className={`flex-row items-center bg-dark-200 rounded-full px-5 py-4 ${
                isFocused ? 'border border-purple-400' : ''
            }`}>
                <Image
                    source={icons.search}
                    className="size-5"
                    resizeMode="contain"
                    tintColor={isFocused ? "#ab8ff8" : "#6b7280"}
                />

                <TextInput
                    ref={inputRef}
                    placeholder={placeholder}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onSubmitEditing={handleSubmit}
                    editable={editable}
                    autoFocus={autoFocus}
                    returnKeyType="search"
                    keyboardType="default"
                    autoCorrect={false}
                    autoCapitalize="none"
                    placeholderTextColor="#a8b5db"
                    className="flex-1 ml-2 text-white text-base"
                    style={{
                        fontSize: 16, // Prevents zoom on iOS
                        outline: 'none' // Removes outline on web
                    }}
                />

                {/* Clear button - only show when there's text and input is editable */}
                {value && value.length > 0 && editable && (
                    <TouchableOpacity
                        onPress={handleClear}
                        className="ml-2 p-1"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Image
                            source={icons.close || icons.x} // Use close/x icon if available
                            className="size-4"
                            resizeMode="contain"
                            tintColor="#a8b5db"
                        />
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    )
}

export default SearchBar1;





// import {View, Text, Image, TextInput} from 'react-native'
// import {icons} from "@/constants/icons";
//
// interface Props {
//     placeholder: string;
//     onPress: () => void;
// }
//
// const SearchBar1 = ( {placeholder, onPress, value} ) => {
//     return (
//         <View className="flex-row items-center bg-dark-200 rounded-full px-5 py-4">
//             <Image
//                 source={icons.search}
//                 className="size-5"
//                 resizeMode="contain"
//                 tintColor="#ab8ff8"
//             />
//
//             <TextInput
//                 onPress={ onPress }
//                 placeholder={placeholder}
//                 value=""
//                 onChangeText={() => {}}
//                 placeholderTextColor="#a8b5db"
//                 className="flex-1 ml-2 text-white"
//             />
//         </View>
//     )
// }
//
// export default SearchBar1;