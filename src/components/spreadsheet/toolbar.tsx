
'use client';

import React from 'react';
import type Handsontable from 'handsontable';
import * as XLSX from 'xlsx';
import {
  Scissors,
  Copy,
  Paintbrush,
  Bold,
  Italic,
  Underline,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  WrapText,
  Merge,
  Sigma,
  Filter,
  Search,
} from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { templates } from '@/lib/spreadsheet-templates';
import { ScrollArea } from '../ui/scroll-area';

interface SpreadsheetToolbarProps {
  hotInstance: Handsontable | null;
  onImport: () => void;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
  onSetTemplate: (template: (typeof templates)[0]) => void;
}

const colorPalette = [
    { name: 'Light Red', className: 'ht-bg-light-red' },
    { name: 'Light Green', className: 'ht-bg-light-green' },
    { name: 'Light Blue', className: 'ht-bg-light-blue' },
    { name: 'Light Yellow', className: 'ht-bg-light-yellow' },
    { name: 'Dark Red Text', className: 'ht-text-dark-red' },
    { name: 'Dark Green Text', className: 'ht-text-dark-green' },
    { name: 'Dark Blue Text', className: 'ht-text-dark-blue' },
    { name: 'Black Text', className: 'ht-text-black' },
];


export function SpreadsheetToolbar({ hotInstance, onImport, toggleFullscreen, isFullscreen, onSetTemplate }: SpreadsheetToolbarProps) {
  const { t } = useLanguage();

  const toggleCellClass = (classNameToToggle: string, classPrefix?: string) => {
    if (!hotInstance) return;
    const selectedRange = hotInstance.getSelectedRangeLast();
    if (!selectedRange) return;

    hotInstance.batch(() => {
        for (let row = selectedRange.from.row; row <= selectedRange.to.row; row++) {
            for (let col = selectedRange.from.col; col <= selectedRange.to.col; col++) {
                const cell = hotInstance.getCell(row, col);
                if (!cell) continue;

                let classNames = (cell.className || '').split(' ').filter(Boolean);
                
                if(classPrefix) {
                    classNames = classNames.filter(cn => !cn.startsWith(classPrefix));
                }
                
                if (!classNames.includes(classNameToToggle)) {
                    classNames.push(classNameToToggle);
                } else if (!classPrefix) { // Only toggle off if not a prefix-based class
                     classNames = classNames.filter(cn => cn !== classNameToToggle);
                }
                cell.className = classNames.join(' ');
            }
        }
    });
    hotInstance.render();
  };


  const setAlignment = (alignment: 'htLeft' | 'htCenter' | 'htRight' | 'htJustify') => {
    if (!hotInstance) return;
    const selectedRange = hotInstance.getSelectedRangeLast();
     if (!selectedRange) return;

    hotInstance.batch(() => {
        for (let row = selectedRange.from.row; row <= selectedRange.to.row; row++) {
          for (let col = selectedRange.from.col; col <= selectedRange.to.col; col++) {
            const cell = hotInstance.getCell(row, col);
            if (!cell) continue;

            let classNames = (cell.className || '').split(' ').filter(Boolean);
            const alignments = ['htLeft', 'htCenter', 'htRight', 'htJustify'];
            classNames = classNames.filter(c => !alignments.includes(c));
            classNames.push(alignment);
            cell.className = classNames.join(' ');
          }
        }
    });
    hotInstance.render();
  };

  const handleMergeToggle = () => {
    if (!hotInstance) return;
    const mergePlugin = hotInstance.getPlugin('mergeCells');
    const selection = hotInstance.getSelectedRangeLast();
    if (!selection) return;

    const isMerged = mergePlugin.isMerged(selection.from.row, selection.from.col);

    if (isMerged) {
        const mergeInfo = mergePlugin.getMerge(selection.from.row, selection.from.col);
        if (mergeInfo) {
            mergePlugin.unmerge(mergeInfo.row, mergeInfo.col);
        }
    } else {
        mergePlugin.merge(selection.from.row, selection.from.col, selection.to.row, selection.to.col);
    }
    hotInstance.render();
  };

  const handleWrapTextToggle = () => {
    if (!hotInstance) return;
    const selectedRange = hotInstance.getSelectedRangeLast();
    if (!selectedRange) return;

    const firstCellMeta = hotInstance.getCellMeta(selectedRange.from.row, selectedRange.from.col);
    const isWrapped = firstCellMeta.wordWrap === 'break-word';

    hotInstance.batch(() => {
        for (let row = selectedRange.from.row; row <= selectedRange.to.row; row++) {
            for (let col = selectedRange.from.col; col <= selectedRange.to.col; col++) {
                hotInstance.setCellMeta(row, col, 'wordWrap', isWrapped ? 'normal' : 'break-word');
            }
        }
    });
    hotInstance.render();
  };

  const handleCopy = () => {
    hotInstance?.getPlugin('copyPaste').copy();
  }

  const handleCut = () => {
    hotInstance?.getPlugin('copyPaste').cut();
  }

  const handleDownload = () => {
    if (!hotInstance) return;
    const data = hotInstance.getData();
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'Sasha-Spreadsheet.xlsx');
  };

  const isEnabled = !!hotInstance;

  return (
    <TooltipProvider>
      <div className="p-2 border-b bg-background z-20 relative">
        <div className="flex flex-wrap items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-sm">{t('toolbarTemplates')}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <ScrollArea className="h-[250px]">
                    {templates.map((template) => (
                    <DropdownMenuItem key={template.id} onSelect={() => onSetTemplate(template)}>
                        {t(template.name)}
                    </DropdownMenuItem>
                    ))}
                </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="h-8 text-sm" onClick={onImport}>{t('toolbarImport')}</Button>
          <Button variant="ghost" size="sm" className="h-8 text-sm" onClick={handleDownload} disabled={!isEnabled}>{t('toolbarDownload')}</Button>
          <Button variant="ghost" size="sm" className="h-8 text-sm" onClick={toggleFullscreen}>
            {isFullscreen ? t('toolbarExitFullscreen') : t('toolbarFullscreen')}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-sm cursor-not-allowed text-muted-foreground">{t('toolbarInsert')}</Button>
          <Button variant="ghost" size="sm" className="h-8 text-sm cursor-not-allowed text-muted-foreground">{t('toolbarData')}</Button>
        </div>

        <Separator className="my-2" />

        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex items-center space-x-2 pb-2">
            {/* Clipboard */}
            <div className="flex items-center space-x-1">
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={true}><div className="flex flex-col items-center"><Copy className="h-4 w-4" /><span className="text-[10px] -mt-1">{t('tooltipPaste').split(' ')[0]}</span></div></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipPaste')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCut} disabled={!isEnabled}><Scissors /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipCut')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy} disabled={!isEnabled}><Copy /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipCopy')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={true}><Paintbrush /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipFormatPainter')}</p></TooltipContent>
                </Tooltip>
            </div>
            <Separator orientation="vertical" className="h-6" />

            {/* Font */}
            <div className="flex items-center space-x-1">
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleCellClass('ht-cell-bold')} disabled={!isEnabled}><Bold /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipBold')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleCellClass('ht-cell-italic')} disabled={!isEnabled}><Italic /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipItalic')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleCellClass('ht-cell-underline')} disabled={!isEnabled}><Underline /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipUnderline')}</p></TooltipContent>
                </Tooltip>
                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!isEnabled}><Palette /></Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>{t('tooltipFillColor')}</p></TooltipContent>
                    </Tooltip>
                    <DropdownMenuPortal>
                    <DropdownMenuContent>
                        <div className="p-2 grid grid-cols-4 gap-1">
                            {colorPalette.map(color => (
                                <DropdownMenuItem key={color.className} className="p-0 h-6 w-6 cursor-pointer" onSelect={() => toggleCellClass(color.className, color.className.startsWith('ht-bg-') ? 'ht-bg-' : 'ht-text-')} >
                                    <div title={color.name} className={cn("h-full w-full border", color.className.startsWith('ht-bg-') ? color.className.replace('!important', '') : 'flex items-center justify-center ' + color.className.replace('!important', ''))}>
                                    {color.className.startsWith('ht-text-') && 'A'}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                                <DropdownMenuItem className="p-0 h-6 w-6 cursor-pointer" onSelect={() => { toggleCellClass('', 'ht-bg-'); toggleCellClass('', 'ht-text-'); } }>
                                <div className="h-full w-full border text-xs flex items-center justify-center">X</div>
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                    </DropdownMenuPortal>
                </DropdownMenu>
            </div>
            <Separator orientation="vertical" className="h-6" />

            {/* Alignment */}
            <div className="flex items-center space-x-1">
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAlignment('htLeft')} disabled={!isEnabled}><AlignLeft /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipAlignLeft')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAlignment('htCenter')} disabled={!isEnabled}><AlignCenter /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipCenter')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAlignment('htRight')} disabled={!isEnabled}><AlignRight /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipAlignRight')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleWrapTextToggle} disabled={!isEnabled}><WrapText /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipWrapText')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleMergeToggle} disabled={!isEnabled}><Merge /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipMergeCenter')}</p></TooltipContent>
                </Tooltip>
            </div>
            <Separator orientation="vertical" className="h-6" />
            
            {/* Editing */}
            <div className="flex items-center space-x-1">
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={true}><Sigma /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipAutoSum')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={true}><Filter /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipSortFilter')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={true}><Search /></Button></TooltipTrigger>
                <TooltipContent><p>{t('tooltipFindSelect')}</p></TooltipContent>
                </Tooltip>
            </div>
            </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
