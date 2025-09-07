import { GoogleGenAI, Type } from "@google/genai";
import type { CardData, GameData } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const initialThemeSchema = {
    type: Type.OBJECT,
    properties: {
        themeTitle: { type: Type.STRING, description: "A catchy title for the TCG theme. e.g., 'Celestial Empires'."},
        themeDescription: { type: Type.STRING, description: "A paragraph describing the game's world, conflict, and overall feel."},
        setName: { type: Type.STRING, description: "A name for the first card set. e.g., 'The Astral War'."},
        factions: { type: Type.STRING, description: "A comma-separated list of at least two distinct factions. e.g., 'The Solari Federation, The Void Cult'."},
        locations: { type: Type.STRING, description: "A comma-separated list of at least two key locations. e.g., 'The Glimmering Spire, The Obsidian Chasm'."},
        resources: { type: Type.STRING, description: "A description of the primary resource system. e.g., 'Chrono-Shards, generated each turn, are used to play cards and activate abilities.'"},
    },
    required: ["themeTitle", "themeDescription", "setName", "factions", "locations", "resources"],
};

const cardGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "The name of the card." },
        type: { type: Type.STRING, description: "The type of card (e.g., Creature, Spell, Artifact, Environment)." },
        attack: { type: Type.INTEGER, description: "Attack power of the card. 0 for non-creatures." },
        defense: { type: Type.INTEGER, description: "Defense value of the card. 0 for non-creatures." },
        health: { type: Type.INTEGER, description: "Health points of the card. 0 for non-creatures." },
        ability: { type: Type.STRING, description: "A brief, clear, and concise description of the card's special ability, suitable for the limited space on a card." },
        imagePrompt: { type: Type.STRING, description: "A visually descriptive prompt for an AI image generator to create card art. e.g., 'A majestic griffin soaring through a stormy sky, fantasy art, dramatic lighting'." },
    },
    required: ["name", "type", "attack", "defense", "health", "ability", "imagePrompt"],
};

const cardRegenerationSchema = {
    type: Type.OBJECT,
    properties: {
        attack: { type: Type.INTEGER, description: "A new, balanced attack power." },
        defense: { type: Type.INTEGER, description: "A new, balanced defense value." },
        health: { type: Type.INTEGER, description: "A new, balanced health value." },
        ability: { type: Type.STRING, description: "A new, brief, clear, and concise description of the card's special ability." },
        imagePrompt: { type: Type.STRING, description: "A new, visually descriptive prompt for the card art." },
    },
    required: ["attack", "defense", "health", "ability", "imagePrompt"],
};


const gameGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        rules: {
            type: Type.STRING,
            description: "A complete and clear rulebook for the TCG. It should cover setup, turn structure, card types, combat, and win conditions. Format with markdown.",
        },
        cards: {
            type: Type.ARRAY,
            description: "An array of unique and balanced cards for a starter set.",
            items: cardGenerationSchema,
        },
    },
    required: ["rules", "cards"],
};

export const generateInitialTheme = async (): Promise<{
    themeTitle: string;
    themeDescription: string;
    setName: string;
    factions: string;
    locations: string;
    resources: string;
}> => {
    try {
        const prompt = `
            You are a creative world-builder and game designer. Invent a compelling and unique concept for a new trading card game.
            Provide a theme title, a detailed theme description, a name for the first card set, two or more distinct factions, two or more key locations in the world, and a description of the primary resource system used to play cards.
            Your response must be a single, valid JSON object that adheres to the provided schema. Be creative and evocative.
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: initialThemeSchema,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error generating initial theme:", error);
        throw new Error("Failed to generate initial game theme.");
    }
}


export const generateGameContent = async (
    themeDescription: string,
    factions: string,
    locations: string,
    resources: string,
    numCards: number
): Promise<{ rules: string; cards: Omit<CardData, 'imageUrl'>[] }> => {
    try {
        const prompt = `
            You are an expert trading card game designer. Create a complete and playable TCG based on the following detailed world concept:

            **Theme Description:** ${themeDescription}
            **Factions:** ${factions}
            **Key Locations:** ${locations}
            **Resource System:** ${resources}

            Your response must be a single, valid JSON object that adheres to the provided schema.
            
            1.  **Rules:** Design a clear, concise ruleset that thematically integrates the world concept. The rules should cover objective, setup, turn structure, card types, combat, and how to use the resource system (${resources}).
            
            2.  **Cards:** Generate exactly ${numCards} unique and balanced cards for a starter set. The cards should belong to the specified factions and reflect the theme, locations, and lore. For card abilities, be concise, clear, and creative. The image prompts should be evocative and match the card's name and theme.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    ...gameGenerationSchema,
                    properties: {
                        ...gameGenerationSchema.properties,
                        cards: {
                            ...gameGenerationSchema.properties.cards,
                            description: `An array of ${numCards} unique and balanced cards for a starter set.`
                        }
                    }
                },
            },
        });
        
        const jsonString = response.text.trim();
        const rawGameData: { rules: string; cards: Omit<CardData, 'id' | 'imageUrl' | 'imageState'>[] } = JSON.parse(jsonString);

        const cardsWithState = rawGameData.cards.map(card => ({
            ...card,
            id: crypto.randomUUID(),
            imageState: 'pending' as const,
        }));
        
        return {
            rules: rawGameData.rules,
            cards: cardsWithState,
        };

    } catch (error) {
        console.error("Error generating game content:", error);
        throw new Error("Failed to generate game content. Please check the theme and try again.");
    }
};

export const generateCardImage = async (prompt: string, themeTitle: string): Promise<string> => {
    try {
        const fullPrompt = `${prompt}, in the art style of a modern trading card game, theme of ${themeTitle}.`;

        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '3:4',
            },
        });

        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
};

export const regenerateCardText = async (
    themeDescription: string,
    factions: string,
    locations: string,
    resources: string,
    cardToRegenerate: CardData
): Promise<Omit<CardData, 'id' | 'name' | 'type' | 'imageUrl' | 'imageState'>> => {
     try {
        const prompt = `
            You are a TCG designer refreshing a card design for a game with the following theme:
            **Theme Description:** ${themeDescription}
            **Factions:** ${factions}
            **Key Locations:** ${locations}
            **Resource System:** ${resources}

            Regenerate the stats (attack, defense, health) and ability for the card named "${cardToRegenerate.name}", which is a "${cardToRegenerate.type}" type.
            Provide a new, balanced set of stats, a new clear and concise ability that fits the game's world, and a new image prompt.
            The goal is to offer a different take on the same core card concept while respecting the established lore.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: cardRegenerationSchema,
            },
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error regenerating card text:", error);
        throw new Error("Failed to regenerate card text.");
    }
};