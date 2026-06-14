let isAlertShowing = false;

export const showLogoutAlert = (title: string, message: string, onConfirm: () => void) => {
    if (isAlertShowing) return;
    
    isAlertShowing = true;
    
    // Ta Import động Alert để tránh lỗi vòng lặp phụ thuộc nếu cần
    const { Alert } = require('react-native');
    
    Alert.alert(
        title,
        message,
        [
            {
                text: "Tôi hiểu, đăng xuất",
                onPress: () => {
                    isAlertShowing = false;
                    onConfirm();
                }
            }
        ],
        { cancelable: false }
    );
};
