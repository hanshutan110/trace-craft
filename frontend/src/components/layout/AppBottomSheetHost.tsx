/**
 * 底部弹窗宿主组件
 *
 * 包裹 BottomSheetModal，控制弹窗的显示/隐藏
 * 用于在首页展示图形选择弹窗
 */
import { BottomSheetModal } from '../common/BottomSheetModal';
import React from 'react';

interface AppBottomSheetHostProps {
  selectedShapeId: string;
  isOpen: boolean;
  onSelect: (shapeId: string) => void;
  onUploadImage: (file: File) => Promise<void>;
  onClose: () => void;
}

export const AppBottomSheetHost: React.FC<AppBottomSheetHostProps> = ({
  selectedShapeId,
  isOpen,
  onSelect,
  onUploadImage,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <BottomSheetModal
      selectedShapeId={selectedShapeId}
      onSelect={onSelect}
      onUploadImage={onUploadImage}
      onClose={onClose}
    />
  );
};
