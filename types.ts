export interface CardData {
  id: string;
  name: string;
  type: 'Creature' | 'Spell' | 'Artifact' | 'Environment';
  attack: number;
  defense: number;
  health: number;
  ability: string;
  imagePrompt: string;
  imageUrl?: string;
  imageState: 'pending' | 'loading' | 'success' | 'error';
}

export interface GameData {
  setName: string;
  rules: string;
  cards: CardData[];
}
