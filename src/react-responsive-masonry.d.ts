declare module "react-responsive-masonry" {
  import * as React from "react";

  export interface MasonryProps {
    children?: React.ReactNode;
    columnsCount?: number;
    gutter?: string;
    className?: string;
    style?: React.CSSProperties;
    containerTag?: string;
    itemTag?: string;
    itemStyle?: React.CSSProperties;
    itemClassName?: string;
    sequential?: boolean;
  }

  export interface ResponsiveMasonryProps {
    children?: React.ReactNode;
    columnsCountBreakPoints?: Record<number, number>;
    gutterBreakPoints?: Record<number, string>;
    className?: string;
    style?: React.CSSProperties;
  }

  export default function Masonry(props: MasonryProps): React.ReactElement | null;
  export function ResponsiveMasonry(
    props: ResponsiveMasonryProps
  ): React.ReactElement | null;
}
