import Image, { ImageProps } from "next/image";
import React from "react";

// This wrapper allows us to use next/image with data URLs and remote URLs
const NextImageWrapper = (props: ImageProps) => {
  // Unoptimized is required for data URLs (live preview)
  // eslint-disable-next-line jsx-a11y/alt-text -- alt is required by ImageProps and passed via spread
  return <Image {...props} unoptimized />;
};

export default NextImageWrapper;
