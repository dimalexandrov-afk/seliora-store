'use client';
import Link from 'next/link';
import {useEffect} from 'react';
import {useParams} from 'next/navigation';
import {useCart} from '@/components/CartProvider';
import {supabase} from '@/lib/supabase-browser';

export default function CartPage(){
  const params=useParams<{locale:string}>();
  const locale=params.locale;
  const bg=locale==='bg';
  const{items,subtotal,remove,setQty,setMaxQty}=useCart();

  useEffect(()=>{
    const ids=items.map(i=>i.variantId);
    if(!ids.length)return;
    supabase.from('inventory').select('variant_id,quantity_on_hand,quantity_reserved').in('variant_id',ids).then(({data})=>{
      const map=new Map((data??[]).map(r=>[r.variant_id,Math.max(0,(r.quantity_on_hand??0)-(r.quantity_reserved??0))]));
      ids.forEach(id=>setMaxQty(id,map.get(id)??0));
    });
  // Refresh when cart variants change, not when quantity changes.
  },[items.map(i=>i.variantId).join('|')]);

  return <main className="wrap">
    <div className="pagehead"><div className="eyebrow">{bg?'Твоята селекция':'Your selection'}</div><h1>{bg?'Кошница':'Shopping bag'}</h1></div>
    {items.length===0?<div className="emptycart"><p>{bg?'Кошницата е празна.':'Your bag is empty.'}</p><Link className="btn primary" href={'/'+locale+'/shop'}>{bg?'Към магазина':'Shop collection'}</Link></div>:
    <div className="cartlayout"><div>{items.map(i=><div className="cartrow" key={i.variantId}>
      <div className="cartthumb"/>
      <div className="cartinfo"><strong>{i.productName}</strong><div>{i.color} · {i.size}</div>
        {i.maxQty<=0?<div className="stockwarning">{bg?'Изчерпан — премахни продукта от кошницата.':'Out of stock — remove this item from your bag.'}</div>:
        <><div className="qty"><button onClick={()=>setQty(i.variantId,i.qty-1)}>−</button><span>{i.qty}</span><button disabled={i.qty>=i.maxQty} onClick={()=>setQty(i.variantId,i.qty+1)}>+</button></div><div className="cartstock">{i.maxQty<=3?(bg?'Налични: '+i.maxQty:'Available: '+i.maxQty):''}</div></>}
      </div>
      <div className="cartprice">{i.maxQty>0?'€'+(i.price*i.qty).toFixed(2):'—'}<button className="textbtn" onClick={()=>remove(i.variantId)}>{bg?'Премахни':'Remove'}</button></div>
    </div>)}</div>
    <aside className="summary"><div className="eyebrow">{bg?'Общо':'Summary'}</div><div className="summaryline"><span>{bg?'Междинна сума':'Subtotal'}</span><strong>€{subtotal.toFixed(2)}</strong></div><p>{bg?'Количествата се проверяват спрямо текущата наличност. Доставка и плащане ще бъдат активирани преди официалния старт.':'Quantities are checked against live inventory. Shipping and payment will be enabled before the official launch.'}</p><button className="btn primary addbtn" disabled>{bg?'Checkout скоро':'Checkout coming soon'}</button></aside>
    </div>}
  </main>
}
