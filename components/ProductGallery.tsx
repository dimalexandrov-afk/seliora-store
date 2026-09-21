'use client';
import {useState} from 'react';

type Img={id:string;url:string;alt:string};
export default function ProductGallery({images,fallbackClass}:{images:Img[];fallbackClass:string}){
  const[index,setIndex]=useState(0);
  if(!images.length)return <div className={fallbackClass} style={{height:590}}/>;
  const current=images[Math.min(index,images.length-1)];
  return <div className="gallery"><div className="gallerymain"><img src={current.url} alt={current.alt}/></div>{images.length>1&&<div className="gallerythumbs">{images.map((img,i)=><button key={img.id} className={i===index?'active':''} onClick={()=>setIndex(i)} aria-label={'Image '+(i+1)}><img src={img.url} alt=""/></button>)}</div>}</div>
}
