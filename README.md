# 🌿 Mental Health Anonymous (Mobile App)

> **Care, shared quietly.**
> A privacy-first mobile application built with **React Native (Expo SDK 58)**, **NativeWind (Tailwind CSS)**, **Expo Router (v58)**, and **Redux Toolkit + RTK Query**.

---

## 📱 Features

- **Account-based dispatch**: Users sign in to send messages; account identity is not included in the message delivered to recipients.
- **Curated Topic Library**: Educational packets covering Anxiety, Depression, Stress & Burnout, Substance Abuse, Grief & Loss, Dementia, Trauma, and Eating Disorders.
- **3-Step Send Flow**:
  1. **Resources**: Load published topics and guides from the backend and choose what to share.
  2. **Destination & Note**: Select Email or SMS, enter recipient details, and add an optional supportive note.
  3. **Review & Consent**: Review the masked destination, confirm appropriate use, then submit to the authenticated message API.
- **Message Delivery**: The backend sends email or SMS through its configured delivery providers and records dispatch details and status.
- **On-Device History**: A masked copy of dispatches is stored locally; clearing it does not delete backend records.
- **Delivery Updates**: Local notification preference toggles.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: [Expo](https://expo.dev) (SDK 58) + React Native 0.88 + React 19.3 — run with Node 22 LTS
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (v58) File-based routing (`app/`)
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS v3/v4)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) + RTK Query
- **Local Persistence**: [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/)
- **Icons**: [@expo/vector-icons](https://icons.expo.fyi/) (Ionicons, Feather, MaterialCommunityIcons)
- **Forms & Validation**: React Hook Form + Zod
- **Feedback & Toasts**: `react-native-toast-message`

---

## 📂 Project Structure

```
├── app/                              # Expo Router file-based routes
│   ├── _layout.tsx                   # Root layout (Providers, Splash, Toast)
│   ├── +not-found.tsx                # 404 handler
│   ├── index.tsx                     # Entry / Splash screen
│   ├── onboarding.tsx                # 3-slide onboarding carousel
│   ├── (tabs)/                       # Bottom tab navigation
│   │   ├── _layout.tsx
│   │   ├── home.tsx                  # Topics catalog
│   │   ├── history.tsx               # Masked send history
│   │   └── settings.tsx              # Settings & local data management
│   ├── topics/
│   │   └── [id].tsx                  # Topic details & packet checklist
│   └── send/
│       ├── recipient.tsx             # Step 1: Recipient & channel selector
│       ├── message.tsx               # Step 2: Supportive note & suggestions
│       ├── review.tsx                # Step 3: Summary review & disclaimer
│       └── success.tsx               # Confirmation screen
│
├── components/                       # Modular UI Components
│   ├── ui/
│   │   ├── shared/                   # AppButton, AppHeader, AppCard, PrivacyNotice, States
│   │   ├── inputs/                   # InputField, TextAreaField
│   │   ├── layouts/                  # ScreenWrapper
│   │   └── modals/                   # CountryPickerModal
│   ├── topic/                        # TopicCard, TopicIcon
│   └── send/                         # DeliveryMethodSelector
│
├── store/                            # Redux State Management
│   ├── index.ts                      # Store configuration
│   ├── hooks.ts                      # Typed useAppDispatch / useAppSelector
│   ├── slices/
│   │   ├── appSlice.ts               # Onboarding, notifications, history with AsyncStorage sync
│   │   └── shareSlice.ts             # Selected topic, recipient, message
│   └── api/
│       └── baseApi.ts                # RTK Query (getTopics, getTopicById, createAnonymousShare)
│
├── types/                            # Domain TypeScript interfaces
├── data/                             # Curated topics and country codes
├── utils/                            # Formatting, masking, and Zod validators
├── constants/                        # Theme colors & design tokens
├── assets/                           # Illustrations and images
├── global.css                        # Tailwind CSS directives
├── metro.config.js                   # Metro config with NativeWind wrapper
├── tailwind.config.js                # Tailwind CSS palette & styling tokens
├── app.json                          # Expo configuration
└── tsconfig.json                     # TypeScript configuration with @/* path alias
```

---

## 🚀 Getting Started

### Configure the API

Set `EXPO_PUBLIC_API_BASE_URL` to the backend origin or its `/api/v1` URL before starting Expo. For example:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
EXPO_PUBLIC_WEBSITE_URL=https://mentalhealthanonymous.org
```

For local development on a phone, put the Mac's LAN IP in `.env.local` (gitignored), e.g. `EXPO_PUBLIC_API_BASE_URL=http://10.10.27.224:3400`; `localhost` does not work from a device. For EAS builds set it as an EAS environment variable.

The mobile app uses the backend for everything: registration, email verification, sign-in, forgot/reset/change password, topics and resources, package payments, message sending, send history (`message/my-messages`) and the community (posts, replies, likes). Native platforms store session tokens with Expo SecureStore; web uses AsyncStorage. Logging out also clears the cached API data.

### Payments (Stripe, for now)

Every message needs one paid package credit, the same as on the website.

1. `app/packages/index.tsx` lists live prices (`package-purchase/prices`) and unused credits (`package-purchase/my-credits`). An unused credit can be used directly.
2. Buying calls `package-purchase/checkout-session` with `returnTo: "app"`. The server returns `checkoutUrl` and `sessionId`.
3. `app/packages/status.tsx` opens Stripe Checkout in the in-app browser (`expo-web-browser`) and polls `package-purchase/session/:sessionId` until Stripe's webhook confirms the payment. It also re-checks when the app returns to the foreground. Payment is only ever confirmed by the server, never by the app.
4. The credit is stored in `share.credit`, and `send/review.tsx` sends it as `packagePurchaseId`. Basic credits cannot attach resources. Messages go to admin review before delivery.

With `returnTo: "app"`, Stripe returns to the website's `/packages/success?source=app` or `/packages?checkout=cancelled&source=app`, which only tell the person to close the window. Deploy the website so those pages exist in production.

**Pending:** Apple App Store / Google Play in-app purchases. The server already has `billingProvider` values `apple_app_store` and `google_play`; it needs receipt-verification endpoints, and the app needs an IAP library (e.g. `react-native-iap`, which requires a development build, not Expo Go). App Store review may reject Stripe checkout for digital goods on iOS, so plan IAP before submitting to the App Store.

**Known gaps:** community posts accept an image URL only (the API has no image upload); Help still uses `mailto:` rather than the `support/contact` endpoint.

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
# Start Expo development server
npm start

# Run on iOS Simulator (macOS required)
npm run ios

# Run on Android Emulator / Connected Device
npm run android

# Run on Web browser
npm run web
```
