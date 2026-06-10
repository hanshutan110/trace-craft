/**
 * 底部弹窗宿主组件
 *
 * 包裹 BottomSheetModal，控制弹窗的显示/隐藏
 * 用于在首页展示图形选择弹窗
 */
import { BottomSheetModal } from '../CommonModals';
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

