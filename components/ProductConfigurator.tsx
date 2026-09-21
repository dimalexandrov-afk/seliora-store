'use client';

import {useMemo,useState} from 'react';
import {useCart} from './CartProvider';

type Variant={id:string;sku:string;color_name:string;color_hex:string|null;size_label:string;active:boolean};
type Img={id:string;url:string;alt:string;colorName:string|null;sortOrder:number;isPrimary:boolean};

export default function ProductConfigurator({
  locale,slug,name,price,variants,images,fallbackClass
}:{
  locale:string;slug:string;name:string;price:number;variants:Variant[];images:Img[];fallbackClass:string
}){
  const active=variants.filter(v=>v.active);
  const colors=useMemo(()=>{
    const map=new Map<string,string|null>();
    active.forEach(v=>{if(!map.has(v.color_name))map.set(v.color_name,v.color_hex)});
    return [...map.entries()].map(([name,hex])=>({name,hex}));
  },[variants]);
  const[color,setColor]=useState(colors[0]?.name??'');
  const sizes=useMemo(()=>[...new Set(active.filter(v=>v.color_name===color).map(v=>v.size_label))],[active,color]);
  const[size,setSize]=useState(sizes.includes('L')?'L':sizes[0]??'');
  const[index,setIndex]=useState(0);
  const{add}=useCart();
  const bg=locale==='bg';

  const selectedSizes=[...new Set(active.filter(v=>v.color_name===color).map(v=>v.size_label))];
  const effectiveSize=selectedSizes.includes(size)?size:(selectedSizes.includes('L')?'L':selectedSizes[0]??'');
  const variant=active.find(v=>v.color_name===color&&v.size_label===effectiveSize);

  const matching=images.filter(i=>i.colorName===color);
  const generic=images.filter(i=>!i.colorName);
  const visible=[...matching,...generic].sort((a,b)=>(b.isPrimary?1:0)-(a.isPrimary?1:0)||a.sortOrder-b.sortOrder);
  const current=visible[Math.min(index,Math.max(visible.length-1,0))];

  function chooseColor(next:string){
    setColor(next);
    const nextSizes=[...new Set(active.filter(v=>v.color_name===next).map(v=>v.size_label))];
    setSize(nextSizes.includes('L')?'L':nextSizes[0]??'');
    setIndex(0);
  }

  return <div className="productconfig">
    <div className="gallery">
      {visible.length?<><div className="gallerymain"><img src={current.url} alt={current.alt}/></div>{visible.length>1&&<div className="gallerythumbs">{visible.map((img,i)=><button key={img.id} className={i===index?'active':''} onClick={()=>setIndex(i)} aria-label={'Image '+(i+1)}><img src={img.url} alt=""/></button>)}</div>}</>:<div className={fallbackClass} style={{height:590}}/>}
    </div>
    <div className="productinfo">
      {colors.length>0&&<><div className="optionlabel">{bg?'Цвят':'Color'}: <strong>{color}</strong></div><div className="colors">{colors.map(c=><button key={c.name} className={color===c.name?'selected':''} onClick={()=>chooseColor(c.name)} title={c.name}><span style={{background:c.hex||'#777'}}/>{c.name}</button>)}</div></>}
      <div className="optionlabel">{bg?'Размер':'Size'}</div>
      <div className="sizes">{selectedSizes.map(s=><button key={s} className={effectiveSize===s?'selected':''} onClick={()=>setSize(s)}>{s}</button>)}</div>
      <button className="btn primary addbtn" disabled={!variant} onClick={()=>variant&&add({variantId:variant.id,sku:variant.sku,productName:name,slug,color:variant.color_name,size:variant.size_label,price})}>{bg?'Добави в кошницата':'Add to bag'}</button>
      <div className="microcopy">{bg?'Снимките се сменят автоматично според избрания цвят.':'Images update automatically for the selected color.'}</div>
    </div>
  </div>
}
