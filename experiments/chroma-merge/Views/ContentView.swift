//
//  ContentView.swift
//  ChromaMerge
//
//  Main game view
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var gameManager: GameManager
    @EnvironmentObject var monetizationManager: MonetizationManager
    @State private var showShop = false
    @State private var showStats = false
    @State private var showColorPedia = false

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color(red: 0.1, green: 0.1, blue: 0.2),
                        Color(red: 0.2, green: 0.15, blue: 0.3)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 20) {
                // Header
                HeaderView(showShop: $showShop, showStats: $showStats, showColorPedia: $showColorPedia)

                // Game Board
                GameBoardView()
                    .padding(.horizontal)

                // Controls
                ControlsView()

                Spacer()
            }
            .padding(.top)

            // Overlays
            if gameManager.isGameWon {
                WinOverlayView()
            }

            if showShop {
                ShopView(isPresented: $showShop)
            }

            if showStats {
                StatsView(isPresented: $showStats)
            }

            if showColorPedia {
                ColorPediaView(isPresented: $showColorPedia)
            }
        }
    }
}

struct HeaderView: View {
    @EnvironmentObject var gameManager: GameManager
    @EnvironmentObject var monetizationManager: MonetizationManager
    @Binding var showShop: Bool
    @Binding var showStats: Bool
    @Binding var showColorPedia: Bool

    var body: some View {
        HStack {
            // Level & Score
            VStack(alignment: .leading, spacing: 4) {
                Text("Level \(gameManager.currentLevel)")
                    .font(.headline)
                    .foregroundColor(.white)
                Text("Score: \(gameManager.score)")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }

            Spacer()

            // Gems
            Button(action: { showShop = true }) {
                HStack(spacing: 4) {
                    Image(systemName: "diamond.fill")
                        .foregroundColor(.cyan)
                    Text("\(gameManager.gems)")
                        .font(.headline)
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.white.opacity(0.1))
                .cornerRadius(20)
            }

            // Stats button
            Button(action: { showStats = true }) {
                Image(systemName: "chart.bar.fill")
                    .foregroundColor(.white)
                    .padding(8)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(8)
            }

            // ColorPedia button
            Button(action: { showColorPedia = true }) {
                Image(systemName: "book.fill")
                    .foregroundColor(.white)
                    .padding(8)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(8)
            }
        }
        .padding(.horizontal)
    }
}

struct GameBoardView: View {
    @EnvironmentObject var gameManager: GameManager

    let columns = [
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible())
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            ForEach(gameManager.containers) { container in
                ContainerView(container: container)
                    .onTapGesture {
                        gameManager.selectContainer(container)
                    }
            }
        }
    }
}

struct ContainerView: View {
    @EnvironmentObject var gameManager: GameManager
    let container: Container

    var isSelected: Bool {
        gameManager.selectedContainer?.id == container.id
    }

    var body: some View {
        VStack(spacing: 4) {
            ForEach(container.orbs) { orb in
                OrbView(orb: orb)
            }

            // Empty slots
            ForEach(0..<(container.capacity - container.orbs.count), id: \.self) { _ in
                Circle()
                    .fill(Color.white.opacity(0.1))
                    .frame(width: 50, height: 50)
            }
        }
        .padding(8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.05))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isSelected ? Color.cyan : Color.clear, lineWidth: 3)
                )
        )
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.spring(response: 0.3), value: isSelected)
    }
}

struct OrbView: View {
    let orb: ColorOrb

    var body: some View {
        ZStack {
            Circle()
                .fill(
                    RadialGradient(
                        colors: [orb.displayColor.opacity(0.8), orb.displayColor],
                        center: .topLeading,
                        startRadius: 5,
                        endRadius: 30
                    )
                )
                .frame(width: 50, height: 50)
                .shadow(color: orb.displayColor.opacity(0.5), radius: 8)

            // Rarity indicator
            if orb.rarity != .common {
                Circle()
                    .stroke(orb.rarity.color, lineWidth: 2)
                    .frame(width: 50, height: 50)
            }
        }
    }
}

struct ControlsView: View {
    @EnvironmentObject var gameManager: GameManager
    @EnvironmentObject var monetizationManager: MonetizationManager
    @State private var showUndoPrompt = false
    @State private var showHintPrompt = false

    var body: some View {
        HStack(spacing: 20) {
            // Undo
            Button(action: {
                if gameManager.gems >= 10 {
                    _ = gameManager.undoMove()
                } else {
                    showUndoPrompt = true
                }
            }) {
                VStack(spacing: 4) {
                    Image(systemName: "arrow.uturn.backward")
                        .font(.title2)
                    Text("Undo")
                        .font(.caption)
                    Text("10💎")
                        .font(.caption2)
                        .foregroundColor(.cyan)
                }
                .frame(width: 80, height: 80)
                .foregroundColor(.white)
                .background(Color.orange.opacity(0.3))
                .cornerRadius(12)
            }

            // Hint
            Button(action: {
                if gameManager.gems >= 20 {
                    _ = gameManager.useHint()
                } else {
                    showHintPrompt = true
                }
            }) {
                VStack(spacing: 4) {
                    Image(systemName: "lightbulb.fill")
                        .font(.title2)
                    Text("Hint")
                        .font(.caption)
                    Text("20💎")
                        .font(.caption2)
                        .foregroundColor(.cyan)
                }
                .frame(width: 80, height: 80)
                .foregroundColor(.white)
                .background(Color.green.opacity(0.3))
                .cornerRadius(12)
            }

            // Restart
            Button(action: {
                gameManager.restartLevel()
            }) {
                VStack(spacing: 4) {
                    Image(systemName: "arrow.clockwise")
                        .font(.title2)
                    Text("Restart")
                        .font(.caption)
                }
                .frame(width: 80, height: 80)
                .foregroundColor(.white)
                .background(Color.red.opacity(0.3))
                .cornerRadius(12)
            }
        }
        .alert("Watch Ad?", isPresented: $showUndoPrompt) {
            Button("Watch Ad") {
                _ = monetizationManager.watchRewardedAd(rewardType: .undo, gameManager: gameManager)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Watch a short ad to undo your last move")
        }
        .alert("Watch Ad?", isPresented: $showHintPrompt) {
            Button("Watch Ad") {
                _ = monetizationManager.watchRewardedAd(rewardType: .hint, gameManager: gameManager)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Watch a short ad to get a hint")
        }
    }
}

struct WinOverlayView: View {
    @EnvironmentObject var gameManager: GameManager
    @EnvironmentObject var monetizationManager: MonetizationManager

    var body: some View {
        ZStack {
            Color.black.opacity(0.7)
                .ignoresSafeArea()

            VStack(spacing: 30) {
                Text("🎉 Level Complete!")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)

                VStack(spacing: 12) {
                    StatRow(label: "Score", value: "\(gameManager.score)")
                    StatRow(label: "Moves", value: "\(gameManager.moves)")
                    StatRow(label: "Colors Mixed", value: "\(gameManager.totalMixesCreated)")
                    StatRow(label: "Gems Earned", value: "+\(max(0, 50 - gameManager.moves) / 10)")
                }
                .padding()
                .background(Color.white.opacity(0.1))
                .cornerRadius(12)

                Button(action: {
                    gameManager.nextLevel()
                }) {
                    Text("Next Level")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .cornerRadius(12)
                }
                .padding(.horizontal, 40)
            }
            .padding()
        }
    }
}

struct StatRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.gray)
            Spacer()
            Text(value)
                .fontWeight(.bold)
                .foregroundColor(.white)
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(GameManager())
        .environmentObject(MonetizationManager())
}
