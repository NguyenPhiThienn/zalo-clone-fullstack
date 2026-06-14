import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

import { ButtonProps } from "@/types/type";

const getBgVariantStyle = (variant: ButtonProps["bgVariant"]) => {
  switch (variant) {
    case "secondary":
      return "bg-gray-500";
    case "danger":
      return "bg-red-500";
    case "success":
      return "bg-blue-500";
    case "outline":
      return "bg-blue-50 border-blue-600 border-[1px]";
    case "amber":
      return "bg-amber-50 border-amber-500 border-[1px]";
    case "red":
      return "bg-red-50 border-red-500 border-[1px]";
    default:
      return "bg-blue-600";
  }
};

const getTextVariantStyle = (variant: ButtonProps["textVariant"]) => {
  switch (variant) {
    case "primary":
      return "text-blue-600";
    case "amber":
      return "text-amber-600";
    case "red":
      return "text-red-600";
    case "secondary":
      return "text-gray-100";
    case "danger":
      return "text-white";
    case "success":
      return "text-blue-100";
    default:
      return "text-white";
  }
};

const CustomButton = ({
  onPress,
  title,
  bgVariant = "primary",
  textVariant = "default",
  IconLeft,
  IconRight,
  className,
  loading = false,
  ...props
}: ButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={loading || props.disabled}
    className={`flex flex-row justify-center items-center px-4 w-full rounded-xl gap-1 flex-shrink-0 ${getBgVariantStyle(bgVariant)} ${className} ${loading ? "opacity-70" : ""}`}
    style={[
      { height: 48 },
      props.style,
    ]}
    {...props}
  >
    {loading ? (
      <ActivityIndicator
        color={textVariant === "primary" ? "#000" : "#fff"}
        size="small"
      />
    ) : (
      <>
        {IconLeft && <IconLeft />}
        <Text
          className={`text-lg font-bold ${getTextVariantStyle(textVariant)}`}
        >
          {title}
        </Text>
        {IconRight && <IconRight />}
      </>
    )}
  </TouchableOpacity>
);

export default CustomButton;
