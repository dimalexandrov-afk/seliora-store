'use client';

import Link from 'next/link';
import {useState} from 'react';

type Img={id:string;url:string;alt:string;colorName:string|null;isPrimary:boolean;sortOrder:number};

export default function ProductCard({
  locale,slug,name,meta,regular,price,images,fallbackClass
}:{
  locale:string;slug:string;name:string;meta:string|null;regular:string;price:string;images:Img[];fallbackClass:string
}){
  const ordered=[...images].sort((a,b)=>(b.isPrimary?1:0)-(a.isPrimary?1:0)||a.sortOrder-b.sortOrder);
  const[index,setIndex]=useState(0);
  const current=ordered[Math.min(index,Math.max(0,ordered.length-1))];

  function prev(e:React.MouseEvent){e.preventDefault();e.stopPropagation();setIndex(i=>(i-1+ordered.length)%ordered.length)}
  function next(e:React.MouseEvent){e.preventDefault();e.stopPropagation();setIndex(i=>(i+1)%ordered.length)}

  return <article className="card catalogcard">
    <div className="catalogmedia">
      <Link href={'/'+locale+'/product/'+slug} aria-label={name}>
        {current?<div className="productart hasimage"><img src={current.url} alt={current.alt}/></div>:<div className={fallbackClass}/>}
      </Link>
      {ordered.length>1&&<>
        <button className="catalogarrow prev" onClick={prev} aria-label="Previous image">‹</button>
        <button className="catalogarrow next" onClick={next} aria-label="Next image">›</button>
        <div className="catalogdots">{ordered.map((img,i)=><button key={img.id} className={i===index?'active':''} onClick={e=>{e.preventDefault();e.stopPropagation();setIndex(i)}} aria-label={'Image '+(i+1)}/>)}</div>
        <div className="imagecount">{index+1}/{ordered.length}</div>
      </>}
    </div>
    <Link className="cardbody" href={'/'+locale+'/product/'+slug}>
      <div className="name">{name}</div>
      <div className="meta">{meta}</div>
      <div className="price"><span className="oldprice">{regular}</span>{price}</div>
    </Link>
  </article>
}
