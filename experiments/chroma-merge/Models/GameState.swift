//
//  GameState.swift
//  ChromaMerge
//
//  Core game state and logic
//

import Foundation
import Combine

class GameManager: ObservableObject {
    @Published var containers: [Container] = []
    @Published var currentLevel: Int = 1
    @Published var moves: Int = 0
    @Published var score: Int = 0
    @Published var highScore: Int = 0
    @Published var discoveredColors: Set<GameColor> = []
    @Published var selectedContainer: Container?
    @Published var isGameWon: Bool = false
    @Published var isGameOver: Bool = false

    // Progression
    @Published var playerLevel: Int = 1
    @Published var experience: Int = 0
    @Published var totalGamesPlayed: Int = 0
    @Published var totalMixesCreated: Int = 0

    // Currency (soft currency for F2P model)
    @Published var gems: Int = 100 // Starting gems

    private var cancellables = Set<AnyCancellable>()

    init() {
        startNewGame()
        loadProgress()
    }

    func startNewGame() {
        isGameWon = false
        isGameOver = false
        moves = 0
        selectedContainer = nil
        generateLevel(level: currentLevel)
    }

    func generateLevel(level: Int) {
        let numContainers = min(4 + level / 3, 8) // 4-8 containers
        let containerCapacity = 4
        let numColors = min(3 + level / 2, 6) // 3-6 colors

        // Generate pure colors to be sorted
        var allOrbs: [ColorOrb] = []
        let baseColors: [GameColor] = [.red, .blue, .yellow, .orange, .green, .purple]

        for i in 0..<numColors {
            for _ in 0..<containerCapacity {
                allOrbs.append(ColorOrb(color: baseColors[i]))
            }
        }

        // Shuffle orbs
        allOrbs.shuffle()

        // Create containers
        containers = []
        var orbIndex = 0

        // Fill containers with shuffled orbs
        for _ in 0..<numContainers - 2 {
            var container = Container(orbs: [], capacity: containerCapacity)
            for _ in 0..<containerCapacity where orbIndex < allOrbs.count {
                container.orbs.append(allOrbs[orbIndex])
                orbIndex += 1
            }
            containers.append(container)
        }

        // Add empty containers for manipulation
        containers.append(Container(orbs: [], capacity: containerCapacity))
        containers.append(Container(orbs: [], capacity: containerCapacity))
    }

    func selectContainer(_ container: Container) {
        if let selected = selectedContainer {
            // Attempt to move/mix
            if container.id != selected.id {
                moveOrb(from: selected, to: container)
            }
            selectedContainer = nil
        } else {
            if !container.isEmpty {
                selectedContainer = container
            }
        }
    }

    func moveOrb(from source: Container, to destination: Container) {
        guard let sourceIndex = containers.firstIndex(where: { $0.id == source.id }),
              let destIndex = containers.firstIndex(where: { $0.id == destination.id }),
              !source.isEmpty,
              !destination.isFull else {
            return
        }

        let orb = containers[sourceIndex].orbs.removeLast()

        // Check if mixing should occur
        if containers[destIndex].canMixWith(orb) {
            if let mixedOrb = containers[destIndex].mixTopOrb(with: orb) {
                containers[destIndex].orbs.append(mixedOrb)
                discoveredColors.insert(mixedOrb.color)
                totalMixesCreated += 1
                score += mixedOrb.rarity.rawValue.count * 10
            }
        } else {
            containers[destIndex].orbs.append(orb)
        }

        moves += 1
        checkWinCondition()
    }

    func checkWinCondition() {
        let completedContainers = containers.filter { $0.isComplete }
        let requiredComplete = containers.count - 2

        if completedContainers.count >= requiredComplete {
            isGameWon = true
            winLevel()
        }
    }

    func winLevel() {
        let levelBonus = currentLevel * 100
        score += levelBonus

        // Award experience
        let expGain = 50 + (currentLevel * 10)
        experience += expGain

        // Level up check
        let expNeeded = playerLevel * 100
        if experience >= expNeeded {
            playerLevel += 1
            experience = 0
            gems += 50 // Reward on level up
        }

        // Award gems based on performance
        let moveBonus = max(0, 50 - moves) // Fewer moves = more gems
        gems += moveBonus / 10

        totalGamesPlayed += 1

        if score > highScore {
            highScore = score
        }

        saveProgress()
    }

    func nextLevel() {
        currentLevel += 1
        startNewGame()
    }

    func restartLevel() {
        startNewGame()
    }

    func undoMove() -> Bool {
        // Cost: 10 gems or watch ad
        guard gems >= 10 else { return false }
        gems -= 10
        // Simplified: Just restart the level for now
        restartLevel()
        return true
    }

    func useHint() -> Bool {
        // Cost: 20 gems or watch ad
        guard gems >= 20 else { return false }
        gems -= 20
        // TODO: Implement actual hint logic
        return true
    }

    // Persistence
    func saveProgress() {
        UserDefaults.standard.set(playerLevel, forKey: "playerLevel")
        UserDefaults.standard.set(experience, forKey: "experience")
        UserDefaults.standard.set(gems, forKey: "gems")
        UserDefaults.standard.set(highScore, forKey: "highScore")
        UserDefaults.standard.set(totalGamesPlayed, forKey: "totalGamesPlayed")
        UserDefaults.standard.set(totalMixesCreated, forKey: "totalMixesCreated")
    }

    func loadProgress() {
        playerLevel = UserDefaults.standard.integer(forKey: "playerLevel")
        if playerLevel == 0 { playerLevel = 1 }
        experience = UserDefaults.standard.integer(forKey: "experience")
        gems = UserDefaults.standard.integer(forKey: "gems")
        if gems == 0 { gems = 100 }
        highScore = UserDefaults.standard.integer(forKey: "highScore")
        totalGamesPlayed = UserDefaults.standard.integer(forKey: "totalGamesPlayed")
        totalMixesCreated = UserDefaults.standard.integer(forKey: "totalMixesCreated")
    }
}
