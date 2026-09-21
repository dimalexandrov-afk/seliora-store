'use client';

import {FormEvent,useEffect,useMemo,useState} from 'react';
import {supabase} from '@/lib/supabase-browser';

type Product={
  id:string;slug:string;name:string;subtitle:string|null;description:string|null;denier:number|null;finish:string|null;
  status:string;base_price_eur:number|null;launch_price_eur:number|null;featured:boolean;sort_order:number;
};
type Variant={id:string;product_id:string;sku:string;color_name:string;size_label:string;active:boolean};
type Stock={variant_id:string;quantity_on_hand:number;quantity_reserved:number;reorder_level:number};
type ProductImage={id:string;product_id:string;storage_path:string;alt_text:string|null;sort_order:number;is_primary:boolean};

const PUBLIC_BASE='https://yclgswebvkiilmescehw.supabase.co/storage/v1/object/public/product-images/';
function publicUrl(path:string){return PUBLIC_BASE+path.split('/').map(encodeURIComponent).join('/')}

export default function AdminPage(){
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[logged,setLogged]=useState(false);
  const[authorized,setAuthorized]=useState(false);
  const[products,setProducts]=useState<Product[]>([]);
  const[selectedId,setSelectedId]=useState('');
  const[variants,setVariants]=useState<Variant[]>([]);
  const[stock,setStock]=useState<Stock[]>([]);
  const[images,setImages]=useState<ProductImage[]>([]);
  const[msg,setMsg]=useState('');
  const[busy,setBusy]=useState(false);
  const[uploading,setUploading]=useState(false);

  const selected=useMemo(()=>products.find(p=>p.id===selectedId)??null,[products,selectedId]);

  useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(data.session){setLogged(true);checkAccess();}})},[]);

  async function checkAccess(){
    const{data,error}=await supabase.from('admin_users').select('user_id').limit(1);
    const ok=!error&&!!data?.length;
    setAuthorized(ok);
    if(ok)await loadProducts();
  }

  async function login(e:FormEvent){
    e.preventDefault();setMsg('');setBusy(true);
    const{error}=await supabase.auth.signInWithPassword({email,password});
    setBusy(false);
    if(error){setMsg(error.message);return}
    setLogged(true);await checkAccess();
  }

  async function logout(){await supabase.auth.signOut();setLogged(false);setAuthorized(false);setProducts([]);}

  async function loadProducts(){
    const{data,error}=await supabase.from('products').select('*').order('sort_order');
    if(error){setMsg(error.message);return}
    setProducts(data??[]);
    if(data?.length&&!selectedId)await selectProduct(data[0].id);
  }

  async function selectProduct(productId:string){
    setSelectedId(productId);setMsg('');
    const[{data:v,error},{data:imgs}]=await Promise.all([
      supabase.from('product_variants').select('id,product_id,sku,color_name,size_label,active').eq('product_id',productId).order('size_label'),
      supabase.from('product_images').select('*').eq('product_id',productId).order('sort_order')
    ]);
    if(error){setMsg(error.message);return}
    setVariants(v??[]);setImages(imgs??[]);
    const ids=(v??[]).map(x=>x.id);
    if(!ids.length){setStock([]);return}
    const{data:s}=await supabase.from('inventory').select('*').in('variant_id',ids);
    setStock(s??[]);
  }

  function patchProduct(field:keyof Product,value:any){
    setProducts(ps=>ps.map(p=>p.id===selectedId?{...p,[field]:value}:p));
  }

  async function saveProduct(){
    if(!selected)return;setBusy(true);setMsg('');
    const payload={
      name:selected.name,subtitle:selected.subtitle,description:selected.description,denier:selected.denier,finish:selected.finish,
      status:selected.status,base_price_eur:selected.base_price_eur,launch_price_eur:selected.launch_price_eur,
      featured:selected.featured,sort_order:selected.sort_order,updated_at:new Date().toISOString()
    };
    const{error}=await supabase.from('products').update(payload).eq('id',selected.id);
    setBusy(false);setMsg(error?error.message:'Запазено.');
  }

  async function saveStock(variantId:string,qty:number){
    setStock(s=>s.map(x=>x.variant_id===variantId?{...x,quantity_on_hand:qty}:x));
    const{error}=await supabase.from('inventory').update({quantity_on_hand:qty,updated_at:new Date().toISOString()}).eq('variant_id',variantId);
    setMsg(error?error.message:'Наличността е обновена.');
  }

  async function uploadImages(files:FileList|null){
    if(!selected||!files?.length)return;
    setUploading(true);setMsg('');
    let nextOrder=images.length?Math.max(...images.map(i=>i.sort_order))+1:0;
    let hasPrimary=images.some(i=>i.is_primary);
    for(const file of Array.from(files)){
      if(!file.type.startsWith('image/'))continue;
      const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');
      const path=selected.slug+'/'+crypto.randomUUID()+'-'+safe;
      const{error:uploadError}=await supabase.storage.from('product-images').upload(path,file,{cacheControl:'3600',upsert:false});
      if(uploadError){setMsg(uploadError.message);continue}
      const{error:insertError}=await supabase.from('product_images').insert({
        product_id:selected.id,storage_path:path,alt_text:selected.name,sort_order:nextOrder,is_primary:!hasPrimary
      });
      if(insertError){await supabase.storage.from('product-images').remove([path]);setMsg(insertError.message);continue}
      hasPrimary=true;nextOrder++;
    }
    setUploading(false);await selectProduct(selected.id);
    setMsg('Снимките са качени.');
  }

  async function deleteImage(img:ProductImage){
    if(!selected)return;
    setMsg('');
    const{error:storageError}=await supabase.storage.from('product-images').remove([img.storage_path]);
    if(storageError){setMsg(storageError.message);return}
    const{error}=await supabase.from('product_images').delete().eq('id',img.id);
    if(error){setMsg(error.message);return}
    const remaining=images.filter(i=>i.id!==img.id);
    if(img.is_primary&&remaining.length)await supabase.from('product_images').update({is_primary:true}).eq('id',remaining[0].id);
    await selectProduct(selected.id);
  }

  async function setPrimary(id:string){
    if(!selected)return;
    await supabase.from('product_images').update({is_primary:false}).eq('product_id',selected.id);
    const{error}=await supabase.from('product_images').update({is_primary:true}).eq('id',id);
    setMsg(error?error.message:'Основната снимка е сменена.');
    await selectProduct(selected.id);
  }

  async function moveImage(img:ProductImage,dir:-1|1){
    if(!selected)return;
    const ordered=[...images].sort((a,b)=>a.sort_order-b.sort_order);
    const idx=ordered.findIndex(i=>i.id===img.id);
    const swap=ordered[idx+dir];
    if(!swap)return;
    await Promise.all([
      supabase.from('product_images').update({sort_order:swap.sort_order}).eq('id',img.id),
      supabase.from('product_images').update({sort_order:img.sort_order}).eq('id',swap.id)
    ]);
    await selectProduct(selected.id);
  }

  async function updateAlt(id:string,alt:string){
    setImages(xs=>xs.map(x=>x.id===id?{...x,alt_text:alt}:x));
    await supabase.from('product_images').update({alt_text:alt}).eq('id',id);
  }

  if(!logged)return <main className="adminshell"><div className="adminlogin"><div className="eyebrow">SELIORA CMS</div><h1>Администрация</h1><p>Вход за управление на продукти, снимки, цени и наличности.</p><form onSubmit={login}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Парола<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="btn primary addbtn" disabled={busy}>{busy?'Влизане...':'Вход'}</button></form>{msg&&<div className="adminmsg">{msg}</div>}</div></main>;

  if(!authorized)return <main className="adminshell"><div className="adminlogin"><div className="eyebrow">SELIORA CMS</div><h1>Няма достъп</h1><p>Потребителят е влязъл успешно, но не е SELIORA администратор.</p><button className="btn" onClick={logout}>Изход</button></div></main>;

  return <main className="adminshell"><header className="adminbar"><div><strong>SELIORA CMS</strong><span>Catalog · images · inventory</span></div><button className="textbtn" onClick={logout}>Изход</button></header><div className="adminlayout"><aside className="adminproducts"><div className="adminsectiontitle">Продукти</div>{products.map(p=><button key={p.id} className={p.id===selectedId?'active':''} onClick={()=>selectProduct(p.id)}><strong>{p.name}</strong><span>{p.status} · {p.denier??'—'} DEN</span></button>)}</aside>{selected&&<section className="admineditor"><div className="adminheading"><div><div className="eyebrow">Редакция</div><h1>{selected.name}</h1></div><button className="btn primary" onClick={saveProduct} disabled={busy}>{busy?'Запазване...':'Запази'}</button></div><div className="adminformgrid"><label>Име<input value={selected.name} onChange={e=>patchProduct('name',e.target.value)}/></label><label>Slug<input value={selected.slug} disabled/></label><label className="wide">Кратко описание<input value={selected.subtitle??''} onChange={e=>patchProduct('subtitle',e.target.value)}/></label><label className="wide">Описание<textarea rows={5} value={selected.description??''} onChange={e=>patchProduct('description',e.target.value)}/></label><label>DEN<input type="number" value={selected.denier??''} onChange={e=>patchProduct('denier',e.target.value?Number(e.target.value):null)}/></label><label>Финиш<input value={selected.finish??''} onChange={e=>patchProduct('finish',e.target.value)}/></label><label>Редовна цена €<input type="number" step="0.01" value={selected.base_price_eur??''} onChange={e=>patchProduct('base_price_eur',e.target.value?Number(e.target.value):null)}/></label><label>Стартова цена €<input type="number" step="0.01" value={selected.launch_price_eur??''} onChange={e=>patchProduct('launch_price_eur',e.target.value?Number(e.target.value):null)}/></label><label>Статус<select value={selected.status} onChange={e=>patchProduct('status',e.target.value)}><option value="draft">draft</option><option value="active">active</option><option value="archived">archived</option></select></label><label>Подредба<input type="number" value={selected.sort_order} onChange={e=>patchProduct('sort_order',Number(e.target.value))}/></label></div>

  <div className="adminimages"><div className="adminsectiontitle">Продуктови снимки</div><label className="uploadbox"><strong>{uploading?'Качване...':'Качи снимки'}</strong><span>Може да избереш няколко JPG, PNG, WebP или AVIF файла наведнъж. До 8 MB на файл.</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={uploading} onChange={e=>uploadImages(e.target.files)}/></label>{!images.length&&<p className="microcopy">Още няма качени снимки за този продукт.</p>}<div className="adminimagegrid">{[...images].sort((a,b)=>a.sort_order-b.sort_order).map((img,idx)=><article className="adminimagecard" key={img.id}><div className="adminimagepreview"><img src={publicUrl(img.storage_path)} alt={img.alt_text??selected.name}/>{img.is_primary&&<span>Основна</span>}</div><input value={img.alt_text??''} onChange={e=>updateAlt(img.id,e.target.value)} placeholder="Alt текст"/><div className="imageactions"><button disabled={idx===0} onClick={()=>moveImage(img,-1)}>←</button><button disabled={idx===images.length-1} onClick={()=>moveImage(img,1)}>→</button><button onClick={()=>setPrimary(img.id)} disabled={img.is_primary}>Основна</button><button className="danger" onClick={()=>deleteImage(img)}>Изтрий</button></div></article>)}</div></div>

  <div className="adminstock"><div className="adminsectiontitle">Наличности</div>{variants.map(v=>{const inv=stock.find(s=>s.variant_id===v.id);return <div className="stockrow" key={v.id}><div><strong>{v.size_label}</strong><span>{v.color_name} · {v.sku}</span></div><input type="number" min="0" value={inv?.quantity_on_hand??0} onChange={e=>saveStock(v.id,Number(e.target.value))}/></div>})}</div>{msg&&<div className="adminmsg">{msg}</div>}</section>}</div></main>
}
