/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { ImageState } from '../types';
import { UploadIcon } from './icons';

interface ImageListPanelProps {
    images: ImageState[];
    selectedImageId: string | null;
    onSelectImage: (id: string) => void;
    onFileSelect: (files: FileList | null) => void;
}

const ImageListPanel: React.FC<ImageListPanelProps> = ({ images, selectedImageId, onSelectImage, onFileSelect }) => {
    return (
        <div className="w-full md:w-64 bg-gray-900/50 border-r border-gray-800/80 p-4 flex flex-col gap-4 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-200 text-center">Batch Images</h2>
            <div className="flex-grow overflow-y-auto flex flex-col gap-3 pr-2">
                {images.map(image => (
                    <ImageThumbnail
                        key={image.id}
                        image={image}
                        isSelected={image.id === selectedImageId}
                        onClick={() => onSelectImage(image.id)}
                    />
                ))}
            </div>
            <label htmlFor="image-upload-more" className="relative mt-auto w-full inline-flex items-center justify-center px-4 py-3 text-sm font-bold text-white bg-blue-600 rounded-lg cursor-pointer group hover:bg-blue-500 transition-colors">
                <UploadIcon className="w-5 h-5 mr-2" />
                Add More Images
            </label>
            <input id="image-upload-more" type="file" className="hidden" accept="image/*" multiple onChange={(e) => onFileSelect(e.target.files)} />
        </div>
    );
};

interface ImageThumbnailProps {
    image: ImageState;
    isSelected: boolean;
    onClick: () => void;
}

const ImageThumbnail: React.FC<ImageThumbnailProps> = ({ image, isSelected, onClick }) => {
    const [objectUrl, setObjectUrl] = React.useState<string | null>(null);

    React.useEffect(() => {
        const url = URL.createObjectURL(image.originalFile);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [image.originalFile]);

    return (
        <button
            onClick={onClick}
            className={`relative rounded-lg overflow-hidden border-2 transition-all duration-200 ${isSelected ? 'border-blue-500 shadow-lg shadow-blue-500/30' : 'border-gray-700 hover:border-gray-500'}`}
        >
            {objectUrl && <img src={objectUrl} alt={image.originalFile.name} className="w-full h-auto object-cover aspect-square" />}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
                <p className="text-xs text-white truncate">{image.originalFile.name}</p>
            </div>
        </button>
    );
};

export default ImageListPanel;