package com.example.backend.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final RestClient restClient = RestClient.create();

    @Value("${brevo.api.key}")
    private String brevoApiKey;

    @Value("${brevo.sender.email}")
    private String senderEmail;

    @Value("${brevo.sender.name:Zalo Clone}")
    private String senderName;

    @Override
    @Async
    public void sendVerificationEmail(String toEmail, String firstName, String code) {
        sendEmail(toEmail, "[Zalo Clone] Xác thực tài khoản", buildVerificationHtml(firstName, code));
    }

    @Override
    @Async
    public void sendResetPasswordEmail(String toEmail, String firstName, String code) {
        sendEmail(toEmail, "[Zalo Clone] Đặt lại mật khẩu", buildResetPasswordHtml(firstName, code));
    }

    private void sendEmail(String toEmail, String subject, String htmlContent) {
        try {
            Map<String, Object> body = Map.of(
                "sender", Map.of("name", senderName, "email", senderEmail),
                "to", List.of(Map.of("email", toEmail)),
                "subject", subject,
                "htmlContent", htmlContent
            );

            String response = restClient.post()
                .uri("https://api.brevo.com/v3/smtp/email")
                .header("api-key", brevoApiKey)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
            log.info("Email sent to {}: {}", toEmail, response);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildVerificationHtml(String firstName, String code) {
        return """
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px;">
              <div style="text-align:center;margin-bottom:24px;">
                <div style="display:inline-block;background:#0068ff;border-radius:12px;padding:12px 20px;">
                  <span style="color:white;font-size:22px;font-weight:bold;">Zalo Clone</span>
                </div>
              </div>
              <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                <h2 style="margin:0 0 8px;color:#1f2937;font-size:20px;">Xác thực tài khoản</h2>
                <p style="color:#6b7280;margin:0 0 24px;">Xin chào <strong>%s</strong>, vui lòng dùng mã OTP bên dưới để kích hoạt tài khoản.</p>
                <div style="background:#eff6ff;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                  <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#0068ff;">%s</span>
                </div>
                <p style="color:#9ca3af;font-size:13px;margin:0;">Mã có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
              </div>
            </div>
            """.formatted(firstName, code);
    }

    private String buildResetPasswordHtml(String firstName, String code) {
        return """
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px;">
              <div style="text-align:center;margin-bottom:24px;">
                <div style="display:inline-block;background:#0068ff;border-radius:12px;padding:12px 20px;">
                  <span style="color:white;font-size:22px;font-weight:bold;">Zalo Clone</span>
                </div>
              </div>
              <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                <h2 style="margin:0 0 8px;color:#1f2937;font-size:20px;">Đặt lại mật khẩu</h2>
                <p style="color:#6b7280;margin:0 0 24px;">Xin chào <strong>%s</strong>, dùng mã OTP bên dưới để đặt lại mật khẩu của bạn.</p>
                <div style="background:#fff7ed;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                  <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#ea580c;">%s</span>
                </div>
                <p style="color:#9ca3af;font-size:13px;margin:0;">Mã có hiệu lực trong <strong>10 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
              </div>
            </div>
            """.formatted(firstName, code);
    }
}
