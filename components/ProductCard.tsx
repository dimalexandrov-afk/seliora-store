'use client';

import Link from 'next/link';

type Img={id:string;url:string;alt:string;colorName:string|null;isPrimary:boolean;sortOrder:number};

export default function ProductCard({
  locale,slug,name,meta,regular,price,images,fallbackClass
}:{
  locale:string;slug:string;name:string;meta:string|null;regular:string;price:string;images:Img[];fallbackClass:string
}){
  const ordered=[...images].sort((a,b)=>(b.isPrimary?1:0)-(a.isPrimary?1:0)||a.sortOrder-b.sortOrder);
  const first=ordered[0];
  const second=ordered[1];

  return <article className="card catalogcard">
    <Link className="catalogmedia hoverswap" href={'/'+locale+'/product/'+slug} aria-label={name}>
      {first?<div className="productart hasimage">
        <img className="catalogimg primaryimg" src={first.url} alt={first.alt}/>
        {second&&<img className="catalogimg secondaryimg" src={second.url} alt=""/>}
      </div>:<div className={fallbackClass}/>}
      {second&&<div className="hoverhint">1 / 2</div>}
    </Link>
    <Link className="cardbody" href={'/'+locale+'/product/'+slug}>
      <div className="name">{name}</div>
      <div className="meta">{meta}</div>
      <div className="price"><span className="oldprice">{regular}</span>{price}</div>
    </Link>
  </article>
}
