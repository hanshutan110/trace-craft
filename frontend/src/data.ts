/**
 * TraceCraft frontend static data.
 *
 * Mock data for preset shapes and run history.
 * This file is kept for future backend replacement.
 */
import { HistoryRecord, PresetShape } from './types';

export const presetShapes: PresetShape[] = [
  {
    id: 'star',
    name: 'Star',
    englishName: 'star',
    gradient: 'linear-gradient(135deg, #FFD166 0%, #FFB347 100%)',
    description: 'Run a shining star route',
    distance: 5.0,
    iconType: 'star',
    isHot: true,
  },
  {
    id: 'heart',
    name: 'Heart',
    englishName: 'heart',
    gradient: 'linear-gradient(135deg, #FF758C 0%, #FF7EB3 100%)',
    description: 'Draw a heart with your steps',
    distance: 4.2,
    iconType: 'heart',
    isHot: true,
  },
  {
    id: 'circle',
    name: 'Circle',
    englishName: 'circle',
    gradient: 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
    description: 'Classic loop route around the lake',
    distance: 3.5,
    iconType: 'circle',
  },
  {
    id: 'triangle',
    name: 'Triangle',
    englishName: 'triangle',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A24 100%)',
    description: 'Short sprint with geometric style',
    distance: 3.0,
    iconType: 'triangle',
  },
  {
    id: 'square',
    name: 'Square',
    englishName: 'square',
    gradient: 'linear-gradient(135deg, #A8E6CF 0%, #3BAC6A 100%)',
    description: 'A clean block-around route',
    distance: 4.0,
    iconType: 'square',
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    englishName: 'hexagon',
    gradient: 'linear-gradient(135deg, #A29BFE 0%, #6C5CE7 100%)',
    description: 'A mid-distance route shaped like a honeycomb',
    distance: 4.8,
    iconType: 'hexagon',
  },
];

export const historyRecords: HistoryRecord[] = [
  {
    id: 'hist1',
    name: 'Cat Run',
    distance: '5.01km',
    time: '32:15',
    date: '2026-06-08',
    shapeType: 'cat',
  },
  {
    id: 'hist2',
    name: 'Star Speed Run',
    distance: '3.62km',
    time: '22:40',
    date: '2026-05-30',
    shapeType: 'star',
  },
  {
    id: 'hist3',
    name: 'Heart Run',
    distance: '4.25km',
    time: '28:10',
    date: '2026-05-24',
    shapeType: 'heart',
  },
];
