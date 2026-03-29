import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, Platform } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography, borderRadius } from '../constants/theme';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title?: string;
  instruction?: string;
}

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = Math.min(width, height) * 0.7;

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  visible,
  onClose,
  onScan,
  title = 'Scan Barcode',
  instruction = 'Position the Data Matrix code within the frame',
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    onScan(data);
    
    // Reset after delay
    setTimeout(() => {
      setScanned(false);
    }, 2000);
  };

  if (!visible) {
    return null;
  }

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.messageContainer}>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              Requesting camera permission...
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.messageContainer}>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              Camera permission is required to scan barcodes.
            </Text>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={requestPermission}
            >
              <Text style={[styles.permissionButtonText, { color: colors.textInverse }]}>
                Grant Permission
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: [
              'aztec',
              'ean13',
              'ean8',
              'qr',
              'pdf417',
              'upc_e',
              'datamatrix',
              'code39',
              'code93',
              'itf14',
              'codabar',
              'code128',
              'upc_a',
            ],
          }}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top overlay */}
          <View style={[styles.overlayTop, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
            <View style={styles.header}>
              <Text style={styles.overlayTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.overlayCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.overlayInstruction}>{instruction}</Text>
          </View>

          {/* Middle section with scan area */}
          <View style={styles.middleRow}>
            <View style={[styles.sideOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]} />
            
            {/* Scan area with corners */}
            <View style={[styles.scanArea, { width: SCAN_AREA_SIZE, height: SCAN_AREA_SIZE }]}>
              {/* Top-left corner */}
              <View style={[styles.corner, styles.cornerTopLeft, { borderColor: colors.secondary }]} />
              {/* Top-right corner */}
              <View style={[styles.corner, styles.cornerTopRight, { borderColor: colors.secondary }]} />
              {/* Bottom-left corner */}
              <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: colors.secondary }]} />
              {/* Bottom-right corner */}
              <View style={[styles.corner, styles.cornerBottomRight, { borderColor: colors.secondary }]} />
              
              {/* Scanning indicator */}
              {!scanned && (
                <View style={[styles.scanLine, { backgroundColor: colors.secondary }]} />
              )}
            </View>
            
            <View style={[styles.sideOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]} />
          </View>

          {/* Bottom overlay */}
          <View style={[styles.overlayBottom, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
            <Text style={styles.overlayHint}>
              {scanned ? 'Code detected!' : 'Scanning...'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    fontWeight: '700',
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeText: {
    ...typography.body,
    fontWeight: '600',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
  },
  permissionButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    paddingBottom: spacing.xl,
  },
  overlayTitle: {
    ...typography.h2,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  overlayCloseText: {
    ...typography.h3,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  overlayInstruction: {
    ...typography.body,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  middleRow: {
    flexDirection: 'row',
    flex: 1,
  },
  sideOverlay: {
    flex: 1,
  },
  scanArea: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: borderRadius.lg,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: borderRadius.lg,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: borderRadius.lg,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: borderRadius.lg,
  },
  scanLine: {
    width: '80%',
    height: 2,
    opacity: 0.8,
  },
  overlayBottom: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  overlayHint: {
    ...typography.body,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
