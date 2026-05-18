export type LensId =
  | 'logic'
  | 'religion'
  | 'mating'
  | 'statistics'
  | 'science'
  | 'persuasion'
  | 'economics'
  | 'simulation'
  | 'winners-losers'
  | 'predator-prey'
  | 'strategy'
  | 'abundance'
  | 'moist-robot'
  | 'victim-oppressor'
  | 'mind-reading'

export type Lens = {
  id: LensId
  name: string
  description: string
  coreQuestion: string
  blindSpot: string
  power: string
  examples: string[]
}

export type RealityEntry = {
  id: string
  situation: string
  mood: number
  stress: number
  confidence: number
  primaryLens: LensId
  alternateLenses: LensId[]
  hiddenAssumption: string
  distortion: string
  betterFrame: string
  bestAction: string
  clarityScore: number
  createdAt: string
}

export type CheckIn = {
  id: string
  date: string
  energy: number
  mood: number
  stress: number
  confidence: number
  dominantThought: string
  predictedLens: LensId
  createdAt: string
}

export type Settings = {
  onboardingDone: boolean
}
