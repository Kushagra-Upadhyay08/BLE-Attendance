import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:image/image.dart' as img;

import 'ml/face_recognizer.dart';

// ---------------------------------------------------------------------------
// Liveness challenge types
// ---------------------------------------------------------------------------

enum _LivenessChallenge { smile, turnLeft, turnRight }

extension _LivenessLabel on _LivenessChallenge {
  String get instruction {
    switch (this) {
      case _LivenessChallenge.smile:
        return 'Smile 😊';
      case _LivenessChallenge.turnLeft:
        return 'Turn your head LEFT';
      case _LivenessChallenge.turnRight:
        return 'Turn your head RIGHT';
    }
  }

  IconData get icon {
    switch (this) {
      case _LivenessChallenge.smile:
        return Icons.sentiment_very_satisfied_rounded;
      case _LivenessChallenge.turnLeft:
        return Icons.turn_left_rounded;
      case _LivenessChallenge.turnRight:
        return Icons.turn_right_rounded;
    }
  }
}

// ---------------------------------------------------------------------------
// Verification phases
// ---------------------------------------------------------------------------

enum _Phase { initialising, liveness, capturing, result }

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

/// Full-screen dialog for verifying a student's face during attendance
/// finalisation.
///
/// Opens the front camera, runs a random liveness challenge sequence, then
/// captures and compares against the saved embedding. Allows up to
/// [maxRetries] attempts. Returns `true` on a successful match.
class FaceVerificationDialog extends StatefulWidget {
  const FaceVerificationDialog({super.key, this.maxRetries = 3});
  final int maxRetries;

  @override
  State<FaceVerificationDialog> createState() => _FaceVerificationDialogState();
}

