'use client';
import {createContext,useContext,useEffect,useMemo,useState} from 'react';

export type CartItem={
  variantId:string;sku:string;productName:string;slug:string;color:string;size:string;
  price:number;qty:number;maxQty:number
};
type CartContextValue={
  items:CartItem[];count:number;subtotal:number;
  add:(item:Omit<CartItem,'qty'|'maxQty'> & {maxQty?:number})=>void;
  remove:(variantId:string)=>void;
  setQty:(variantId:string,qty:number)=>void;
  setMaxQty:(variantId:string,maxQty:number)=>void;
  clear:()=>void
};
const CartContext=createContext<CartContextValue|null>(null);

export function CartProvider({children}:{children:React.ReactNode}){
  const[items,setItems]=useState<CartItem[]>([]);
  useEffect(()=>{try{const raw=localStorage.getItem('seliora_cart');if(raw){const parsed=JSON.parse(raw);setItems((parsed as CartItem[]).map(i=>({...i,maxQty:typeof i.maxQty==='number'?i.maxQty:99})))}}catch{}},[]);
  useEffect(()=>{try{localStorage.setItem('seliora_cart',JSON.stringify(items))}catch{}},[items]);

  const value=useMemo<CartContextValue>(()=>({
    items,
    count:items.reduce((s,i)=>s+i.qty,0),
    subtotal:items.reduce((s,i)=>s+i.qty*i.price,0),
    add:item=>setItems(current=>{
      const maxQty=item.maxQty??99;
      if(maxQty<=0)return current;
      const found=current.find(x=>x.variantId===item.variantId);
      if(found)return current.map(x=>x.variantId===item.variantId?{...x,maxQty,qty:Math.min(x.qty+1,maxQty)}:x);
      return [...current,{...item,maxQty,qty:1}]
    }),
    remove:id=>setItems(current=>current.filter(x=>x.variantId!==id)),
    setQty:(id,qty)=>setItems(current=>current.flatMap(x=>{
      if(x.variantId!==id)return [x];
      if(qty<=0)return [];
      return [{...x,qty:Math.min(qty,x.maxQty)}]
    })),
    setMaxQty:(id,maxQty)=>setItems(current=>current.flatMap(x=>{
      if(x.variantId!==id)return [x];
      if(maxQty<=0)return [{...x,maxQty:0,qty:0}];
      return [{...x,maxQty,qty:Math.min(Math.max(1,x.qty),maxQty)}]
    })),
    clear:()=>setItems([])
  }),[items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
export function useCart(){const ctx=useContext(CartContext);if(!ctx)throw new Error('useCart must be inside CartProvider');return ctx}
