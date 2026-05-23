import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { startTransition, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';

import { GroceryItemCard } from '@/components/grocery-item-card';
import { SummaryCard } from '@/components/summary-card';
import type { DraftItem, GroceryItem } from '@/types/grocery';
import {
  currencyLabels,
  formatCurrencyValue,
  getCurrencyDescription,
  getCurrencySymbol,
  supportedCurrencies,
  type CurrencyPreference,
  type SupportedCurrencyCode,
} from '@/utils/currency';
import { sanitizePrice, sanitizeQuantity } from '@/utils/item-form';
import { formatCurrency } from '@/utils/price-parser';
import { scanPriceFromImage, type OCRMode } from '@/utils/price-ocr';

const defaultDraft: DraftItem = {
  name: '',
  quantity: '1',
  price: '',
};

const lightPalette = {
  background: '#F4F0E6',
  card: '#FFFDF8',
  cardStrong: '#E6F0E3',
  cardMuted: '#F5E8D4',
  accent: '#C9E7C2',
  accentStrong: '#2F6B45',
  secondaryAccent: '#F7D7AF',
  text: '#163322',
  textSecondary: '#5A6C61',
  border: '#D5DED1',
  hero: '#EAF4E0',
};

const darkPalette = {
  background: '#0F1612',
  card: '#18211B',
  cardStrong: '#203127',
  cardMuted: '#31261E',
  accent: '#2C4533',
  accentStrong: '#8FD6A3',
  secondaryAccent: '#7B5A37',
  text: '#F2F7F2',
  textSecondary: '#B2C0B5',
  border: '#304137',
  hero: '#1F2C22',
};

const currencyOptions = supportedCurrencies;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getEffectiveDraftCurrency(
  currencyPreference: CurrencyPreference,
  draft: DraftItem,
  lastDetectedCurrency: SupportedCurrencyCode,
) {
  return currencyPreference === 'auto'
    ? draft.detectedCurrencyCode ?? lastDetectedCurrency
    : currencyPreference;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const palette = colorScheme === 'dark' ? darkPalette : lightPalette;

  const [draft, setDraft] = useState<DraftItem>(defaultDraft);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [busyAction, setBusyAction] = useState<'camera' | 'library' | null>(null);
  const [currencyPreference, setCurrencyPreference] = useState<CurrencyPreference>('auto');
  const [lastDetectedCurrency, setLastDetectedCurrency] = useState<SupportedCurrencyCode>('PHP');
  const [ocrMode, setOcrMode] = useState<OCRMode>('auto');
  const [ocrApiKey, setOcrApiKey] = useState(
    process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY ?? 'helloworld',
  );
  const [notice, setNotice] = useState<string>(
    'Point the camera at a shelf label, then add the item when the detected price looks right.',
  );

  const supportsWideLayout = width > 860;
  const effectiveDraftCurrency = getEffectiveDraftCurrency(
    currencyPreference,
    draft,
    lastDetectedCurrency,
  );
  const priceSymbol = getCurrencySymbol(effectiveDraftCurrency);

  function resolveItemDisplayCurrency(item: GroceryItem) {
    return currencyPreference === 'auto'
      ? item.detectedCurrencyCode ?? item.currencyCode ?? lastDetectedCurrency
      : currencyPreference;
  }

  const summary = useMemo(() => {
    const totalItems = items.length;
    const totalUnits = items.reduce((count, item) => count + item.quantity, 0);
    const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const checkedCost = items
      .filter((item) => item.checked)
      .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const displayCurrencies = items.map((item) =>
      currencyPreference === 'auto'
        ? item.detectedCurrencyCode ?? item.currencyCode ?? lastDetectedCurrency
        : currencyPreference,
    );
    const distinctCurrencies = Array.from(new Set(displayCurrencies));

    return {
      totalItems,
      totalUnits,
      totalCost,
      checkedCost,
      summaryCurrencyCode: distinctCurrencies[0] ?? effectiveDraftCurrency,
      hasMixedCurrencies: distinctCurrencies.length > 1,
      distinctCurrencies,
    };
  }, [currencyPreference, effectiveDraftCurrency, items, lastDetectedCurrency]);

  const hasDraftPrice = draft.price.trim().length > 0;
  const draftQuantity = Math.max(1, Number.parseInt(draft.quantity || '1', 10));
  const draftUnitPrice = Number.parseFloat(draft.price);
  const draftSubtotal = Number.isFinite(draftUnitPrice) ? draftQuantity * draftUnitPrice : 0;

  const plannedTotalLabel = summary.hasMixedCurrencies
    ? 'Mixed'
    : formatCurrency(summary.totalCost, summary.summaryCurrencyCode);
  const checkedTotalLabel = summary.hasMixedCurrencies
    ? 'Mixed'
    : formatCurrency(summary.checkedCost, summary.summaryCurrencyCode);
  const listHeaderTotalLabel = summary.hasMixedCurrencies
    ? 'Mixed currencies'
    : formatCurrency(summary.totalCost, summary.summaryCurrencyCode);
  const usesDemoOCRKey = ocrApiKey.trim() === 'helloworld';
  const useCompressedCapture = ocrMode === 'cloud' || (ocrMode === 'auto' && Constants.appOwnership === 'expo');

  async function scanFromSource(source: 'camera' | 'library') {
    try {
      setBusyAction(source);
      setNotice(
        source === 'camera'
          ? 'Opening the camera for a shelf photo…'
          : 'Opening your photo library…',
      );

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setNotice(
            'Camera access was denied. You can still add prices manually or choose a photo from your library.',
          );
          return;
        }
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: useCompressedCapture ? 0.35 : 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: useCompressedCapture ? 0.35 : 1,
            });

      if (result.canceled || !result.assets[0]) {
        setNotice('No image was selected. Your draft item is still here.');
        return;
      }

      const asset = result.assets[0];
      const scan = await scanPriceFromImage(asset.uri, {
        cloudApiKey: ocrApiKey,
        mode: ocrMode,
      });

      if (scan.detectedCurrencyCode) {
        setLastDetectedCurrency(scan.detectedCurrencyCode);
      }

      setDraft((currentDraft) => ({
        ...currentDraft,
        imageUri: asset.uri,
        price: scan.bestPrice ? scan.bestPrice.toFixed(2) : currentDraft.price,
        detectedCurrencyCode: scan.detectedCurrencyCode ?? currentDraft.detectedCurrencyCode,
        recognizedText: scan.text || currentDraft.recognizedText,
        matchedLine: scan.matchedLine,
      }));

      if (!scan.supported) {
        setNotice(
          scan.message ??
            'OCR is not available in this build yet, so the app kept the image and left the price editable.',
        );
        return;
      }

      if (scan.bestPrice) {
        if (process.env.EXPO_OS === 'ios') {
          await Haptics.selectionAsync();
        }

        const detectedCurrency = scan.detectedCurrencyCode ?? effectiveDraftCurrency;
        const amountLabel = formatCurrency(scan.bestPrice, detectedCurrency);
        const modeLabel = scan.message ? ` ${scan.message}` : '';

        if (currencyPreference === 'auto') {
          setNotice(
            `Detected ${amountLabel} in ${currencyLabels[detectedCurrency]}. You can adjust it before adding the item.${modeLabel}`,
          );
        } else {
          setNotice(
            `Detected ${amountLabel}, but your settings are locked to ${currencyPreference}. You can still edit the price before adding the item.${modeLabel}`,
          );
        }
      } else {
        setNotice(
          'The scan found text, but no confident shelf price. You can type the price manually and still keep the photo for reference.',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown scan error';
      setNotice(`The scan did not finish cleanly: ${message}`);
    } finally {
      setBusyAction(null);
    }
  }

  function adjustQuantity(delta: number) {
    setDraft((currentDraft) => {
      const currentQuantity = Math.max(1, Number.parseInt(currentDraft.quantity || '1', 10));
      return {
        ...currentDraft,
        quantity: String(Math.max(1, currentQuantity + delta)),
      };
    });
  }

  function addItem() {
    const trimmedName = draft.name.trim();
    const quantity = Number.parseInt(draft.quantity || '1', 10);
    const unitPrice = Number.parseFloat(draft.price);

    if (!trimmedName) {
      setNotice('Add an item name first so the list stays readable.');
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setNotice('Enter a valid price, or scan a shelf label so the app can fill it in.');
      return;
    }

    const nextItem: GroceryItem = {
      id: createId(),
      name: trimmedName,
      quantity: Number.isFinite(quantity) ? Math.max(1, quantity) : 1,
      unitPrice,
      currencyCode: effectiveDraftCurrency,
      detectedCurrencyCode: draft.detectedCurrencyCode,
      checked: false,
      imageUri: draft.imageUri,
      recognizedText: draft.recognizedText,
      matchedLine: draft.matchedLine,
    };

    startTransition(() => {
      setItems((currentItems) => [nextItem, ...currentItems]);
    });
    setDraft(defaultDraft);
    setNotice(
      `${trimmedName} was added to the list at ${formatCurrency(
        unitPrice,
        effectiveDraftCurrency,
      )} each.`,
    );
  }

  function toggleChecked(id: string) {
    startTransition(() => {
      setItems((currentItems) =>
        currentItems.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
      );
    });
  }

  function removeItem(id: string) {
    startTransition(() => {
      setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    });
    setNotice('Item removed from the list.');
  }

  function adjustSavedItemQuantity(id: string, delta: number) {
    let updatedItemName = '';

    startTransition(() => {
      setItems((currentItems) =>
        currentItems.map((item) => {
          if (item.id !== id) {
            return item;
          }

          updatedItemName = item.name;
          return {
            ...item,
            quantity: Math.max(1, item.quantity + delta),
          };
        }),
      );
    });

    if (updatedItemName) {
      setNotice(`${updatedItemName} quantity updated. Totals were recomputed.`);
    }
  }

  function saveItemEdits(
    id: string,
    nextValues: { name: string; quantity: number; unitPrice: number },
  ) {
    const trimmedName = nextValues.name.trim();

    if (!trimmedName) {
      setNotice('An item name is still required when editing.');
      return false;
    }

    if (!Number.isFinite(nextValues.quantity) || nextValues.quantity <= 0) {
      setNotice('Quantity needs to stay at 1 or higher.');
      return false;
    }

    if (!Number.isFinite(nextValues.unitPrice) || nextValues.unitPrice <= 0) {
      setNotice('Price needs to be greater than 0.');
      return false;
    }

    startTransition(() => {
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === id
            ? {
                ...item,
                name: trimmedName,
                quantity: Math.max(1, Math.round(nextValues.quantity)),
                unitPrice: nextValues.unitPrice,
              }
            : item,
        ),
      );
    });
    setNotice(`${trimmedName} was updated and the grocery total has been recalculated.`);
    return true;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -70,
          right: -30,
          height: 220,
          width: 220,
          borderRadius: 110,
          backgroundColor: palette.accent,
          opacity: 0.45,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 160,
          left: -50,
          height: 180,
          width: 180,
          borderRadius: 90,
          backgroundColor: palette.secondaryAccent,
          opacity: 0.2,
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 120,
          paddingBottom: 40,
          gap: 18,
        }}>
        <View
          style={{
            gap: 14,
            borderRadius: 32,
            borderCurve: 'continuous',
            padding: 22,
            backgroundColor: palette.hero,
            boxShadow: '0 20px 52px rgba(18, 45, 29, 0.09)',
          }}>
          <Text
            selectable
            style={{
              color: palette.textSecondary,
              fontSize: 12,
              fontWeight: '800',
              letterSpacing: 1.1,
              textTransform: 'uppercase',
            }}>
            Grocery OCR helper
          </Text>
          <Text
            selectable
            style={{
              color: palette.text,
              fontSize: 34,
              lineHeight: 38,
              fontWeight: '900',
            }}>
            Snap shelf prices, track quantity, and keep the total honest.
          </Text>
          <Text
            selectable
            style={{
              color: palette.textSecondary,
              fontSize: 15,
              lineHeight: 22,
              maxWidth: 620,
            }}>
            Build your list while shopping. Take a photo of the price tag, let OCR suggest the shelf
            price, then check items off as they land in your cart.
          </Text>
        </View>

        <View
          style={{
            gap: 16,
            borderRadius: 30,
            borderCurve: 'continuous',
            padding: 20,
            backgroundColor: palette.card,
            boxShadow: '0 18px 52px rgba(13, 37, 23, 0.08)',
          }}>
          <View style={{ gap: 6 }}>
            <Text
              selectable
              style={{
                color: palette.text,
                fontSize: 24,
                fontWeight: '800',
              }}>
              Currency settings
            </Text>
            <Text
              selectable
              style={{
                color: palette.textSecondary,
                fontSize: 14,
                lineHeight: 20,
              }}>
              Pick one currency for the whole trip, or let the scanner auto-detect shelf tags for
              you.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Pressable
              onPress={() => setCurrencyPreference('auto')}
              style={{
                borderRadius: 999,
                borderCurve: 'continuous',
                paddingHorizontal: 16,
                paddingVertical: 11,
                backgroundColor:
                  currencyPreference === 'auto' ? palette.accentStrong : palette.background,
                borderWidth: 1,
                borderColor:
                  currencyPreference === 'auto' ? palette.accentStrong : palette.border,
              }}>
              <Text
                style={{
                  color: currencyPreference === 'auto' ? '#F8FFF8' : palette.text,
                  fontSize: 13,
                  fontWeight: '800',
                }}>
                Auto detect
              </Text>
            </Pressable>

            {currencyOptions.map((currencyCode) => {
              const isSelected = currencyPreference === currencyCode;

              return (
                <Pressable
                  key={currencyCode}
                  onPress={() => setCurrencyPreference(currencyCode)}
                  style={{
                    borderRadius: 999,
                    borderCurve: 'continuous',
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    backgroundColor: isSelected ? palette.cardStrong : palette.background,
                    borderWidth: 1,
                    borderColor: isSelected ? palette.accentStrong : palette.border,
                  }}>
                  <Text
                    style={{
                      color: palette.text,
                      fontSize: 13,
                      fontWeight: '800',
                    }}>
                    {currencyCode}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={{
              gap: 8,
              borderRadius: 22,
              borderCurve: 'continuous',
              backgroundColor: palette.background,
              borderWidth: 1,
              borderColor: palette.border,
              padding: 16,
            }}>
            <Text
              selectable
              style={{
                color: palette.text,
                fontSize: 15,
                fontWeight: '800',
              }}>
              {currencyPreference === 'auto'
                ? `Auto mode is active. Latest detected currency: ${getCurrencyDescription(
                    lastDetectedCurrency,
                  )}`
                : `Manual mode is active. Using ${getCurrencyDescription(currencyPreference)}`}
            </Text>
            <Text
              selectable
              style={{
                color: palette.textSecondary,
                fontSize: 13,
                lineHeight: 19,
              }}>
              {currencyPreference === 'auto'
                ? 'Each scanned item can keep its detected currency. If more than one currency appears in the same list, totals are not converted automatically.'
                : 'All prices and totals will be shown in the currency you selected. This changes formatting only and does not convert amounts.'}
            </Text>
          </View>
        </View>

        <View
          style={{
            gap: 16,
            borderRadius: 30,
            borderCurve: 'continuous',
            padding: 20,
            backgroundColor: palette.card,
            boxShadow: '0 18px 52px rgba(13, 37, 23, 0.08)',
          }}>
          <View style={{ gap: 6 }}>
            <Text
              selectable
              style={{
                color: palette.text,
                fontSize: 24,
                fontWeight: '800',
              }}>
              OCR settings
            </Text>
            <Text
              selectable
              style={{
                color: palette.textSecondary,
                fontSize: 14,
                lineHeight: 20,
              }}>
              Use cloud OCR for Expo Go, or keep native ML Kit for dev builds when you want
              on-device scanning.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(['auto', 'cloud', 'native'] as OCRMode[]).map((mode) => {
              const isSelected = ocrMode === mode;
              const label =
                mode === 'auto'
                  ? 'Auto'
                  : mode === 'cloud'
                    ? 'Cloud OCR'
                    : 'On-device OCR';

              return (
                <Pressable
                  key={mode}
                  onPress={() => setOcrMode(mode)}
                  style={{
                    borderRadius: 999,
                    borderCurve: 'continuous',
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    backgroundColor: isSelected ? palette.cardStrong : palette.background,
                    borderWidth: 1,
                    borderColor: isSelected ? palette.accentStrong : palette.border,
                  }}>
                  <Text
                    style={{
                      color: palette.text,
                      fontSize: 13,
                      fontWeight: '800',
                    }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={{
              gap: 10,
              borderRadius: 22,
              borderCurve: 'continuous',
              backgroundColor: palette.background,
              borderWidth: 1,
              borderColor: palette.border,
              padding: 16,
            }}>
            <Text
              selectable
              style={{
                color: palette.text,
                fontSize: 15,
                fontWeight: '800',
              }}>
              {ocrMode === 'auto'
                ? 'Auto mode uses cloud OCR in Expo Go and native ML Kit in a development build.'
                : ocrMode === 'cloud'
                  ? 'Cloud OCR is forced. This works in Expo Go and uploads shelf photos to OCR.space.'
                  : 'On-device OCR is forced. This requires a development build and will not work in Expo Go.'}
            </Text>
            <Text
              selectable
              style={{
                color: palette.textSecondary,
                fontSize: 13,
                lineHeight: 19,
              }}>
              OCR.space documents a free tier and demo examples using the `helloworld` key. Add
              your own API key for steadier results and higher usage limits.
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="OCR.space API key"
              placeholderTextColor={palette.textSecondary}
              value={ocrApiKey}
              onChangeText={setOcrApiKey}
              style={{
                borderRadius: 16,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: palette.border,
                backgroundColor: palette.card,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: palette.text,
                fontSize: 15,
                fontWeight: '600',
              }}
            />
            <Text
              selectable
              style={{
                color: palette.textSecondary,
                fontSize: 12,
                lineHeight: 18,
              }}>
              {usesDemoOCRKey
                ? 'Demo key in use: good for quick tests, but rate-limited and not reliable for regular shopping.'
                : 'Custom OCR key in use.'}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: supportsWideLayout ? 'row' : 'column',
            gap: 14,
            flexWrap: 'wrap',
          }}>
          <SummaryCard
            accent={palette.accent}
            detail={
              summary.hasMixedCurrencies
                ? 'Multiple currencies are on the list. Switch to one currency setting if this trip should use a single money format.'
                : `${summary.totalItems} distinct item${summary.totalItems === 1 ? '' : 's'} in the cart plan`
            }
            eyebrow="Planned total"
            secondaryTextColor={palette.textSecondary}
            surface={palette.card}
            textColor={palette.text}
            value={plannedTotalLabel}
          />
          <SummaryCard
            accent={palette.secondaryAccent}
            detail={`${summary.totalUnits} unit${summary.totalUnits === 1 ? '' : 's'} across your full list`}
            eyebrow="Quantity"
            secondaryTextColor={palette.textSecondary}
            surface={palette.card}
            textColor={palette.text}
            value={String(summary.totalUnits)}
          />
          <SummaryCard
            accent={palette.accent}
            detail={
              summary.hasMixedCurrencies
                ? 'Checked items are not converted when different currencies are mixed.'
                : `Only checked items roll into this ${summary.summaryCurrencyCode} subtotal`
            }
            eyebrow="Checked off"
            secondaryTextColor={palette.textSecondary}
            surface={palette.card}
            textColor={palette.text}
            value={checkedTotalLabel}
          />
        </View>

        <View
          style={{
            gap: 18,
            borderRadius: 30,
            borderCurve: 'continuous',
            padding: 20,
            backgroundColor: palette.card,
            boxShadow: '0 18px 52px rgba(13, 37, 23, 0.08)',
          }}>
          <View style={{ gap: 6 }}>
            <Text
              selectable
              style={{
                color: palette.text,
                fontSize: 24,
                fontWeight: '800',
              }}>
              New grocery item
            </Text>
            <Text
              selectable
              style={{
                color: palette.textSecondary,
                fontSize: 14,
                lineHeight: 20,
              }}>
              Add the item name first, then either type the price or let the shelf scanner suggest one.
            </Text>
          </View>

          <View style={{ gap: 14 }}>
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  color: palette.textSecondary,
                  fontSize: 12,
                  fontWeight: '800',
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}>
                Item name
              </Text>
              <TextInput
                placeholder="Example: Gala apples"
                placeholderTextColor={palette.textSecondary}
                value={draft.name}
                onChangeText={(value) =>
                  setDraft((currentDraft) => ({ ...currentDraft, name: value }))
                }
                style={{
                  borderRadius: 20,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: palette.border,
                  backgroundColor: palette.background,
                  paddingHorizontal: 16,
                  paddingVertical: 15,
                  color: palette.text,
                  fontSize: 16,
                  fontWeight: '600',
                }}
              />
            </View>

            <View
              style={{
                flexDirection: supportsWideLayout ? 'row' : 'column',
                gap: 14,
              }}>
              <View style={{ flex: 1, gap: 8 }}>
                <Text
                  style={{
                    color: palette.textSecondary,
                    fontSize: 12,
                    fontWeight: '800',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                  }}>
                  Quantity
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderRadius: 20,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: palette.background,
                    padding: 8,
                  }}>
                  <Pressable
                    accessibilityLabel="Decrease quantity"
                    onPress={() => adjustQuantity(-1)}
                    style={{
                      height: 42,
                      width: 42,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 16,
                      borderCurve: 'continuous',
                      backgroundColor: palette.cardMuted,
                    }}>
                    <Text style={{ color: palette.text, fontSize: 22, fontWeight: '700' }}>-</Text>
                  </Pressable>
                  <TextInput
                    keyboardType="number-pad"
                    value={draft.quantity}
                    onChangeText={(value) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        quantity: sanitizeQuantity(value),
                      }))
                    }
                    style={{
                      flex: 1,
                      color: palette.text,
                      textAlign: 'center',
                      fontSize: 18,
                      fontWeight: '700',
                      fontVariant: ['tabular-nums'],
                    }}
                  />
                  <Pressable
                    accessibilityLabel="Increase quantity"
                    onPress={() => adjustQuantity(1)}
                    style={{
                      height: 42,
                      width: 42,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 16,
                      borderCurve: 'continuous',
                      backgroundColor: palette.cardStrong,
                    }}>
                    <Text style={{ color: palette.text, fontSize: 22, fontWeight: '700' }}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ flex: 1, gap: 8 }}>
                <Text
                  style={{
                    color: palette.textSecondary,
                    fontSize: 12,
                    fontWeight: '800',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                  }}>
                  Unit price
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderRadius: 20,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: palette.background,
                    paddingHorizontal: 16,
                    paddingVertical: 4,
                  }}>
                  <Text
                    style={{
                      color: palette.textSecondary,
                      fontSize: 18,
                      fontWeight: '800',
                    }}>
                    {priceSymbol}
                  </Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={palette.textSecondary}
                    value={draft.price}
                    onChangeText={(value) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        price: sanitizePrice(value),
                      }))
                    }
                    style={{
                      flex: 1,
                      color: palette.text,
                      fontSize: 18,
                      fontWeight: '700',
                      fontVariant: ['tabular-nums'],
                      paddingVertical: 11,
                    }}
                  />
                </View>
              </View>
            </View>
          </View>

          <View
            style={{
              flexDirection: supportsWideLayout ? 'row' : 'column',
              gap: 12,
            }}>
            <Pressable
              onPress={() => scanFromSource('camera')}
              style={{
                flex: 1,
                borderRadius: 22,
                borderCurve: 'continuous',
                paddingHorizontal: 18,
                paddingVertical: 16,
                backgroundColor: palette.accentStrong,
              }}>
              <Text
                style={{
                  color: colorScheme === 'dark' ? '#0F1612' : '#F9FFF9',
                  fontSize: 15,
                  fontWeight: '800',
                  textAlign: 'center',
                }}>
                {busyAction === 'camera' ? 'Scanning…' : 'Scan shelf with camera'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => scanFromSource('library')}
              style={{
                flex: 1,
                borderRadius: 22,
                borderCurve: 'continuous',
                paddingHorizontal: 18,
                paddingVertical: 16,
                backgroundColor: palette.cardMuted,
              }}>
              <Text
                style={{
                  color: palette.text,
                  fontSize: 15,
                  fontWeight: '800',
                  textAlign: 'center',
                }}>
                {busyAction === 'library' ? 'Scanning…' : 'Use a photo from library'}
              </Text>
            </Pressable>

            <Pressable
              onPress={addItem}
              style={{
                flex: 1,
                borderRadius: 22,
                borderCurve: 'continuous',
                paddingHorizontal: 18,
                paddingVertical: 16,
                backgroundColor: hasDraftPrice ? palette.cardStrong : palette.cardMuted,
              }}>
              <Text
                style={{
                  color: palette.text,
                  fontSize: 15,
                  fontWeight: '800',
                  textAlign: 'center',
                }}>
                Add item to list
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              gap: 12,
              borderRadius: 24,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: palette.border,
              backgroundColor: palette.background,
              padding: 16,
            }}>
            <Text
              selectable
              style={{
                color: palette.textSecondary,
                fontSize: 12,
                fontWeight: '800',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}>
              Scan feedback
            </Text>
            <Text
              selectable
              style={{
                color: palette.text,
                fontSize: 14,
                lineHeight: 20,
              }}>
              {notice}
            </Text>
            <Text
              selectable
              style={{
                color: palette.textSecondary,
                fontSize: 13,
                lineHeight: 19,
              }}>
              Draft currency in use: {effectiveDraftCurrency}
              {draft.detectedCurrencyCode ? ` · Detected from shelf: ${draft.detectedCurrencyCode}` : ''}
            </Text>
            {hasDraftPrice ? (
              <Text
                selectable
                style={{
                  color: palette.text,
                  fontSize: 14,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                }}>
                Draft item subtotal: {formatCurrency(draftSubtotal, effectiveDraftCurrency)}
              </Text>
            ) : null}

            {draft.imageUri ? (
              <View
                style={{
                  gap: 12,
                  flexDirection: supportsWideLayout ? 'row' : 'column',
                }}>
                <Image
                  source={{ uri: draft.imageUri }}
                  style={{
                    width: supportsWideLayout ? 180 : '100%',
                    height: 140,
                    borderRadius: 18,
                    backgroundColor: palette.cardStrong,
                  }}
                  contentFit="cover"
                />

                <View style={{ flex: 1, gap: 8 }}>
                  {draft.matchedLine ? (
                    <Text
                      selectable
                      style={{
                        color: palette.text,
                        fontSize: 14,
                        fontWeight: '700',
                        lineHeight: 20,
                      }}>
                      Best OCR match: {draft.matchedLine}
                    </Text>
                  ) : null}
                  {draft.recognizedText ? (
                    <Text
                      selectable
                      style={{
                        color: palette.textSecondary,
                        fontSize: 13,
                        lineHeight: 19,
                      }}>
                      {draft.recognizedText.slice(0, 240)}
                      {draft.recognizedText.length > 240 ? '…' : ''}
                    </Text>
                  ) : (
                    <Text
                      selectable
                      style={{
                        color: palette.textSecondary,
                        fontSize: 13,
                        lineHeight: 19,
                      }}>
                      The image is saved in the draft so you can still type a price even if OCR misses.
                    </Text>
                  )}
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ gap: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
            }}>
            <View style={{ gap: 4 }}>
              <Text
                selectable
                style={{
                  color: palette.text,
                  fontSize: 24,
                  fontWeight: '800',
                }}>
                Shopping list
              </Text>
              <Text
                selectable
                style={{
                  color: palette.textSecondary,
                  fontSize: 14,
                  lineHeight: 20,
                }}>
                Tap an item to check it off once it is in the cart.
              </Text>
            </View>

            <View
              style={{
                borderRadius: 999,
                borderCurve: 'continuous',
                backgroundColor: palette.card,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}>
              <Text
                selectable
                style={{
                  color: palette.text,
                  fontSize: 13,
                  fontWeight: '800',
                  fontVariant: ['tabular-nums'],
                }}>
                {listHeaderTotalLabel}
              </Text>
            </View>
          </View>

          {items.length === 0 ? (
            <View
              style={{
                gap: 10,
                borderRadius: 28,
                borderCurve: 'continuous',
                padding: 22,
                backgroundColor: palette.card,
                borderWidth: 1,
                borderColor: palette.border,
              }}>
              <Text
                selectable
                style={{
                  color: palette.text,
                  fontSize: 20,
                  fontWeight: '800',
                }}>
                Your list is waiting for the first item.
              </Text>
              <Text
                selectable
                style={{
                  color: palette.textSecondary,
                  fontSize: 14,
                  lineHeight: 20,
                }}>
                Try adding a name like milk, eggs, or cereal, then scan the shelf label to pull in the price.
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <GroceryItemCard
                key={item.id}
                accentSurface={palette.cardStrong}
                displayCurrencyCode={resolveItemDisplayCurrency(item)}
                formatAmount={formatCurrencyValue}
                item={item}
                onAdjustQuantity={adjustSavedItemQuantity}
                onRemove={removeItem}
                onSaveEdit={saveItemEdits}
                onToggleChecked={toggleChecked}
                secondaryTextColor={palette.textSecondary}
                surface={palette.card}
                textColor={palette.text}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
