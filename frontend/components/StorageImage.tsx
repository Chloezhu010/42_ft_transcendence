/**
 * Image wrapper that accepts either stored filenames or direct URLs.
 * Keeps backend URL assembly out of calling components.
 */
import React from 'react';
import { getImageUrl } from '@/utils';

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
