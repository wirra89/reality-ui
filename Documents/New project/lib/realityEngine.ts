import type { LensId, RealityEntry } from '@/types/reality'

export type EngineInput = {
  situation: string
  mood: number
  stress: number
  confidence: number
}

type ReframeTemplate = { frame: string; action: string }

type EngineRule = {
  keywords: string[]
  primaryLens: LensId
  hiddenAssumption: string
  distortion: string
  betterFrame: string
  bestAction: string
  alternateLenses: LensId[]
}

const RULES: EngineRule[] = [
  {
    keywords: ["didn't reply", "not replying", "no reply", "hasn't texted", "left on read", "hasn't responded", "no message", "not responded"],
    primaryLens: 'mating',
    hiddenAssumption: 'If she cared, she would respond quickly.',
    distortion: 'Mind reading + emotional reasoning',
    betterFrame: 'Response timing is data about her schedule, mood, or habits — not a signal about your worth.',
    bestAction: 'Do not follow up again. Redirect your attention to something that builds you.',
    alternateLenses: ['statistics', 'strategy', 'abundance'],
  },
  {
    keywords: ['ghosted', 'ghost', 'disappeared', 'went silent', 'stopped talking', 'stopped responding'],
    primaryLens: 'mind-reading',
    hiddenAssumption: 'You know why they went silent, and it means something bad about you.',
    distortion: 'Mind reading + personalisation',
    betterFrame: 'You do not have enough information to know why they stopped. Silence is ambiguous, not a verdict.',
    bestAction: 'Treat it as neutral information. Move forward without a resolution you cannot force.',
    alternateLenses: ['statistics', 'mating', 'abundance'],
  },
  {
    keywords: ['rejected', 'rejection', 'turned down', 'said no', "doesn't like me", 'not interested', 'friend zoned', 'friendzoned'],
    primaryLens: 'mating',
    hiddenAssumption: 'Being rejected by this person means you are not enough.',
    distortion: 'Emotional reasoning + overgeneralisation',
    betterFrame: 'Rejection is a filter, not a verdict. It eliminates mismatches — it does not measure your worth.',
    bestAction: 'Acknowledge the outcome, learn what you can, and continue moving forward.',
    alternateLenses: ['statistics', 'abundance', 'logic'],
  },
  {
    keywords: ['fight', 'argument', 'arguing', 'conflict', 'yelled', 'yelling', 'screamed', 'angry at me', 'mad at me', 'disagree'],
    primaryLens: 'strategy',
    hiddenAssumption: 'Winning this argument is the most important outcome.',
    distortion: 'Short-term emotional framing',
    betterFrame: 'Conflicts are negotiation points, not battlegrounds. The long game matters more than this moment.',
    bestAction: 'Identify what you actually want from this relationship long-term, and respond toward that.',
    alternateLenses: ['statistics', 'logic', 'victim-oppressor'],
  },
  {
    keywords: ['failed', 'failure', 'mistake', 'messed up', 'screwed up', 'messed it up', 'ruined', 'blew it'],
    primaryLens: 'winners-losers',
    hiddenAssumption: 'A bad outcome is evidence of permanent inadequacy.',
    distortion: 'Identity collapse + catastrophising',
    betterFrame: 'An outcome can be studied and corrected without becoming a verdict on who you are.',
    bestAction: 'Extract the lesson as a process change. Then take one repair action if available.',
    alternateLenses: ['logic', 'science', 'moist-robot'],
  },
  {
    keywords: ['judging', 'they think', 'everyone thinks', 'what will they think', 'embarrassed', 'embarrassing', 'looked stupid', 'made fun', 'laughed at'],
    primaryLens: 'mind-reading',
    hiddenAssumption: 'Other people are focused on your failure and have drawn a conclusion about you.',
    distortion: 'Mind reading + spotlight effect',
    betterFrame: 'People are mostly thinking about themselves. Your performance in their mind is far smaller than in yours.',
    bestAction: 'Act as if no one is watching — because mostly, they are not.',
    alternateLenses: ['statistics', 'persuasion', 'logic'],
  },
  {
    keywords: ['better than me', 'more successful', 'ahead of me', 'everyone else', 'others are', 'he has', 'she has', 'they have', 'more than me'],
    primaryLens: 'abundance',
    hiddenAssumption: "Someone else's success reduces your possibility.",
    distortion: 'Scarcity framing + social comparison',
    betterFrame: "Another person's progress does not subtract from your path. Races are individual even when they look collective.",
    bestAction: 'Turn your focus from their results to your next action. One is in your control, the other is not.',
    alternateLenses: ['statistics', 'winners-losers', 'logic'],
  },
  {
    keywords: ["can't control", 'out of control', 'anxious', 'anxiety', 'worried', 'what if', 'overthinking', 'spiraling', 'spiral'],
    primaryLens: 'moist-robot',
    hiddenAssumption: 'The worst outcome is probable and you must prepare for it emotionally now.',
    distortion: 'Catastrophising + emotional reasoning',
    betterFrame: 'Your nervous system is producing this output in response to an uncertain future. Uncertainty is not danger.',
    bestAction: 'Name exactly what you can control right now and act only on that.',
    alternateLenses: ['science', 'strategy', 'statistics'],
  },
  {
    keywords: ['deadline', 'boss', 'fired', 'performance review', 'presentation', 'career', 'promotion'],
    primaryLens: 'strategy',
    hiddenAssumption: 'This high-pressure moment determines your long-term trajectory.',
    distortion: 'Magnification + short-term framing',
    betterFrame: 'This is one data point in a long career. Execute the next step well, and let the rest follow.',
    bestAction: 'Identify the single highest-leverage action for the next two hours and do only that.',
    alternateLenses: ['economics', 'logic', 'winners-losers'],
  },
  {
    keywords: ['relationship', 'girlfriend', 'boyfriend', 'partner', 'together', 'break up', 'breaking up', 'feelings for'],
    primaryLens: 'statistics',
    hiddenAssumption: 'The current emotional signal is a reliable predictor of the final outcome.',
    distortion: 'Emotional reasoning + premature conclusion',
    betterFrame: 'Relationships are dynamic systems. One bad moment or one uncertainty does not define the trajectory.',
    bestAction: 'Allow the system more data before drawing conclusions. One conversation is not the pattern.',
    alternateLenses: ['mating', 'strategy', 'logic'],
  },
  {
    keywords: ['stuck', 'going nowhere', 'no progress', 'not improving', 'same place', 'wasting time', 'stagnating', 'plateau'],
    primaryLens: 'strategy',
    hiddenAssumption: 'If progress is not visible, it is not happening.',
    distortion: 'Impatience bias + black-and-white thinking',
    betterFrame: 'Growth is often non-linear. Plateau periods consolidate gains before the next jump.',
    bestAction: 'Review your inputs, not your outputs. Are you doing the right things consistently?',
    alternateLenses: ['winners-losers', 'economics', 'abundance'],
  },
  {
    keywords: ['betrayed', 'lied', 'lied to', 'cheated', 'backstabbed', 'trust', 'disappointed me', 'let me down', 'broke my trust'],
    primaryLens: 'logic',
    hiddenAssumption: "This person's behavior reflects a permanent character flaw that should have been obvious.",
    distortion: 'Hindsight bias + personalisation',
    betterFrame: "People act on their incentives and current state, not on your expectations. This is data about alignment.",
    bestAction: 'Decide what this information means for your future actions, not your past assessment of them.',
    alternateLenses: ['victim-oppressor', 'statistics', 'strategy'],
  },
  {
    keywords: ['sick', 'symptoms', 'disease', 'pain', 'medical', 'diagnosis', 'illness'],
    primaryLens: 'science',
    hiddenAssumption: 'The most alarming explanation is the most likely one.',
    distortion: 'Catastrophising + availability bias',
    betterFrame: 'Symptoms are data. The mechanism matters. Most alarming interpretations are statistically rare.',
    bestAction: 'Gather actual medical information rather than worst-case interpretations.',
    alternateLenses: ['statistics', 'logic', 'moist-robot'],
  },
  {
    keywords: ['money', 'broke', 'debt', 'bills', 'afford', 'financial', 'rent', 'salary', 'income', 'expenses'],
    primaryLens: 'economics',
    hiddenAssumption: 'Your current financial position is fixed and defines your future options.',
    distortion: 'Permanence bias + scarcity framing',
    betterFrame: 'Financial situations are flows, not states. The question is which variable to change.',
    bestAction: 'Write down your actual numbers. Identify one variable you can change this week.',
    alternateLenses: ['abundance', 'strategy', 'logic'],
  },
  {
    keywords: ['instagram', 'social media', 'likes', 'followers', 'views', 'feed', 'validation', 'comments'],
    primaryLens: 'persuasion',
    hiddenAssumption: 'External signals of approval accurately measure your value.',
    distortion: 'Persuasion hijack + social proof bias',
    betterFrame: 'These platforms are engineered to create validation-seeking behavior. The signal is manipulated, not real.',
    bestAction: "Close the app. Name one concrete thing you did today that you are proud of independently of anyone's response.",
    alternateLenses: ['abundance', 'statistics', 'logic'],
  },
  {
    keywords: ['angry', 'rage', 'furious', 'disrespected', 'disrespect', 'insulted', 'provoked', 'pissed', 'infuriating'],
    primaryLens: 'predator-prey',
    hiddenAssumption: 'Reacting immediately is the right response to a threat.',
    distortion: 'Reactive impulse + threat magnification',
    betterFrame: 'Predators choose their moment. An immediate reaction is often the response that serves your opponent, not you.',
    bestAction: 'Wait before responding. Choose the action that costs them more, not the one that feels best now.',
    alternateLenses: ['strategy', 'logic', 'winners-losers'],
  },
  {
    keywords: ['inferior', 'not good enough', 'not worthy', "don't deserve", 'worthless', 'loser', 'pathetic', 'weak'],
    primaryLens: 'winners-losers',
    hiddenAssumption: 'Your current position determines your permanent standing.',
    distortion: 'Identity collapse + permanence bias',
    betterFrame: 'Winners lose most of the time too. The gap between where you are and where you want to be is called a plan.',
    bestAction: 'Identify one skill or action that would close the gap by 1% and start there.',
    alternateLenses: ['logic', 'abundance', 'moist-robot'],
  },
  {
    keywords: ['trapped', 'no way out', 'no choice', 'forced', 'no option', 'no escape', 'stuck with'],
    primaryLens: 'victim-oppressor',
    hiddenAssumption: 'You have no agency in this situation.',
    distortion: 'Learned helplessness + black-and-white thinking',
    betterFrame: 'There are always options — they may all be difficult, but they exist. Feeling trapped is a cognitive state, not a fact.',
    bestAction: 'Write down every option, including uncomfortable ones you have been refusing to consider.',
    alternateLenses: ['strategy', 'logic', 'economics'],
  },
  {
    keywords: ['meaning', 'purpose', 'why bother', 'worth it', 'matters', 'pointless', 'meaningless', "what's the point"],
    primaryLens: 'religion',
    hiddenAssumption: 'Meaning must be discovered externally or it does not exist.',
    distortion: 'Existential catastrophising + passive meaning frame',
    betterFrame: 'Meaning is built through action and commitment, not found through analysis. The question is what you choose to care about.',
    bestAction: 'Choose one thing to commit to for the next 30 days regardless of whether it feels meaningful yet.',
    alternateLenses: ['logic', 'simulation', 'abundance'],
  },
  {
    keywords: ['uncertain', 'uncertainty', "don't know", 'unsure', 'unclear', 'not sure what', 'what happens'],
    primaryLens: 'statistics',
    hiddenAssumption: 'Uncertainty itself is a problem that must be resolved before you can act.',
    distortion: 'Intolerance of uncertainty',
    betterFrame: 'All decisions are made under uncertainty. The question is not certainty — it is which move has the best expected value.',
    bestAction: 'Identify the best move given current information and take it. Gather more data as you go.',
    alternateLenses: ['logic', 'strategy', 'moist-robot'],
  },
]

