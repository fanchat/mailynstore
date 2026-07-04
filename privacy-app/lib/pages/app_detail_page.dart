import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/scanned_app.dart';
import '../services/app_scanner.dart';

class AppDetailPage extends StatelessWidget {
  final ScannedApp app;

  const AppDetailPage({super.key, required this.app});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(app.appName),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Risk banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: app.riskLevel == 'danger'
                      ? [const Color(0xFFEF4444), const Color(0xFFDC2626)]
                      : app.riskLevel == 'warning'
                          ? [const Color(0xFFF59E0B), const Color(0xFFD97706)]
                          : [const Color(0xFF10B981), const Color(0xFF059669)],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Icon(app.riskIcon, color: Colors.white, size: 40),
                  const SizedBox(height: 8),
                  Text(
                    app.riskLabel,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    app.packageName,
                    style: const TextStyle(fontSize: 12, color: Colors.white70),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Basic info
            _buildInfoCard(context, [
              _infoRow('应用名称', app.appName),
              _infoRow('包名', app.packageName),
              _infoRow('版本', app.versionName),
              _infoRow('安装来源', _sourceLabel(app.installSource)),
              _infoRow('存储占用', app.sizeLabel),
            ]),
            const SizedBox(height: 12),

            // Dangerous permissions
            if (app.dangerousPermissions.isNotEmpty) ...[
              _buildSectionTitle('⚠️ 危险权限 (${app.dangerousPermissions.length})'),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: app.dangerousPermissions.map((perm) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          const Icon(Icons.warning_amber_rounded,
                              size: 16, color: Color(0xFFEF4444)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(perm,
                                style: const TextStyle(fontSize: 14)),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Risk assessment
            _buildSectionTitle('📋 风险评估'),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                _riskDescription(app),
                style: const TextStyle(fontSize: 14, height: 1.6),
              ),
            ),
            const SizedBox(height: 28),

            // Action buttons
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: () => AppScanner.openAppSettings(app.packageName),
                icon: const Icon(Icons.settings_rounded),
                label: const Text('打开应用设置'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF667EEA),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton.icon(
                onPressed: () => AppScanner.openUninstallScreen(app.packageName),
                icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444)),
                label: const Text('卸载应用',
                    style: TextStyle(color: Color(0xFFEF4444))),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFEF4444)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _sourceLabel(String source) {
    switch (source) {
      case 'playstore':
        return 'Google Play';
      case 'system':
        return '系统预装';
      case 'unknown':
        return '未知来源 ⚠️';
      default:
        return source;
    }
  }

  String _riskDescription(ScannedApp app) {
    final parts = <String>[];
    if (app.installSource == 'unknown') {
      parts.add('• 该应用从未知渠道安装，无法确认来源安全性。');
    }
    if (app.dangerousPermissions.isNotEmpty) {
      parts.add('• 该应用申请了 ${app.dangerousPermissions.length} 项敏感权限，可能存在过度收集个人信息的行为。');
    }
    if (app.appSizeMB > 200) {
      parts.add('• 该应用占用 ${app.sizeLabel} 空间，建议定期清理缓存。');
    }
    if (parts.isEmpty) {
      return '该应用目前未发现明显风险，建议保持系统和应用更新。';
    }
    return parts.join('\n');
  }

  Widget _buildSectionTitle(String title) {
    return Text(title,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold));
  }

  Widget _buildInfoCard(BuildContext context, List<Widget> rows) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(children: rows),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(label,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}
