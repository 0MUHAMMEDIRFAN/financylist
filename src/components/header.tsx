import Link from 'next/link';

const Logo = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 28C10 29.1046 9.10457 30 8 30C6.89543 30 6 29.1046 6 28C6 26.8954 6.89543 26 8 26C9.10457 26 10 26.8954 10 28Z" fill="hsl(var(--primary))"/>
        <path d="M26 28C26 29.1046 25.1046 30 24 30C22.8954 30 22 29.1046 22 28C22 26.8954 22.8954 26 24 26C25.1046 26 26 26.8954 26 28Z" fill="hsl(var(--primary))"/>
        <path d="M8 2C10.7614 2 13 4.23858 13 7V22.5C13 23.3284 12.3284 24 11.5 24H9.5C8.67157 24 8 23.3284 8 22.5V7C8 5.34315 6.65685 4 5 4C3.34315 4 2 5.34315 2 7V22.5C2 25.5376 4.46243 28 7.5 28H8.5C11.5376 28 14 25.5376 14 22.5V7C14 3.68629 11.3137 1 8 1C4.68629 1 2 3.68629 2 7" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M24 2C21.2386 2 19 4.23858 19 7V22.5C19 23.3284 19.6716 24 20.5 24H22.5C23.3284 24 24 23.3284 24 22.5V7C24 5.34315 25.3431 4 27 4C28.6569 4 30 5.34315 30 7V22.5C30 25.5376 27.5376 28 24.5 28H23.5C20.4624 28 18 25.5376 18 22.5V7C18 3.68629 20.6863 1 24 1C27.3137 1 30 3.68629 30 7" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


export function Header({ children, leftNode, title }: { children?: React.ReactNode; leftNode?: React.ReactNode; title?: string }) {
  return (
    <header className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
            {leftNode}
            {title ? (
                <span className="text-xl font-bold text-foreground">{title}</span>
            ) : (
                <Link href="/" className="flex items-center gap-2">
                    <Logo />
                    <span className="text-xl font-bold text-primary hidden sm:inline-block">Financylist</span>
                </Link>
            )}
        </div>
        <div className="flex items-center gap-2">
            {children}
        </div>
      </div>
    </header>
  );
}
