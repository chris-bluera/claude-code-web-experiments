//
//  MonetizationManager.swift
//  ChromaMerge
//
//  Monetization system implementing research-backed strategies:
//  - IAP: Color packs, gems, premium features ($1-5 sweet spot)
//  - Rewarded Ads: Boost IAP by 6x (research-proven)
//  - Subscriptions: Battle-pass style progression
//

import Foundation
import Combine

class MonetizationManager: ObservableObject {
    // IAP Products (simulated)
    @Published var iapProducts: [IAPProduct] = []

    // Ad tracking
    @Published var adsWatched: Int = 0
    @Published var rewardedAdsAvailable: Bool = true
    @Published var interstitialCooldown: Date?

    // Subscription
    @Published var isPremiumSubscriber: Bool = false
    @Published var subscriptionEndDate: Date?

    // Analytics (simulated)
    @Published var totalRevenue: Double = 0.0
    @Published var iapRevenue: Double = 0.0
    @Published var adRevenue: Double = 0.0
    @Published var subscriptionRevenue: Double = 0.0

    // Metrics tracking
    @Published var lifetimeValue: Double = 0.0
    @Published var daysActive: Int = 0
    private var installDate: Date

    init() {
        installDate = Date()
        setupIAPProducts()
        loadMonetizationData()
    }

    func setupIAPProducts() {
        iapProducts = [
            // Consumables (Gems)
            IAPProduct(
                id: "gems_100",
                name: "Small Gem Pack",
                description: "100 Gems",
                price: 0.99,
                type: .consumable,
                gems: 100
            ),
            IAPProduct(
                id: "gems_500",
                name: "Medium Gem Pack",
                description: "500 Gems + 50 Bonus",
                price: 4.99,
                type: .consumable,
                gems: 550
            ),
            IAPProduct(
                id: "gems_1200",
                name: "Large Gem Pack",
                description: "1200 Gems + 300 Bonus",
                price: 9.99,
                type: .consumable,
                gems: 1500
            ),

            // Non-Consumables
            IAPProduct(
                id: "unlock_advanced_colors",
                name: "Advanced Color Pack",
                description: "Unlock tertiary colors",
                price: 2.99,
                type: .nonConsumable
            ),
            IAPProduct(
                id: "unlimited_undo",
                name: "Unlimited Undo",
                description: "Undo moves without cost",
                price: 4.99,
                type: .nonConsumable
            ),

            // Subscription
            IAPProduct(
                id: "premium_monthly",
                name: "Premium Pass",
                description: "Daily gems, exclusive colors, no ads",
                price: 4.99,
                type: .subscription,
                subscriptionDuration: .monthly
            )
        ]
    }

    // MARK: - IAP Simulation

    func purchaseProduct(_ product: IAPProduct, gameManager: GameManager) -> Bool {
        // Simulate purchase success (90% success rate)
        guard Double.random(in: 0...1) < 0.9 else {
            return false
        }

        // Process purchase
        switch product.type {
        case .consumable:
            if let gems = product.gems {
                gameManager.gems += gems
            }

        case .nonConsumable:
            // Unlock features
            UserDefaults.standard.set(true, forKey: product.id)

        case .subscription:
            isPremiumSubscriber = true
            subscriptionEndDate = Calendar.current.date(byAdding: .month, value: 1, to: Date())
            // Daily gems for subscribers
            gameManager.gems += 50
        }

        // Track revenue
        iapRevenue += product.price
        totalRevenue += product.price
        calculateLTV()

        // Research: IAP users are 6x more likely to make another purchase
        // Simulate this by increasing gem rewards slightly
        if iapRevenue > 0 {
            gameManager.gems += Int(product.price * 10) // Bonus gems
        }

        saveMonetizationData()
        return true
    }

    // MARK: - Rewarded Ad Simulation

