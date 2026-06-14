package com.example.backend.report.mapper;

import com.example.backend.report.dto.ReportDto;
import com.example.backend.report.entity.Report;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ReportMapper {

    @Mapping(target = "reporterId", source = "reporter.id")
    @Mapping(target = "reporterName", expression = "java((report.getReporter().getFirstName() + \" \" + report.getReporter().getLastName()).trim())")
    @Mapping(target = "reporterEmail", source = "reporter.email")
    @Mapping(target = "reportedId", source = "reported.id")
    @Mapping(target = "reportedName", expression = "java((report.getReported().getFirstName() + \" \" + report.getReported().getLastName()).trim())")
    @Mapping(target = "reportedEmail", source = "reported.email")
    @Mapping(target = "reportedBanned", source = "reported.banned")
    @Mapping(target = "evidenceUrls", ignore = true) // Handled in service due to presigned URLs
    @Mapping(target = "createdAt", source = "createdAt")
    ReportDto toDto(Report report);
}
