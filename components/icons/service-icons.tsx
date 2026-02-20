import type { SVGProps } from "react";

const iconProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "currentColor" };

export function ClickUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props} style={{ color: "#7B68EE", ...props.style }}>
      <path d="M2.88 17.12l3.53-2.7C8.08 16.46 10 17.27 12 17.27c2 0 3.92-.81 5.59-2.85l3.53 2.7C18.6 20.41 15.5 22 12 22s-6.6-1.59-9.12-4.88zM12 1.95l-8.37 8.37 3.18 3.18L12 8.31l5.19 5.19 3.18-3.18L12 1.95z" />
    </svg>
  );
}

export function NotionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props} style={{ color: "#000000", ...props.style }}>
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.296 2.13c-.42-.326-.98-.7-2.055-.607L3.01 2.71c-.467.046-.56.28-.374.466zM5.26 7.33v13.594c0 .746.373 1.026 1.213.98l14.523-.84c.84-.046.933-.56.933-1.166V6.584c0-.607-.233-.933-.746-.887l-15.177.887c-.56.046-.746.327-.746.746zM18.36 8.27c.094.42 0 .84-.42.887l-.7.14v10.024c-.607.327-1.166.513-1.633.513-.746 0-.933-.233-1.493-.933l-4.571-7.178v6.95l1.446.327s0 .84-1.166.84l-3.22.187c-.092-.187 0-.653.328-.746l.84-.233V9.577L5.827 9.39c-.093-.42.14-1.026.793-1.073l3.453-.233 4.758 7.272V9.017l-1.213-.14c-.093-.513.28-.887.746-.933z" />
    </svg>
  );
}

export function JiraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props} style={{ color: "#0052CC", ...props.style }}>
      <path d="M11.571 11.513H0a5.218 5.218 0 005.232 5.215h2.13v2.057A5.215 5.215 0 0012.575 24V12.518a1.005 1.005 0 00-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 005.215 5.214h2.129v2.058a5.218 5.218 0 005.215 5.214V6.762a1.005 1.005 0 00-1.001-1.005zM23.013 0H11.455a5.215 5.215 0 005.215 5.215h2.129v2.057A5.215 5.215 0 0024.013 12.487V1.005A1.005 1.005 0 0023.013 0z" />
    </svg>
  );
}

export function LinearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props} style={{ color: "#5E6AD2", ...props.style }}>
      <path d="M1.04 11.28c-.03.19-.04.38-.04.58 0 5.52 4.48 10 10 10 .2 0 .39-.01.58-.04L1.04 11.28zm1.28 4.06l7.34 7.34A9.99 9.99 0 0020.66 12H13a1 1 0 01-1-1V3.34A9.99 9.99 0 002.32 15.34z" />
    </svg>
  );
}

export function AsanaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props} style={{ color: "#F06A6A", ...props.style }}>
      <circle cx="12" cy="6" r="5.5" />
      <circle cx="5.5" cy="17.5" r="5.5" />
      <circle cx="18.5" cy="17.5" r="5.5" />
    </svg>
  );
}