const FALLBACK_RULE: EngineRule = {
  keywords: [],
  primaryLens: 'logic',
  hiddenAssumption: 'The most intense emotional interpretation is probably the most accurate one.',
  distortion: 'Emotional reasoning',
  betterFrame: 'Intensity is data, not a command. The situation becomes clearer when you separate facts from forecast.',
  bestAction: 'List only the facts you can verify. Then identify the smallest action available.',
  alternateLenses: ['statistics', 'moist-robot', 'strategy'],
}

const LENS_REFRAMES: Record<LensId, ReframeTemplate> = {
  logic: {
    frame: 'Strip away the emotional charge. What are the verifiable facts, and only the facts?',
    action: 'Write down only what you know for certain — no interpretation, no forecast.',
  },
  religion: {
    frame: 'What if this difficulty exists to develop something in you that ease cannot?',
    action: 'Identify one quality this situation could be building in you.',
  },
  mating: {
    frame: 'How does your response to this affect how others perceive your confidence and stability?',
    action: 'Choose the response that signals strength and self-possession, not need.',
  },
  statistics: {
    frame: 'One event is not a trend. What would a larger sample size actually tell you?',
    action: 'List every counter-example you can think of before drawing a conclusion.',
  },
  science: {
    frame: 'What is the mechanism here? What cause produced this effect?',
    action: 'Focus on the process variable you can change, not the outcome you cannot.',
  },
  persuasion: {
    frame: 'Who benefits from you believing the worst interpretation of this?',
    action: 'Ask who installed this frame in your head and whether it serves you.',
  },
  economics: {
    frame: "What are the real incentives driving the other person's behavior?",
    action: 'Stop interpreting intentions. Start mapping incentives.',
  },
  simulation: {
    frame: 'If this is one scenario in a simulation, what would the optimal player do right now?',
    action: 'Make the move the optimal player makes, regardless of how it feels.',
  },
  'winners-losers': {
    frame: 'What does the winner of this situation do next?',
    action: 'Take the action the winner takes, not the one the loser takes.',
  },
  'predator-prey': {
    frame: 'Are you reacting like prey, or responding like a predator who chooses their moment?',
    action: 'Pause. Do not react. Choose your moment.',
  },
  strategy: {
    frame: 'What is the long game here? What move serves you best six months from now?',
    action: 'Take the action that protects your position and keeps options open.',
  },
  abundance: {
    frame: 'This situation looks scarce only because you are zoomed in. Zoom out.',
    action: 'Name three other opportunities or paths that exist independent of this one.',
  },
  'moist-robot': {
    frame: 'You are a system that received an input and is generating this output. You are not the feeling — you are the system running it.',
    action: 'Identify the input. Change the input, or change how you process it.',
  },
  'victim-oppressor': {
    frame: 'Are you taking ownership of your response, or assigning blame as a substitute for action?',
    action: 'Identify one thing fully within your control and act on it now.',
  },
  'mind-reading': {
    frame: 'You are treating a story you invented as if it were confirmed fact.',
    action: 'Either gather actual evidence or treat the uncertainty as neutral information.',
  },
}

