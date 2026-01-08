import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

// Global singleton to ensure only one recording exists at a time
let currentRecording: Audio.Recording | null = null;

/**
 * Request microphone permissions
 */
export async function requestPermissions(): Promise<boolean> {
  console.log('[Audio] Requesting permissions...');
  const { granted } = await Audio.requestPermissionsAsync();
  console.log('[Audio] Permission granted:', granted);
  return granted;
}

/**
 * Clean up any existing recording
 */
export async function cleanupRecording(): Promise<void> {
  console.log('[Audio] Cleaning up recording...');
  if (currentRecording) {
    try {
      const status = await currentRecording.getStatusAsync();
      console.log('[Audio] Current recording status:', JSON.stringify(status));
      if (status.canRecord || status.isRecording) {
        await currentRecording.stopAndUnloadAsync();
      }
    } catch (e) {
      console.log('[Audio] Cleanup error (may be expected):', e);
    }
    currentRecording = null;
  }

  // Reset audio mode
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });
  } catch (e) {
    console.log('[Audio] Reset audio mode error:', e);
  }
}

/**
 * Start a new recording
 */
export async function startRecording(): Promise<Audio.Recording> {
  console.log('[Audio] Starting recording...');

  // Always cleanup first
  await cleanupRecording();

  // Small delay to ensure cleanup is complete
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('[Audio] Setting audio mode...');
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    console.log('[Audio] Audio mode set successfully');
  } catch (e) {
    console.error('[Audio] Failed to set audio mode:', e);
    throw e;
  }

  console.log('[Audio] Creating recording...');
  try {
    const { recording, status } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
      (recordingStatus) => {
        // Log status updates during recording
        if (recordingStatus.isRecording) {
          console.log('[Audio] Recording... duration:', recordingStatus.durationMillis, 'ms');
        }
      },
      500 // Update every 500ms
    );

    console.log('[Audio] Recording created successfully');
    console.log('[Audio] Initial status:', JSON.stringify(status));
    currentRecording = recording;
    return recording;
  } catch (e) {
    console.error('[Audio] Failed to create recording:', e);
    throw e;
  }
}

/**
 * Stop the current recording and return the URI
 */
export async function stopRecording(): Promise<string | null> {
  console.log('[Audio] Stopping recording...');

  if (!currentRecording) {
    console.log('[Audio] No recording to stop!');
    return null;
  }

  try {
    // Check status before stopping
    const statusBefore = await currentRecording.getStatusAsync();
    console.log('[Audio] Status before stop:', JSON.stringify(statusBefore));

    await currentRecording.stopAndUnloadAsync();
    const uri = currentRecording.getURI();
    console.log('[Audio] Recording stopped successfully');
    console.log('[Audio] Recording URI:', uri);

    currentRecording = null;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    return uri;
  } catch (e) {
    console.error('[Audio] Error stopping recording:', e);
    currentRecording = null;
    return null;
  }
}

/**
 * Check if currently recording
 */
export function isCurrentlyRecording(): boolean {
  return currentRecording !== null;
}

/**
 * Get current recording status
 */
export async function getRecordingStatus(): Promise<Audio.RecordingStatus | null> {
  if (!currentRecording) return null;
  try {
    return await currentRecording.getStatusAsync();
  } catch (e) {
    return null;
  }
}
