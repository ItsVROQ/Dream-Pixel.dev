'use client';

import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface ImageUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  onUploadStart?: () => void;
  onUploadComplete?: (result: unknown) => void;
  onUploadError?: (error: string) => void;
}

interface ProcessedImage {
  id: string;
  url: string;
  originalUrl: string;
  signedUrl?: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  original: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
  processed: {
    width: number;
    height: number;
    size: number;
    compressionRatio: number;
  };
  lqip?: string;
  srcSet?: string;
  processingTime: number;
}

export function ImageUpload({
  maxSize = 20 * 1024 * 1024, // 20MB
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
}: ImageUploadOptions = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<ProcessedImage[]>([]);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds maximum of ${(maxSize / 1024 / 1024).toFixed(1)}MB`;
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`;
    }

    return null;
  }, [maxSize, allowedTypes]);

  const uploadImage = useCallback(async (file: File): Promise<ProcessedImage | null> => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      onUploadStart?.();
      setIsUploading(true);

      const response = await fetch('/api/images/upload-reference', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      
      if (result.success) {
        const imageData: ProcessedImage = {
          ...result.image,
          id: uuidv4(),
        };
        
        onUploadComplete?.(imageData);
        setUploadedImages(prev => [...prev, imageData]);
        return imageData;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onUploadError?.(errorMessage);
      console.error('Upload error:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [onUploadStart, onUploadComplete, onUploadError]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    
    files.forEach(file => {
      const error = validateFile(file);
      if (error) {
        onUploadError?.(error);
        return;
      }
      uploadImage(file);
    });
  }, [onUploadError, uploadImage, validateFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        onUploadError?.(error);
        return;
      }
      uploadImage(file);
    });
  }, [onUploadError, uploadImage, validateFile]);

  return (
    <div className="image-upload-container">
      {/* Upload Area */}
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="file-input"
          disabled={isUploading}
        />
        
        <div className="upload-content">
          {isUploading ? (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p>Processing image... {uploadProgress}%</p>
            </div>
          ) : (
            <>
              <svg className="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <p>Drag and drop images here, or click to browse</p>
              <p className="upload-hint">
                Supported: JPEG, PNG, WebP • Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Images */}
      {uploadedImages.length > 0 && (
        <div className="uploaded-images">
          <h3>Uploaded Images</h3>
          <div className="images-grid">
            {uploadedImages.map((image) => (
              <div key={image.id} className="image-card">
                <div className="image-preview">
                  <img
                    src={image.thumbnailUrl || image.url}
                    alt="Uploaded"
                    className="image-thumbnail"
                    loading="lazy"
                  />
                  <div className="image-overlay">
                    <button 
                      className="view-button"
                      onClick={() => window.open(image.url, '_blank')}
                    >
                      View Original
                    </button>
                  </div>
                </div>
                
                <div className="image-info">
                  <div className="image-stats">
                    <span>Original: {image.original.width}×{image.original.height}</span>
                    <span>Optimized: {image.processed.width}×{image.processed.height}</span>
                    <span>Compression: {image.processed.compressionRatio}%</span>
                  </div>
                  <div className="image-sizes">
                    <div className="size-info">
                      <strong>Original:</strong> {(image.original.size / 1024).toFixed(1)}KB
                    </div>
                    <div className="size-info">
                      <strong>Optimized:</strong> {(image.processed.size / 1024).toFixed(1)}KB
                    </div>
                    <div className="size-info">
                      <strong>Processing Time:</strong> {image.processingTime}ms
                    </div>
                  </div>
                  
                  <div className="image-urls">
                    <div className="url-item">
                      <label>Main URL:</label>
                      <input 
                        type="text" 
                        value={image.url} 
                        readOnly 
                        className="url-input"
                        onClick={(e) => e.currentTarget.select()}
                      />
                    </div>
                    {image.thumbnailUrl && (
                      <div className="url-item">
                        <label>Thumbnail URL:</label>
                        <input 
                          type="text" 
                          value={image.thumbnailUrl} 
                          readOnly 
                          className="url-input"
                          onClick={(e) => e.currentTarget.select()}
                        />
                      </div>
                    )}
                    {image.signedUrl && (
                      <div className="url-item">
                        <label>Signed URL (24h):</label>
                        <input 
                          type="text" 
                          value={image.signedUrl} 
                          readOnly 
                          className="url-input"
                          onClick={(e) => e.currentTarget.select()}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .image-upload-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
        }

        .upload-area {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 3rem 2rem;
          text-align: center;
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
          background: #f9fafb;
        }

        .upload-area:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .upload-area.dragging {
          border-color: #3b82f6;
          background: #dbeafe;
          transform: scale(1.02);
        }

        .upload-area.uploading {
          pointer-events: none;
          opacity: 0.7;
        }

        .file-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .upload-content {
          pointer-events: none;
        }

        .upload-icon {
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .upload-hint {
          color: #6b7280;
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }

        .upload-progress {
          pointer-events: none;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          transition: width 0.3s ease;
        }

        .uploaded-images {
          margin-top: 2rem;
        }

        .images-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .image-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .image-preview {
          position: relative;
          aspect-ratio: 16/10;
          overflow: hidden;
        }

        .image-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .image-preview:hover .image-overlay {
          opacity: 1;
        }

        .view-button {
          background: white;
          color: black;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .image-info {
          padding: 1rem;
        }

        .image-stats {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .image-sizes {
          margin-bottom: 1rem;
        }

        .size-info {
          font-size: 0.75rem;
          margin-bottom: 0.25rem;
        }

        .image-urls {
          border-top: 1px solid #f3f4f6;
          padding-top: 1rem;
        }

        .url-item {
          margin-bottom: 0.75rem;
        }

        .url-item label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .url-input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.75rem;
          font-family: monospace;
          background: #f9fafb;
        }

        .url-input:focus {
          outline: none;
          border-color: #3b82f6;
        }
      `}</style>
    </div>
  );
}

export default ImageUpload;