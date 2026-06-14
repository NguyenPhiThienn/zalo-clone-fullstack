import { useState, forwardRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { InputFieldProps } from "@/types/type";

const InputField = forwardRef<TextInput, InputFieldProps>(({
  label,
  labelStyle,
  icon,
  iconRight,
  secureTextEntry = false,
  containerStyle,
  inputStyle,
  iconStyle,
  className,
  error,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="w-full mb-2">
      {label && (
        <Text
          className={`text-lg font-JakartaSemiBold mb-2 text-gray-700 ${labelStyle}`}
        >
          {label}
        </Text>
      )}
      <View
        className={`flex flex-row justify-start items-center relative 
        bg-white rounded-xl border ${error ? "border-red-500" : "border-gray-300"} focus:border-green-500  ${containerStyle}`}
      >
        {icon &&
          (typeof icon === "string" && !icon.startsWith("http") ? (
            <Ionicons
              name={icon as any}
              size={20}
              color="#6B7280"
              style={{ marginLeft: 16 }}
            />
          ) : (
            <Image
              source={icon}
              className={`w-6 h-6 ml-4 ${iconStyle}`}
              style={iconStyle?.startsWith("#") ? { tintColor: iconStyle } : {}}
            />
          ))}
        <TextInput
          ref={ref}
          style={{
            borderRadius: 9999,
            padding: 16,
            fontFamily: "JakartaSemiBold",
            fontSize: 16,
            flex: 1,
            textAlign: "left",
          }}
          secureTextEntry={secureTextEntry && !showPassword}
          {...props}
          placeholderTextColor={"#AAAAAA"}
        />
        {iconRight && (
          <View className="pr-4">
            {iconRight}
          </View>
        )}
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="pr-4"
          >
            <Ionicons
              name={showPassword ? "eye" : "eye-off"}
              size={24}
              color="#6B7280"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text className="text-red-500 text-base mt-1 ml-2 font-JakartaMedium">
          {error}
        </Text>
      )}
    </View>
  );
});

export default InputField;
