import { BottomSheetModal } from '../Others';
import React from 'react';

interface AppBottomSheetHostProps {
  selectedShapeId: string;
  isOpen: boolean;
  onSelect: (shapeId: string) => void;
  onClose: () => void;
}

export const AppBottomSheetHost: React.FC<AppBottomSheetHostProps> = ({
  selectedShapeId,
  isOpen,
  onSelect,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <BottomSheetModal
      selectedShapeId={selectedShapeId}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
};
