//
//  Container.swift
//  ChromaMerge
//
//  Container that holds color orbs with mixing logic
//

import Foundation

struct Container: Identifiable, Equatable {
    let id = UUID()
    var orbs: [ColorOrb]
    let capacity: Int
    var isLocked: Bool = false

    var isFull: Bool {
        orbs.count >= capacity
    }

    var isEmpty: Bool {
        orbs.isEmpty
    }

    var isPure: Bool {
        guard !orbs.isEmpty else { return false }
        let firstColor = orbs.first!.color
        return orbs.allSatisfy { $0.color == firstColor }
    }

    var isComplete: Bool {
        isPure && isFull
    }

    // Check if top orb can mix with another color
    func canMixWith(_ orb: ColorOrb) -> Bool {
        guard let topOrb = orbs.last else { return false }
        return GameColor.mix(topOrb.color, orb.color) != nil
    }

    // Mix top orb with incoming orb
    mutating func mixTopOrb(with orb: ColorOrb) -> ColorOrb? {
        guard let topOrb = orbs.last else { return nil }
        guard let mixedColor = GameColor.mix(topOrb.color, orb.color) else { return nil }

        orbs.removeLast()
        return ColorOrb(color: mixedColor, mixProgress: 0.5)
    }
}
