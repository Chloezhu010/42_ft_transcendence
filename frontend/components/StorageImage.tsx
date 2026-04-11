/**
 * Image component that resolves backend storage filenames to full URLs.
 */
import React from 'react';
import { getImageUrl } from '@/services/imageUtils';

interface StorageImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

const StorageImage: React.FC<StorageImageProps> = ({ src, alt, className = '' }) => {
  const imageUrl = getImageUrl(src ?? undefined);

  if (!imageUrl) {
    return null;
  }

  return <img src={imageUrl} alt={alt} className={className} />;
};

export default StorageImage;
