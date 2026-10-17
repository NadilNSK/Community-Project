import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

export default function QrPassModal({ visible, passData, onClose }) {
  if (!passData) return null;

  const sizes =
    passData.sizeBreakdown && typeof passData.sizeBreakdown === 'object'
      ? Object.entries(passData.sizeBreakdown)
      : [];

  const handlePrintThermalPass = async () => {
    try {
      const sizeHtml = sizes
        .map(
          ([sz, qty]) =>
            `<div style="border:1px solid #000;padding:4px 8px;text-align:center;flex:1;">
              <div style="font-size:10px;font-weight:bold;">SIZE ${sz}</div>
              <div style="font-size:14px;font-weight:900;">${qty}</div>
            </div>`
        )
        .join('');

      const html = `
        <html>
          <body style="font-family: monospace; width: 340px; margin: 0 auto; padding: 14px; border: 2px solid #000;">
            <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px;">
              <div style="font-size: 11px; font-weight: bold;">TRENDY (SE APPAREL PVT LTD)</div>
              <div style="font-size: 18px; font-weight: 900; margin-top: 2px;">MASTER TRANSFER GATE PASS</div>
              <div style="display:inline-block; background:#000; color:#fff; padding: 3px 10px; font-weight:bold; margin-top:4px;">
                ${passData.transferCode}
              </div>
            </div>
            <div style="text-align: center; margin: 12px 0;">
              <img src="${passData.qrDataUrl}" style="width: 210px; height: 210px; border: 2px solid #000; padding: 4px;" />
              <div style="font-size: 10px; margin-top: 4px;">HMAC-SHA256: ${passData.qrPassHash}</div>
            </div>
            <div style="border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 8px 0; font-size: 12px;">
              <div><strong>FROM:</strong> ${passData.sourceBranch?.branchName || ''}</div>
              <div><strong>TO:</strong> ${passData.destinationBranch?.branchName || ''}</div>
              <div><strong>STYLE:</strong> ${passData.garmentStyle} (${passData.garmentColor})</div>
              <div><strong>VEHICLE:</strong> ${passData.vehicle?.registrationNo || ''}</div>
              <div><strong>DRIVER:</strong> ${passData.vehicle?.driverName || ''} (${passData.vehicle?.driverPhone || ''})</div>
            </div>
            <div style="padding: 10px 0; border-bottom: 2px solid #000;">
              <div style="display:flex; justify-content:space-between; font-size: 16px; font-weight: 900;">
                <span>TOTAL PIECES:</span>
                <span>${passData.dispatchedQty} PCS</span>
              </div>
              <div style="display:flex; gap: 6px; margin-top: 8px;">${sizeHtml}</div>
            </div>
            <div style="font-size: 10px; padding-top: 6px; display:flex; justify-content:space-between;">
              <span>Issued: ${new Date(passData.createdAt).toLocaleString()}</span>
              <span>203 DPI Thermal</span>
            </div>
          </body>
        </html>
      `;

      await Print.printAsync({ html });
    } catch (err) {
      Alert.alert('Print Error', err.message || 'Unable to launch thermal print dialog.');
    }
  };

  const handleSharePdfPass = async () => {
    try {
      const html = `
        <html>
          <body style="font-family: sans-serif; padding: 24px;">
            <h2>TRENDY (SE APPAREL PVT LTD) - MASTER GATE PASS (${passData.transferCode})</h2>
            <img src="${passData.qrDataUrl}" style="width: 240px; height: 240px;" />
            <p><strong>HMAC-SHA256:</strong> ${passData.qrPassHash}</p>
            <p><strong>From:</strong> ${passData.sourceBranch?.branchName}</p>
            <p><strong>To:</strong> ${passData.destinationBranch?.branchName}</p>
            <p><strong>Style:</strong> ${passData.garmentStyle} (${passData.garmentColor})</p>
            <p><strong>Dispatched Quantity:</strong> ${passData.dispatchedQty} Pieces</p>
            <p><strong>Vehicle:</strong> ${passData.vehicle?.registrationNo} - ${passData.vehicle?.driverName}</p>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('PDF Saved', `Saved to: ${uri}`);
      }
    } catch (err) {
      Alert.alert('Share Error', err.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>203 DPI Thermal Master QR Gate Pass</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.thermalLabel}>
              <Text style={styles.brandSub}>TRENDY (SE APPAREL PVT LTD)</Text>
              <Text style={styles.labelTitle}>MASTER TRANSFER GATE PASS</Text>
              <View style={styles.codeBadge}>
                <Text style={styles.codeText}>{passData.transferCode}</Text>
              </View>

              {passData.qrDataUrl ? (
                <Image
                  source={{ uri: passData.qrDataUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : null}

              <Text style={styles.hashText}>
                HMAC-SHA256: {passData.qrPassHash?.slice(0, 20)}...
              </Text>

              <View style={styles.metaSection}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>FROM PLANT:</Text>
                  <Text style={styles.metaVal}>{passData.sourceBranch?.branchName}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>TO PLANT:</Text>
                  <Text style={styles.metaVal}>{passData.destinationBranch?.branchName}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>STYLE / COLOR:</Text>
                  <Text style={styles.metaVal}>
                    {passData.garmentStyle} ({passData.garmentColor})
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>VEHICLE REG:</Text>
                  <Text style={styles.metaVal}>{passData.vehicle?.registrationNo}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>DRIVER:</Text>
                  <Text style={styles.metaVal}>
                    {passData.vehicle?.driverName} ({passData.vehicle?.driverPhone})
                  </Text>
                </View>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>CONSOLIDATED QTY:</Text>
                <Text style={styles.totalValue}>{passData.dispatchedQty} PCS</Text>
              </View>

              {sizes.length > 0 && (
                <View style={styles.sizeGrid}>
                  {sizes.map(([sz, count]) => (
                    <View key={sz} style={styles.sizeCell}>
                      <Text style={styles.sizeName}>SIZE {sz}</Text>
                      <Text style={styles.sizeCount}>{count}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.printBtn} onPress={handlePrintThermalPass}>
              <Ionicons name="print" size={18} color="#ffffff" />
              <Text style={styles.printBtnText}>Print Thermal Label</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareBtn} onPress={handleSharePdfPass}>
              <Ionicons name="share-outline" size={18} color="#0f172a" />
              <Text style={styles.shareBtnText}>Share PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  thermalLabel: {
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  brandSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#334155',
  },
  labelTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#000000',
    marginTop: 2,
  },
  codeBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  codeText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  qrImage: {
    width: 200,
    height: 200,
    marginVertical: 10,
  },
  hashText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#475569',
    marginBottom: 10,
  },
  metaSection: {
    width: '100%',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#000000',
    paddingVertical: 8,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaKey: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  metaVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  totalRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    fontFamily: 'monospace',
  },
  sizeGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: 6,
    marginTop: 4,
  },
  sizeCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 6,
    paddingVertical: 4,
    alignItems: 'center',
  },
  sizeName: {
    fontSize: 9,
    fontWeight: '800',
    color: '#334155',
  },
  sizeCount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  printBtn: {
    flex: 2,
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  printBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 13,
  },
});
