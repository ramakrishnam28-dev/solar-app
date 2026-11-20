import { Platform } from 'react-native';

/**
 * The Android wireframes (pages 5 and 6 of docs/Solar_EPC_App_Wireframes.pdf) are built first.
 * iOS keeps the floating pill bar until its own design pass.
 * Set EXPO_PUBLIC_DESIGN=ios to preview the iOS chrome in a browser.
 */
export const IOS_DESIGN = Platform.OS === 'ios' || process.env.EXPO_PUBLIC_DESIGN === 'ios';
