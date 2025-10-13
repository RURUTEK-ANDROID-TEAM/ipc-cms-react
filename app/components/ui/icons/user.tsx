import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import {
  Activity,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

export interface IconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface IconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  color?: string; // 👈 allows different role colors
  badge?: React.ReactNode; // 👈 overlay marker (crown, eye, wrench, etc.)
}

const pathVariant = {
  normal: { pathLength: 1, opacity: 1, pathOffset: 0 },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    pathOffset: [1, 0],
  },
};

const circleVariant = {
  normal: { pathLength: 1, pathOffset: 0, scale: 1 },
  animate: {
    pathLength: [0, 1],
    pathOffset: [1, 0],
    scale: [0.5, 1],
  },
};

const BaseUserIcon = forwardRef<IconHandle, IconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 15,
      color = "currentColor",
      badge,
      ...props
    },
    ref
  ) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start("animate");
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start("normal");
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn("relative inline-block", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.circle
            cx="12"
            cy="8"
            r="5"
            animate={controls}
            variants={circleVariant}
          />
          <motion.path
            d="M20 21a8 8 0 0 0-16 0"
            variants={pathVariant}
            transition={{ delay: 0.2, duration: 0.4 }}
            animate={controls}
          />
        </svg>

        {/* Badge overlay */}
        <Activity mode={badge ? "visible" : "hidden"}>
          <span className="absolute -bottom-1 -right-1 text-xs">{badge}</span>
        </Activity>
      </div>
    );
  }
);

BaseUserIcon.displayName = "BaseUserIcon";

//
// Variants for different roles
//

export const AdminUserIcon = forwardRef<IconHandle, Omit<IconProps, "color">>(
  (props, ref) => <BaseUserIcon ref={ref} color="white" {...props} />
);

export const ViewerUserIcon = forwardRef<IconHandle, Omit<IconProps, "color">>(
  (props, ref) => <BaseUserIcon ref={ref} color="white" {...props} />
);

export const OperatorUserIcon = forwardRef<
  IconHandle,
  Omit<IconProps, "color">
>((props, ref) => <BaseUserIcon ref={ref} color="white" {...props} />);
