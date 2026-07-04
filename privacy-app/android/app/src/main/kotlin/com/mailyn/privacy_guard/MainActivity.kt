package com.mailyn.privacy_guard

import android.app.usage.StorageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.storage.StorageManager
import android.provider.Settings
import android.util.Log
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.mailyn.privacy_guard/scanner"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "getInstalledApps" -> {
                    val apps = getInstalledApps()
                    result.success(apps)
                }
                "openAppSettings" -> {
                    val packageName = call.argument<String>("packageName") ?: ""
                    openAppSettings(packageName)
                    result.success(true)
                }
                "openUninstallScreen" -> {
                    val packageName = call.argument<String>("packageName") ?: ""
                    openUninstallScreen(packageName)
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }

    private data class AppScanInfo(
        val packageName: String,
        val appName: String,
        val versionName: String,
        val iconBase64: String?,  // will be sent as null, handled on Flutter side
        val isSystemApp: Boolean,
        val installSource: String,  // "playstore", "unknown", "system"
        val dangerousPermissions: List<String>,
        val appSizeMB: Double,
        val hasBackgroundLimit: Boolean,
        val riskLevel: String  // "safe", "warning", "danger"
    )

    private val DANGEROUS_PERMISSION_GROUPS = mapOf(
        "android.permission.READ_SMS" to "读取短信",
        "android.permission.RECEIVE_SMS" to "接收短信",
        "android.permission.SEND_SMS" to "发送短信",
        "android.permission.READ_CONTACTS" to "读取通讯录",
        "android.permission.ACCESS_FINE_LOCATION" to "精确定位",
        "android.permission.ACCESS_BACKGROUND_LOCATION" to "后台定位",
        "android.permission.CAMERA" to "相机",
        "android.permission.RECORD_AUDIO" to "录音",
        "android.permission.READ_CALL_LOG" to "读取通话记录",
        "android.permission.READ_EXTERNAL_STORAGE" to "读取存储",
        "android.permission.MANAGE_EXTERNAL_STORAGE" to "管理所有文件",
        "android.permission.SYSTEM_ALERT_WINDOW" to "悬浮窗",
        "android.permission.REQUEST_INSTALL_PACKAGES" to "安装未知应用",
        "android.permission.BIND_ACCESSIBILITY_SERVICE" to "无障碍服务",
        "android.permission.QUERY_ALL_PACKAGES" to "查询所有应用",
        "android.permission.POST_NOTIFICATIONS" to "发送通知",
        "android.permission.PACKAGE_USAGE_STATS" to "使用统计"
    )

    private fun getInstalledApps(): List<Map<String, Any?>> {
        val pm = packageManager
        val apps = mutableListOf<Map<String, Any?>>()
        val dangerousApps = listOf(
            "com.mobile.legends", "com.miui.securitycenter", // known clean examples
        )

        try {
            val packages = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.getInstalledPackages(
                    PackageManager.PackageInfoFlags.of(
                        PackageManager.GET_PERMISSIONS.toLong() or
                        PackageManager.GET_META_DATA.toLong()
                    )
                )
            } else {
                @Suppress("DEPRECATION")
                pm.getInstalledPackages(PackageManager.GET_PERMISSIONS)
            }

            val storageStatsManager = getSystemService(Context.STORAGE_STATS_SERVICE) as? StorageStatsManager

            for (pkg in packages) {
                try {
                    val info = pkg.applicationInfo ?: continue
                    val appName = pm.getApplicationLabel(info).toString()
                    val packageName = pkg.packageName

                    // Skip launcher-only packages
                    if (packageName == "android" || packageName.startsWith("com.android.systemui")) continue

                    val isSystemApp = (info.flags and ApplicationInfo.FLAG_SYSTEM) != 0

                    // Check install source
                    val installSource = if (isSystemApp) {
                        "system"
                    } else {
                        val installer = pm.getInstallerPackageName(packageName)
                        when {
                            installer.isNullOrEmpty() -> "unknown"
                            installer.contains("play") || installer.contains("google") -> "playstore"
                            else -> "unknown"
                        }
                    }

                    // Get dangerous permissions
                    val dangerousPerms = mutableListOf<String>()
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        // For Android 13+, check runtime permissions
                        val perms = pkg.permissions
                        if (perms != null) {
                            for (perm in perms) {
                                val permName = perm.name ?: continue
                                val hasDangerous = DANGEROUS_PERMISSION_GROUPS.keys.any { permName.startsWith(it) }
                                if (hasDangerous) {
                                    val label = DANGEROUS_PERMISSION_GROUPS.entries.find { permName.startsWith(it.key) }?.value ?: permName
                                    dangerousPerms.add(label)
                                }
                            }
                        }
                    } else {
                        @Suppress("DEPRECATION")
                        val perms = pkg.requestedPermissions
                        if (perms != null) {
                            @Suppress("DEPRECATION")
                            val granted = pkg.requestedPermissionsFlags
                            for (i in perms.indices) {
                                if (i < granted.size && (granted[i] and PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0) {
                                    val permName = perms[i]
                                    val hasDangerous = DANGEROUS_PERMISSION_GROUPS.keys.any { permName.startsWith(it) }
                                    if (hasDangerous) {
                                        val label = DANGEROUS_PERMISSION_GROUPS.entries.find { permName.startsWith(it.key) }?.value ?: permName
                                        dangerousPerms.add(label)
                                    }
                                }
                            }
                        }
                    }

                    // Estimate app size
                    var appSizeMB = 0.0
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && storageStatsManager != null) {
                            val uuid = storageStatsManager.getPrimaryStorageUuid() ?: StorageManager.UUID_DEFAULT
                            val stats = storageStatsManager.queryStatsForPackage(uuid, packageName, android.os.Process.myUserHandle())
                            appSizeMB = (stats.appBytes + stats.dataBytes + stats.cacheBytes) / (1024.0 * 1024.0)
                        } else {
                            // Fallback: estimate from APK size
                            val apkFile = File(info.publicSourceDir ?: info.sourceDir ?: "")
                            if (apkFile.exists()) {
                                appSizeMB = apkFile.length() / (1024.0 * 1024.0)
                            }
                        }
                    } catch (e: Exception) {
                        // Can't get storage stats for some packages
                    }

                    // Determine risk level
                    val riskLevel = when {
                        packageName == pm.getPackageName() -> "safe"  // ourselves
                        installSource == "unknown" && dangerousPerms.size >= 2 -> "danger"
                        dangerousPerms.size >= 4 -> "danger"
                        dangerousPerms.size >= 2 -> "warning"
                        installSource == "unknown" && !isSystemApp -> "warning"
                        appSizeMB > 500 -> "warning"  // very large app
                        else -> "safe"
                    }

                    apps.add(mapOf(
                        "packageName" to packageName,
                        "appName" to appName,
                        "versionName" to (pkg.versionName ?: ""),
                        "isSystemApp" to isSystemApp,
                        "installSource" to installSource,
                        "dangerousPermissions" to dangerousPerms,
                        "appSizeMB" to Math.round(appSizeMB * 100.0) / 100.0,
                        "riskLevel" to riskLevel
                    ))
                } catch (e: Exception) {
                    Log.e("PrivacyGuard", "Error processing package: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e("PrivacyGuard", "Error getting packages: ${e.message}")
        }

        return apps
    }

    private fun openAppSettings(packageName: String) {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = android.net.Uri.parse("package:$packageName")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(intent)
    }

    private fun openUninstallScreen(packageName: String) {
        val intent = Intent(Intent.ACTION_DELETE).apply {
            data = android.net.Uri.parse("package:$packageName")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(intent)
    }
}
