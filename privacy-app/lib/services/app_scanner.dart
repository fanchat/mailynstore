import 'package:flutter/services.dart';
import '../models/scanned_app.dart';

class AppScanner {
  static const _channel = MethodChannel('com.mailyn.privacy_guard/scanner');

  static Future<List<ScannedApp>> scanInstalledApps() async {
    final result = await _channel.invokeMethod('getInstalledApps');
    if (result == null) return [];

    final list = result as List<dynamic>;
    return list
        .map((e) => ScannedApp.fromMap(Map<String, dynamic>.from(e)))
        .toList();
  }

  static Future<void> openAppSettings(String packageName) async {
    await _channel.invokeMethod('openAppSettings', {'packageName': packageName});
  }

  static Future<void> openUninstallScreen(String packageName) async {
    await _channel.invokeMethod('openUninstallScreen', {'packageName': packageName});
  }
}