class _FaceVerificationDialogState extends State<FaceVerificationDialog>
    with SingleTickerProviderStateMixin {
  // Camera & ML
  CameraController? _cam;
  CameraDescription? _camDesc;
  final FaceDetector _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      performanceMode: FaceDetectorMode.accurate,
      enableClassification: true, // smile + eye-open probabilities
      enableLandmarks: true,
      minFaceSize: 0.3,
    ),
  );
  final FaceRecognizer _recognizer = FaceRecognizer();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  // State
  _Phase _phase = _Phase.initialising;
  String _statusText = 'Initialising…';
  int _retriesLeft = 3;
  bool _matched = false;
  List<double>? _savedEmbedding;

  // Liveness
  late List<_LivenessChallenge> _challenges;
  int _challengeIdx = 0;
  int _satisfiedFrames = 0;
  static const int _requiredFrames = 3; // consecutive frames to accept
  bool _isDetecting = false;

  // Animation
  late AnimationController _pulseCtrl;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  @override
  void initState() {
    super.initState();
    _retriesLeft = widget.maxRetries;
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pickChallenges();
    _init();
  }

  @override
  void dispose() {
    _stopStream();
    _cam?.dispose();
    _faceDetector.close();
    _recognizer.dispose();
    _pulseCtrl.dispose();
    super.dispose();
  }

  // -----------------------------------------------------------------------
  // Initialisation
  // -----------------------------------------------------------------------

  void _pickChallenges() {
    final all = _LivenessChallenge.values.toList()..shuffle(Random());
    _challenges = all.take(2).toList();
    _challengeIdx = 0;
    _satisfiedFrames = 0;
  }

  Future<void> _init() async {
    try {
      final embStr = await _storage.read(key: 'face_embedding');
      if (embStr == null) {
        if (mounted) Navigator.of(context).pop(false);
        return;
      }
      _savedEmbedding = List<double>.from(jsonDecode(embStr) as List);

      await _recognizer.init();

      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        if (mounted) {
          setState(() {
            _phase = _Phase.result;
            _statusText = 'No camera found on this device.';
          });
        }
        return;
      }
      final front = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );
      _camDesc = front;
      _cam = CameraController(
        front,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: Platform.isAndroid
            ? ImageFormatGroup.nv21
            : ImageFormatGroup.bgra8888,
      );
      await _cam!.initialize();

      if (mounted) {
        setState(() {
          _phase = _Phase.liveness;
          _statusText = _challenges[_challengeIdx].instruction;
        });
        _startStream();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _phase = _Phase.result;
          _statusText = 'Camera error: ${_short(e)}';
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // Camera stream for liveness
  // -----------------------------------------------------------------------

  void _startStream() {
    _cam?.startImageStream(_onCameraFrame);
  }

  void _stopStream() {
    try {
      _cam?.stopImageStream();
    } catch (_) {}
  }

  Future<void> _onCameraFrame(CameraImage camImage) async {
    if (_isDetecting || _phase != _Phase.liveness) return;
    _isDetecting = true;

    try {
      final inputImage = _buildInputImage(camImage);
      if (inputImage == null) {
        _isDetecting = false;
        return;
      }

      final faces = await _faceDetector.processImage(inputImage);
      if (faces.isEmpty) {
        _satisfiedFrames = 0;
        if (mounted) {
          setState(() => _statusText = 'No face detected — look at the camera');
        }
        _isDetecting = false;
        return;
      }

      final face = faces.first;
      final challenge = _challenges[_challengeIdx];
      final passed = _evaluateChallenge(challenge, face);

      if (passed) {
        _satisfiedFrames++;
        if (_satisfiedFrames >= _requiredFrames) {
          // Challenge done
          _satisfiedFrames = 0;
          _challengeIdx++;
          if (_challengeIdx >= _challenges.length) {
            // All challenges passed → capture for embedding
            _stopStream();
            if (mounted) {
              setState(() {
                _phase = _Phase.capturing;
                _statusText = 'Liveness confirmed ✓  Verifying face…';
              });
            }
            await _captureAndVerify();
          } else {
            if (mounted) {
              setState(
                () => _statusText = _challenges[_challengeIdx].instruction,
              );
            }
          }
        }
      } else {
        _satisfiedFrames = 0;
        if (mounted) {
          setState(() => _statusText = challenge.instruction);
        }
      }
    } catch (_) {
      // Silently skip bad frames
    }
    _isDetecting = false;
  }

  InputImage? _buildInputImage(CameraImage camImage) {
    if (_camDesc == null) return null;
    final rotation = InputImageRotationValue.fromRawValue(
      _camDesc!.sensorOrientation,
    );
    if (rotation == null) return null;

    final format = InputImageFormatValue.fromRawValue(camImage.format.raw);
    if (format == null) return null;

    final plane = camImage.planes.first;
    return InputImage.fromBytes(
      bytes: plane.bytes,
      metadata: InputImageMetadata(
        size: Size(
          camImage.width.toDouble(),
          camImage.height.toDouble(),
        ),
        rotation: rotation,
        format: format,
        bytesPerRow: plane.bytesPerRow,
      ),
    );
  }

  // -----------------------------------------------------------------------
  // Liveness challenge evaluation
  // -----------------------------------------------------------------------

  bool _evaluateChallenge(_LivenessChallenge c, Face face) {
    switch (c) {
      case _LivenessChallenge.smile:
        return (face.smilingProbability ?? 0.0) > 0.7;

      case _LivenessChallenge.turnLeft:
        return (face.headEulerAngleY ?? 0.0) > 25;

      case _LivenessChallenge.turnRight:
        return (face.headEulerAngleY ?? 0.0) < -25;
    }
  }

  // -----------------------------------------------------------------------
  // Capture + embedding verification
  // -----------------------------------------------------------------------

  Future<void> _captureAndVerify() async {
    if (_cam == null || !_cam!.value.isInitialized) return;
    if (_savedEmbedding == null) return;

    try {
      final xFile = await _cam!.takePicture();
      final bytes = await xFile.readAsBytes();

      final inputImage = InputImage.fromFilePath(xFile.path);
      final faces = await _faceDetector.processImage(inputImage);

      if (faces.isEmpty) {
        _handleFailedAttempt('No face detected during capture.');
        try { await File(xFile.path).delete(); } catch (_) {}
        return;
      }

      final rawImage = img.decodeImage(bytes);
      if (rawImage == null) {
        _handleFailedAttempt('Failed to process image.');
        try { await File(xFile.path).delete(); } catch (_) {}
        return;
      }
      final fullImage = img.bakeOrientation(rawImage);
      final rect = faces.first.boundingBox;

      // Crop with 20 % padding for robust embeddings
      final cropped = FaceRecognizer.cropFace(
        fullImage,
        bboxX: rect.left.toInt(),
        bboxY: rect.top.toInt(),
        bboxW: rect.width.toInt(),
        bboxH: rect.height.toInt(),
        padding: 0.2,
      );

      final embedding = _recognizer.getEmbedding(cropped);
      final dist = _recognizer.distance(embedding, _savedEmbedding!);
      final match = _recognizer.isMatch(embedding, _savedEmbedding!);

      try { await File(xFile.path).delete(); } catch (_) {}

      if (match) {
        setState(() {
          _matched = true;
          _phase = _Phase.result;
          _statusText =
              '✅ Face verified! (distance: ${dist.toStringAsFixed(2)})';
        });
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) Navigator.of(context).pop(true);
      } else {
        _handleFailedAttempt(
          'Face does not match (distance: ${dist.toStringAsFixed(2)}).',
        );
      }
    } catch (e) {
      _handleFailedAttempt('Error: ${_short(e)}');
    }
  }

  void _handleFailedAttempt(String message) {
    _retriesLeft--;
    if (_retriesLeft <= 0) {
      setState(() {
        _phase = _Phase.result;
        _statusText = '❌ Verification failed. No retries left.';
      });
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) Navigator.of(context).pop(false);
      });
    } else {
      // Re-pick challenges and restart liveness
      _pickChallenges();
      setState(() {
        _phase = _Phase.liveness;
        _statusText = _challenges[_challengeIdx].instruction;
      });
      _startStream();
    }
  }

  String _short(Object e) {
    final s = e.toString();
    return s.length > 60 ? s.substring(0, 60) : s;
  }

  // -----------------------------------------------------------------------
  // Build UI
  // -----------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final overlayColor = _matched
        ? const Color(0xFF16A34A)
        : (_retriesLeft <= 0 ? Colors.red : cs.primary);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text(
          'Verify Face',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => Navigator.of(context).pop(false),
        ),
      ),
      body: _phase == _Phase.initialising
          ? const Center(
              child: CircularProgressIndicator(color: Colors.white),
            )
          : (_cam == null)
              ? _buildErrorBody()
              : _buildCameraBody(overlayColor),
    );
  }

  Widget _buildErrorBody() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.white54, size: 48),
            const SizedBox(height: 16),
            Text(
              _statusText,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white, fontSize: 15),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCameraBody(Color overlayColor) {
    return Column(
      children: [
        Expanded(
          child: Stack(
            alignment: Alignment.center,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: CameraPreview(_cam!),
              ),
              // Oval overlay
              IgnorePointer(
                child: CustomPaint(
                  size: Size.infinite,
                  painter: _OvalOverlayPainter(color: overlayColor),
                ),
              ),

              // Challenge indicator (during liveness phase)
              if (_phase == _Phase.liveness)
                Positioned(
                  top: 16,
                  left: 24,
                  right: 24,
                  child: _buildChallengeChips(),
                ),

              // Liveness icon prompt
              if (_phase == _Phase.liveness)
                Positioned(
                  top: 80,
                  child: AnimatedBuilder(
                    animation: _pulseCtrl,
                    builder: (_, __) => Opacity(
                      opacity: 0.5 + _pulseCtrl.value * 0.5,
                      child: Icon(
                        _challenges[_challengeIdx].icon,
                        size: 56,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),

              // Status text
              Positioned(
                bottom: 24,
                left: 24,
                right: 24,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withAlpha(160),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _statusText,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),

              // Retries indicator
              Positioned(
                top: 16,
                right: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withAlpha(160),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Retries: $_retriesLeft',
                    style: TextStyle(
                      color:
                          _retriesLeft <= 1 ? Colors.red.shade300 : Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // During liveness the stream handles everything automatically.
        // Show a hint instead of a button.
        Padding(
          padding: const EdgeInsets.all(24),
          child: _phase == _Phase.liveness
              ? Text(
                  'Follow the prompts above — verification is automatic',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withAlpha(180),
                    fontSize: 13,
                  ),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }

  /// Small progress chips showing which challenges are done / pending.
  Widget _buildChallengeChips() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(_challenges.length, (i) {
        final done = i < _challengeIdx;
        final active = i == _challengeIdx;
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: done
                ? const Color(0xFF16A34A)
                : active
                    ? Colors.white.withAlpha(50)
                    : Colors.white.withAlpha(20),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                done ? Icons.check_rounded : _challenges[i].icon,
                size: 16,
                color: Colors.white,
              ),
              const SizedBox(width: 4),
              Text(
                'Step ${i + 1}',
                style: const TextStyle(color: Colors.white, fontSize: 11),
              ),
            ],
          ),
        );
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// Oval overlay painter (shared style with registration page).
// ---------------------------------------------------------------------------

class _OvalOverlayPainter extends CustomPainter {
  _OvalOverlayPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final ovalRect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height * 0.42),
      width: size.width * 0.65,
      height: size.height * 0.52,
    );

    final bgPaint = Paint()..color = Colors.black.withAlpha(120);
    final ovalPath = Path()..addOval(ovalRect);
    final bgPath = Path()
      ..addRect(rect)
      ..addPath(ovalPath, Offset.zero);
    bgPath.fillType = PathFillType.evenOdd;
    canvas.drawPath(bgPath, bgPaint);

    final borderPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    canvas.drawOval(ovalRect, borderPaint);
  }

  @override
  bool shouldRepaint(covariant _OvalOverlayPainter old) => old.color != color;
}
