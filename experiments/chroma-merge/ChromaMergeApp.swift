//
//  ChromaMergeApp.swift
//  ChromaMerge
//
//  A hybrid-casual sorting-merge puzzle game with color-mixing mechanics
//  Research-driven monetization: IAP + Rewarded Ads + Subscriptions
//

import SwiftUI

@main
struct ChromaMergeApp: App {
    @StateObject private var gameManager = GameManager()
    @StateObject private var monetizationManager = MonetizationManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(gameManager)
                .environmentObject(monetizationManager)
                .preferredColorScheme(.dark)
        }
    }
}
