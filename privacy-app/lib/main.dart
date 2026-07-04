import 'package:flutter/material.dart';
import 'pages/home_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PrivacyGuardApp());
}

class PrivacyGuardApp extends StatelessWidget {
  const PrivacyGuardApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '精拾·手机守护',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF667EEA),
        scaffoldBackgroundColor: const Color(0xFFF5F7FA),
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          foregroundColor: Color(0xFF1A1A2E),
        ),
      ),
      home: const HomePage(),
    );
  }
}
