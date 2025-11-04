//
//  ColorOrb.swift
//  ChromaMerge
//
//  Represents a color orb with mixing capabilities
//

import SwiftUI

struct ColorOrb: Identifiable, Equatable {
    let id = UUID()
    var color: GameColor
    var mixProgress: Double = 0.0 // 0.0 = pure, 1.0 = fully mixed

    var displayColor: Color {
        color.toColor()
    }

    // Calculate rarity based on mix complexity
    var rarity: ColorRarity {
        switch color.mixLevel {
        case 0: return .common
        case 1: return .uncommon
        case 2: return .rare
        case 3: return .epic
        default: return .legendary
        }
    }
}

enum ColorRarity: String {
    case common = "Common"
    case uncommon = "Uncommon"
    case rare = "Rare"
    case epic = "Epic"
    case legendary = "Legendary"

    var color: Color {
        switch self {
        case .common: return .gray
        case .uncommon: return .green
        case .rare: return .blue
        case .epic: return .purple
        case .legendary: return .yellow
        }
    }
}

// Color mixing logic based on color theory
enum GameColor: Equatable, Hashable {
    // Primary colors (level 0)
    case red, blue, yellow

    // Secondary colors (level 1)
    case orange, green, purple

    // Tertiary colors (level 2)
    case redOrange, yellowOrange, yellowGreen, blueGreen, blueViolet, redViolet

    // Special colors (level 3+)
    case brown, gray, white, black

    var mixLevel: Int {
        switch self {
        case .red, .blue, .yellow: return 0
        case .orange, .green, .purple: return 1
        case .redOrange, .yellowOrange, .yellowGreen, .blueGreen, .blueViolet, .redViolet: return 2
        case .brown, .gray: return 3
        case .white, .black: return 4
        }
    }

    func toColor() -> Color {
        switch self {
        case .red: return .red
        case .blue: return .blue
        case .yellow: return .yellow
        case .orange: return .orange
        case .green: return .green
        case .purple: return .purple
        case .redOrange: return Color(red: 1.0, green: 0.27, blue: 0.0)
        case .yellowOrange: return Color(red: 1.0, green: 0.6, blue: 0.0)
        case .yellowGreen: return Color(red: 0.6, green: 0.8, blue: 0.2)
        case .blueGreen: return Color(red: 0.0, green: 0.5, blue: 0.5)
        case .blueViolet: return Color(red: 0.54, green: 0.17, blue: 0.89)
        case .redViolet: return Color(red: 0.78, green: 0.08, blue: 0.52)
        case .brown: return .brown
        case .gray: return .gray
        case .white: return .white
        case .black: return .black
        }
    }

    var name: String {
        switch self {
        case .red: return "Red"
        case .blue: return "Blue"
        case .yellow: return "Yellow"
        case .orange: return "Orange"
        case .green: return "Green"
        case .purple: return "Purple"
        case .redOrange: return "Red-Orange"
        case .yellowOrange: return "Yellow-Orange"
        case .yellowGreen: return "Yellow-Green"
        case .blueGreen: return "Blue-Green"
        case .blueViolet: return "Blue-Violet"
        case .redViolet: return "Red-Violet"
        case .brown: return "Brown"
        case .gray: return "Gray"
        case .white: return "White"
        case .black: return "Black"
        }
    }

    // Color mixing rules based on color theory
    static func mix(_ color1: GameColor, _ color2: GameColor) -> GameColor? {
        let colors = Set([color1, color2])

        // Primary + Primary = Secondary
        if colors == [.red, .yellow] { return .orange }
        if colors == [.yellow, .blue] { return .green }
        if colors == [.blue, .red] { return .purple }

        // Primary + Secondary = Tertiary
        if colors == [.red, .orange] { return .redOrange }
        if colors == [.yellow, .orange] { return .yellowOrange }
        if colors == [.yellow, .green] { return .yellowGreen }
        if colors == [.blue, .green] { return .blueGreen }
        if colors == [.blue, .purple] { return .blueViolet }
        if colors == [.red, .purple] { return .redViolet }

        // Complex mixes = Brown/Gray
        if color1.mixLevel >= 2 && color2.mixLevel >= 2 {
            return .brown
        }

        // All three primaries = Brown
        // (handled by progressive mixing)

        return nil
    }
}