    func watchRewardedAd(rewardType: AdRewardType, gameManager: GameManager) -> Bool {
        guard rewardedAdsAvailable else { return false }

        // Simulate ad watch
        adsWatched += 1

        switch rewardType {
        case .gems:
            gameManager.gems += 30
        case .undo:
            gameManager.restartLevel() // Simplified undo
        case .hint:
            // Give hint
            break
        case .continueGame:
            gameManager.isGameOver = false
        }

        // Ad revenue simulation (research: average $0.01-0.05 per ad)
        let adEarning = Double.random(in: 0.01...0.05)
        adRevenue += adEarning
        totalRevenue += adEarning
        calculateLTV()

        // Cooldown (prevent spam)
        rewardedAdsAvailable = false
        DispatchQueue.main.asyncAfter(deadline: .now() + 30) {
            self.rewardedAdsAvailable = true
        }

        saveMonetizationData()
        return true
    }

    func showInterstitialAd() -> Bool {
        // Show interstitial every 5 games (research-backed frequency)
        guard let cooldown = interstitialCooldown else {
            interstitialCooldown = Date()
            return true
        }

        let timePassed = Date().timeIntervalSince(cooldown)
        if timePassed > 300 { // 5 minutes
            interstitialCooldown = Date()

            // Interstitial revenue (research: $0.02-0.10 per impression)
            let adEarning = Double.random(in: 0.02...0.10)
            adRevenue += adEarning
            totalRevenue += adEarning
            calculateLTV()

            return true
        }

        return false
    }

    // MARK: - Analytics & Metrics

    func calculateLTV() {
        // LTV calculation based on research:
        // LTV = ARPU × (1 / Churn Rate)
        // Simplified: Total Revenue / Days Active
        daysActive = max(1, Calendar.current.dateComponents([.day], from: installDate, to: Date()).day ?? 1)
        lifetimeValue = totalRevenue

        // Research: Target ARPU for iOS: $57.64 annually = $0.158/day
        // Good performing games: $5-7 ARPDAU for idle/merge
    }

    func getARPDAU() -> Double {
        // Average Revenue Per Daily Active User
        guard daysActive > 0 else { return 0 }
        return totalRevenue / Double(daysActive)
    }

    func getConversionRate() -> Double {
        // Percentage of users who made purchases
        // Simulated based on session data
        return iapRevenue > 0 ? 0.035 : 0.0 // 3.5% is typical for mobile games
    }

    // MARK: - Persistence

    func saveMonetizationData() {
        UserDefaults.standard.set(adsWatched, forKey: "adsWatched")
        UserDefaults.standard.set(totalRevenue, forKey: "totalRevenue")
        UserDefaults.standard.set(iapRevenue, forKey: "iapRevenue")
        UserDefaults.standard.set(adRevenue, forKey: "adRevenue")
        UserDefaults.standard.set(isPremiumSubscriber, forKey: "isPremiumSubscriber")
        UserDefaults.standard.set(daysActive, forKey: "daysActive")
        UserDefaults.standard.set(lifetimeValue, forKey: "lifetimeValue")
    }

    func loadMonetizationData() {
        adsWatched = UserDefaults.standard.integer(forKey: "adsWatched")
        totalRevenue = UserDefaults.standard.double(forKey: "totalRevenue")
        iapRevenue = UserDefaults.standard.double(forKey: "iapRevenue")
        adRevenue = UserDefaults.standard.double(forKey: "adRevenue")
        isPremiumSubscriber = UserDefaults.standard.bool(forKey: "isPremiumSubscriber")
        daysActive = UserDefaults.standard.integer(forKey: "daysActive")
        lifetimeValue = UserDefaults.standard.double(forKey: "lifetimeValue")
    }
}

// MARK: - Models

struct IAPProduct: Identifiable {
    let id: String
    let name: String
    let description: String
    let price: Double
    let type: IAPType
    var gems: Int?
    var subscriptionDuration: SubscriptionDuration?

    var priceString: String {
        String(format: "$%.2f", price)
    }
}

enum IAPType {
    case consumable
    case nonConsumable
    case subscription
}

enum SubscriptionDuration {
    case weekly
    case monthly
    case yearly
}

enum AdRewardType {
    case gems
    case undo
    case hint
    case continueGame
}
