# Chroma Merge - Project Structure

## Directory Organization

```
chroma-merge/
├── ChromaMergeApp.swift          # App entry point
├── Models/                       # Data models & game logic
│   ├── ColorOrb.swift           # Color orb with mixing logic
│   ├── Container.swift          # Container for orbs
│   ├── GameState.swift          # Game manager & state
│   └── MonetizationManager.swift # IAP, ads, analytics
├── Views/                        # SwiftUI views
│   ├── ContentView.swift        # Main game screen
│   ├── ShopView.swift           # IAP store
│   ├── StatsView.swift          # Analytics dashboard
│   └── ColorPediaView.swift     # Color collection tracker
├── README.md                     # Comprehensive documentation
└── PROJECT_STRUCTURE.md         # This file

```

## Xcode Project Setup

To run this project in Xcode:

1. **Create New Xcode Project**
   - File → New → Project
   - Choose "iOS" → "App"
   - Product Name: "ChromaMerge"
   - Interface: SwiftUI
   - Language: Swift
   - Minimum iOS: 16.0+

2. **Add Files**
   - Drag all `.swift` files into Xcode project
   - Maintain folder structure (Models/, Views/)
   - Ensure files are added to target

3. **Configure Project**
   - Set Bundle Identifier: `com.yourname.chromamerge`
   - Set Team (for signing)
   - Set Deployment Target: iOS 16.0+

4. **Capabilities (for full version)**
   - In-App Purchase (when implementing StoreKit)
   - Push Notifications (for retention)
   - iCloud (for CloudKit sync)

## File Descriptions

### Entry Point
- **ChromaMergeApp.swift**: SwiftUI app lifecycle, environment setup

### Models (Business Logic)
- **ColorOrb.swift**:
  - `ColorOrb` struct: Individual color with rarity
  - `GameColor` enum: 16 colors with mixing rules
  - `ColorRarity` enum: Common → Legendary tiers

- **Container.swift**:
  - Container for color orbs
  - Capacity management
  - Mixing logic integration

- **GameState.swift**:
  - `GameManager` class: Core game state
  - Level generation algorithm
  - Win/loss detection
  - Progression system (levels, XP, gems)
  - Persistence (UserDefaults)

- **MonetizationManager.swift**:
  - IAP products definition
  - Rewarded ad simulation
  - Analytics (LTV, ARPDAU, conversion)
  - Revenue tracking

### Views (UI)
- **ContentView.swift**:
  - Main game board
  - Header with stats
  - Container grid
  - Control buttons
  - Win overlay

- **ShopView.swift**:
  - IAP product catalog
  - Premium subscription card
  - Purchase flow

- **StatsView.swift**:
  - Player progress stats
  - Monetization metrics
  - Industry benchmarks
  - Performance tracking

- **ColorPediaView.swift**:
  - Color collection display
  - Discovery progress
  - Color theory education
  - Rarity visualization

## Key Design Patterns

### Architecture
- **MVVM** (Model-View-ViewModel)
- **ObservableObject** for state management
- **Environment Objects** for dependency injection
- **Combine** for reactive updates

### Game Logic
- **Color Theory**: Real color mixing rules (RYB model)
- **Rarity System**: Based on color complexity (mix level)
- **Progressive Difficulty**: More colors + containers per level
- **Optimization Scoring**: Bonus for fewer moves

### Monetization
- **Soft Currency**: Gems (earned + purchased)
- **Hard Currency**: Premium subscription
- **Ad-Gated Rewards**: Optional, not forced
- **IAP Tiers**: $0.99, $4.99, $9.99 (research-backed)

## Adding New Features

### New Colors
1. Add to `GameColor` enum
2. Define mixing rules in `mix()` function
3. Update `mixLevel` property
4. Add to ColorPediaView arrays

### New Levels
1. Modify `generateLevel()` in GameState
2. Adjust `numContainers` and `numColors` formulas
3. Add special level types (time-based, limited moves, etc.)

### New IAP Products
1. Add to `setupIAPProducts()` in MonetizationManager
2. Handle purchase in `purchaseProduct()`
3. Add UI in ShopView

### New Mechanics
1. Extend Container or ColorOrb models
2. Add UI controls in ContentView
3. Update win condition logic if needed

## Performance Considerations

### Optimizations Implemented
- Lazy loading for grids
- Efficient color calculations
- Minimal re-renders with @Published
- UserDefaults for fast persistence

### Future Optimizations
- Core Data for complex queries
- Image caching for custom color assets
- Background queue for analytics
- Metal for advanced visual effects

## Testing Strategy

### Unit Tests (Future)
- Color mixing logic
- Win condition detection
- Monetization calculations
- Level generation

### UI Tests (Future)
- Container interaction
- Purchase flow
- Win/loss scenarios
- Navigation

### Analytics to Monitor
- Crash rate (<1%)
- Level completion rate (>70%)
- Session length (8-12 min target)
- Retention (D1/D7/D30)

## Deployment Checklist

### Pre-Launch
- [ ] App Store assets (icon, screenshots, video)
- [ ] Privacy policy (data collection)
- [ ] Terms of service
- [ ] COPPA compliance (if targeting kids)
- [ ] StoreKit IAP products configured
- [ ] Ad network integration (AdMob/Unity)
- [ ] Analytics setup (Firebase)
- [ ] Beta testing (TestFlight)

### Post-Launch
- [ ] Monitor crash reports
- [ ] Track monetization metrics
- [ ] A/B test IAP prices
- [ ] Iterate on retention hooks
- [ ] Regular content updates (new levels)

## Dependencies (Future)

When implementing full version, add:

```swift
// StoreKit for IAP
import StoreKit

// Ad frameworks
import GoogleMobileAds  // AdMob
// OR
import UnityAds          // Unity Ads

// Analytics
import FirebaseAnalytics
import FirebaseCrashlytics

// Cloud Sync
import CloudKit

// Notifications
import UserNotifications
```

---

**Last Updated**: November 2025
**Version**: 1.0 (MVP)
**Swift**: 5.9+
**iOS**: 16.0+
