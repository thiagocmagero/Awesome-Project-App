declare module 'react-file-icon' {
  import * as React from 'react';

  export interface FileIconProps {
    extension?: string;
    color?: string;
    type?: string;
    labelColor?: string;
    glyphColor?: string;
    foldColor?: string;
    gradientColor?: string;
    gradientOpacity?: number;
    radius?: number;
    fold?: boolean;
    labelTextColor?: string;
    labelUppercase?: boolean;
    size?: number;
  }

  export const FileIcon: React.FC<FileIconProps>;
  export const defaultStyles: Record<string, Partial<FileIconProps>>;
}
