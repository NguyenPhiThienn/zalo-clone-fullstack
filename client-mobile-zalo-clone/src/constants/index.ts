import arrowDown from "@/assets/icons/arrow-down.png";
import arrowUp from "@/assets/icons/arrow-up.png";
import backArrow from "@/assets/icons/back-arrow.png";
import chat from "@/assets/icons/chat.png";
import checkmark from "@/assets/icons/check.png";
import close from "@/assets/icons/close.png";
import dollar from "@/assets/icons/dollar.png";
import email from "@/assets/icons/email.png";
import eyecross from "@/assets/icons/eyecross.png";
import google from "@/assets/icons/google.png";
import home from "@/assets/icons/home.png";
import list from "@/assets/icons/list.png";
import lock from "@/assets/icons/lock.png";
import map from "@/assets/icons/map.png";
import marker from "@/assets/icons/marker.png";
import marker2 from "@/assets/icons/marker2.png";
import out from "@/assets/icons/out.png";
import person from "@/assets/icons/person.png";
import pin from "@/assets/icons/pin.png";
import point from "@/assets/icons/point.png";
import profile from "@/assets/icons/profile.png";
import search from "@/assets/icons/search.png";
import selectedMarker from "@/assets/icons/selected-marker.png";
import selectedMarker2 from "@/assets/icons/selected-marker2.png";
import star from "@/assets/icons/star.png";
import target from "@/assets/icons/target.png";
import to from "@/assets/icons/to.png";

import check from "@/assets/images/check.png";
import message from "@/assets/images/message.png";
import noResult from "@/assets/images/no-result.png";
import signUpCuate from "@/assets/images/Sign up-cuate.png";

// Import các ảnh mới cho Zalo Clone
import callingCuate from "@/assets/images/Calling-cuate.png";
import groupChatCuate from "@/assets/images/Group Chat-cuate.png";

export const images = {
    signUpCuate,
    check,
    noResult,
    message,
    callingCuate,
    groupChatCuate,
};

export const icons = {
    arrowDown,
    arrowUp,
    backArrow,
    chat,
    checkmark,
    close,
    dollar,
    email,
    eyecross,
    google,
    home,
    list,
    lock,
    map,
    marker,
    marker2,
    out,
    person,
    pin,
    point,
    profile,
    search,
    selectedMarker,
    selectedMarker2,
    star,
    target,
    to,
};

export const onboarding = [
    {
        id: 1,
        title: "Gọi video ổn định",
        description: "Trò chuyện thật đã với hình ảnh sắc nét, tiếng chất, âm chuẩn dưới mọi điều kiện mạng.",
        image: images.callingCuate,
    },
    {
        id: 2,
        title: "Nhắn tin nhanh chóng",
        description: "Gửi tin nhắn, hình ảnh, file và sticker đến bạn bè và gia đình mọi lúc.",
        image: images.message,
    },
    {
        id: 3,
        title: "Nhóm chat tiện lợi",
        description: "Kết nối cộng đồng, trao đổi công việc và chia sẻ khoảnh khắc cùng nhóm bạn.",
        image: images.groupChatCuate,
    },
];

export const data = {
    onboarding,
};