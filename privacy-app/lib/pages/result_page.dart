import 'package:flutter/material.dart';
import '../models/scanned_app.dart';
import '../services/app_scanner.dart';
import 'app_detail_page.dart';

class ResultPage extends StatelessWidget {
  final List<ScannedApp> apps;

  const ResultPage({super.key, required this.apps});

  @override
  Widget build(BuildContext context) {
    final dangerApps = apps.where((a) => a.riskLevel == 'danger').toList();
    final warningApps = apps.where((a) => a.riskLevel == 'warning').toList();
    final safeApps = apps.where((a) => a.riskLevel == 'safe').toList();

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
                ),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(24),
                  bottomRight: Radius.circular(24),
                ),
              ),
              child: Column(
                children: [
                  const SizedBox(height: 12),
                  Text(
                    dangerApps.isEmpty && warningApps.isEmpty
                        ? '✅ 您的手机状态良好'
                        : '🛡️ 发现 ${dangerApps.length + warningApps.length} 个问题',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildStat('高风险', dangerApps.length, const Color(0xFFEF4444)),
                      _buildStat('需关注', warningApps.length, const Color(0xFFF59E0B)),
                      _buildStat('安全', safeApps.length, const Color(0xFF10B981)),
                      _buildStat('总计', apps.length, Colors.white70),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            // App list
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                children: [
                  if (dangerApps.isNotEmpty) ...[
                    _buildSectionHeader('🔴 高风险', '建议立即处理', const Color(0xFFEF4444)),
                    ...dangerApps.map((app) => _buildAppCard(context, app)),
                    const SizedBox(height: 12),
                  ],
                  if (warningApps.isNotEmpty) ...[
                    _buildSectionHeader('🟡 需关注', '建议检查设置', const Color(0xFFF59E0B)),
                    ...warningApps.map((app) => _buildAppCard(context, app)),
                    const SizedBox(height: 12),
                  ],
                  _buildSectionHeader('🟢 安全', '${safeApps.length} 个应用', const Color(0xFF10B981)),
                  ...safeApps.take(10).map((app) => _buildAppCard(context, app)),
                  if (safeApps.length > 10)
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        '还有 ${safeApps.length - 10} 个安全应用未显示',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStat(String label, int count, Color color) {
    return Column(
      children: [
        Text(
          count.toString(),
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.white70)),
      ],
    );
  }

  Widget _buildSectionHeader(String title, String subtitle, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      child: Row(
        children: [
          Text(title,
              style:
                  TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(width: 8),
          Text(subtitle,
              style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildAppCard(BuildContext context, ScannedApp app) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 1,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => AppDetailPage(app: app)),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // App icon placeholder
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    app.appName.isNotEmpty ? app.appName[0] : '?',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      app.appName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${app.sizeLabel} · ${app.installSource == "unknown" ? "未知来源" : app.isSystemApp ? "系统应用" : "已知来源"}',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: app.riskColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(app.riskIcon, size: 14, color: app.riskColor),
                    const SizedBox(width: 4),
                    Text(
                      app.riskLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: app.riskColor,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
