import { View, Text, TextInput, TextInputProps } from "react-native";
import React from "react";

interface TextAreaProps extends TextInputProps {
  label?: string;
  labelStyle?: string;
  containerStyle?: string;
  inputStyle?: string;
  error?: string;
  className?: string; // Support for NativeWind if passed as prop
}

const TextArea = React.forwardRef<TextInput, TextAreaProps>(
  ({ label, labelStyle, containerStyle, inputStyle, error, className, ...props }, ref) => {
    return (
      <View className={`mb-2 w-full ${containerStyle}`}>
        {label && (
          <Text
            className={`text-lg font-JakartaSemiBold mb-2 text-gray-700 ${labelStyle}`}
          >
            {label}
          </Text>
        )}

        <View
          className={`bg-white rounded-xl border ${error ? "border-red-500" : "border-gray-300"
            } focus:border-green-500 ${className}`}
        >
          <TextInput
            ref={ref}
            multiline
            numberOfLines={props.numberOfLines || 3}
            textAlignVertical="top"
            style={[
              {
                minHeight: (props.numberOfLines || 3) * 24 + 24, // Approximate height
                paddingTop: 12,
                paddingBottom: 12,
                paddingHorizontal: 16,
                fontFamily: "JakartaSemiBold",
                fontSize: 16,
                color: "#1F2937", // text-gray-700
              },
            ]}
            placeholderTextColor="#9CA3AF"
            {...props}
          />
        </View>
        {error && (
          <Text className="text-red-500 text-sm mt-1 font-JakartaMedium">
            {error}
          </Text>
        )}
      </View>
    );
  }
);

TextArea.displayName = "TextArea";

export default TextArea;
