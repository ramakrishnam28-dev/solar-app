import { Alert, Platform } from 'react-native';

/** Ask "are you sure?" and call onYes only when confirmed. Works on phone and web. */
export function confirm(title: string, message: string, yesLabel: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: yesLabel, style: 'destructive', onPress: onYes },
  ]);
}
