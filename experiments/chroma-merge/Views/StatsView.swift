//
//  StatsView.swift
//  ChromaMerge
//
//  Analytics dashboard showing monetization metrics
//

import SwiftUI

struct StatsView: View {
    @EnvironmentObject var gameManager: GameManager
    @EnvironmentObject var monetizationManager: MonetizationManager
    @Binding var isPresented: Bool

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
                    Text("📊 Statistics")
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
                    VStack(spacing: 24) {
                        // Player Progress
                        StatSection(title: "Player Progress") {
                            StatItem(label: "Level", value: "\(gameManager.playerLevel)")
                            StatItem(label: "Experience", value: "\(gameManager.experience)/\(gameManager.playerLevel * 100)")
                            StatItem(label: "High Score", value: "\(gameManager.highScore)")
                            StatItem(label: "Total Games", value: "\(gameManager.totalGamesPlayed)")
                            StatItem(label: "Colors Mixed", value: "\(gameManager.totalMixesCreated)")
                            StatItem(label: "Gems", value: "\(gameManager.gems)")
                        }

                        // Monetization Metrics (Research-backed)
                        StatSection(title: "💰 Monetization Analytics") {
                            MetricCard(
                                title: "Lifetime Value (LTV)",
                                value: String(format: "$%.2f", monetizationManager.lifetimeValue),
                                subtitle: "Total revenue generated",
                                color: .green
                            )

                            MetricCard(
                                title: "ARPDAU",
                                value: String(format: "$%.3f", monetizationManager.getARPDAU()),
                                subtitle: "Avg revenue per day (Target: $0.158+)",
                                color: .blue
                            )

                            MetricCard(
                                title: "Days Active",
                                value: "\(monetizationManager.daysActive)",
                                subtitle: "Retention metric",
                                color: .purple
                            )

                            StatItem(label: "Total Revenue", value: String(format: "$%.2f", monetizationManager.totalRevenue))
                            StatItem(label: "IAP Revenue", value: String(format: "$%.2f", monetizationManager.iapRevenue))
                            StatItem(label: "Ad Revenue", value: String(format: "$%.2f", monetizationManager.adRevenue))
                            StatItem(label: "Ads Watched", value: "\(monetizationManager.adsWatched)")
                            StatItem(
                                label: "Conversion Rate",
                                value: String(format: "%.1f%%", monetizationManager.getConversionRate() * 100)
                            )
                        }

                        // Research Benchmarks
                        StatSection(title: "📈 Industry Benchmarks") {
                            BenchmarkCard(
                                metric: "iOS ARPU",
                                actual: monetizationManager.getARPDAU() * 30,
                                target: 57.64,
                                period: "monthly"
                            )

                            BenchmarkCard(
                                metric: "Conversion Rate",
                                actual: monetizationManager.getConversionRate() * 100,
                                target: 3.5,
                                period: "%"
                            )

                            Text("Based on 2024 mobile gaming research")
                                .font(.caption)
                                .foregroundColor(.gray)
                                .padding(.top, 8)
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
    }
}

struct StatSection<Content: View>: View {
    let title: String
    let content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .foregroundColor(.white)

            VStack(spacing: 8) {
                content
            }
            .padding()
            .background(Color.white.opacity(0.05))
            .cornerRadius(12)
        }
    }
}

struct StatItem: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.gray)
            Spacer()
            Text(value)
                .fontWeight(.semibold)
                .foregroundColor(.white)
        }
    }
}

struct MetricCard: View {
    let title: String
    let value: String
    let subtitle: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.gray)
            Text(value)
                .font(.title)
                .fontWeight(.bold)
                .foregroundColor(color)
            Text(subtitle)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(color.opacity(0.1))
        .cornerRadius(8)
    }
}

struct BenchmarkCard: View {
    let metric: String
    let actual: Double
    let target: Double
    let period: String

    var progress: Double {
        min(actual / target, 1.0)
    }

    var isGood: Bool {
        actual >= target
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(metric)
                    .font(.subheadline)
                    .foregroundColor(.white)
                Spacer()
                Image(systemName: isGood ? "checkmark.circle.fill" : "arrow.up.circle.fill")
                    .foregroundColor(isGood ? .green : .orange)
            }

            HStack {
                Text(String(format: "%.2f%@", actual, period == "%" ? "" : period))
                    .font(.headline)
                    .foregroundColor(.white)
                Text("/ \(String(format: "%.2f", target))\(period)")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 6)
                        .cornerRadius(3)

                    Rectangle()
                        .fill(isGood ? Color.green : Color.orange)
                        .frame(width: geometry.size.width * progress, height: 6)
                        .cornerRadius(3)
                }
            }
            .frame(height: 6)
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(8)
    }
}
