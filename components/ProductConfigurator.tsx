'use client';

import {useMemo,useState} from 'react';
import {useCart} from './CartProvider';

type InventoryRow={quantity_on_hand:number;quantity_reserved:number};
type Variant={id:string;sku:string;color_name:string;color_hex:string|null;size_label:string;active:boolean;inventory?:InventoryRow|InventoryRow[]|null};
type Img={id:string;url:string;alt:string;colorName:string|null;sortOrder:number;isPrimary:boolean};

export default function ProductConfigurator({
  locale,slug,name,price,variants,images,fallbackClass
}:{
  locale:string;slug:string;name:string;price:number;variants:Variant[];images:Img[];fallbackClass:string
}){
  const stockOf=(v:Variant)=>{const row=Array.isArray(v.inventory)?v.inventory[0]:v.inventory;return Math.max(0,(row?.quantity_on_hand??0)-(row?.quantity_reserved??0))};
  const active=variants.filter(v=>v.active);
  const colors=useMemo(()=>{
    const map=new Map<string,string|null>();
    active.forEach(v=>{if(!map.has(v.color_name))map.set(v.color_name,v.color_hex)});
    return [...map.entries()].map(([name,hex])=>({name,hex}));
  },[variants]);
  const ordered=useMemo(()=>[...images].sort((a,b)=>(b.isPrimary?1:0)-(a.isPrimary?1:0)||a.sortOrder-b.sortOrder),[images]);
  const[color,setColor]=useState(colors[0]?.name??'');
  const firstColor=colors[0]?.name??'';
  const initialVariants=active.filter(v=>v.color_name===firstColor);
  const initialSizes=[...new Set(initialVariants.map(v=>v.size_label))];
  const initialInStock=initialVariants.filter(v=>stockOf(v)>0).map(v=>v.size_label);
  const[size,setSize]=useState(initialInStock.includes('L')?'L':initialInStock[0]??(initialSizes.includes('L')?'L':initialSizes[0]??''));
  const[index,setIndex]=useState(0);
  const{add}=useCart();
  const bg=locale==='bg';

  const selectedSizes=[...new Set(active.filter(v=>v.color_name===color).map(v=>v.size_label))];
  const inStockSizes=active.filter(v=>v.color_name===color&&stockOf(v)>0).map(v=>v.size_label);
  const effectiveSize=selectedSizes.includes(size)?size:(inStockSizes.includes('L')?'L':inStockSizes[0]??(selectedSizes.includes('L')?'L':selectedSizes[0]??''));
  const variant=active.find(v=>v.color_name===color&&v.size_label===effectiveSize);
  const current=ordered[Math.min(index,Math.max(ordered.length-1,0))];

  function prev(){if(ordered.length)setIndex(i=>(i-1+ordered.length)%ordered.length)}
  function next(){if(ordered.length)setIndex(i=>(i+1)%ordered.length)}

  function chooseColor(nextColor:string){
    setColor(nextColor);
    const nextVariants=active.filter(v=>v.color_name===nextColor);
    const nextSizes=[...new Set(nextVariants.map(v=>v.size_label))];
    const nextInStock=nextVariants.filter(v=>stockOf(v)>0).map(v=>v.size_label);
    setSize(nextInStock.includes('L')?'L':nextInStock[0]??(nextSizes.includes('L')?'L':nextSizes[0]??''));
    const firstMatching=ordered.findIndex(i=>i.colorName===nextColor);
    if(firstMatching>=0)setIndex(firstMatching);
  }

  return <div className="productconfig">
    <div className="gallery">
      {ordered.length?<><div className="gallerymain productgallerymain"><img src={current.url} alt={current.alt}/>{ordered.length>1&&<><button className="galleryarrow prev" onClick={prev} aria-label="Previous image">‹</button><button className="galleryarrow next" onClick={next} aria-label="Next image">›</button><div className="gallerycount">{index+1}/{ordered.length}</div></>}</div>{ordered.length>1&&<div className="gallerythumbs">{ordered.map((img,i)=><button key={img.id} className={i===index?'active':''} onClick={()=>setIndex(i)} aria-label={'Image '+(i+1)}><img src={img.url} alt=""/></button>)}</div>}</>:<div className={fallbackClass} style={{height:590}}/>}
    </div>
    <div className="productinfo">
      {colors.length>0&&<><div className="optionlabel">{bg?'Цвят':'Color'}: <strong>{color}</strong></div><div className="colors">{colors.map(c=><button key={c.name} className={color===c.name?'selected':''} onClick={()=>chooseColor(c.name)} title={c.name}><span style={{background:c.hex||'#777'}}/>{c.name}</button>)}</div></>}
      <div className="optionlabel">{bg?'Размер':'Size'}</div>
      <div className="sizes">{selectedSizes.map(s=>{const sv=active.find(v=>v.color_name===color&&v.size_label===s);const available=sv?stockOf(sv):0;return <button key={s} className={(effectiveSize===s?'selected ':'')+(available<=0?'soldout':'')} disabled={available<=0} onClick={()=>setSize(s)}>{s}{available<=0?<small>{bg?'Изчерпан':'Out'}</small>:available<=3?<small>{bg?'Последни '+available:'Only '+available}</small>:null}</button>})}</div>
      <button className="btn primary addbtn" disabled={!variant||stockOf(variant)<=0} onClick={()=>variant&&stockOf(variant)>0&&add({variantId:variant.id,sku:variant.sku,productName:name,slug,color:variant.color_name,size:variant.size_label,price,maxQty:stockOf(variant)})}>{variant&&stockOf(variant)<=0?(bg?'Изчерпан':'Out of stock'):(bg?'Добави в кошницата':'Add to bag')}</button>
      <div className="microcopy">{variant&&stockOf(variant)>0?(stockOf(variant)<=3?(bg?'Остават '+stockOf(variant)+' броя.':'Only '+stockOf(variant)+' left.'):(bg?'В наличност':'In stock')):(bg?'Избраният вариант не е наличен.':'The selected variant is unavailable.')}</div>
    </div>
  </div>
}
