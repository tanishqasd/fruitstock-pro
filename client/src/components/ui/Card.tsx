import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

const Card = ({ children, className = "" }: Props) => {
  return (
    <div
      className={`
      bg-[#171717]
      rounded-[30px]
      p-8
      border border-[#262626]
      shadow-[0_20px_80px_rgba(0,0,0,.45)]
      hover:border-[#3b3b3b]
      hover:-translate-y-1
      transition-all duration-300
      ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;