function findRule(situation: string): { rule: EngineRule; matched: boolean } {
  const lower = situation.toLowerCase()
  const rule = RULES.find(r => r.keywords.some(k => lower.includes(k)))
  return rule ? { rule, matched: true } : { rule: FALLBACK_RULE, matched: false }
}

function buildAlternates(primary: LensId, ruleAlternates: LensId[]): LensId[] {
  const alts: LensId[] = []
  const statsSubstitute: LensId = primary === 'statistics' ? 'logic' : 'statistics'
  if (!alts.includes(statsSubstitute)) alts.push(statsSubstitute)
  const grounding: LensId[] = ['moist-robot', 'logic', 'science']
  const groundingChoice = grounding.find(l => l !== primary && !alts.includes(l))
  if (groundingChoice) alts.push(groundingChoice)
  for (const alt of ruleAlternates) {
    if (alt !== primary && !alts.includes(alt) && alts.length < 4) {
      alts.push(alt)
    }
  }
  return alts.slice(0, 4)
}

export function analyzeReality(input: EngineInput): RealityEntry {
  const { rule, matched } = findRule(input.situation)
  const matchStrength = matched ? 100 : 65
  const clarityScore = Math.round(
    Math.min(100, Math.max(0,
      (100 - input.stress) * 0.35 +
      input.confidence * 0.35 +
      matchStrength * 0.30
    ))
  )
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    situation: input.situation,
    mood: input.mood,
    stress: input.stress,
    confidence: input.confidence,
    primaryLens: rule.primaryLens,
    alternateLenses: buildAlternates(rule.primaryLens, rule.alternateLenses),
    hiddenAssumption: rule.hiddenAssumption,
    distortion: rule.distortion,
    betterFrame: rule.betterFrame,
    bestAction: rule.bestAction,
    clarityScore,
  }
}

export function reframeForLens(entry: RealityEntry, lensId: LensId): ReframeTemplate {
  return LENS_REFRAMES[lensId]
}

export function predictDominantLens(thought: string): LensId {
  if (!thought.trim()) return 'logic'
  const { rule } = findRule(thought)
  return rule.primaryLens
}
