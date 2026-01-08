import { Audio } from 'expo-av';

// Global singleton to ensure only one recording exists at a time
let currentRecording: Audio.Recording | null = null;

/**
 * Clean up any existing recording
 */
export async function cleanupRecording(): Promise<void> {
  if (currentRecording) {
    try {
      const status = await currentRecording.getStatusAsync();
      if (status.isRecording) {
        await currentRecording.stopAndUnloadAsync();
      } else if (status.isDoneRecording === false) {
        await currentRecording.stopAndUnloadAsync();
      }
    } catch (e) {
      // Recording might already be unloaded, ignore
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
    // Ignore
  }
}

/**
 * Start a new recording
 */
export async function startRecording(): Promise<Audio.Recording> {
  // Always cleanup first
  await cleanupRecording();

  // Small delay to ensure cleanup is complete
  await new Promise(resolve => setTimeout(resolve, 100));

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );

  currentRecording = recording;
  return recording;
}

/**
 * Stop the current recording and return the URI
 */
export async function stopRecording(): Promise<string | null> {
  if (!currentRecording) return null;

  try {
    await currentRecording.stopAndUnloadAsync();
    const uri = currentRecording.getURI();
    currentRecording = null;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    return uri;
  } catch (e) {
    console.error('Error stopping recording:', e);
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
