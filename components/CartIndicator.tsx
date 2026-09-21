'use client';
import Link from 'next/link';import {useCart} from './CartProvider';
export default function CartIndicator({locale,label}:{locale:string;label:string}){const{count}=useCart();return <Link href={'/'+locale+'/cart'}>{label} ({count})</Link>}
