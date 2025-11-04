//
//  ShopView.swift
//  ChromaMerge
//
//  In-App Purchase shop implementing research-backed monetization
//

import SwiftUI

struct ShopView: View {
    @EnvironmentObject var gameManager: GameManager
    @EnvironmentObject var monetizationManager: MonetizationManager
    @Binding var isPresented: Bool
    @State private var selectedProduct: IAPProduct?
    @State private var showPurchaseConfirmation = false

    var body: some View {
        ZStack {
            Color.black.opacity(0.8)
                .ignoresSafeArea()
                .onTapGesture {
                    isPresented = false
                }

            VStack(spacing: 20) {
                // Header
                HStack {
                    Text("💎 Shop")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Spacer()

                    Button(action: { isPresented = false }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title)
                            .foregroundColor(.white)
                    }
                }
                .padding()

                ScrollView {
                    VStack(spacing: 16) {
                        // Premium Subscription (Featured)
                        if let premium = monetizationManager.iapProducts.first(where: { $0.type == .subscription }) {
                            PremiumCard(product: premium)
                                .onTapGesture {
                                    selectedProduct = premium
                                    showPurchaseConfirmation = true
                                }
                        }

                        // Gem Packs
                        Text("Gem Packs")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal)

                        ForEach(monetizationManager.iapProducts.filter { $0.type == .consumable }) { product in
                            ProductCard(product: product)
                                .onTapGesture {
                                    selectedProduct = product
                                    showPurchaseConfirmation = true
                                }
                        }

                        // Power-ups
                        Text("Power-ups")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal)

                        ForEach(monetizationManager.iapProducts.filter { $0.type == .nonConsumable }) { product in
                            ProductCard(product: product)
                                .onTapGesture {
                                    selectedProduct = product
                                    showPurchaseConfirmation = true
                                }
                        }
                    }
                    .padding()
                }
            }
            .frame(maxWidth: 500)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color(red: 0.1, green: 0.1, blue: 0.2))
            )
            .padding()
        }
        .alert("Purchase \(selectedProduct?.name ?? "")?", isPresented: $showPurchaseConfirmation) {
            Button("Buy \(selectedProduct?.priceString ?? "")") {
                if let product = selectedProduct {
                    let success = monetizationManager.purchaseProduct(product, gameManager: gameManager)
                    if success {
                        // Show success feedback
                    }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(selectedProduct?.description ?? "")
        }
    }
}

struct PremiumCard: View {
    let product: IAPProduct

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "crown.fill")
                    .font(.title)
                    .foregroundColor(.yellow)

                VStack(alignment: .leading) {
                    Text(product.name)
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    Text(product.description)
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                Spacer()

                Text(product.priceString)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }

            HStack(spacing: 20) {
                FeatureBadge(icon: "diamond.fill", text: "50 Daily Gems")
                FeatureBadge(icon: "paintpalette.fill", text: "Exclusive Colors")
                FeatureBadge(icon: "eye.slash.fill", text: "No Ads")
            }
        }
        .padding()
        .background(
            LinearGradient(
                colors: [Color.purple.opacity(0.3), Color.blue.opacity(0.3)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.yellow, lineWidth: 2)
        )
    }
}

struct ProductCard: View {
    let product: IAPProduct

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(product.name)
                    .font(.headline)
                    .foregroundColor(.white)
                Text(product.description)
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            if let gems = product.gems {
                HStack(spacing: 4) {
                    Image(systemName: "diamond.fill")
                        .foregroundColor(.cyan)
                    Text("\(gems)")
                        .foregroundColor(.white)
                }
            }

            Text(product.priceString)
                .font(.headline)
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.green)
                .cornerRadius(8)
        }
        .padding()
        .background(Color.white.opacity(0.1))
        .cornerRadius(12)
    }
}

struct FeatureBadge: View {
    let icon: String
    let text: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .foregroundColor(.yellow)
            Text(text)
                .font(.caption2)
                .foregroundColor(.white)
        }
    }
}
