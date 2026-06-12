/**
 * English dictionary — the canonical shape. `ar.ts` must satisfy `Dictionary`,
 * so a missing translation is a compile error, not a runtime surprise.
 */
export const en = {
  appName: 'KeyMaster',
  tagline: 'Become a Windows 11 power user',

  nav: {
    learn: 'Learn',
    practice: 'Practice',
    typing: 'Typing',
    simulator: 'Simulator',
    arena: 'Arena',
    stats: 'Stats',
  },

  landing: {
    heroTitle: 'Master every Windows 11 shortcut',
    heroSubtitle:
      'Interactive lessons, spaced repetition and a competitive speed arena — with real keyboard detection that measures your actual reflexes.',
    ctaStart: 'Start learning',
    ctaArena: 'Enter the Arena',
    featureLearnTitle: 'Learn by doing',
    featureLearnBody:
      'No multiple choice where it matters: press the real keys and feel the muscle memory build.',
    featureSrsTitle: 'Never forget',
    featureSrsBody:
      'Spaced repetition schedules every shortcut exactly when you are about to forget it.',
    featureArenaTitle: 'Compete on speed',
    featureArenaBody:
      'Sprint against the clock, build combos, and chase personal records measured to the millisecond.',
    statShortcuts: 'shortcuts',
    statCategories: 'categories',
    statLanguages: 'languages',
  },

  common: {
    level: 'Level',
    xp: 'XP',
    streak: 'Streak',
    day: 'day',
    days: 'days',
    accuracy: 'Accuracy',
    avgReaction: 'Avg reaction',
    consistency: 'Consistency',
    bestScore: 'Best score',
    score: 'Score',
    combo: 'Combo',
    maxCombo: 'Max combo',
    correct: 'Correct',
    start: 'Start',
    continue: 'Continue',
    back: 'Back',
    done: 'Done',
    cancel: 'Cancel',
    dailyGoal: 'Daily goal',
  },

  learn: {
    title: 'Learning path',
    subtitle: 'Work through each category to build complete keyboard mastery.',
    lesson: 'Lesson',
    shortcutsLabel: 'shortcuts',
    masteredLabel: 'mastered',
    startLesson: 'Start lesson',
    lessonComplete: 'Lesson complete!',
    xpEarned: 'XP earned',
    backToPath: 'Back to learning path',
  },

  practice: {
    title: 'Practice',
    subtitle: 'Review due shortcuts before they fade.',
    dueNow: 'due now',
    reviewNow: 'Review now',
    allDoneTitle: 'All caught up!',
    allDoneBody: 'No reviews due. Learn new shortcuts or hit the Arena.',
    pressKeys: 'Press the shortcut',
    youPressed: 'You pressed',
    expected: 'Expected',
    tryAgain: 'Try again',
    reveal: 'Reveal',
    next: 'Next',
    correctLabel: 'Correct!',
    wrongLabel: 'Not quite',
    metaRemapNote: 'Browsers reserve the ⊞ Win key — hold Ctrl + Alt instead during practice.',
    winKeyEnable: 'Use the real ⊞ key (fullscreen)',
    winKeyActive: '⊞ live — real shortcuts captured (hold Esc to leave fullscreen)',
    winKeyExit: 'Exit',
    quizPrompt: 'Which keys perform this action?',
    sessionComplete: 'Session complete',
  },

  arena: {
    title: 'Speed Arena',
    subtitle: 'Raw speed, measured honestly. No mercy.',
    sprintTitle: 'Shortcut Sprint',
    sprintDesc: '60 seconds. As many shortcuts as you can. Combos multiply your score.',
    timeAttackTitle: 'Time Attack',
    timeAttackDesc: '20 shortcuts. The clock is the enemy — every millisecond costs points.',
    survivalTitle: 'Survival',
    survivalDesc: 'Three lives. No clock. How long can you last?',
    bossRushTitle: 'Boss Rush',
    bossRushDesc: 'A gauntlet of the hardest shortcuts. Three lives, fifteen bosses.',
    comboRushTitle: 'Combo Rush',
    comboRushDesc: 'One mistake ends the run. Build the longest perfect chain.',
    reactionTitle: 'Reaction Test',
    startRun: 'Start run',
    getReady: 'Get ready…',
    timeLeft: 'Time left',
    elapsed: 'Elapsed',
    lives: 'Lives',
    finalScore: 'Final score',
    newRecord: 'New personal record!',
    runAgain: 'Run again',
    comingSoon: 'Coming soon',
    modesLockedNote: 'More modes unlock as the platform grows.',
  },

  stats: {
    title: 'Your statistics',
    subtitle: 'Progress across every shortcut you have trained.',
    totalXp: 'Total XP',
    shortcutsSeen: 'Shortcuts trained',
    avgAccuracy: 'Average accuracy',
    byCategory: 'Mastery by category',
    noData: 'Complete a lesson to see your statistics.',
  },

  simulator: {
    title: 'Windows 11 Simulator',
    subtitle: 'A living desktop in your browser — complete missions with real shortcuts.',
    mission: 'Mission',
    missionDone: 'Done!',
    needsWinMode: 'Windows owns this combo — it only reaches the browser in real-⊞ fullscreen mode.',
    skip: 'Skip',
    allDoneTitle: 'All missions complete!',
    allDoneBody: 'You drove a whole Windows desktop without touching the mouse.',
    restart: 'Restart missions',
  },

  typing: {
    title: 'Touch Typing',
    subtitle: 'Train raw keyboard speed — accuracy first, then velocity.',
    start: 'Start typing test',
    duration: 'Duration',
    wpm: 'WPM',
    rawWpm: 'Raw WPM',
    bestWpm: 'Best WPM',
    bestStreak: 'Best streak',
    keystrokes: 'Keystrokes',
    typeToBegin: 'Start typing — the clock starts on your first key.',
    tryAgain: 'Try again',
  },

  auth: {
    signIn: 'Sign in',
    signOut: 'Sign out',
    signInTitle: 'Sign in to KeyMaster',
    signInSubtitle: 'Sync progress across devices and compete on global leaderboards.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    sendLink: 'Send magic link',
    linkSent: 'Check your inbox — sign-in link sent.',
    orContinueWith: 'or continue with',
    localNote: 'Your local progress uploads automatically after you sign in.',
  },

  leaderboard: {
    title: 'Global leaderboard',
    subtitle: 'Top Shortcut Sprint runs worldwide.',
    rank: 'Rank',
    player: 'Player',
    empty: 'No runs yet — be the first.',
    signInToCompete: 'Sign in to submit your runs to the leaderboard.',
  },

  a11y: {
    toggleTheme: 'Toggle dark mode',
    switchLanguage: 'Switch language',
  },
} as const;

/** Structural type all locales must satisfy. */
export type Dictionary = {
  [K in keyof typeof en]: (typeof en)[K] extends string
    ? string
    : { [P in keyof (typeof en)[K]]: string };
};
