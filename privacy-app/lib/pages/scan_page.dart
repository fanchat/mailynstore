import 'dart:async';
import 'package:flutter/material.dart';
import '../models/scanned_app.dart';
import '../services/app_scanner.dart';
import 'result_page.dart';

class ScanPage extends StatefulWidget {
  const ScanPage({super.key});

  @override
  State<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends State<ScanPage> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _rotationAnim;
  String _statusText = '正在准备扫描...';
  double _progress = 0;
  bool _scanning = true;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
    _rotationAnim = Tween<double>(begin: 0, end: 1).animate(_animController);
    _startScan();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _startScan() async {
    // Simulate progress steps
    const steps = [
      '正在扫描已安装应用...',
      '正在检查权限配置...',
      '正在分析安装来源...',
      '正在评估风险等级...',
      '正在生成报告...',
    ];

    for (int i = 0; i < steps.length; i++) {
      if (!mounted) return;
      setState(() {
        _statusText = steps[i];
        _progress = (i + 1) / steps.length;
      });
      await Future.delayed(const Duration(milliseconds: 600));
    }

    // Actual scan
    try {
      setState(() => _statusText = '正在深度检测...');
      final apps = await AppScanner.scanInstalledApps();
      if (!mounted) return;

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => ResultPage(apps: apps)),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _statusText = '扫描失败: $e';
        _scanning = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AnimatedBuilder(
                  animation: _rotationAnim,
                  builder: (context, child) {
                    return Transform.rotate(
                      angle: _rotationAnim.value * 6.28,
                      child: Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
                          ),
                          borderRadius: BorderRadius.circular(28),
                        ),
                        child: const Center(
                          child: Text('🔍', style: TextStyle(fontSize: 44)),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 40),
                Text(
                  _statusText,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: _progress,
                    minHeight: 6,
                    backgroundColor: Colors.grey.shade200,
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF667EEA)),
                  ),
                ),
                const SizedBox(height: 32),
                Text(
                  '扫描过程完全在本地进行\n您的数据不会上传到任何服务器',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
