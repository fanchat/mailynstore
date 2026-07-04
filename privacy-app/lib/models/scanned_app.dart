import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class ScannedApp {
  final String packageName;
  final String appName;
  final String versionName;
  final bool isSystemApp;
  final String installSource;
  final List<String> dangerousPermissions;
  final double appSizeMB;
  final String riskLevel;

  ScannedApp({
    required this.packageName,
    required this.appName,
    required this.versionName,
    required this.isSystemApp,
    required this.installSource,
    required this.dangerousPermissions,
    required this.appSizeMB,
    required this.riskLevel,
  });

  factory ScannedApp.fromMap(Map<String, dynamic> map) {
    return ScannedApp(
      packageName: map['packageName'] as String? ?? '',
      appName: map['appName'] as String? ?? '',
      versionName: map['versionName'] as String? ?? '',
      isSystemApp: map['isSystemApp'] as bool? ?? false,
      installSource: map['installSource'] as String? ?? 'unknown',
      dangerousPermissions: (map['dangerousPermissions'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      appSizeMB: (map['appSizeMB'] as num?)?.toDouble() ?? 0.0,
      riskLevel: map['riskLevel'] as String? ?? 'safe',
    );
  }

  String get riskLabel {
    switch (riskLevel) {
      case 'danger':
        return '高风险';
      case 'warning':
        return '需关注';
      default:
        return '安全';
    }
  }

  Color get riskColor {
    switch (riskLevel) {
      case 'danger':
        return const Color(0xFFEF4444);
      case 'warning':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF10B981);
    }
  }

  IconData get riskIcon {
    switch (riskLevel) {
      case 'danger':
        return Icons.warning_rounded;
      case 'warning':
        return Icons.info_outline_rounded;
      default:
        return Icons.check_circle_outline_rounded;
    }
  }

  String get sizeLabel {
    if (appSizeMB < 1) return '${(appSizeMB * 1024).toStringAsFixed(0)} KB';
    if (appSizeMB < 100) return '${appSizeMB.toStringAsFixed(1)} MB';
    return '${(appSizeMB / 1024).toStringAsFixed(1)} GB';
  }
}
