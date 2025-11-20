/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateDescription } from './services/geminiService';
import { updateProductInDB } from './services/databaseService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import DescribePanel from './components/DescribePanel';
import ImageListPanel from './components/ImageListPanel';
import SaveModal from './components/SaveModal';
import { UndoIcon, RedoIcon, EyeIcon, SaveIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import { ImageState, ImageType, DescriptionTab } from './types';


const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
  
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new File([u8arr], filename, {type:mime});
}
const imageFileToWebPFile = (imageFile: File, quality: number = 1): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(imageFile);
        img.src = objectUrl;
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) { return reject(new Error('Could not get canvas context')); }
            ctx.drawImage(img, 0, 0);
            const webpDataUrl = canvas.toDataURL('image/webp', quality);
            const webpFileName = imageFile.name.replace(/\.[^/.]+$/, "") + ".webp";
            const webpFile = dataURLtoFile(webpDataUrl, webpFileName);
            resolve(webpFile);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image for WebP conversion.'));
        };
    });
};


type Tab = 'retouch' | 'adjust' | 'filters' | 'crop' | 'describe';
type ItemToSave = { type: 'Image' | 'Description' };

const App: React.FC = () => {
  const [images, setImages] = useState<ImageState[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [itemToSave, setItemToSave] = useState<ItemToSave | null>(null);

  const [descriptionTab, setDescriptionTab] = useState<DescriptionTab>('Description');
  const [descriptionPrompt, setDescriptionPrompt] = useState<string>('');

  const selectedImageState = images.find(img => img.id === selectedImageId) ?? null;
  const currentImage = selectedImageState ? selectedImageState.history[selectedImageState.historyIndex] : null;
  const originalImage = selectedImageState ? selectedImageState.history[0] : null;
  
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // ... (useEffect hooks are unchanged) ...
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);


  const canUndo = selectedImageState ? selectedImageState.historyIndex > 0 : false;
  const canRedo = selectedImageState ? selectedImageState.historyIndex < selectedImageState.history.length - 1 : false;

  const updateSelectedImage = (updater: (image: ImageState) => ImageState) => {
    if (!selectedImageId) return;
    setImages(prevImages => prevImages.map(img =>
      img.id === selectedImageId ? updater(img) : img
    ));
  };

  const addImageToHistory = useCallback((newImageFile: File) => {
    if (!selectedImageId) return;
    updateSelectedImage(image => {
      const newHistory = image.history.slice(0, image.historyIndex + 1);
      newHistory.push(newImageFile);
      return { ...image, history: newHistory, historyIndex: newHistory.length - 1 };
    });
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, [selectedImageId]);


  const handleFilesUpload = useCallback(async (files: FileList) => {
    setError(null);
    
    const processedFilesPromises = Array.from(files).map(async (file) => {
        try {
            // This ensures the input to the AI is 1024x1024, 
            // so the AI output will also be 1024x1024.
            const squareFile = await resizeToSquare(file);
            
            return {
                id: `${file.name}-${Date.now()}-${Math.random()}`,
                originalFile: squareFile, // Use the square file
                history: [squareFile],    // Use the square file
                historyIndex: 0,
                description: null,
                isDescriptionSaved: false,
            } as ImageState;
        } catch (e) {
            console.error("Failed to resize image", e);
            return null;
        }
    });

    const newImagesResults = await Promise.all(processedFilesPromises);
    // Filter out any failed processing attempts
    const newImages = newImagesResults.filter((img): img is ImageState => img !== null);

    setImages(prevImages => [...prevImages, ...newImages]);
    
    if (!selectedImageId && newImages.length > 0) {
      setSelectedImageId(newImages[0].id);
    }

    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, [selectedImageId]);

  const handleSelectImage = useCallback((id: string) => {
    setSelectedImageId(id);
    setError(null);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('No image selected to edit.');
      return;
    }
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }
    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentImage) {
      setError('No image selected to apply a filter to.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) {
      setError('No image selected to apply an adjustment to.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);


// Helper to center-crop and resize any image to exactly 1024x1024
const resizeToSquare = (imageFile: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(imageFile);
        img.src = url;
        
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            // Set fixed dimensions 1024x1024
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }

            // Calculate center crop
            const scale = Math.max(1024 / img.naturalWidth, 1024 / img.naturalHeight);
            const x = (1024 / 2) - (img.naturalWidth / 2) * scale;
            const y = (1024 / 2) - (img.naturalHeight / 2) * scale;

            // Draw high quality
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);

            // Convert back to File
            canvas.toBlob((blob) => {
                if (blob) {
                    const resizedFile = new File([blob], "square-1024.png", { type: "image/png" });
                    resolve(resizedFile);
                } else {
                    reject(new Error("Canvas to Blob failed"));
                }
            }, 'image/png', 1.0);
        };
        
        img.onerror = (err) => reject(err);
    });
};

  // This sets a default prompt based on the selected tab
  const handleDescriptionTabChange = (tab: DescriptionTab) => {
    setDescriptionTab(tab);
    // Set context-aware default prompts
    if (tab === 'Description') {
        setDescriptionPrompt("Write a concise, engaging product description highlighting key features.");
    } else if (tab === 'Alt Description') {
        setDescriptionPrompt("Write a short alt text describing the visual appearance of the product for accessibility.");
    } else if (tab === 'Meta Description') {
        setDescriptionPrompt("Write a SEO-friendly meta description including call to action, under 160 characters.");
    }
  };

  const handleGenerateDescription = useCallback(async (prompt: string) => {
    if (!currentImage) {
      setError('No image selected to describe.');
      return;
    }
    setIsLoading(true);
    setError(null);

    setDescriptionPrompt(prompt); 
    updateSelectedImage(img => ({ ...img, description: null, isDescriptionSaved: false }));
    try {
        const generatedText = await generateDescription(currentImage, prompt);
        updateSelectedImage(img => ({ ...img, description: generatedText }));
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate description. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, selectedImageId]);

  const handleInitiateSave = (itemType: 'Image' | 'Description') => {
      setItemToSave({ type: itemType });
      setIsSaveModalOpen(true);
  };
  
  const handleSaveToDb = async (sku: string, type: string) => {
      if (!itemToSave || !currentImage || !selectedImageState) {
          setError("No item selected to save.");
          return;
      }

      const dataType = itemToSave.type;
      const dataToSave = dataType === 'Image' ? currentImage : selectedImageState.description;

      if (dataToSave === null || dataToSave === undefined) {
          setError(`No ${dataType.toLowerCase()} available to save.`);
          return;
      }
      
      setIsSaving(true);
      setError(null);
      try {
          let dataForDb: File | string = dataToSave;
          let originalFileForDb: File = selectedImageState.originalFile;

          if (dataType === 'Image' && dataToSave instanceof File) {
              console.log('Converting images to WebP for database save...');
              const [webpCurrentImage, webpOriginalImage] = await Promise.all([
                  imageFileToWebPFile(dataToSave),
                  imageFileToWebPFile(selectedImageState.originalFile)
              ]);
              dataForDb = webpCurrentImage;
              originalFileForDb = webpOriginalImage;
              console.log('Conversion to WebP complete.');
          }
          
          const result = await updateProductInDB(
            sku,
            type, // This is now a string, e.g., "Wax" or "Wax_alt"
            dataType,
            dataForDb,
            originalFileForDb 
          );

          if (result.success) {
              alert(result.message);
              if (dataType === 'Description') {
                  updateSelectedImage(img => ({ ...img, isDescriptionSaved: true }));
              }
              setIsSaveModalOpen(false);
              setItemToSave(null);
          } else {
              setError(result.message);
          }
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(`Failed to save to database. ${errorMessage}`);
          console.error(err);
      } finally {
          setIsSaving(false);
      }
  };

  const handleUndo = useCallback(() => {
    if (canUndo) {
      updateSelectedImage(img => ({ ...img, historyIndex: img.historyIndex - 1 }));
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canUndo, selectedImageId]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      updateSelectedImage(img => ({ ...img, historyIndex: img.historyIndex + 1 }));
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canRedo, selectedImageId]);

  const handleReset = useCallback(() => {
    if (selectedImageState && selectedImageState.history.length > 0) {
      updateSelectedImage(img => ({ ...img, historyIndex: 0 }));
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [selectedImageState]);

  const handleUploadNew = useCallback(() => {
    setImages([]);
    setSelectedImageId(null);
    setError(null);
    setPrompt('');
    setEditHotspot(null);
    setDisplayHotspot(null);
  }, []);

  const handleDownload = useCallback(async () => {
    if (currentImage) {
      setIsLoading(true);
      setError(null);
      try {
        const webpFile = await imageFileToWebPFile(currentImage);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(webpFile);
        const newFileName = currentImage.name.replace(/\.[^/.]+$/, "") + ".webp";
        link.download = `edited-${newFileName}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } catch(err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to convert to WebP for download. ${errorMessage}`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentImage]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch') return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDisplayHotspot({ x: offsetX, y: offsetY });
    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;

    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);
    setEditHotspot({ x: originalX, y: originalY });
 };

  const renderEditorContent = () => {
    if (error) {
       return (
           <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
            <p className="text-md text-red-400">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Try Again
            </button>
          </div>
        );
    }

    if (!selectedImageState || !currentImageUrl) {
      return <div className="text-center text-gray-400">Select an image from the list to start editing.</div>;
    }

    const imageDisplay = (
      <div className="relative">
        {originalImageUrl && (
            <img
                key={originalImageUrl}
                src={originalImageUrl}
                alt="Original"
                className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none"
            />
        )}
        <img
            ref={imgRef}
            key={currentImageUrl}
            src={currentImageUrl}
            alt="Current"
            onClick={handleImageClick}
            className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'} ${activeTab === 'retouch' ? 'cursor-crosshair' : ''}`}
        />
      </div>
    );
    
    const cropImageElement = (
      <img 
        ref={imgRef}
        key={`crop-${currentImageUrl}`}
        src={currentImageUrl} 
        alt="Crop this image"
        className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
      />
    );

    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                    <Spinner />
                    <p className="text-gray-300">AI is working its magic...</p>
                </div>
            )}
            
            {activeTab === 'crop' ? (
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)} 
                onComplete={c => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                {cropImageElement}
              </ReactCrop>
            ) : imageDisplay }

            {displayHotspot && !isLoading && activeTab === 'retouch' && (
                <div 
                    className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                >
                    <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                </div>
            )}
        </div>
        
        <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-sm">
            {(['retouch', 'crop', 'adjust', 'filters', 'describe'] as Tab[]).map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                        activeTab === tab 
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
        
        <div className="w-full">
            {activeTab === 'retouch' && (
                <div className="flex flex-col items-center gap-4">
                    <p className="text-md text-white-400">
                        {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}
                    </p>
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                        <textarea
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"}
                            className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isLoading || !editHotspot}
                        />
                        <button 
                            type="submit"
                            className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading || !prompt.trim() || !editHotspot}
                        >
                            Generate
                        </button>
                    </form>
                </div>
            )}
            {activeTab === 'crop' && 
              <CropPanel 
                onApplyCrop={handleApplyCrop} 
                onSetAspect={setAspect} 
                isLoading={isLoading} 
                isCropping={!!completedCrop?.width && completedCrop.width > 0} 
              />
            }
            {activeTab === 'adjust' && 
              <AdjustmentPanel 
                onApplyAdjustment={handleApplyAdjustment} 
                isLoading={isLoading} 
              />
            }
            {activeTab === 'filters' && 
              <FilterPanel 
                onApplyFilter={handleApplyFilter} 
                isLoading={isLoading} 
              />
            }
            
            {activeTab === 'describe' && 
              <DescribePanel 
                onGenerate={handleGenerateDescription} 
                onInitiateSave={() => handleInitiateSave('Description')} 
                description={selectedImageState.description} 
                isSaved={selectedImageState.isDescriptionSaved} 
                isLoading={isLoading}
                // Pass the prompt state down
                prompt={descriptionPrompt}
                onPromptChange={setDescriptionPrompt}
                // Pass the update handler down
                onDescriptionChange={(newDesc) => 
                  updateSelectedImage(img => ({ ...img, description: newDesc, isDescriptionSaved: false }))
                }
                // New Props
                activeTab={descriptionTab}
                onTabChange={handleDescriptionTabChange}
              />
            }
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button onClick={handleUndo} disabled={!canUndo} className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5" aria-label="Undo last action">
                <UndoIcon className="w-5 h-5 mr-2" /> Undo
            </button>
            <button onClick={handleRedo} disabled={!canRedo} className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5" aria-label="Redo last action">
                <RedoIcon className="w-5 h-5 mr-2" /> Redo
            </button>
            <div className="h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>
            {canUndo && (
              <button onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} onMouseLeave={() => setIsComparing(false)} onTouchStart={() => setIsComparing(true)} onTouchEnd={() => setIsComparing(false)} className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base" aria-label="Press and hold to see original image">
                  <EyeIcon className="w-5 h-5 mr-2" /> Compare
              </button>
            )}
            <button onClick={handleReset} disabled={!canUndo} className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent">
                Reset
            </button>
            <button onClick={handleUploadNew} className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base">
                Upload New Batch
            </button>
            <div className="h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>

            <button onClick={() => handleInitiateSave('Image')} className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base">
                <SaveIcon className="w-5 h-5 mr-2" /> Save Image
            </button>

            <button onClick={handleDownload} disabled={isLoading} className="flex-grow sm:flex-grow-0 ml-auto bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-green-800 disabled:to-green-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none">
                Download Image
            </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1600px] mx-auto flex">
        {images.length === 0 ? (
          <div className="w-full flex justify-center items-center p-4 md:p-8">
            <StartScreen onFileSelect={(files) => files && handleFilesUpload(files)} />
          </div>
        ) : (
          <>
            <ImageListPanel images={images} selectedImageId={selectedImageId} onSelectImage={handleSelectImage} onFileSelect={(files) => files && handleFilesUpload(files)} />
            <div className="flex-grow p-4 md:p-8 flex justify-center items-start">
              {renderEditorContent()}
            </div>
          </>
        )}
      </main>
      <SaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveToDb}
        itemType={itemToSave?.type || 'Image'}
        descriptionTab={descriptionTab}
        isSaving={isSaving}
      />
    </div>
  );
};

export default App;


