import './globals.css';import Header from '@/components/Header';import Footer from '@/components/Footer';
export const metadata={title:'SELIORA — Hosiery for every body',description:'Modern hosiery designed for comfort, fit and everyday confidence.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Header/>{children}<Footer/></body></html>}
