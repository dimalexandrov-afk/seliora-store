import {notFound} from 'next/navigation';import {isLocale,copy} from '@/lib/i18n';import {getProduct,money,imageUrl} from '@/lib/catalog';import ProductConfigurator from '@/components/ProductConfigurator';

function detailLabel(locale:string,key:string){
  const bg=locale==='bg';
  if(key==='material')return bg?'Състав':'Composition';
  if(key==='toe')return bg?'Пръсти':'Toe';
  if(key==='waistband')return bg?'Колан':'Waistband';
  if(key==='care')return bg?'Грижа':'Care';
  return key;
}

export default async function Product({params}:{params:Promise<{locale:string,slug:string}>}){
  const {locale,slug}=await params;
  if(!isLocale(locale))notFound();
  const p=await getProduct(slug);
  if(!p)notFound();
  const t=copy[locale];
  const price=p.launch_price_eur??p.base_price_eur??0;
  const variants=(p.product_variants??[]).filter(v=>v.active);
  const images=[...(p.product_images??[])].map(i=>({
    id:i.id,url:imageUrl(i.storage_path),alt:i.alt_text??p.name,colorName:i.color_name??null,sortOrder:i.sort_order,isPrimary:i.is_primary
  }));
  const specs=[
    [detailLabel(locale,'material'),p.material_composition],
    [detailLabel(locale,'toe'),p.toe_type],
    [detailLabel(locale,'waistband'),p.waistband_type],
    [detailLabel(locale,'care'),p.care_instructions]
  ].filter(([,v])=>v);

  return <main className="wrap">
    <div className="pagehead"><div className="eyebrow">{t.collection}</div><h1>{p.name}</h1><p className="lead">{p.subtitle}</p></div>
    <div className="productlayout">
      <ProductConfigurator locale={locale} slug={slug} name={p.name} price={price} variants={variants} images={images} fallbackClass={`productart ${p.finish==='gloss'?'gloss':''} ${p.finish==='opaque'?'opaque':''}`}/>
      <div className="productdetails">
        <div className="price" style={{fontSize:25}}><span className="oldprice">{money(p.base_price_eur)}</span>{money(p.launch_price_eur)}</div>
        <p className="lead">{p.description}</p>
        {specs.length>0&&<div className="productspecs">{specs.map(([label,value])=><div className="specrow" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
        <div className="placeholder">{locale==='bg'?'Размерната таблица ще бъде финализирана след физическо тестване на мострите.':'The final fit chart will be confirmed after physical sample testing.'}</div>
      </div>
    </div>
  </main>
}