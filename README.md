# GroceryManager

GroceryManager is an Expo React Native app for building a grocery list from shelf prices. You can scan a shelf tag, detect the price and currency, set a quantity, and keep a running total across all items in your list.

## Features

- Shelf price OCR from the camera or photo library
- Expo Go support through a cloud OCR fallback
- Optional on-device OCR in a development build
- Automatic currency detection with a manual currency setting
- Editable grocery items with quantity, price, and check state
- Live subtotal and total calculations across the full list

## Tech stack

- Expo SDK 54
- Expo Router
- React Native
- OCR.space for Expo Go cloud OCR
- ML Kit text recognition for development builds

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start in Expo Go mode:

   ```bash
   npx expo start
   ```

3. Start with a development build for on-device OCR:

   ```bash
   npx expo start --dev-client
   ```

## OCR modes

- `Auto`: uses cloud OCR in Expo Go and native OCR in a development build
- `Cloud OCR`: forces OCR.space scanning
- `On-device OCR`: uses the ML Kit native module and requires a development build

You can optionally set `EXPO_PUBLIC_OCR_SPACE_API_KEY` for better OCR.space limits. If no key is provided, the app falls back to the public demo key.

## Scripts

- `npm run start`
- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run lint`

## Validation

The project has been validated with:

- `npx tsc --noEmit`
- `npm run lint`
