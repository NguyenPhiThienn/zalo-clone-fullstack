package com.example.backend.call.service;

import com.example.backend.call.dto.CallSessionDto;
import com.example.backend.call.dto.StartCallRequest;

import java.util.List;
import java.util.UUID;

public interface CallHistoryService {
    CallSessionDto saveCallSession(UUID initiatorId, StartCallRequest req);
    List<CallSessionDto> getCallHistory(UUID chatId);
}
