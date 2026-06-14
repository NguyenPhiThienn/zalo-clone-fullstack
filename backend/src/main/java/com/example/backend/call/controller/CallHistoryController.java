package com.example.backend.call.controller;

import com.example.backend.call.dto.CallSessionDto;
import com.example.backend.call.dto.StartCallRequest;
import com.example.backend.call.service.CallHistoryService;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/calls")
@RequiredArgsConstructor
public class CallHistoryController {

    private final CallHistoryService callHistoryService;
    private final UserRepository userRepository;

    /**
     * Lưu lịch sử cuộc gọi sau khi kết thúc.
     * POST /api/v1/calls
     */
    @PostMapping
    public ResponseEntity<CallSessionDto> saveCall(
            @RequestBody StartCallRequest req,
            Principal principal) {
        User me = userRepository.findByEmail(principal.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        CallSessionDto dto = callHistoryService.saveCallSession(me.getId(), req);
        return ResponseEntity.ok(dto);
    }

    /**
     * Lấy lịch sử cuộc gọi của chat.
     * GET /api/v1/calls/{chatId}
     */
    @GetMapping("/{chatId}")
    public ResponseEntity<List<CallSessionDto>> getHistory(@PathVariable UUID chatId) {
        return ResponseEntity.ok(callHistoryService.getCallHistory(chatId));
    }
}
