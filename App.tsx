import React, { useState, useCallback, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { CardData, GameData } from './types';
import { generateGameContent, generateCardImage, regenerateCardText, generateInitialTheme } from './services/geminiService';
import Card from './components/Card';
import LoadingSpinner from './components/LoadingSpinner';
import ShardIcon from './components/icons/ShardIcon';
import ShardStoreModal from './components/ShardStoreModal';

const SHARD_STORAGE_KEY = 'tcg-generator-shards';

const App: React.FC = () => {
  const [themeTitle, setThemeTitle] = useState<string>('');
  const [themeDescription, setThemeDescription] = useState<string>('');
  const [factions, setFactions] = useState<string>('');
  const [locations, setLocations] = useState<string>('');
  const [resources, setResources] = useState<string>('');
  const [numCards, setNumCards] = useState<number>(10);
  
  const [setName, setSetName] = useState<string>('');
  const [rules, setRules] = useState<string | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingImages, setIsGeneratingImages] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isDevMode, setIsDevMode] = useState<boolean>(false);

  const [shards, setShards] = useState<number>(() => {
    const savedShards = localStorage.getItem(SHARD_STORAGE_KEY);
    return savedShards ? parseInt(savedShards, 10) : 200;
  });
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(false);

  const rulesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(SHARD_STORAGE_KEY, shards.toString());
  }, [shards]);

  useEffect(() => {
    const fetchDefaults = async () => {
        setIsLoading(true);
        setLoadingMessage('Generating a unique game idea for you...');
        try {
            const defaults = await generateInitialTheme();
            setThemeTitle(defaults.themeTitle);
            setThemeDescription(defaults.themeDescription);
            setSetName(defaults.setName);
            setFactions(defaults.factions);
            setLocations(defaults.locations);
            setResources(defaults.resources);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load initial theme. Please refresh the page.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    fetchDefaults();
  }, []);

  const generateAllCardImages = useCallback(async (currentCards: CardData[], currentThemeTitle: string) => {
    setIsGeneratingImages(true);
    let shardsAvailable = shards;

    for (let i = 0; i < currentCards.length; i++) {
        const card = currentCards[i];
        if (card.imageState !== 'pending') continue;

        if (shardsAvailable < 1) {
            setError('Ran out of Image Shards. Image generation paused. You can retry individual cards later.');
            setCards(prev => prev.map(c => (c.id === card.id ? { ...c, imageState: 'error' } : c)));
            continue;
        }
        
        shardsAvailable--;
        setShards(prev => prev - 1);
        setCards(prev => prev.map(c => c.id === card.id ? { ...c, imageState: 'loading' } : c));
        
        try {
            const imageUrl = await generateCardImage(card.imagePrompt, currentThemeTitle);
            setCards(prev => prev.map(c => c.id === card.id ? { ...c, imageState: 'success', imageUrl } : c));
        } catch (err: any) {
            console.error(`Failed to generate image for ${card.name}:`, err);
            setCards(prev => prev.map(c => c.id === card.id ? { ...c, imageState: 'error' } : c));
            setShards(prev => prev + 1); // Refund shard on failure
            shardsAvailable++;

            if (err?.message?.includes('RESOURCE_EXHAUSTED') || err?.error?.status === 'RESOURCE_EXHAUSTED') {
                setError('API rate limit reached. Image generation paused. Your shard has been refunded.');
                break;
            } else {
                 setError('An error occurred during image generation. Your shard has been refunded.');
            }
        }
    }
    setIsGeneratingImages(false);
  }, [shards]);
  
  const handleGenerate = useCallback(async () => {
    const inputs = [themeTitle, themeDescription, setName, factions, locations, resources];
    if (inputs.some(input => !input.trim()) || numCards < 1) {
        setError('Please fill out all fields and set card count to at least 1.');
        return;
    }
    setIsLoading(true);
    setLoadingMessage('Generating rules & card concepts...');
    setError(null);
    setRules(null);
    setCards([]);

    try {
      const gameContent = await generateGameContent(themeDescription, factions, locations, resources, numCards);
      setRules(gameContent.rules);
      setCards(gameContent.cards);
      generateAllCardImages(gameContent.cards, themeTitle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [themeTitle, themeDescription, setName, factions, locations, resources, numCards, generateAllCardImages]);

  const handleRegenerateImage = useCallback(async (cardId: string) => {
    if (shards < 1) {
      setError("You need at least 1 Image Shard to generate an image.");
      return;
    }
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    setShards(prev => prev - 1); // Consume shard
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, imageState: 'loading' } : c));
    try {
      const imageUrl = await generateCardImage(card.imagePrompt, themeTitle);
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, imageState: 'success', imageUrl } : c));
    } catch (err) {
      console.error(`Failed to regenerate image for ${card.name}:`, err);
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, imageState: 'error' } : c));
      setShards(prev => prev + 1); // Refund shard
      setError('Failed to regenerate image. Your shard has been refunded.');
    }
  }, [cards, themeTitle, shards]);

  const handleRegenerateText = useCallback(async (cardId: string) => {
    if (shards < 1) {
      setError("You need at least 1 Image Shard for the subsequent image generation.");
      return;
    }
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    
    const originalCard = { ...card };
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ability: 'Regenerating...' } : c));

    try {
        const newTextData = await regenerateCardText(themeDescription, factions, locations, resources, card);
        const updatedCard = {
            ...card,
            ...newTextData,
            imageState: 'pending' as const,
            imageUrl: undefined
        };
        setCards(prev => prev.map(c => c.id === cardId ? updatedCard : c));
        await handleRegenerateImage(cardId);
    } catch (err) {
        setError("Failed to regenerate card text.");
        setCards(prev => prev.map(c => c.id === cardId ? originalCard : c));
    }
  }, [cards, themeDescription, factions, locations, resources, handleRegenerateImage, shards]);

  const handleDownloadPdf = async () => {
    if (!rules || cards.length === 0 || !rulesRef.current) {
        setError("No game data to generate PDF from.");
        return;
    }
    setIsGeneratingPdf(true);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 10;
    const cardWidth = 63;
    const cardHeight = 88;
    const cardsPerPage = 9;
    
    // 1. Add Rules
    const rulesCanvas = await html2canvas(rulesRef.current, { scale: 2 });
    const rulesImgData = rulesCanvas.toDataURL('image/png');
    const rulesImgProps = pdf.getImageProperties(rulesImgData);
    const rulesPdfWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
    const rulesPdfHeight = (rulesImgProps.height * rulesPdfWidth) / rulesImgProps.width;
    pdf.addImage(rulesImgData, 'PNG', margin, margin, rulesPdfWidth, rulesPdfHeight);

    // 2. Add Cards
    for (let i = 0; i < cards.length; i++) {
        const cardIndexOnPage = i % cardsPerPage;
        if (i > 0 && cardIndexOnPage === 0) {
            pdf.addPage();
        }

        const cardElement = document.getElementById(cards[i].id);
        if (cardElement) {
            const cardCanvas = await html2canvas(cardElement, { scale: 3 });
            const cardImgData = cardCanvas.toDataURL('image/jpeg', 0.9);

            const row = Math.floor(cardIndexOnPage / 3);
            const col = cardIndexOnPage % 3;
            
            const x = margin + (col * (cardWidth + 5));
            const y = margin + (row * (cardHeight + 5));

            pdf.addImage(cardImgData, 'JPEG', x, y, cardWidth, cardHeight);
        }
    }
    
    pdf.save(`${setName.replace(/\s+/g, '_') || 'tcg_set'}.pdf`);
    setIsGeneratingPdf(false);
  };

  const handleDownloadJson = () => {
    if (!rules || cards.length === 0) {
        setError("No game data to download.");
        return;
    }
    const gameData: GameData = { setName, rules, cards };
    const jsonString = JSON.stringify(gameData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${setName.replace(/\s+/g, '_') || 'tcg_set'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddShards = () => {
    setShards(prev => prev + 100);
  };
  
  const commonInputClass = "bg-gray-700 border-2 border-gray-600 text-white rounded-lg p-3 w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition disabled:bg-gray-800 disabled:cursor-not-allowed";
  const anyLoading = isLoading || isGeneratingImages || isGeneratingPdf;

  return (
    <>
      <ShardStoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />
      {(isLoading || isGeneratingPdf) && <LoadingSpinner message={loadingMessage || (isGeneratingPdf ? 'Generating Printable PDF...' : '')} />}

      <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-8 flex items-center gap-4 z-10">
          <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg shadow-md border border-gray-700">
            <ShardIcon className="w-6 h-6 text-cyan-400" />
            <span className="text-xl font-bold text-white">{shards}</span>
          </div>
          <button
            onClick={() => setIsStoreOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold py-2 px-4 rounded-lg hover:from-cyan-600 hover:to-teal-600 transition-all transform hover:scale-105"
          >
            Get Shards
          </button>
        </div>

        <div className="container mx-auto">
          <header className="text-center mb-8 pt-16 sm:pt-0">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-600">
              TCG Card Game Generator
            </h1>
            <p className="text-lg text-gray-400 mt-2">Bring your imagination to life. Create a complete, playable card game from any theme.</p>
          </header>

          <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-xl shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="themeTitle" className="block text-sm font-medium text-gray-300 mb-1">Game Theme Title</label>
                  <input id="themeTitle" type="text" value={themeTitle} onChange={(e) => setThemeTitle(e.target.value)} placeholder="e.g., Celestial Empires" className={commonInputClass} disabled={anyLoading}/>
                </div>
                <div>
                  <label htmlFor="setName" className="block text-sm font-medium text-gray-300 mb-1">Set Name</label>
                  <input id="setName" type="text" value={setName} onChange={(e) => setSetName(e.target.value)} placeholder="e.g., The Astral War" className={commonInputClass} disabled={anyLoading}/>
                </div>
                <div>
                  <label htmlFor="themeDescription" className="block text-sm font-medium text-gray-300 mb-1">Theme Description</label>
                  <textarea id="themeDescription" value={themeDescription} onChange={(e) => setThemeDescription(e.target.value)} placeholder="Describe the world, conflict, and feel..." rows={4} className={commonInputClass} disabled={anyLoading}/>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="factions" className="block text-sm font-medium text-gray-300 mb-1">Factions (comma-separated)</label>
                  <textarea id="factions" value={factions} onChange={(e) => setFactions(e.target.value)} placeholder="e.g., The Solari Federation, The Void Cult" rows={2} className={commonInputClass} disabled={anyLoading}/>
                </div>
                <div>
                  <label htmlFor="locations" className="block text-sm font-medium text-gray-300 mb-1">Locations (comma-separated)</label>
                  <textarea id="locations" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="e.g., Glimmering Spire, Obsidian Chasm" rows={2} className={commonInputClass} disabled={anyLoading}/>
                </div>
                <div>
                  <label htmlFor="resources" className="block text-sm font-medium text-gray-300 mb-1">Resource System</label>
                  <textarea id="resources" value={resources} onChange={(e) => setResources(e.target.value)} placeholder="e.g., Chrono-Shards, generated each turn..." rows={2} className={commonInputClass} disabled={anyLoading}/>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
              <div className="w-full sm:w-auto sm:flex-grow">
                <label htmlFor="numCards" className="block text-sm font-medium text-gray-300 mb-1">Number of Cards</label>
                <input id="numCards" type="number" value={numCards} onChange={(e) => setNumCards(parseInt(e.target.value, 10) || 0)} min="1" max="50" className={commonInputClass} disabled={anyLoading}/>
              </div>
              <button
                  onClick={handleGenerate}
                  disabled={anyLoading}
                  className="w-full sm:w-auto bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center self-end"
                >
                  {isLoading ? 'Generating...' : 'Generate Game'}
                </button>
            </div>
            {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
          </div>
          
          {rules && cards.length > 0 && (
            <div className="text-center mt-8 flex flex-wrap gap-4 justify-center items-center">
               <button onClick={handleDownloadJson} disabled={anyLoading} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 transition-all duration-300 transform hover:scale-105">Download JSON</button>
               <button onClick={handleDownloadPdf} disabled={anyLoading} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-600 transition-all duration-300 transform hover:scale-105">
                {isGeneratingPdf ? 'Generating PDF...' : 'Download Printable PDF'}
                </button>
               <div className="flex items-center space-x-2 text-gray-400">
                <input type="checkbox" id="devMode" checked={isDevMode} onChange={() => setIsDevMode(!isDevMode)} className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500" />
                <label htmlFor="devMode">Dev Mode</label>
               </div>
               {isDevMode && (
                  <button onClick={handleAddShards} className="bg-yellow-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors">Add 100 Shards</button>
               )}
            </div>
          )}

          {rules && (
            <div className="mt-12">
              <h2 className="text-3xl font-bold mb-4 text-center">{setName}: Game Rules</h2>
              <div 
                  ref={rulesRef}
                  className="prose prose-invert lg:prose-xl mx-auto bg-gray-800 p-6 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: rules.replace(/\n/g, '<br />') }}
              />
            </div>
          )}

          {cards.length > 0 && (
            <div className="mt-12">
              <h2 className="text-3xl font-bold mb-8 text-center">Generated Cards</h2>
              <div className="flex flex-wrap justify-center gap-8">
                {cards.map((card) => (
                  <Card key={card.id} card={card} isDevMode={isDevMode} shards={shards} onRegenerateImage={handleRegenerateImage} onRegenerateText={handleRegenerateText} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default App;
