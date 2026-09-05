package id.co.ulptoboali.sisi

import android.app.Activity
import android.content.Intent
import android.os.Handler
import android.os.Looper
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var pendingSave: MethodChannel.Result? = null
    private var pendingJpeg: ByteArray? = null
    private val saveRequest = 7321
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "id.co.ulptoboali.sisi/photo_export")
            .setMethodCallHandler { call, result ->
                if (call.method != "saveWatermarkedJpeg") {
                    result.notImplemented()
                    return@setMethodCallHandler
                }
                if (pendingSave != null) {
                    result.error("BUSY", "Penyimpanan foto sedang berjalan.", null)
                    return@setMethodCallHandler
                }
                val bytes = call.argument<ByteArray>("bytes")
                if (bytes == null || bytes.size < 4 || bytes.size > 40 * 1024 * 1024 ||
                    bytes[0].toInt() and 255 != 255 || bytes[1].toInt() and 255 != 216) {
                    result.error("INVALID_IMAGE", "Hasil watermark JPEG tidak valid atau terlalu besar.", null)
                    return@setMethodCallHandler
                }
                val rawName = call.argument<String>("filename") ?: "SiSi-watermark.jpg"
                val cleanName = rawName.replace(Regex("[^A-Za-z0-9._-]"), "_").take(120)
                pendingSave = result
                pendingJpeg = bytes
                try {
                    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "image/jpeg"
                        putExtra(Intent.EXTRA_TITLE, if (cleanName.endsWith(".jpg")) cleanName else "$cleanName.jpg")
                    }
                    startActivityForResult(intent, saveRequest)
                } catch (error: Exception) {
                    finishSave("OPEN_FAILED", "Pemilih lokasi penyimpanan tidak dapat dibuka.")
                }
            }
    }

    private fun finishSave(code: String? = null, message: String? = null, saved: Boolean = false) {
        val result = pendingSave
        pendingSave = null
        pendingJpeg = null
        if (code != null) result?.error(code, message, null)
        else result?.success(mapOf("saved" to saved))
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != saveRequest) {
            super.onActivityResult(requestCode, resultCode, data)
            return
        }
        if (resultCode != Activity.RESULT_OK) {
            finishSave(saved = false)
            return
        }
        val uri = data?.data
        val bytes = pendingJpeg
        if (uri == null || bytes == null) {
            finishSave("NO_DATA", "Data foto tidak tersedia. Buka foto dan ulangi penyimpanan.")
            return
        }
        val resolver = contentResolver
        Thread {
            try {
                val stream = resolver.openOutputStream(uri, "w")
                    ?: throw IllegalStateException("Output unavailable")
                stream.use { it.write(bytes); it.flush() }
                mainHandler.post { finishSave(saved = true) }
            } catch (error: Exception) {
                // Do not delete a provider document: the user may have selected
                // an existing destination. Report the failure, retain source.
                mainHandler.post { finishSave("WRITE_FAILED", "Foto gagal disimpan. Periksa ruang penyimpanan dan pilih lokasi lain.") }
            }
        }.start()
    }

    override fun onDestroy() {
        if (pendingSave != null) finishSave("ACTIVITY_CLOSED", "Penyimpanan terhenti. Silakan ulangi dari foto.")
        super.onDestroy()
    }
}
