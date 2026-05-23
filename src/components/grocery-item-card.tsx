import { useState } from 'react';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { GroceryItem } from '@/types/grocery';
import { sanitizePrice, sanitizeQuantity } from '@/utils/item-form';
import type { SupportedCurrencyCode } from '@/utils/currency';

type GroceryItemCardProps = {
  item: GroceryItem;
  displayCurrencyCode: SupportedCurrencyCode;
  formatAmount: (value: number, currencyCode: SupportedCurrencyCode) => string;
  onAdjustQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onSaveEdit: (id: string, nextValues: { name: string; quantity: number; unitPrice: number }) => boolean;
  onToggleChecked: (id: string) => void;
  surface: string;
  accentSurface: string;
  textColor: string;
  secondaryTextColor: string;
};

export function GroceryItemCard({
  displayCurrencyCode,
  formatAmount,
  accentSurface,
  item,
  onAdjustQuantity,
  onRemove,
  onSaveEdit,
  onToggleChecked,
  secondaryTextColor,
  surface,
  textColor,
}: GroceryItemCardProps) {
  const subtotal = item.quantity * item.unitPrice;
  const itemCurrencyCode = displayCurrencyCode;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQuantity, setEditQuantity] = useState(String(item.quantity));
  const [editPrice, setEditPrice] = useState(item.unitPrice.toFixed(2));

  function openEditor() {
    setEditName(item.name);
    setEditQuantity(String(item.quantity));
    setEditPrice(item.unitPrice.toFixed(2));
    setIsEditing(true);
  }

  function cancelEditor() {
    setEditName(item.name);
    setEditQuantity(String(item.quantity));
    setEditPrice(item.unitPrice.toFixed(2));
    setIsEditing(false);
  }

  function saveEditor() {
    const didSave = onSaveEdit(item.id, {
      name: editName,
      quantity: Math.max(1, Number.parseInt(editQuantity || '1', 10)),
      unitPrice: Number.parseFloat(editPrice),
    });

    if (didSave) {
      setIsEditing(false);
    }
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      exiting={FadeOutUp.duration(220)}
      layout={LinearTransition.springify().damping(18)}
      style={{
        gap: 14,
        borderRadius: 26,
        borderCurve: 'continuous',
        backgroundColor: surface,
        padding: 18,
        boxShadow: '0 18px 48px rgba(17, 40, 27, 0.1)',
      }}>
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.checked ? `Uncheck ${item.name}` : `Check ${item.name}`}
          onPress={() => onToggleChecked(item.id)}
          style={{
            marginTop: 2,
            height: 28,
            width: 28,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: item.checked ? '#2F6B45' : accentSurface,
            borderWidth: 1,
            borderColor: item.checked ? '#2F6B45' : '#C8D9CB',
          }}>
          <Text
            style={{
              color: item.checked ? '#F8FFF8' : '#587060',
              fontSize: 14,
              fontWeight: '800',
            }}>
            {item.checked ? 'OK' : ''}
          </Text>
        </Pressable>

        <View style={{ flex: 1, gap: 6 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 10,
              alignItems: 'flex-start',
            }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                selectable
                style={{
                  color: textColor,
                  fontSize: 18,
                  fontWeight: '800',
                }}>
                {item.name}
              </Text>
              <Text
                selectable
                style={{
                  color: secondaryTextColor,
                  fontSize: 13,
                  lineHeight: 18,
                  fontVariant: ['tabular-nums'],
                }}>
                {item.quantity} x {formatAmount(item.unitPrice, itemCurrencyCode)}
              </Text>
            </View>

            <Text
              selectable
              style={{
                color: textColor,
                fontSize: 18,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
              }}>
              {formatAmount(subtotal, itemCurrencyCode)}
            </Text>
          </View>

          {item.matchedLine ? (
            <Text
              selectable
              style={{
                color: secondaryTextColor,
                fontSize: 12,
                lineHeight: 17,
              }}>
              Matched from shelf text: {item.matchedLine}
            </Text>
          ) : null}
          <Text
            selectable
            style={{
              color: secondaryTextColor,
              fontSize: 12,
              lineHeight: 17,
            }}>
            Currency: {itemCurrencyCode}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}>
            <Text
              selectable
              style={{
                color: secondaryTextColor,
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}>
              Quantity
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderRadius: 18,
                borderCurve: 'continuous',
                backgroundColor: accentSurface,
                padding: 6,
              }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Decrease quantity for ${item.name}`}
                onPress={() => onAdjustQuantity(item.id, -1)}
                style={{
                  height: 32,
                  width: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  backgroundColor: '#F6FAF5',
                }}>
                <Text
                  style={{
                    color: '#264D35',
                    fontSize: 20,
                    fontWeight: '700',
                  }}>
                  -
                </Text>
              </Pressable>
              <Text
                selectable
                style={{
                  minWidth: 28,
                  color: textColor,
                  fontSize: 16,
                  fontWeight: '800',
                  textAlign: 'center',
                  fontVariant: ['tabular-nums'],
                }}>
                {item.quantity}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Increase quantity for ${item.name}`}
                onPress={() => onAdjustQuantity(item.id, 1)}
                style={{
                  height: 32,
                  width: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  backgroundColor: '#F6FAF5',
                }}>
                <Text
                  style={{
                    color: '#264D35',
                    fontSize: 20,
                    fontWeight: '700',
                  }}>
                  +
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {isEditing ? (
        <View
          style={{
            gap: 10,
            borderRadius: 22,
            borderCurve: 'continuous',
            backgroundColor: accentSurface,
            padding: 14,
          }}>
          <Text
            selectable
            style={{
              color: textColor,
              fontSize: 13,
              fontWeight: '800',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}>
            Edit grocery item
          </Text>

          <TextInput
            placeholder="Item name"
            placeholderTextColor={secondaryTextColor}
            value={editName}
            onChangeText={setEditName}
            style={{
              borderRadius: 16,
              borderCurve: 'continuous',
              backgroundColor: surface,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: textColor,
              fontSize: 15,
              fontWeight: '600',
            }}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              keyboardType="number-pad"
              placeholder="Qty"
              placeholderTextColor={secondaryTextColor}
              value={editQuantity}
              onChangeText={(value) => setEditQuantity(sanitizeQuantity(value))}
              style={{
                flex: 1,
                borderRadius: 16,
                borderCurve: 'continuous',
                backgroundColor: surface,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: textColor,
                fontSize: 15,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
              }}
            />
            <TextInput
              keyboardType="decimal-pad"
              placeholder="Price"
              placeholderTextColor={secondaryTextColor}
              value={editPrice}
              onChangeText={(value) => setEditPrice(sanitizePrice(value))}
              style={{
                flex: 1,
                borderRadius: 16,
                borderCurve: 'continuous',
                backgroundColor: surface,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: textColor,
                fontSize: 15,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
              }}
            />
          </View>

          <Text
            selectable
            style={{
              color: secondaryTextColor,
              fontSize: 13,
              fontVariant: ['tabular-nums'],
            }}>
            Edited subtotal:{' '}
            {formatAmount(
              Math.max(1, Number.parseInt(editQuantity || '1', 10)) *
                (Number.parseFloat(editPrice) || 0),
              itemCurrencyCode,
            )}
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Save changes for ${item.name}`}
              onPress={saveEditor}
              style={{
                flex: 1,
                borderRadius: 16,
                borderCurve: 'continuous',
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: '#2F6B45',
              }}>
              <Text
                style={{
                  color: '#F8FFF8',
                  fontSize: 13,
                  fontWeight: '800',
                  textAlign: 'center',
                }}>
                Save changes
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cancel editing ${item.name}`}
              onPress={cancelEditor}
              style={{
                flex: 1,
                borderRadius: 16,
                borderCurve: 'continuous',
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: surface,
              }}>
              <Text
                style={{
                  color: textColor,
                  fontSize: 13,
                  fontWeight: '800',
                  textAlign: 'center',
                }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
        }}>
        <Text
          selectable
          style={{
            color: item.checked ? '#2F6B45' : secondaryTextColor,
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}>
          {item.checked ? 'Picked up' : 'Still on the list'}
        </Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
            onPress={isEditing ? cancelEditor : openEditor}
            style={{
              borderRadius: 999,
              borderCurve: 'continuous',
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: accentSurface,
            }}>
            <Text
              style={{
                color: textColor,
                fontSize: 12,
                fontWeight: '800',
                letterSpacing: 0.2,
              }}>
              {isEditing ? 'Close' : 'Edit'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name}`}
            onPress={() => onRemove(item.id)}
            style={{
              borderRadius: 999,
              borderCurve: 'continuous',
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: '#FFE5DE',
            }}>
            <Text
              style={{
                color: '#A14829',
                fontSize: 12,
                fontWeight: '800',
                letterSpacing: 0.2,
              }}>
              Remove
            </Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
