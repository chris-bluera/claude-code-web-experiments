//
//  ColorPediaView.swift
//  ChromaMerge
//
//  Educational color theory reference (collection mechanic)
//

import SwiftUI

struct ColorPediaView: View {
    @EnvironmentObject var gameManager: GameManager
    @Binding var isPresented: Bool

    let allColors: [GameColor] = [
        .red, .blue, .yellow,
        .orange, .green, .purple,
        .redOrange, .yellowOrange, .yellowGreen, .blueGreen, .blueViolet, .redViolet,
        .brown, .gray, .white, .black
    ]

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
                    Text("🎨 ColorPedia")
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

                // Progress
                HStack {
                    Text("Discovered: \(gameManager.discoveredColors.count)/\(allColors.count)")
                        .font(.headline)
                        .foregroundColor(.white)

                    Spacer()

                    ProgressView(value: Double(gameManager.discoveredColors.count), total: Double(allColors.count))
                        .tint(.cyan)
                        .frame(width: 150)
                }
                .padding(.horizontal)

                ScrollView {
                    VStack(spacing: 16) {
                        // Primary Colors
                        ColorSection(
                            title: "Primary Colors",
                            colors: [.red, .blue, .yellow],
                            discovered: gameManager.discoveredColors
                        )

                        // Secondary Colors
                        ColorSection(
                            title: "Secondary Colors",
                            colors: [.orange, .green, .purple],
                            discovered: gameManager.discoveredColors
                        )

                        // Tertiary Colors
                        ColorSection(
                            title: "Tertiary Colors",
                            colors: [.redOrange, .yellowOrange, .yellowGreen, .blueGreen, .blueViolet, .redViolet],
                            discovered: gameManager.discoveredColors
                        )

                        // Special Colors
                        ColorSection(
                            title: "Special Colors",
                            colors: [.brown, .gray, .white, .black],
                            discovered: gameManager.discoveredColors
                        )

                        // Color Theory Info
                        VStack(alignment: .leading, spacing: 12) {
                            Text("📚 Color Theory")
                                .font(.headline)
                                .foregroundColor(.white)

                            InfoCard(
                                icon: "1.circle.fill",
                                title: "Primary Colors",
                                description: "Red, Blue, and Yellow cannot be created by mixing other colors"
                            )

                            InfoCard(
                                icon: "2.circle.fill",
                                title: "Secondary Colors",
                                description: "Created by mixing two primary colors: Orange (Red+Yellow), Green (Yellow+Blue), Purple (Blue+Red)"
                            )

                            InfoCard(
                                icon: "3.circle.fill",
                                title: "Tertiary Colors",
                                description: "Created by mixing a primary color with a secondary color"
                            )
                        }
                        .padding()
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
    }
}

struct ColorSection: View {
    let title: String
    let colors: [GameColor]
    let discovered: Set<GameColor>

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .foregroundColor(.white)

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 12) {
                ForEach(colors, id: \.self) { color in
                    ColorCard(color: color, isDiscovered: discovered.contains(color))
                }
            }
        }
    }
}

struct ColorCard: View {
    let color: GameColor
    let isDiscovered: Bool

    var body: some View {
        VStack(spacing: 8) {
            Circle()
                .fill(
                    isDiscovered ?
                    RadialGradient(
                        colors: [color.toColor().opacity(0.8), color.toColor()],
                        center: .topLeading,
                        startRadius: 5,
                        endRadius: 50
                    ) :
                    RadialGradient(
                        colors: [Color.gray.opacity(0.3), Color.gray.opacity(0.5)],
                        center: .center,
                        startRadius: 5,
                        endRadius: 50
                    )
                )
                .frame(width: 60, height: 60)
                .overlay(
                    Circle()
                        .stroke(Color.white.opacity(0.2), lineWidth: 2)
                )

            Text(isDiscovered ? color.name : "???")
                .font(.caption)
                .foregroundColor(isDiscovered ? .white : .gray)
                .multilineTextAlignment(.center)

            if isDiscovered {
                HStack(spacing: 2) {
                    Image(systemName: "star.fill")
                        .font(.caption2)
                        .foregroundColor(.yellow)
                    Text("Lv \(color.mixLevel)")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
            }
        }
        .padding(8)
        .background(Color.white.opacity(isDiscovered ? 0.1 : 0.05))
        .cornerRadius(12)
    }
}

struct InfoCard: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.cyan)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                Text(description)
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(8)
    }
}
